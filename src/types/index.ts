export type CategoryType =
  | 'All'
  | 'Grocery'
  | 'Beverages'
  | 'Snacks'
  | 'Household'
  | 'Personal Care'
  | 'Fashion'
  | 'Electronics';

export interface Product {
  id: string;
  storeId?: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  storeType: 'grocery' | 'fashion' | 'electronics' | 'all';
  costPrice: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  unit: string; // e.g. "KG", "1L", "250G", "Pcs", "Pack"
  iconType: string;
  color: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Card';

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  storeId?: string;
  invoiceNo: string;
  createdAt: string; // ISO string
  items: SaleItem[];
  subtotal: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  changeGiven?: number;
  cashierId?: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  status: 'completed' | 'refunded';
}

export interface StoreSubscription {
  status: 'active' | 'trial' | 'expired' | 'suspended';
  plan: 'Starter' | 'Professional' | 'Enterprise';
  startDate: string;
  expiryDate: string; // ISO string
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  lastPaymentId?: string;
  paymentStatus?: 'pending' | 'approved' | 'rejected';
}

export interface StoreInfo {
  id?: string;
  ownerId?: string;
  name: string;
  branch: string;
  tagline: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number; // e.g. 0 or 5%
  receiptFooter: string;
  printerSize: '80mm' | '58mm' | 'A4';
  storeType: 'grocery' | 'fashion' | 'electronics';
  status?: 'active' | 'suspended';
  subscription?: StoreSubscription;
}

export interface StaffUser {
  id: string;
  storeId?: string;
  name: string;
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Cashier';
  avatarInitials: string;
  pin?: string;
  email: string;
  permissions?: string[];
  status?: 'active' | 'suspended';
  lastLogin?: string;
  phone?: string;
}
