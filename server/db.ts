import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  emitAccountSuspended,
  emitAccountActivated,
  emitPaymentApproved,
  emitSubscriptionUpdated,
  emitSubscriptionExpired,
} from './socket';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'shoppos';

// Multi-tenant Document Schemas
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

export interface StoreDoc {
  _id: string; // e.g. "store_001", "store_002"
  ownerId: string; // e.g. "usr_admin", "usr_owner_002"
  name: string;
  branch: string;
  tagline: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  receiptFooter: string;
  printerSize: '80mm' | '58mm' | 'A4';
  storeType: 'grocery' | 'fashion' | 'electronics';
  status: 'active' | 'suspended';
  subscription: StoreSubscription;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserDoc {
  _id: string;
  storeId: string; // Multi-tenant binding
  name: string;
  email: string;
  passwordHash: string;
  pinHash: string; // Bcrypt hashed PIN (no plaintext PIN)
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Cashier';
  permissions: string[];
  phone?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

export interface CategoryDoc {
  _id: string;
  storeId: string; // Multi-tenant binding
  name: string;
  createdAt: string;
}

export interface ProductDoc {
  _id: string;
  storeId: string; // Multi-tenant binding
  name: string;
  sku: string;
  barcode: string;
  category: string;
  storeType: 'grocery' | 'fashion' | 'electronics' | 'all';
  costPrice: number;
  price: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  iconType: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleDoc {
  _id: string;
  storeId: string; // Multi-tenant binding
  invoiceNo: string;
  createdAt: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'Cash' | 'bKash' | 'Nagad' | 'Card';
  amountReceived?: number;
  changeGiven?: number;
  cashierId?: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  status: 'completed' | 'refunded';
}

export interface AuditLogDoc {
  _id: string;
  storeId: string; // Multi-tenant binding
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

// Database state
let mongoClient: MongoClient | null = null;
let nativeDb: Db | null = null;
let isUsingRemoteMongo = false;
let dbConnected = false;

// Embedded MongoDB-compatible store as fallback
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'mongodb.json');

interface LocalDatabaseState {
  stores: StoreDoc[];
  users: UserDoc[];
  categories: CategoryDoc[];
  products: ProductDoc[];
  sales: SaleDoc[];
  audit_logs: AuditLogDoc[];
}

let localDb: LocalDatabaseState = {
  stores: [],
  users: [],
  categories: [],
  products: [],
  sales: [],
  audit_logs: [],
};

// Seed initial data for multiple stores
export async function seedInitialData() {
  const salt = await bcrypt.genSalt(10);

  // Store 1 Hashes
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const adminPinHash = await bcrypt.hash('1234', salt);
  const managerPasswordHash = await bcrypt.hash('manager123', salt);
  const managerPinHash = await bcrypt.hash('2222', salt);
  const cashierPasswordHash = await bcrypt.hash('cashier123', salt);
  const cashierPinHash = await bcrypt.hash('0000', salt);

  // Store 2 Hashes
  const owner2PasswordHash = await bcrypt.hash('owner123', salt);
  const owner2PinHash = await bcrypt.hash('5555', salt);
  const cashier2PasswordHash = await bcrypt.hash('cashier123', salt);
  const cashier2PinHash = await bcrypt.hash('9999', salt);

  // Store 1: Green Mart (Grocery)
  const store1: StoreDoc = {
    _id: 'store_001',
    ownerId: 'usr_admin',
    name: 'Green Mart',
    branch: 'Dhanmondi Branch',
    tagline: 'Fresh Groceries & Daily Essentials',
    phone: '+880 1712-345678',
    address: 'Shop #14, Road 7, Dhanmondi, Dhaka',
    currency: '৳',
    taxRate: 0,
    receiptFooter: 'Thank you for shopping with Green Mart! Please visit again.',
    printerSize: '80mm',
    storeType: 'grocery',
    status: 'active',
    subscription: {
      status: 'active',
      plan: 'Professional',
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 60 * 86400000).toISOString(), // 60 days active
      billingCycle: 'monthly',
      amount: 2500,
      lastPaymentId: 'pay_init_001',
      paymentStatus: 'approved',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Store 2: Blue Electronics (Electronics)
  const store2: StoreDoc = {
    _id: 'store_002',
    ownerId: 'usr_owner_002',
    name: 'Blue Electronics',
    branch: 'Gulshan Branch',
    tagline: 'Premium Gadgets & Authentic Accessories',
    phone: '+880 1812-987654',
    address: 'Level 3, Block C, Gulshan-2, Dhaka',
    currency: '৳',
    taxRate: 5,
    receiptFooter: 'Warranty valid with invoice. Thank you for choosing Blue Electronics!',
    printerSize: '80mm',
    storeType: 'electronics',
    status: 'active',
    subscription: {
      status: 'active',
      plan: 'Enterprise',
      startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      expiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      billingCycle: 'yearly',
      amount: 24000,
      lastPaymentId: 'pay_init_002',
      paymentStatus: 'approved',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const initialStores: StoreDoc[] = [store1, store2];

  // Users for Store 1 & Store 2
  const initialUsers: UserDoc[] = [
    {
      _id: 'usr_admin',
      storeId: 'store_001',
      name: 'Admin Manager',
      email: 'admin@shoppos.com',
      passwordHash: adminPasswordHash,
      pinHash: adminPinHash,
      role: 'SuperAdmin',
      permissions: [
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
      ],
      phone: '+880 1712-000001',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'usr_manager',
      storeId: 'store_001',
      name: 'Sadia Akhter',
      email: 'manager@shoppos.com',
      passwordHash: managerPasswordHash,
      pinHash: managerPinHash,
      role: 'Manager',
      permissions: [
        'pos.checkout',
        'pos.discount',
        'products.create',
        'products.edit',
        'products.stock',
        'sales.view',
        'sales.refund',
      ],
      phone: '+880 1819-000002',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'usr_cashier',
      storeId: 'store_001',
      name: 'Tariqul Islam',
      email: 'cashier@shoppos.com',
      passwordHash: cashierPasswordHash,
      pinHash: cashierPinHash,
      role: 'Cashier',
      permissions: ['pos.checkout', 'sales.view'],
      phone: '+880 1911-000003',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'usr_owner_002',
      storeId: 'store_002',
      name: 'Tanvir Ahmed',
      email: 'owner2@shoppos.com',
      passwordHash: owner2PasswordHash,
      pinHash: owner2PinHash,
      role: 'Admin',
      permissions: [
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
      ],
      phone: '+880 1812-000004',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'usr_cashier_002',
      storeId: 'store_002',
      name: 'Kamrul Hasan',
      email: 'cashier2@shoppos.com',
      passwordHash: cashier2PasswordHash,
      pinHash: cashier2PinHash,
      role: 'Cashier',
      permissions: ['pos.checkout', 'sales.view'],
      phone: '+880 1912-000005',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];

  // Categories for Store 1
  const store1CatNames = [
    'Grocery',
    'Beverages',
    'Snacks',
    'Dairy & Eggs',
    'Bakery',
    'Household',
    'Personal Care',
    'Spices & Oils',
  ];

  const initialCategories: CategoryDoc[] = [
    ...store1CatNames.map((name, i) => ({
      _id: `cat_001_${i + 1}`,
      storeId: 'store_001',
      name,
      createdAt: new Date().toISOString(),
    })),
    // Categories for Store 2
    ...['Mobile Accessories', 'Audio & Headphones', 'Power & Cables', 'Smart Wearables', 'Gaming Accessories'].map(
      (name, i) => ({
        _id: `cat_002_${i + 1}`,
        storeId: 'store_002',
        name,
        createdAt: new Date().toISOString(),
      })
    ),
  ];

  // Products for Store 1 (Grocery)
  const initialProducts: ProductDoc[] = [
    {
      _id: 'prod-1',
      storeId: 'store_001',
      name: 'Rice (5KG)',
      sku: 'GRO-RC-001',
      barcode: '890103001',
      category: 'Grocery',
      storeType: 'grocery',
      costPrice: 950,
      price: 1200,
      stock: 45,
      lowStockThreshold: 10,
      unit: '5KG',
      iconType: 'rice',
      color: '#F59E0B',
    },
    {
      _id: 'prod-2',
      storeId: 'store_001',
      name: 'Cooking Oil (1L)',
      sku: 'GRO-OIL-002',
      barcode: '890103002',
      category: 'Grocery',
      storeType: 'grocery',
      costPrice: 145,
      price: 180,
      stock: 32,
      lowStockThreshold: 8,
      unit: '1L',
      iconType: 'oil',
      color: '#EAB308',
    },
    {
      _id: 'prod-3',
      storeId: 'store_001',
      name: 'Sugar (1KG)',
      sku: 'GRO-SGR-003',
      barcode: '890103003',
      category: 'Grocery',
      storeType: 'grocery',
      costPrice: 75,
      price: 90,
      stock: 50,
      lowStockThreshold: 12,
      unit: '1KG',
      iconType: 'sugar',
      color: '#3B82F6',
    },
    {
      _id: 'prod-4',
      storeId: 'store_001',
      name: 'Lentil / Dal (1KG)',
      sku: 'GRO-DAL-004',
      barcode: '890103004',
      category: 'Grocery',
      storeType: 'grocery',
      costPrice: 95,
      price: 120,
      stock: 28,
      lowStockThreshold: 10,
      unit: '1KG',
      iconType: 'lentil',
      color: '#EF4444',
    },
    {
      _id: 'prod-5',
      storeId: 'store_001',
      name: 'Wheat Flour / Atta (2KG)',
      sku: 'GRO-ATT-005',
      barcode: '890103005',
      category: 'Grocery',
      storeType: 'grocery',
      costPrice: 85,
      price: 110,
      stock: 40,
      lowStockThreshold: 10,
      unit: '2KG',
      iconType: 'flour',
      color: '#D97706',
    },
    {
      _id: 'prod-6',
      storeId: 'store_001',
      name: 'Salt (1KG)',
      sku: 'GRO-SLT-006',
      barcode: '890103006',
      category: 'Grocery',
      storeType: 'grocery',
      costPrice: 30,
      price: 40,
      stock: 60,
      lowStockThreshold: 15,
      unit: '1KG',
      iconType: 'salt',
      color: '#06B6D4',
    },
    {
      _id: 'prod-7',
      storeId: 'store_001',
      name: 'Black Tea (400g)',
      sku: 'BEV-TEA-007',
      barcode: '890103007',
      category: 'Beverages',
      storeType: 'grocery',
      costPrice: 190,
      price: 240,
      stock: 25,
      lowStockThreshold: 5,
      unit: '400g',
      iconType: 'tea',
      color: '#10B981',
    },
    {
      _id: 'prod-8',
      storeId: 'store_001',
      name: 'Milk (1L Pack)',
      sku: 'BEV-MLK-008',
      barcode: '890103008',
      category: 'Dairy & Eggs',
      storeType: 'grocery',
      costPrice: 65,
      price: 85,
      stock: 4,
      lowStockThreshold: 8,
      unit: '1L',
      iconType: 'milk',
      color: '#6366F1',
    },
    {
      _id: 'prod-9',
      storeId: 'store_001',
      name: 'Energy Drink (250ml)',
      sku: 'BEV-ENG-009',
      barcode: '890103009',
      category: 'Beverages',
      storeType: 'grocery',
      costPrice: 70,
      price: 95,
      stock: 35,
      lowStockThreshold: 10,
      unit: 'Can',
      iconType: 'energydrink',
      color: '#8B5CF6',
    },
    {
      _id: 'prod-10',
      storeId: 'store_001',
      name: 'Butter Biscuits (300g)',
      sku: 'SNK-BSC-010',
      barcode: '890103010',
      category: 'Snacks',
      storeType: 'grocery',
      costPrice: 50,
      price: 70,
      stock: 3,
      lowStockThreshold: 6,
      unit: 'Pack',
      iconType: 'biscuit',
      color: '#F97316',
    },
    {
      _id: 'prod-11',
      storeId: 'store_001',
      name: 'Instant Noodles (4-Pack)',
      sku: 'SNK-NDL-011',
      barcode: '890103011',
      category: 'Snacks',
      storeType: 'grocery',
      costPrice: 100,
      price: 130,
      stock: 22,
      lowStockThreshold: 5,
      unit: 'Pack',
      iconType: 'noodles',
      color: '#EC4899',
    },
    {
      _id: 'prod-12',
      storeId: 'store_001',
      name: 'Potato Chips (150g)',
      sku: 'SNK-CHP-012',
      barcode: '890103012',
      category: 'Snacks',
      storeType: 'grocery',
      costPrice: 40,
      price: 60,
      stock: 18,
      lowStockThreshold: 5,
      unit: 'Pack',
      iconType: 'biscuit',
      color: '#EAB308',
    },

    // Products for Store 2 (Electronics)
    {
      _id: 'prod-201',
      storeId: 'store_002',
      name: '65W GaN Fast Charger',
      sku: 'ELE-CHG-001',
      barcode: '890201001',
      category: 'Power & Cables',
      storeType: 'electronics',
      costPrice: 1200,
      price: 1850,
      stock: 30,
      lowStockThreshold: 5,
      unit: 'Pcs',
      iconType: 'charger',
      color: '#3B82F6',
    },
    {
      _id: 'prod-202',
      storeId: 'store_002',
      name: 'Braided USB-C Cable (2m)',
      sku: 'ELE-CBL-002',
      barcode: '890201002',
      category: 'Power & Cables',
      storeType: 'electronics',
      costPrice: 250,
      price: 450,
      stock: 55,
      lowStockThreshold: 10,
      unit: 'Pcs',
      iconType: 'cable',
      color: '#10B981',
    },
    {
      _id: 'prod-203',
      storeId: 'store_002',
      name: 'Active Noise Cancelling Earbuds',
      sku: 'ELE-AUD-003',
      barcode: '890201003',
      category: 'Audio & Headphones',
      storeType: 'electronics',
      costPrice: 2200,
      price: 3499,
      stock: 18,
      lowStockThreshold: 4,
      unit: 'Pcs',
      iconType: 'earbuds',
      color: '#8B5CF6',
    },
    {
      _id: 'prod-204',
      storeId: 'store_002',
      name: 'MagSafe Wireless Power Bank 10000mAh',
      sku: 'ELE-PWR-004',
      barcode: '890201004',
      category: 'Mobile Accessories',
      storeType: 'electronics',
      costPrice: 1800,
      price: 2600,
      stock: 14,
      lowStockThreshold: 3,
      unit: 'Pcs',
      iconType: 'charger',
      color: '#F59E0B',
    },
    {
      _id: 'prod-205',
      storeId: 'store_002',
      name: 'Fitness Smart Band 8',
      sku: 'ELE-SMT-005',
      barcode: '890201005',
      category: 'Smart Wearables',
      storeType: 'electronics',
      costPrice: 2400,
      price: 3300,
      stock: 20,
      lowStockThreshold: 5,
      unit: 'Pcs',
      iconType: 'earbuds',
      color: '#EC4899',
    },
  ];

  // Sales for Store 1
  const initialSales: SaleDoc[] = [
    {
      _id: 'sale-1',
      storeId: 'store_001',
      invoiceNo: '1001',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      items: [
        {
          productId: 'prod-1',
          productName: 'Rice (5KG)',
          quantity: 2,
          unitPrice: 1200,
          totalPrice: 2400,
        },
        {
          productId: 'prod-2',
          productName: 'Cooking Oil (1L)',
          quantity: 1,
          unitPrice: 180,
          totalPrice: 180,
        },
        {
          productId: 'prod-10',
          productName: 'Butter Biscuits (300g)',
          quantity: 2,
          unitPrice: 70,
          totalPrice: 140,
        },
      ],
      subtotal: 2720,
      discountType: 'flat',
      discountValue: 120,
      discountAmount: 120,
      taxAmount: 0,
      total: 2600,
      paymentMethod: 'bKash',
      cashierId: 'usr_cashier',
      cashierName: 'Tariqul Islam',
      customerName: 'Siam Ahmed',
      customerPhone: '+880 1711-223344',
      status: 'completed',
    },
    {
      _id: 'sale-2',
      storeId: 'store_001',
      invoiceNo: '1002',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      items: [
        {
          productId: 'prod-7',
          productName: 'Black Tea (400g)',
          quantity: 1,
          unitPrice: 240,
          totalPrice: 240,
        },
        {
          productId: 'prod-3',
          productName: 'Sugar (1KG)',
          quantity: 2,
          unitPrice: 90,
          totalPrice: 180,
        },
      ],
      subtotal: 420,
      discountType: 'flat',
      discountValue: 0,
      discountAmount: 0,
      taxAmount: 0,
      total: 420,
      paymentMethod: 'Cash',
      amountReceived: 500,
      changeGiven: 80,
      cashierId: 'usr_cashier',
      cashierName: 'Tariqul Islam',
      customerName: 'Mitu Akter',
      status: 'completed',
    },

    // Sales for Store 2
    {
      _id: 'sale-201',
      storeId: 'store_002',
      invoiceNo: '2001',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      items: [
        {
          productId: 'prod-201',
          productName: '65W GaN Fast Charger',
          quantity: 1,
          unitPrice: 1850,
          totalPrice: 1850,
        },
        {
          productId: 'prod-202',
          productName: 'Braided USB-C Cable (2m)',
          quantity: 1,
          unitPrice: 450,
          totalPrice: 450,
        },
      ],
      subtotal: 2300,
      discountType: 'flat',
      discountValue: 100,
      discountAmount: 100,
      taxAmount: 110,
      total: 2310,
      paymentMethod: 'Card',
      cashierId: 'usr_cashier_002',
      cashierName: 'Kamrul Hasan',
      customerName: 'Adnan Sami',
      customerPhone: '+880 1811-998877',
      status: 'completed',
    },
  ];

  const initialAuditLogs: AuditLogDoc[] = [
    {
      _id: 'log-1',
      storeId: 'store_001',
      userId: 'usr_admin',
      userName: 'Admin Manager',
      action: 'SYSTEM_INIT',
      details: 'Store Green Mart multi-tenant repository initialized.',
      timestamp: new Date().toISOString(),
    },
    {
      _id: 'log-2',
      storeId: 'store_002',
      userId: 'usr_owner_002',
      userName: 'Tanvir Ahmed',
      action: 'SYSTEM_INIT',
      details: 'Store Blue Electronics multi-tenant repository initialized.',
      timestamp: new Date().toISOString(),
    },
  ];

  return {
    initialStores,
    initialUsers,
    initialCategories,
    initialProducts,
    initialSales,
    initialAuditLogs,
  };
}

function saveLocalDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist local MongoDB state:', err);
  }
}

async function loadLocalDb(initialData: Awaited<ReturnType<typeof seedInitialData>>) {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);

      // Perform backward-compatibility migration to multi-tenant structure if needed
      let migrated = false;

      // Ensure stores list
      if (!parsed.stores || parsed.stores.length === 0) {
        parsed.stores = initialData.initialStores;
        migrated = true;
      } else {
        // If store doesn't have ownerId or store_002 is missing
        if (!parsed.stores[0].ownerId) {
          parsed.stores[0].ownerId = 'usr_admin';
          migrated = true;
        }
        if (!parsed.stores.find((s: StoreDoc) => s._id === 'store_002')) {
          parsed.stores.push(initialData.initialStores[1]);
          migrated = true;
        }

        // Ensure all stores have status and valid subscription
        for (const s of parsed.stores) {
          if (!s.status) {
            s.status = 'active';
            migrated = true;
          }
          if (!s.subscription) {
            s.subscription = {
              status: 'active',
              plan: s._id === 'store_002' ? 'Enterprise' : 'Professional',
              startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
              expiryDate: new Date(Date.now() + 60 * 86400000).toISOString(),
              billingCycle: s._id === 'store_002' ? 'yearly' : 'monthly',
              amount: s._id === 'store_002' ? 24000 : 2500,
              lastPaymentId: `pay_${s._id}`,
              paymentStatus: 'approved',
            };
            migrated = true;
          }
        }
      }

      // Ensure users have storeId and pinHash
      if (Array.isArray(parsed.users)) {
        for (const u of parsed.users) {
          if (!u.storeId) {
            u.storeId = 'store_001';
            migrated = true;
          }
          if (u.pin && !u.pinHash) {
            const salt = await bcrypt.genSalt(10);
            u.pinHash = await bcrypt.hash(u.pin.toString(), salt);
            delete u.pin;
            migrated = true;
          }
        }
        // Ensure store_002 users exist
        if (!parsed.users.find((u: UserDoc) => u.storeId === 'store_002')) {
          parsed.users.push(
            initialData.initialUsers[3], // owner2
            initialData.initialUsers[4]  // cashier2
          );
          migrated = true;
        }
      } else {
        parsed.users = initialData.initialUsers;
        migrated = true;
      }

      // Ensure categories have storeId
      if (!parsed.categories || !Array.isArray(parsed.categories) || typeof parsed.categories[0] === 'string') {
        parsed.categories = initialData.initialCategories;
        migrated = true;
      } else {
        for (const c of parsed.categories) {
          if (!c.storeId) {
            c.storeId = 'store_001';
            migrated = true;
          }
        }
      }

      // Ensure products have storeId
      if (Array.isArray(parsed.products)) {
        for (const p of parsed.products) {
          if (!p.storeId) {
            p.storeId = 'store_001';
            migrated = true;
          }
        }
        if (!parsed.products.find((p: ProductDoc) => p.storeId === 'store_002')) {
          const store2Products = initialData.initialProducts.filter((p) => p.storeId === 'store_002');
          parsed.products.push(...store2Products);
          migrated = true;
        }
      } else {
        parsed.products = initialData.initialProducts;
        migrated = true;
      }

      // Ensure sales have storeId
      if (Array.isArray(parsed.sales)) {
        for (const s of parsed.sales) {
          if (!s.storeId) {
            s.storeId = 'store_001';
            migrated = true;
          }
        }
      } else {
        parsed.sales = initialData.initialSales;
        migrated = true;
      }

      // Ensure audit_logs have storeId
      if (Array.isArray(parsed.audit_logs)) {
        for (const l of parsed.audit_logs) {
          if (!l.storeId) {
            l.storeId = 'store_001';
            migrated = true;
          }
        }
      } else {
        parsed.audit_logs = initialData.initialAuditLogs;
        migrated = true;
      }

      localDb = parsed;
      if (migrated) {
        saveLocalDb();
      }
      return;
    }
  } catch (err) {
    console.warn('Could not read existing local MongoDB file, initializing fresh multi-tenant structure:', err);
  }

  localDb = {
    stores: initialData.initialStores,
    users: initialData.initialUsers,
    categories: initialData.initialCategories,
    products: initialData.initialProducts,
    sales: initialData.initialSales,
    audit_logs: initialData.initialAuditLogs,
  };
  saveLocalDb();
}

// Connect to Database and create multi-tenant indexes
export async function initDatabase() {
  const initialData = await seedInitialData();

  if (MONGODB_URI && MONGODB_URI.startsWith('mongodb')) {
    try {
      console.log(`[MongoDB] Attempting connection to MongoDB URI...`);
      mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 5000,
      });
      await mongoClient.connect();
      nativeDb = mongoClient.db(DB_NAME);
      isUsingRemoteMongo = true;
      dbConnected = true;
      console.log(`[MongoDB] Connected successfully to remote MongoDB database: ${DB_NAME}`);

      // Create multi-tenant indexes
      try {
        await nativeDb.collection('users').createIndex({ storeId: 1 });
        await nativeDb.collection('users').createIndex({ email: 1 });
        await nativeDb.collection('categories').createIndex({ storeId: 1 });
        await nativeDb.collection('categories').createIndex({ storeId: 1, name: 1 });
        await nativeDb.collection('products').createIndex({ storeId: 1 });
        await nativeDb.collection('products').createIndex({ storeId: 1, sku: 1 });
        await nativeDb.collection('products').createIndex({ storeId: 1, barcode: 1 });
        await nativeDb.collection('sales').createIndex({ storeId: 1 });
        await nativeDb.collection('sales').createIndex({ storeId: 1, createdAt: -1 });
        await nativeDb.collection('audit_logs').createIndex({ storeId: 1 });
        await nativeDb.collection('audit_logs').createIndex({ storeId: 1, timestamp: -1 });
        console.log('[MongoDB] Multi-tenant indexes verified/created successfully.');
      } catch (idxErr) {
        console.warn('[MongoDB] Index creation notice:', (idxErr as Error).message);
      }

      // Seed remote collections if empty
      const userCount = await nativeDb.collection('users').countDocuments();
      if (userCount === 0) {
        console.log('[MongoDB] Seeding initial multi-tenant collections into MongoDB...');
        await (nativeDb.collection<any>('stores')).insertMany(initialData.initialStores);
        await (nativeDb.collection<any>('users')).insertMany(initialData.initialUsers);
        await (nativeDb.collection<any>('categories')).insertMany(initialData.initialCategories);
        await (nativeDb.collection<any>('products')).insertMany(initialData.initialProducts);
        await (nativeDb.collection<any>('sales')).insertMany(initialData.initialSales);
        await (nativeDb.collection<any>('audit_logs')).insertMany(initialData.initialAuditLogs);
      }
      return;
    } catch (err) {
      console.warn(
        `[MongoDB] Remote connection failed: ${(err as Error).message}. Falling back to multi-tenant embedded storage.`
      );
    }
  }

