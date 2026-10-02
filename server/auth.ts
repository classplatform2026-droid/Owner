import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserDoc, UsersRepo, StoreDoc, StoreRepo } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'shoppos_production_jwt_secret_key_884920';

export interface AuthRequest extends Request {
  user?: UserDoc;
  storeId?: string;
  store?: StoreDoc;
}

export function generateToken(user: UserDoc): string {
  const uid = user._id ? user._id.toString() : (user.id || '');
  const sId = user.storeId ? user.storeId.toString() : '';
  return jwt.sign(
    {
      id: uid,
      userId: uid,
      sub: uid,
      storeId: sId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.id || decoded.userId || decoded.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token: User ID missing.' });
    }

    const user = await UsersRepo.findById(userId);

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    // Verify store status
    const store = await StoreRepo.getStore(user.storeId);
    if (!store) {
      return res.status(401).json({ error: 'Store not found or no longer active.' });
    }

    if (store.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    req.user = user;
    req.storeId = user.storeId;
    req.store = store;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
}

// Subscription Validation Middleware
export function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.store) {
    return res.status(401).json({ error: 'Store context required.' });
  }

  const sub = req.store.subscription;
  if (!sub) {
    return next();
  }

  const isExpired =
    sub.status === 'expired' ||
    (sub.expiryDate && new Date(sub.expiryDate).getTime() < Date.now());

  if (isExpired) {
    return res.status(403).json({
      error: 'Your subscription has expired. Please renew your plan to continue.',
      code: 'SUBSCRIPTION_EXPIRED',
      subscription: {
        ...sub,
        status: 'expired',
      },
    });
  }

  next();
}

export function requireRole(allowedRoles: Array<'SuperAdmin' | 'Admin' | 'Manager' | 'Cashier' | 'Owner' | string>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const currentRole = (req.user.role || '').toLowerCase();
    if (currentRole === 'superadmin' || currentRole === 'owner') {
      return next(); // SuperAdmin / Owner has full store rights
    }

    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
    if (!normalizedAllowed.includes(currentRole)) {
      return res.status(403).json({
        error: `Access denied. Requires one of: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const currentRole = (req.user.role || '').toLowerCase();
    if (currentRole === 'superadmin' || currentRole === 'owner' || currentRole === 'admin') {
      return next(); // Store owners / Admins have all permissions in their store
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        error: `Permission denied. Missing required permission: "${permission}".`,
      });
    }

    next();
  };
}
