import { Router, Response } from 'express';
import {
  ProductsRepo,
  SalesRepo,
  StoreRepo,
  AuditRepo,
  CategoriesRepo,
  getDbStatus,
} from '../db';
import {
  authenticateToken,
  requirePermission,
  requireRole,
  requireActiveSubscription,
  AuthRequest,
} from '../auth';

export const posRouter = Router();

// GET /api/system/status (Returns system status, scoped to tenant store if authenticated)
posRouter.get('/system/status', async (req: AuthRequest, res: Response) => {
  const storeId = req.user?.storeId;
  const status = getDbStatus(storeId);
  return res.json(status);
});

// GET /api/audit-logs (Scoped strictly to storeId)
posRouter.get(
  '/audit-logs',
  authenticateToken,
  requireRole(['SuperAdmin', 'Admin', 'Manager']),
  async (req: AuthRequest, res: Response) => {
    const storeId = req.user!.storeId;
    const logs = await AuditRepo.getRecent(storeId, 30);
    return res.json({ logs });
  }
);

// ----------------- STORE ENDPOINTS -----------------
// GET /api/store (Scoped to user's storeId)
posRouter.get('/store', authenticateToken, async (req: AuthRequest, res: Response) => {
  const storeId = req.user!.storeId;
  const store = await StoreRepo.getStore(storeId);
  if (!store) {
    return res.status(404).json({ error: 'Store not found.' });
  }
  return res.json({ store });
});

// PUT /api/store (Scoped strictly to user's storeId)
posRouter.put(
  '/store',
  authenticateToken,
  requireRole(['SuperAdmin', 'Admin']),
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const updated = await StoreRepo.updateStore(storeId, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Store could not be updated.' });
      }

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'UPDATE_SETTINGS',
        details: `Updated store configuration for "${updated.name}" (${updated.branch})`,
      });

      return res.json({ success: true, store: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update store settings.' });
    }
  }
);

// ----------------- CATEGORIES ENDPOINTS -----------------
// GET /api/categories (Scoped to storeId)
posRouter.get('/categories', authenticateToken, async (req: AuthRequest, res: Response) => {
  const storeId = req.user!.storeId;
  const categories = await CategoriesRepo.getAll(storeId);
  return res.json({ categories });
});

// POST /api/categories (Create category in storeId)
posRouter.post(
  '/categories',
  authenticateToken,
  requireRole(['SuperAdmin', 'Admin', 'Manager']),
  requireActiveSubscription,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Category name is required.' });
      }

      const created = await CategoriesRepo.create(storeId, name.trim());

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'CREATE_CATEGORY',
        details: `Created new category "${created}" in store ${storeId}`,
      });

      return res.status(201).json({ success: true, category: created });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }
);

// DELETE /api/categories/:name (Delete category in storeId)
posRouter.delete(
  '/categories/:name',
  authenticateToken,
  requireRole(['SuperAdmin', 'Admin', 'Manager']),
  requireActiveSubscription,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const catName = decodeURIComponent(req.params.name).trim();

      await CategoriesRepo.delete(storeId, catName);

      // Reassign products in this store that had this category to 'Grocery'
      const storeProducts = await ProductsRepo.getAll(storeId);
      for (const p of storeProducts) {
        if (p.category.toLowerCase() === catName.toLowerCase()) {
          await ProductsRepo.update(storeId, p._id, { category: 'Grocery' });
        }
      }

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'DELETE_CATEGORY',
        details: `Deleted category "${catName}" in store ${storeId}`,
      });

      return res.json({ success: true, message: `Category "${catName}" deleted.` });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete category.' });
    }
  }
);

// ----------------- PRODUCTS ENDPOINTS -----------------
// GET /api/products (Scoped to storeId)
posRouter.get('/products', authenticateToken, async (req: AuthRequest, res: Response) => {
  const storeId = req.user!.storeId;
  const products = await ProductsRepo.getAll(storeId);
  return res.json({ products });
});

// GET /api/products/:id (Scoped to storeId)
posRouter.get('/products/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const storeId = req.user!.storeId;
  const product = await ProductsRepo.findById(storeId, req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found in this store.' });
  }
  return res.json({ product });
});

// POST /api/products (Create product in storeId)
posRouter.post(
  '/products',
  authenticateToken,
  requirePermission('products.create'),
  requireActiveSubscription,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const {
        name,
        sku,
        barcode,
        category,
        storeType,
        costPrice,
        price,
        stock,
        lowStockThreshold,
        unit,
        iconType,
        color,
      } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({ error: 'Product name and price are required.' });
      }

      const newProduct = await ProductsRepo.create({
        storeId,
        name: name.trim(),
        sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
        barcode: barcode || Date.now().toString().slice(-8),
        category: category || 'Grocery',
        storeType: storeType || 'grocery',
        costPrice: Number(costPrice) || 0,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        unit: unit || 'Pcs',
        iconType: iconType || 'rice',
        color: color || '#3B82F6',
      });

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'CREATE_PRODUCT',
        details: `Added new product "${newProduct.name}" (SKU: ${newProduct.sku}) in store ${storeId}`,
      });

      return res.status(201).json({ success: true, product: newProduct });
    } catch (err) {
      console.error('Create product error:', err);
      return res.status(500).json({ error: 'Failed to create product.' });
    }
  }
);