  // Fallback to embedded multi-tenant MongoDB engine
  await loadLocalDb(initialData);
  isUsingRemoteMongo = false;
  dbConnected = true;
  console.log(
    `[MongoDB] Running on multi-tenant MongoDB document storage (data/mongodb.json) with strict storeId isolation.`
  );
}

export function getDbStatus(storeId?: string) {
  if (isUsingRemoteMongo && nativeDb) {
    return {
      mode: 'remote-mongodb',
      connected: dbConnected,
      database: DB_NAME,
      storeId: storeId || 'all',
      collections: {
        stores: 'native',
        users: 'native',
        categories: 'native',
        products: 'native',
        sales: 'native',
      },
    };
  }

  return {
    mode: 'embedded-mongodb',
    connected: dbConnected,
    database: DB_NAME,
    storeId: storeId || 'all',
    collections: {
      stores: localDb.stores.length,
      users: storeId ? localDb.users.filter((u) => u.storeId === storeId).length : localDb.users.length,
      categories: storeId ? localDb.categories.filter((c) => c.storeId === storeId).length : localDb.categories.length,
      products: storeId ? localDb.products.filter((p) => p.storeId === storeId).length : localDb.products.length,
      sales: storeId ? localDb.sales.filter((s) => s.storeId === storeId).length : localDb.sales.length,
    },
  };
}

