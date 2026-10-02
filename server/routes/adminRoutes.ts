import { Router, Request, Response } from 'express';
import { StoreRepo, UsersRepo, AuditRepo } from '../db';

export const adminRouter = Router();

// GET /api/admin/stores (Lists stores with status and subscription for Admin control)
adminRouter.get('/stores', async (_req: Request, res: Response) => {
  try {
    const stores = await StoreRepo.getAllStores();
    return res.json({ stores });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve stores.' });
  }
});

// POST /api/admin/stores/:storeId/suspend (Admin suspends store)
adminRouter.post('/stores/:storeId/suspend', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { reason } = req.body;

    const store = await StoreRepo.getStore(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const updated = await StoreRepo.suspendStore(
      storeId,
      reason || 'Your account has been suspended by the administrator. Please contact support.'
    );

    await AuditRepo.log({
      storeId,
      userId: 'admin_console',
      userName: 'SaaS Platform Admin',
      action: 'SUSPEND_STORE',
      details: `Admin suspended store ${storeId} (${store.name})`,
    });

    return res.json({
      success: true,
      message: `Store ${storeId} suspended successfully. Realtime notification broadcasted.`,
      store: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to suspend store.' });
  }
});

// POST /api/admin/stores/:storeId/activate (Admin activates store)
adminRouter.post('/stores/:storeId/activate', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const store = await StoreRepo.getStore(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const updated = await StoreRepo.activateStore(storeId);

    await AuditRepo.log({
      storeId,
      userId: 'admin_console',
      userName: 'SaaS Platform Admin',
      action: 'ACTIVATE_STORE',
      details: `Admin activated store ${storeId} (${store.name})`,
    });

    return res.json({
      success: true,
      message: `Store ${storeId} activated successfully. Realtime notification broadcasted.`,
      store: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to activate store.' });
  }
});

// POST /api/admin/stores/:storeId/approve-payment (Admin approves subscription payment)
adminRouter.post('/stores/:storeId/approve-payment', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { paymentId, months } = req.body;

    const store = await StoreRepo.getStore(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const updated = await StoreRepo.approvePayment(
      storeId,
      paymentId || `pay_${Date.now()}`,
      Number(months) || 1
    );

    await AuditRepo.log({
      storeId,
      userId: 'admin_console',
      userName: 'SaaS Platform Admin',
      action: 'APPROVE_PAYMENT',
      details: `Admin approved subscription payment for store ${storeId}`,
    });

    return res.json({
      success: true,
      message: `Payment approved for store ${storeId}. Subscription activated in realtime.`,
      subscription: updated?.subscription,
      store: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to approve payment.' });
  }
});

// POST /api/admin/stores/:storeId/expire-subscription (Admin sets subscription as expired)
adminRouter.post('/stores/:storeId/expire-subscription', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const store = await StoreRepo.getStore(storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const updated = await StoreRepo.expireSubscription(storeId);

    await AuditRepo.log({
      storeId,
      userId: 'admin_console',
      userName: 'SaaS Platform Admin',
      action: 'EXPIRE_SUBSCRIPTION',
      details: `Admin marked subscription as expired for store ${storeId}`,
    });

    return res.json({
      success: true,
      message: `Subscription marked as expired for store ${storeId}. Realtime notification broadcasted.`,
      subscription: updated?.subscription,
      store: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to expire subscription.' });
  }
});