// PUT /api/products/:id (Update product in storeId)
posRouter.put(
  '/products/:id',
  authenticateToken,
  requirePermission('products.edit'),
  requireActiveSubscription,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;

      const existing = await ProductsRepo.findById(storeId, targetId);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found in this store.' });
      }

      const updated = await ProductsRepo.update(storeId, targetId, req.body);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'UPDATE_PRODUCT',
        details: `Updated product details for "${existing.name}" in store ${storeId}`,
      });

      return res.json({ success: true, product: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update product.' });
    }
  }
);

// PATCH /api/products/:id/stock (Adjust stock in storeId)
posRouter.patch(
  '/products/:id/stock',
  authenticateToken,
  requirePermission('products.stock'),
  requireActiveSubscription,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;
      const { stock } = req.body;

      if (stock === undefined) {
        return res.status(400).json({ error: 'Stock number is required.' });
      }

      const existing = await ProductsRepo.findById(storeId, targetId);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found in this store.' });
      }

      const updated = await ProductsRepo.adjustStock(storeId, targetId, Number(stock));

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'UPDATE_STOCK',
        details: `Adjusted stock for "${existing.name}" from ${existing.stock} to ${stock} in store ${storeId}`,
      });

      return res.json({ success: true, product: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to adjust stock.' });
    }
  }
);

// DELETE /api/products/:id (Delete product in storeId)
posRouter.delete(
  '/products/:id',
  authenticateToken,
  requirePermission('products.delete'),
  requireActiveSubscription,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;

      const existing = await ProductsRepo.findById(storeId, targetId);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found in this store.' });
      }

      await ProductsRepo.delete(storeId, targetId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'DELETE_PRODUCT',
        details: `Deleted product "${existing.name}" (SKU: ${existing.sku}) from store ${storeId}`,
      });

      return res.json({ success: true, message: 'Product deleted.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete product.' });
    }
  }
);

// ----------------- SALES / POS ENDPOINTS -----------------
// GET /api/sales (Scoped to storeId)
posRouter.get(
  '/sales',
  authenticateToken,
  requirePermission('sales.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const sales = await SalesRepo.getAll(storeId);
      return res.json({ sales });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve sales.' });
    }
  }
);

// GET /api/sales/:id (Scoped to storeId)
posRouter.get(
  '/sales/:id',
  authenticateToken,
  requirePermission('sales.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const sale = await SalesRepo.findById(storeId, req.params.id);
      if (!sale) {
        return res.status(404).json({ error: 'Sale record not found in this store.' });
      }
      return res.json({ sale });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve sale details.' });
    }
  }
);

// POST /api/sales (Complete POS checkout with storeId enforcement)
posRouter.post(
  '/sales',
  authenticateToken,
  requirePermission('pos.checkout'),
  requireActiveSubscription,
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const {
        items,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxAmount,
        total,
        paymentMethod,
        amountReceived,
        changeGiven,
        customerName,
        customerPhone,
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Cart items are required.' });
      }

      // Generate invoice number scoped to store
      const storeSales = await SalesRepo.getAll(storeId);
      const invoiceNo = (1001 + storeSales.length).toString();

      const newSale = await SalesRepo.create({
        storeId,
        invoiceNo,
        createdAt: new Date().toISOString(),
        items,
        subtotal: Number(subtotal) || 0,
        discountType: discountType || 'flat',
        discountValue: Number(discountValue) || 0,
        discountAmount: Number(discountAmount) || 0,
        taxAmount: Number(taxAmount) || 0,
        total: Number(total) || 0,
        paymentMethod: paymentMethod || 'Cash',
        amountReceived: amountReceived !== undefined ? Number(amountReceived) : undefined,
        changeGiven: changeGiven !== undefined ? Number(changeGiven) : undefined,
        cashierId: req.user!._id,
        cashierName: req.user!.name,
        customerName,
        customerPhone,
        status: 'completed',
      });

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'COMPLETE_SALE',
        details: `Completed sale invoice #${invoiceNo} for amount ৳${total} in store ${storeId}`,
      });

      return res.status(201).json({ success: true, sale: newSale });
    } catch (err) {
      console.error('POS Checkout error:', err);
      return res.status(400).json({ error: (err as Error).message });
    }
  }
);

// POST /api/sales/:id/refund (Process refund with storeId enforcement & inventory restoration)
posRouter.post(
  '/sales/:id/refund',
  authenticateToken,
  requirePermission('sales.refund'),
  async (req: AuthRequest, res: Response) => {
    try {
      const storeId = req.user!.storeId;
      const targetId = req.params.id;

      const sale = await SalesRepo.findById(storeId, targetId);
      if (!sale) {
        return res.status(404).json({ error: 'Sale record not found in this store.' });
      }

      if (sale.status === 'refunded') {
        return res.status(400).json({ error: 'This sale has already been refunded.' });
      }

      const refunded = await SalesRepo.refund(storeId, targetId);

      await AuditRepo.log({
        storeId,
        userId: req.user!._id,
        userName: req.user!.name,
        action: 'REFUND_SALE',
        details: `Processed refund for invoice #${sale.invoiceNo} (Amount ৳${sale.total}) in store ${storeId}`,
      });

      return res.json({ success: true, sale: refunded });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to process refund.' });
    }
  }
);