// ----------------- STORE OPERATIONS -----------------
export const StoreRepo = {
  async getStore(storeId: string): Promise<StoreDoc | null> {
    if (isUsingRemoteMongo && nativeDb) {
      return (await nativeDb.collection<any>('stores').findOne({ _id: storeId })) as StoreDoc | null;
    }
    return localDb.stores.find((s) => s._id === storeId) || null;
  },

  async updateStore(storeId: string, updates: Partial<StoreDoc>): Promise<StoreDoc | null> {
    const oldStore = await StoreRepo.getStore(storeId);
    // Security: never allow changing _id or ownerId via updateStore
    const { _id: _, ownerId: __, ...safeUpdates } = updates as any;
    const updatedAt = new Date().toISOString();

    let updatedStore: StoreDoc | null = null;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb
        .collection<any>('stores')
        .updateOne({ _id: storeId }, { $set: { ...safeUpdates, updatedAt } });
      updatedStore = await StoreRepo.getStore(storeId);
    } else {
      const idx = localDb.stores.findIndex((s) => s._id === storeId);
      if (idx !== -1) {
        localDb.stores[idx] = { ...localDb.stores[idx], ...safeUpdates, updatedAt };
        saveLocalDb();
        updatedStore = localDb.stores[idx];
      }
    }

    if (updatedStore) {
      // Trigger realtime Socket.IO notifications for this store
      if (safeUpdates.status && safeUpdates.status !== oldStore?.status) {
        if (safeUpdates.status === 'suspended') {
          emitAccountSuspended(storeId, 'Your account has been suspended. Please contact support.');
        } else if (safeUpdates.status === 'active') {
          emitAccountActivated(storeId);
        }
      }

      if (safeUpdates.subscription) {
        const sub = safeUpdates.subscription as StoreSubscription;
        if (sub.paymentStatus === 'approved' && oldStore?.subscription?.paymentStatus !== 'approved') {
          emitPaymentApproved(storeId, sub.lastPaymentId || `pay_${Date.now()}`, sub);
        } else if (sub.status === 'expired' && oldStore?.subscription?.status !== 'expired') {
          emitSubscriptionExpired(storeId);
        } else {
          emitSubscriptionUpdated(storeId, sub);
        }
      }
    }

    return updatedStore;
  },

  async suspendStore(storeId: string, reason?: string): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const currentSub = store.subscription || {
      status: 'active',
      plan: 'Professional',
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      billingCycle: 'monthly',
      amount: 2500,
    };

    const updated = await StoreRepo.updateStore(storeId, {
      status: 'suspended',
      subscription: {
        ...currentSub,
        status: 'suspended',
      },
    });

    emitAccountSuspended(storeId, reason || 'Your account has been suspended. Please contact support.');
    return updated;
  },

  async activateStore(storeId: string): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const currentSub = store.subscription || {
      status: 'active',
      plan: 'Professional',
      startDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      billingCycle: 'monthly',
      amount: 2500,
    };

    const isDateValid = new Date(currentSub.expiryDate).getTime() > Date.now();

    const updated = await StoreRepo.updateStore(storeId, {
      status: 'active',
      subscription: {
        ...currentSub,
        status: isDateValid ? 'active' : 'expired',
      },
    });

    emitAccountActivated(storeId);
    return updated;
  },

  async approvePayment(storeId: string, paymentId?: string, months = 1): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const payId = paymentId || `pay_${Date.now()}`;
    const newExpiry = new Date(Date.now() + months * 30 * 86400000).toISOString();

    const newSub: StoreSubscription = {
      plan: store.subscription?.plan || 'Professional',
      status: 'active',
      startDate: new Date().toISOString(),
      expiryDate: newExpiry,
      billingCycle: store.subscription?.billingCycle || 'monthly',
      amount: store.subscription?.amount || 2500,
      lastPaymentId: payId,
      paymentStatus: 'approved',
    };

    const updated = await StoreRepo.updateStore(storeId, {
      status: 'active',
      subscription: newSub,
    });

    emitPaymentApproved(storeId, payId, newSub);
    return updated;
  },

  async expireSubscription(storeId: string): Promise<StoreDoc | null> {
    const store = await StoreRepo.getStore(storeId);
    if (!store) return null;

    const expiredSub: StoreSubscription = {
      ...(store.subscription || {
        plan: 'Professional',
        startDate: new Date().toISOString(),
        billingCycle: 'monthly',
        amount: 2500,
      }),
      status: 'expired',
      expiryDate: new Date(Date.now() - 86400000).toISOString(), // 1 day in the past
      paymentStatus: 'pending',
    };

    const updated = await StoreRepo.updateStore(storeId, {
      subscription: expiredSub,
    });

    emitSubscriptionExpired(storeId);
    return updated;
  },

  async getAllStores(): Promise<StoreDoc[]> {
    if (isUsingRemoteMongo && nativeDb) {
      return (await nativeDb.collection<any>('stores').find({}).toArray()) as StoreDoc[];
    }
    return localDb.stores;
  },
};

