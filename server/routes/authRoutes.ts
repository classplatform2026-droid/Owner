import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UsersRepo, StoreRepo, AuditRepo } from '../db';
import { authenticateToken, requireRole, generateToken, AuthRequest } from '../auth';

export const authRouter = Router();

// In-memory rate limiting map (IP -> attempts count)
const loginAttempts: Map<string, { count: number; resetTime: number }> = new Map();

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 15 * 60 * 1000 });
    return true;
  }
  if (record.count >= 30) {
    return false;
  }
  record.count += 1;
  return true;
}

// POST /api/auth/login
// Supports multi-tenant login with email/password, email/PIN, or terminal PIN directly
authRouter.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (!checkLoginRateLimit(clientIp)) {
      return res.status(429).json({
        error: 'Too many login attempts. Please wait 15 minutes before trying again.',
      });
    }

    const { identifier, password, pin } = req.body;

    if (!identifier && !pin) {
      return res.status(400).json({ error: 'Please provide email or staff PIN.' });
    }

    let user = null;

    if (pin && !identifier) {
      // Direct PIN terminal login (searches active users by hashed pin)
      user = await UsersRepo.findByPin(pin.toString().trim());
    } else if (identifier) {
      // Email or identifier login
      user = await UsersRepo.findByEmail(identifier.trim());

      if (!user && pin) {
        // Fallback: check if identifier was actually PIN
        user = await UsersRepo.findByPin(pin.toString().trim());
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email, staff identifier, or PIN.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // Verify store status
    const store = await StoreRepo.getStore(user.storeId);
    if (store && store.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // Verify credentials
    let passwordMatches = false;
    const userPass = user.passwordHash || (user as any).password;
    if (password && userPass) {
      passwordMatches = await bcrypt.compare(password, userPass);
    }

    let pinMatches = false;
    if (pin) {
      if (user.pinHash) {
        pinMatches = await bcrypt.compare(pin.toString().trim(), user.pinHash);
      } else if ((user as any).pin && (user as any).pin === pin.toString().trim()) {
        // Safe migration of legacy plaintext PIN to pinHash
        pinMatches = true;
        const salt = await bcrypt.genSalt(10);
        const pinHash = await bcrypt.hash(pin.toString().trim(), salt);
        await UsersRepo.update(user.storeId, user._id, { pinHash });
      }
    }

    // Allow login if password matches OR valid staff PIN matches
    if (!passwordMatches && !pinMatches) {
      return res.status(401).json({ error: 'Incorrect password or PIN.' });
    }

    // Update last login
    await UsersRepo.update(user.storeId, user._id, { lastLogin: new Date().toISOString() });

    const token = generateToken(user);

    await AuditRepo.log({
      storeId: user.storeId,
      userId: user._id,
      userName: user.name,
      action: 'LOGIN',
      details: `User logged in to store ${user.storeId} with role ${user.role}`,
    });

    const { passwordHash: _, pinHash: __, ...safeUser } = user;

    return res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { passwordHash: _, pinHash: __, ...safeUser } = req.user;
  return res.json({ user: safeUser });
});

// GET /api/auth/users (Scoped strictly to storeId)
authRouter.get(
  '/users',
  authenticateToken,
  requireRole(['SuperAdmin', 'Admin', 'Manager']),
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const users = await UsersRepo.getAll(storeId);
      return res.json({ users });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve staff list.' });
    }
  }
);

// POST /api/auth/users (Add new staff to the authenticated store)
authRouter.post(
  '/users',
  authenticateToken,
  requireRole(['SuperAdmin', 'Admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const { name, email, password, pin, role, permissions, phone } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required.' });
      }

      const existing = await UsersRepo.findByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'A staff member with this email already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password || 'password123', salt);
      // Hash PIN securely (no plaintext PIN)
      const pinHash = await bcrypt.hash((pin || '0000').toString().trim(), salt);

      const defaultPerms =
        role === 'SuperAdmin' || role === 'Admin'
          ? [
              'pos.checkout',
              'pos.discount',
              'products.create',
              'products.edit',
              'products.delete',
              'products.stock',
              'sales.view',
              'sales.refund',
              'staff.manage',
              'settings.update',
              'stores.switch',
            ]
          : role === 'Manager'
          ? [
              'pos.checkout',
              'pos.discount',
              'products.create',
              'products.edit',
              'products.stock',
              'sales.view',
              'sales.refund',
            ]
          : ['pos.checkout', 'sales.view'];

      const newUser = await UsersRepo.create({
        storeId,
        name: name.trim(),
        email: email.trim(),
        passwordHash,
        pinHash,
        role,
        permissions: permissions && permissions.length > 0 ? permissions : defaultPerms,
        phone: phone || '',
        status: 'active',
      });

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'CREATE_USER',
        details: `Created new staff "${newUser.name}" with role "${role}" in store ${storeId}`,
      });

      const { passwordHash: _, pinHash: __, ...safeUser } = newUser;
      return res.status(201).json({ success: true, user: safeUser });
    } catch (err) {
      console.error('Create user error:', err);
      return res.status(500).json({ error: 'Failed to create user.' });
    }
  }
);

// PUT /api/auth/users/:id (Update user in authenticated store)
authRouter.put(
  '/users/:id',
  authenticateToken,
  requireRole(['SuperAdmin', 'Admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;
      const { name, role, permissions, status, pin, password, phone } = req.body;

      const existing = await UsersRepo.findById(targetId);
      if (!existing || existing.storeId !== storeId) {
        return res.status(404).json({ error: 'User not found in this store.' });
      }

      const updates: any = {};
      if (name) updates.name = name.trim();
      if (role) updates.role = role;
      if (permissions) updates.permissions = permissions;
      if (status) updates.status = status;
      if (phone !== undefined) updates.phone = phone;

      const salt = await bcrypt.genSalt(10);
      if (password) {
        updates.passwordHash = await bcrypt.hash(password, salt);
      }
      if (pin) {
        updates.pinHash = await bcrypt.hash(pin.toString().trim(), salt);
      }

      const updated = await UsersRepo.update(storeId, targetId, updates);
      if (!updated) {
        return res.status(404).json({ error: 'User could not be updated.' });
      }

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'UPDATE_USER',
        details: `Updated staff "${updated.name}" (${updated.role}) in store ${storeId}`,
      });

      const { passwordHash: _, pinHash: __, ...safeUser } = updated;
      return res.json({ success: true, user: safeUser });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update user.' });
    }
  }
);

// DELETE /api/auth/users/:id (Delete user in authenticated store)
authRouter.delete(
  '/users/:id',
  authenticateToken,
  requireRole(['SuperAdmin', 'Admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;

      if (targetId === req.user!._id) {
        return res.status(400).json({ error: 'You cannot delete your own account.' });
      }

      const target = await UsersRepo.findById(targetId);
      if (!target || target.storeId !== storeId) {
        return res.status(404).json({ error: 'User not found in this store.' });
      }

      const deleted = await UsersRepo.delete(storeId, targetId);
      if (!deleted) {
        return res.status(404).json({ error: 'User could not be deleted.' });
      }

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'DELETE_USER',
        details: `Deleted staff member "${target.name}" from store ${storeId}`,
      });

      return res.json({ success: true, message: 'User deleted.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete user.' });
    }
  }
);
