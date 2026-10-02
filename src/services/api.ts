import { Product, Sale, StoreInfo, StaffUser } from '../types';

const TOKEN_KEY = 'shoppos_jwt_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn('Storage error', e);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    if (res.status === 403 && errorData.code === 'ACCOUNT_SUSPENDED') {
      window.dispatchEvent(
        new CustomEvent('shoppos:account_suspended', {
          detail: { message: errorData.error || 'Your account has been suspended. Please contact support.' },
        })
      );
    } else if (res.status === 403 && errorData.code === 'SUBSCRIPTION_EXPIRED') {
      window.dispatchEvent(
        new CustomEvent('shoppos:subscription_expired', {
          detail: errorData,
        })
      );
    }
    const err = new Error(errorData.error || `HTTP error ${res.status}`);
    (err as any).code = errorData.code;
    (err as any).status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

export interface ApiUser {
  _id: string;
  storeId: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Cashier';
  permissions: string[];
  pin?: string;
  phone?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export interface DbStatusResponse {
  mode: 'remote-mongodb' | 'embedded-mongodb';
  connected: boolean;
  database: string;
  storeId?: string;
  collections: {
    stores?: number | string;
    users: number | string;
    products: number | string;
    sales: number | string;
    categories?: number | string;
  };
}

export const api = {
  // Auth
  async login(credentials: { identifier?: string; password?: string; pin?: string }): Promise<{
    token: string;
    user: ApiUser;
  }> {
    const data = await request<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setStoredToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: ApiUser }> {
    return request<{ user: ApiUser }>('/api/auth/me');
  },

  async getUsers(): Promise<{ users: ApiUser[] }> {
    return request<{ users: ApiUser[] }>('/api/auth/users');
  },

  async createUser(payload: {
    name: string;
    email: string;
    password?: string;
    pin?: string;
    role: string;
    permissions?: string[];
    phone?: string;
  }): Promise<{ user: ApiUser }> {
    return request<{ user: ApiUser }>('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(
    id: string,
    updates: Partial<{
      name: string;
      role: string;
      permissions: string[];
      status: string;
      pin: string;
      password?: string;
      phone?: string;
    }>
  ): Promise<{ user: ApiUser }> {
    return request<{ user: ApiUser }>(`/api/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/auth/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Categories
  async getCategories(): Promise<{ categories: string[] }> {
    return request<{ categories: string[] }>('/api/categories');
  },

  async createCategory(name: string): Promise<{ category: string }> {
    return request<{ category: string }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteCategory(name: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/categories/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },

  // Products
  async getProducts(): Promise<{ products: Product[] }> {
    const data = await request<{ products: any[] }>('/api/products');
    const normalized: Product[] = data.products.map((p) => ({
      id: p._id || p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      storeType: p.storeType || 'grocery',
      costPrice: p.costPrice,
      price: p.price,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold || 5,
      unit: p.unit || 'Pcs',
      iconType: p.iconType || 'rice',
      color: p.color || '#3B82F6',
    }));
    return { products: normalized };
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<{ product: Product }> {
    const data = await request<{ product: any }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return {
      product: {
        ...data.product,
        id: data.product._id || data.product.id,
      },
    };
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<{ product: Product }> {
    const data = await request<{ product: any }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return {
      product: {
        ...data.product,
        id: data.product._id || data.product.id,
      },
    };
  },

  async adjustStock(id: string, stock: number): Promise<{ product: Product }> {
    const data = await request<{ product: any }>(`/api/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ stock }),
    });
    return {
      product: {
        ...data.product,
        id: data.product._id || data.product.id,
      },
    };
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Sales
  async getSales(): Promise<{ sales: Sale[] }> {
    const data = await request<{ sales: any[] }>('/api/sales');
    const normalized: Sale[] = data.sales.map((s) => ({
      id: s._id || s.id,
      invoiceNo: s.invoiceNo,
      createdAt: s.createdAt,
      items: s.items,
      subtotal: s.subtotal,
      discountType: s.discountType,
      discountValue: s.discountValue,
      discountAmount: s.discountAmount,
      taxAmount: s.taxAmount,
      total: s.total,
      paymentMethod: s.paymentMethod,
      amountReceived: s.amountReceived,
      changeGiven: s.changeGiven,
      cashierName: s.cashierName,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      status: s.status,
    }));
    return { sales: normalized };
  },

  async createSale(sale: Omit<Sale, 'id'>): Promise<{ sale: Sale }> {
    const data = await request<{ sale: any }>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
    return {
      sale: {
        ...data.sale,
        id: data.sale._id || data.sale.id,
      },
    };
  },

  async refundSale(id: string): Promise<{ sale: Sale }> {
    const data = await request<{ sale: any }>(`/api/sales/${id}/refund`, {
      method: 'POST',
    });
    return {
      sale: {
        ...data.sale,
        id: data.sale._id || data.sale.id,
      },
    };
  },

  // Store & System
  async getStore(): Promise<{ store: StoreInfo }> {
    const data = await request<{ store: any }>('/api/store');
    return {
      store: {
        id: data.store._id || data.store.id,
        ownerId: data.store.ownerId,
        name: data.store.name,
        branch: data.store.branch,
        tagline: data.store.tagline,
        phone: data.store.phone,
        address: data.store.address,
        currency: data.store.currency,
        taxRate: data.store.taxRate,
        receiptFooter: data.store.receiptFooter,
        printerSize: data.store.printerSize,
        storeType: data.store.storeType,
        status: data.store.status,
        subscription: data.store.subscription,
      },
    };
  },

  async updateStore(updates: Partial<StoreInfo>): Promise<{ store: StoreInfo }> {
    const data = await request<{ store: any }>('/api/store', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return { store: data.store };
  },

  async getDbStatus(): Promise<DbStatusResponse> {
    return request<DbStatusResponse>('/api/system/status');
  },

  async getAuditLogs(): Promise<{ logs: any[] }> {
    return request<{ logs: any[] }>('/api/audit-logs');
  },

  // Admin SaaS Control & Realtime Testing APIs
  async adminSuspendStore(storeId: string, reason?: string) {
    return request<{ success: boolean; message: string; store: any }>(
      `/api/admin/stores/${storeId}/suspend`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  },

  async adminActivateStore(storeId: string) {
    return request<{ success: boolean; message: string; store: any }>(
      `/api/admin/stores/${storeId}/activate`,
      {
        method: 'POST',
      }
    );
  },

  async adminApprovePayment(storeId: string, paymentId?: string, months?: number) {
    return request<{ success: boolean; message: string; subscription: any; store: any }>(
      `/api/admin/stores/${storeId}/approve-payment`,
      {
        method: 'POST',
        body: JSON.stringify({ paymentId, months }),
      }
    );
  },

  async adminExpireSubscription(storeId: string) {
    return request<{ success: boolean; message: string; subscription: any; store: any }>(
      `/api/admin/stores/${storeId}/expire-subscription`,
      {
        method: 'POST',
      }
    );
  },
};