// ----------------- USER REPO (STORE-SCOPED) -----------------
export const UsersRepo = {
  // Global find by email for login (reveals their storeId)
  async findByEmail(email: string): Promise<UserDoc | null> {
    if (isUsingRemoteMongo && nativeDb) {
      return (await nativeDb.collection<any>('users').findOne({
        email: { $regex: new RegExp(`^${email}$`, 'i') },
      })) as UserDoc | null;
    }
    return localDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // Find user by PIN comparison (supports direct terminal PIN login across users)
  async findByPin(pin: string, storeId?: string): Promise<UserDoc | null> {
    let candidateUsers: UserDoc[] = [];

    if (isUsingRemoteMongo && nativeDb) {
      const filter: any = { status: 'active' };
      if (storeId) filter.storeId = storeId;
      candidateUsers = await nativeDb.collection<any>('users').find(filter).toArray();
    } else {
      candidateUsers = localDb.users.filter(
        (u) => u.status === 'active' && (!storeId || u.storeId === storeId)
      );
    }

    for (const candidate of candidateUsers) {
      if (candidate.pinHash) {
        const matches = await bcrypt.compare(pin, candidate.pinHash);
        if (matches) return candidate;
      } else if ((candidate as any).pin && (candidate as any).pin === pin) {
        // Migrate legacy plaintext pin to pinHash on the fly
        const salt = await bcrypt.genSalt(10);
        const pinHash = await bcrypt.hash(pin, salt);
        await UsersRepo.update(candidate.storeId, candidate._id, { pinHash });
        return { ...candidate, pinHash };
      }
    }
    return null;
  },

  async findById(id: string): Promise<UserDoc | null> {
    if (isUsingRemoteMongo && nativeDb) {
      return (await nativeDb.collection<any>('users').findOne({ _id: id })) as UserDoc | null;
    }
    return localDb.users.find((u) => u._id === id) || null;
  },

  // Scoped strictly to storeId
  async getAll(storeId: string): Promise<Omit<UserDoc, 'passwordHash' | 'pinHash'>[]> {
    if (isUsingRemoteMongo && nativeDb) {
      const users = await nativeDb.collection<any>('users').find({ storeId }).toArray();
      return users.map(({ passwordHash: _, pinHash: __, ...rest }: any) => rest);
    }
    return localDb.users
      .filter((u) => u.storeId === storeId)
      .map(({ passwordHash: _, pinHash: __, ...rest }) => rest);
  },

  async create(user: Omit<UserDoc, '_id' | 'createdAt'>): Promise<UserDoc> {
    const newDoc: UserDoc = {
      ...user,
      _id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('users').insertOne(newDoc);
    } else {
      localDb.users.push(newDoc);
      saveLocalDb();
    }
    return newDoc;
  },

  // Update scoped to storeId
  async update(storeId: string, id: string, updates: Partial<UserDoc>): Promise<UserDoc | null> {
    const { _id: _, storeId: __, ...safeUpdates } = updates as any;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('users').updateOne({ _id: id, storeId }, { $set: safeUpdates });
      return UsersRepo.findById(id);
    }

    const idx = localDb.users.findIndex((u) => u._id === id && u.storeId === storeId);
    if (idx === -1) return null;
    localDb.users[idx] = { ...localDb.users[idx], ...safeUpdates };
    saveLocalDb();
    return localDb.users[idx];
  },

  // Delete scoped to storeId
  async delete(storeId: string, id: string): Promise<boolean> {
    if (isUsingRemoteMongo && nativeDb) {
      const res = await nativeDb.collection<any>('users').deleteOne({ _id: id, storeId });
      return (res.deletedCount || 0) > 0;
    }

    const lenBefore = localDb.users.length;
    localDb.users = localDb.users.filter((u) => !(u._id === id && u.storeId === storeId));
    saveLocalDb();
    return localDb.users.length < lenBefore;
  },
};

// ----------------- CATEGORIES REPO (STORE-SCOPED) -----------------
export const CategoriesRepo = {
  async getAll(storeId: string): Promise<string[]> {
    if (isUsingRemoteMongo && nativeDb) {
      const docs = await nativeDb.collection<any>('categories').find({ storeId }).toArray();
      return docs.map((d: any) => d.name);
    }
    return localDb.categories.filter((c) => c.storeId === storeId).map((c) => c.name);
  },

  async create(storeId: string, name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty');

    if (isUsingRemoteMongo && nativeDb) {
      const existing = await nativeDb.collection<any>('categories').findOne({
        storeId,
        name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
      });
      if (!existing) {
        await nativeDb.collection<any>('categories').insertOne({
          _id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          storeId,
          name: trimmed,
          createdAt: new Date().toISOString(),
        });
      }
      return trimmed;
    }

    const exists = localDb.categories.some(
      (c) => c.storeId === storeId && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      localDb.categories.push({
        _id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        storeId,
        name: trimmed,
        createdAt: new Date().toISOString(),
      });
      saveLocalDb();
    }
    return trimmed;
  },

  async delete(storeId: string, name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('categories').deleteOne({
        storeId,
        name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
      });
      return true;
    }

    localDb.categories = localDb.categories.filter(
      (c) => !(c.storeId === storeId && c.name.toLowerCase() === trimmed.toLowerCase())
    );
    saveLocalDb();
    return true;
  },
};

// ----------------- PRODUCTS REPO (STORE-SCOPED) -----------------
export const ProductsRepo = {
  async getAll(storeId: string): Promise<ProductDoc[]> {
    if (isUsingRemoteMongo && nativeDb) {
      return await nativeDb.collection<any>('products').find({ storeId }).toArray();
    }
    return localDb.products.filter((p) => p.storeId === storeId);
  },

  async findById(storeId: string, id: string): Promise<ProductDoc | null> {
    if (isUsingRemoteMongo && nativeDb) {
      return (await nativeDb.collection<any>('products').findOne({ _id: id, storeId })) as ProductDoc | null;
    }
    return localDb.products.find((p) => p._id === id && p.storeId === storeId) || null;
  },

  async create(prod: Omit<ProductDoc, '_id'>): Promise<ProductDoc> {
    const newDoc: ProductDoc = {
      ...prod,
      _id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('products').insertOne(newDoc);
    } else {
      localDb.products.push(newDoc);
      saveLocalDb();
    }
    return newDoc;
  },

  async update(storeId: string, id: string, updates: Partial<ProductDoc>): Promise<ProductDoc | null> {
    const { _id: _, storeId: __, ...safeUpdates } = updates as any;
    const updatedAt = new Date().toISOString();

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb
        .collection<any>('products')
        .updateOne({ _id: id, storeId }, { $set: { ...safeUpdates, updatedAt } });
      return ProductsRepo.findById(storeId, id);
    }

    const idx = localDb.products.findIndex((p) => p._id === id && p.storeId === storeId);
    if (idx === -1) return null;
    localDb.products[idx] = { ...localDb.products[idx], ...safeUpdates, updatedAt };
    saveLocalDb();
    return localDb.products[idx];
  },

  async adjustStock(storeId: string, id: string, newStock: number): Promise<ProductDoc | null> {
    return ProductsRepo.update(storeId, id, { stock: Math.max(0, newStock) });
  },

  async decrementStock(storeId: string, id: string, qty: number): Promise<ProductDoc | null> {
    const prod = await ProductsRepo.findById(storeId, id);
    if (!prod) throw new Error(`Product ${id} not found in store.`);
    if (prod.stock < qty) {
      throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock}, Requested: ${qty}`);
    }
    return ProductsRepo.update(storeId, id, { stock: prod.stock - qty });
  },

  async incrementStock(storeId: string, id: string, qty: number): Promise<ProductDoc | null> {
    const prod = await ProductsRepo.findById(storeId, id);
    if (!prod) return null;
    return ProductsRepo.update(storeId, id, { stock: prod.stock + qty });
  },

  async delete(storeId: string, id: string): Promise<boolean> {
    if (isUsingRemoteMongo && nativeDb) {
      const res = await nativeDb.collection<any>('products').deleteOne({ _id: id, storeId });
      return (res.deletedCount || 0) > 0;
    }

    const lenBefore = localDb.products.length;
    localDb.products = localDb.products.filter((p) => !(p._id === id && p.storeId === storeId));
    saveLocalDb();
    return localDb.products.length < lenBefore;
  },
};

// ----------------- SALES REPO (STORE-SCOPED) -----------------
export const SalesRepo = {
  async getAll(storeId: string): Promise<SaleDoc[]> {
    if (isUsingRemoteMongo && nativeDb) {
      return await nativeDb
        .collection<any>('sales')
        .find({ storeId })
        .sort({ createdAt: -1 })
        .toArray();
    }
    return [...localDb.sales]
      .filter((s) => s.storeId === storeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async findById(storeId: string, id: string): Promise<SaleDoc | null> {
    if (isUsingRemoteMongo && nativeDb) {
      return (await nativeDb.collection<any>('sales').findOne({ _id: id, storeId })) as SaleDoc | null;
    }
    return localDb.sales.find((s) => s._id === id && s.storeId === storeId) || null;
  },

  async create(sale: Omit<SaleDoc, '_id'>): Promise<SaleDoc> {
    if (!sale.storeId) {
      throw new Error('storeId is required to complete sale.');
    }

    // Step 1: Pre-verify that all items exist in this store and have sufficient stock
    for (const item of sale.items) {
      const prod = await ProductsRepo.findById(sale.storeId, item.productId);
      if (!prod) {
        throw new Error(`Product "${item.productName}" does not belong to store ${sale.storeId}.`);
      }
      if (prod.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Available: ${prod.stock}, Requested: ${item.quantity}`
        );
      }
    }

    // Step 2: Decrement inventory safely for this store
    for (const item of sale.items) {
      await ProductsRepo.decrementStock(sale.storeId, item.productId, item.quantity);
    }

    const newDoc: SaleDoc = {
      ...sale,
      _id: `sale_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('sales').insertOne(newDoc);
    } else {
      localDb.sales.unshift(newDoc);
      saveLocalDb();
    }
    return newDoc;
  },

  async refund(storeId: string, id: string): Promise<SaleDoc | null> {
    let sale = await SalesRepo.findById(storeId, id);
    if (!sale || sale.status === 'refunded') return null;

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('sales').updateOne({ _id: id, storeId }, { $set: { status: 'refunded' } });
      sale.status = 'refunded';
    } else {
      const found = localDb.sales.find((s) => s._id === id && s.storeId === storeId);
      if (!found || found.status === 'refunded') return null;
      found.status = 'refunded';
      saveLocalDb();
      sale = found;
    }

    // Restore stock safely for this store's inventory
    for (const item of sale.items) {
      await ProductsRepo.incrementStock(storeId, item.productId, item.quantity);
    }
    return sale;
  },
};

// ----------------- AUDIT REPO (STORE-SCOPED) -----------------
export const AuditRepo = {
  async log(entry: Omit<AuditLogDoc, '_id' | 'timestamp'>): Promise<AuditLogDoc> {
    const newDoc: AuditLogDoc = {
      ...entry,
      _id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };

    if (isUsingRemoteMongo && nativeDb) {
      await nativeDb.collection<any>('audit_logs').insertOne(newDoc);
    } else {
      localDb.audit_logs.unshift(newDoc);
      saveLocalDb();
    }
    return newDoc;
  },

  async getRecent(storeId: string, limit = 30): Promise<AuditLogDoc[]> {
    if (isUsingRemoteMongo && nativeDb) {
      return await nativeDb
        .collection<any>('audit_logs')
        .find({ storeId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    }
    return localDb.audit_logs.filter((l) => l.storeId === storeId).slice(0, limit);
  },
};
