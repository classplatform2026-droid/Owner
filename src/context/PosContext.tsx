import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  CartItem,
  Sale,
  StoreInfo,
  StaffUser,
  PaymentMethod,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_STORE_INFO,
  STAFF_USERS,
  STORE_PRESETS,
} from '../data/mockData';
import { api, DbStatusResponse, setStoredToken, getStoredToken } from '../services/api';

export type ScreenType = 'dashboard' | 'pos' | 'products' | 'sales' | 'settings';

interface PosContextType {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
  storeInfo: StoreInfo;
  currentUser: StaffUser | null;
  staffUsers: StaffUser[];
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  isMobileCartOpen: boolean;
  setIsMobileCartOpen: (open: boolean) => void;
  selectedSaleForReceipt: Sale | null;
  setSelectedSaleForReceipt: (sale: Sale | null) => void;
  dbStatus: DbStatusResponse | null;
  isLoading: boolean;

  // Cart Actions
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Checkout & Discount
  discountType: 'percentage' | 'flat';
  discountValue: number;
  setDiscount: (type: 'percentage' | 'flat', value: number) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  cashReceived: string;
  setCashReceived: (val: string) => void;

  // Calculated values
  cartSubtotal: number;
  discountAmount: number;
  cartTaxAmount: number;
  cartTotal: number;
  cartItemCount: number;

  // POS Complete
  completeSale: (customerInfo?: { name?: string; phone?: string }) => Promise<Sale | null>;

  // Category management
  categories: string[];
  addCategory: (name: string) => Promise<string>;
  deleteCategory: (name: string) => Promise<void>;

  // Product management
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, newStock: number) => Promise<void>;

  // Store & Settings
  updateStoreInfo: (info: Partial<StoreInfo>) => Promise<void>;
  switchStorePreset: (storeKey: 'grocery' | 'fashion' | 'electronics') => void;
  switchStaffUser: (user: StaffUser) => void;
  logoutUser: () => void;
  loginUser: (user: StaffUser) => void;
  loginWithCredentials: (creds: { identifier?: string; password?: string; pin?: string }) => Promise<boolean>;
  refundSale: (saleId: string) => Promise<void>;
  resetToDemoData: () => void;

  // Authority & RBAC management
  fetchStaffUsers: () => Promise<void>;
  createStaffUser: (payload: {
    name: string;
    email: string;
    password?: string;
    pin?: string;
    role: string;
    permissions?: string[];
    phone?: string;
  }) => Promise<void>;
  updateStaffUser: (
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
  ) => Promise<void>;
  deleteStaffUser: (id: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;

  // Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playBeep: (type?: 'beep' | 'success' | 'delete') => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(INITIAL_STORE_INFO);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(STAFF_USERS);
  const [categories, setCategories] = useState<string[]>([
    'Grocery',
    'Beverages',
    'Snacks',
    'Electronics',
    'Fashion',
    'Household',
    'Personal Care',
    'Dairy & Eggs',
    'Bakery',
  ]);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    try {
      const saved = localStorage.getItem('shoppos_current_user');
      return saved ? JSON.parse(saved) : STAFF_USERS[0];
    } catch {
      return STAFF_USERS[0];
    }
  });

  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('flat');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync session & load from backend
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch DB status
      api.getDbStatus().then(setDbStatus).catch(() => {});

      // Fetch Store
      api.getStore().then((res) => {
        if (res.store) setStoreInfo(res.store);
      }).catch(() => {});

      // Fetch Categories
      api.getCategories().then((res) => {
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
      }).catch(() => {});

      // Fetch Products
      api.getProducts().then((res) => {
        if (res.products && res.products.length > 0) {
          setProducts(res.products);
        }
      }).catch(() => {});

      // Fetch Sales
      api.getSales().then((res) => {
        if (res.sales && res.sales.length > 0) {
          setSales(res.sales);
        }
      }).catch(() => {});

      // If user is logged in, check profile & load users list
      if (getStoredToken()) {
        api.getMe().then((res) => {
          if (res.user) {
            const normalizedUser: StaffUser = {
              id: res.user._id,
              storeId: res.user.storeId,
              name: res.user.name,
              email: res.user.email,
              role: res.user.role,
              avatarInitials: res.user.name.charAt(0).toUpperCase(),
              pin: res.user.pin,
              permissions: res.user.permissions,
              status: res.user.status,
              phone: res.user.phone,
              lastLogin: res.user.lastLogin,
            };
            setCurrentUser(normalizedUser);
          }
        }).catch(() => {});

        api.getUsers().then((res) => {
          if (res.users && res.users.length > 0) {
            const mapped = res.users.map((u) => ({
              id: u._id,
              storeId: u.storeId,
              name: u.name,
              email: u.email,
              role: u.role,
              avatarInitials: u.name.charAt(0).toUpperCase(),
              pin: u.pin,
              permissions: u.permissions,
              status: u.status,
              phone: u.phone,
              lastLogin: u.lastLogin,
            }));
            setStaffUsers(mapped);
          }
        }).catch(() => {});
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Audio tone generator
  const playBeep = (type: 'beep' | 'success' | 'delete' = 'beep') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {}
  };

  // Cart Calculations
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const discountAmount =
    discountType === 'percentage'
      ? Math.round((cartSubtotal * Math.min(100, Math.max(0, discountValue))) / 100)
      : Math.min(cartSubtotal, Math.max(0, discountValue));

  const amountAfterDiscount = Math.max(0, cartSubtotal - discountAmount);
  const cartTaxAmount = Math.round((amountAfterDiscount * storeInfo.taxRate) / 100);
  const cartTotal = amountAfterDiscount + cartTaxAmount;
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Cart Functions
  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) return;
    playBeep('beep');
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
  };

  const removeFromCart = (productId: string) => {
    playBeep('delete');
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const setCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity: Math.min(item.product.stock, quantity),
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setCashReceived('');
  };

  const setDiscount = (type: 'percentage' | 'flat', value: number) => {
    setDiscountType(type);
    setDiscountValue(value);
  };

  // Check RBAC permission helper
  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SuperAdmin') return true;
    return currentUser.permissions?.includes(permission) ?? false;
  };

  // Complete Sale
  const completeSale = async (customerInfo?: { name?: string; phone?: string }): Promise<Sale | null> => {
    if (cart.length === 0) return null;

    const receivedNum = cashReceived ? parseFloat(cashReceived) : undefined;
    const changeGiven = receivedNum && receivedNum >= cartTotal ? receivedNum - cartTotal : 0;
    const nextInvoiceNo = (1000 + sales.length + 1).toString();

    const salePayload = {
      invoiceNo: nextInvoiceNo,
      createdAt: new Date().toISOString(),
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
      })),
      subtotal: cartSubtotal,
      discountType,
      discountValue,
      discountAmount,
      taxAmount: cartTaxAmount,
      total: cartTotal,
      paymentMethod,
      amountReceived: receivedNum,
      changeGiven,
      cashierName: currentUser?.name || 'Cashier',
      customerName: customerInfo?.name,
      customerPhone: customerInfo?.phone,
      status: 'completed' as const,
    };

    try {
      const res = await api.createSale(salePayload);
      const created = res.sale;

      // Update state
      setSales((prev) => [created, ...prev]);

      // Deduct stock locally
      setProducts((prev) =>
        prev.map((p) => {
          const cartItem = cart.find((item) => item.product.id === p.id);
          if (cartItem) {
            return {
              ...p,
              stock: Math.max(0, p.stock - cartItem.quantity),
            };
          }
          return p;
        })
      );

      clearCart();
      setIsMobileCartOpen(false);
      playBeep('success');
      setSelectedSaleForReceipt(created);
      return created;
    } catch (err) {
      // Local fallback if offline
      const fallbackSale: Sale = {
        ...salePayload,
        id: `sale-${Date.now()}`,
      };
      setSales((prev) => [fallbackSale, ...prev]);
      setProducts((prev) =>
        prev.map((p) => {
          const cartItem = cart.find((item) => item.product.id === p.id);
          if (cartItem) {
            return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
          }
          return p;
        })
      );
      clearCart();
      setIsMobileCartOpen(false);
      playBeep('success');
      setSelectedSaleForReceipt(fallbackSale);
      return fallbackSale;
    }
  };

  // Products CRUD
  const addProduct = async (newProdData: Omit<Product, 'id'>) => {
    try {
      const res = await api.createProduct(newProdData);
      setProducts((prev) => [res.product, ...prev]);
    } catch {
      const localProd: Product = {
        ...newProdData,
        id: `prod-${Date.now()}`,
      };
      setProducts((prev) => [localProd, ...prev]);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const res = await api.updateProduct(id, updates);
      setProducts((prev) => prev.map((p) => (p.id === id ? res.product : p)));
    } catch {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
    } catch {}
    setProducts((prev) => prev.filter((p) => p.id !== id));
    removeFromCart(id);
  };

  const adjustStock = async (id: string, newStock: number) => {
    try {
      const res = await api.adjustStock(id, newStock);
      setProducts((prev) => prev.map((p) => (p.id === id ? res.product : p)));
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, newStock) } : p))
      );
    }
  };

  const addCategory = async (name: string): Promise<string> => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    try {
      const res = await api.createCategory(trimmed);
      setCategories((prev) => (prev.includes(res.category) ? prev : [...prev, res.category]));
      return res.category;
    } catch {
      setCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      return trimmed;
    }
  };

  const deleteCategory = async (name: string): Promise<void> => {
    try {
      await api.deleteCategory(name);
    } catch {}
    setCategories((prev) => prev.filter((c) => c !== name));
  };

  const updateStoreInfo = async (updates: Partial<StoreInfo>) => {
    try {
      const res = await api.updateStore(updates);
      setStoreInfo(res.store);
    } catch {
      setStoreInfo((prev) => ({ ...prev, ...updates }));
    }
  };

  const switchStorePreset = (storeKey: 'grocery' | 'fashion' | 'electronics') => {
    const preset = STORE_PRESETS[storeKey];
    if (preset) {
      const updated = { ...storeInfo, ...preset };
      setStoreInfo(updated);
      api.updateStore(updated).catch(() => {});
    }
  };

  // Staff & RBAC
  const fetchStaffUsers = async () => {
    try {
      const res = await api.getUsers();
      if (res.users) {
        setStaffUsers(
          res.users.map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            avatarInitials: u.name.charAt(0).toUpperCase(),
            pin: u.pin,
            permissions: u.permissions,
            status: u.status,
            phone: u.phone,
            lastLogin: u.lastLogin,
          }))
        );
      }
    } catch (err) {
      console.warn('Could not fetch staff users', err);
    }
  };

  const createStaffUser = async (payload: {
    name: string;
    email: string;
    password?: string;
    pin?: string;
    role: string;
    permissions?: string[];
    phone?: string;
  }) => {
    const res = await api.createUser(payload);
    const newStaff: StaffUser = {
      id: res.user._id,
      storeId: res.user.storeId,
      name: res.user.name,
      email: res.user.email,
      role: res.user.role,
      avatarInitials: res.user.name.charAt(0).toUpperCase(),
      pin: res.user.pin,
      permissions: res.user.permissions,
      status: res.user.status,
      phone: res.user.phone,
    };
    setStaffUsers((prev) => [...prev, newStaff]);
  };

  const updateStaffUser = async (
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
  ) => {
    const res = await api.updateUser(id, updates);
    setStaffUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              name: res.user.name,
              role: res.user.role,
              permissions: res.user.permissions,
              status: res.user.status,
              pin: res.user.pin,
              phone: res.user.phone,
            }
          : u
      )
    );
    if (currentUser?.id === id) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              name: res.user.name,
              role: res.user.role,
              permissions: res.user.permissions,
              status: res.user.status,
              pin: res.user.pin,
            }
          : null
      );
    }
  };

  const deleteStaffUser = async (id: string) => {
    await api.deleteUser(id);
    setStaffUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const switchStaffUser = (user: StaffUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('shoppos_current_user', JSON.stringify(user));
    } catch {}
  };

  const loginUser = (user: StaffUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('shoppos_current_user', JSON.stringify(user));
    } catch {}
  };

  const loginWithCredentials = async (creds: {
    identifier?: string;
    password?: string;
    pin?: string;
  }): Promise<boolean> => {
    try {
      const data = await api.login(creds);
      const loggedUser: StaffUser = {
        id: data.user._id,
        storeId: data.user.storeId,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatarInitials: data.user.name.charAt(0).toUpperCase(),
        pin: data.user.pin,
        permissions: data.user.permissions,
        status: data.user.status,
        phone: data.user.phone,
        lastLogin: data.user.lastLogin,
      };
      loginUser(loggedUser);
      fetchAllData();
      return true;
    } catch (err) {
      // Local fallback for offline/demo if API request fails
      const matched = staffUsers.find(
        (u) =>
          (creds.identifier && u.email.toLowerCase() === creds.identifier.toLowerCase()) ||
          (creds.pin && u.pin === creds.pin)
      );
      if (matched) {
        loginUser(matched);
        return true;
      }
      throw err;
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setStoredToken(null);
    try {
      localStorage.removeItem('shoppos_current_user');
    } catch {}
  };

  const refundSale = async (saleId: string) => {
    try {
      const res = await api.refundSale(saleId);
      setSales((prev) => prev.map((s) => (s.id === saleId ? res.sale : s)));
      // Refresh products stock
      const prodRes = await api.getProducts();
      setProducts(prodRes.products);
    } catch {
      // Local fallback
      const targetSale = sales.find((s) => s.id === saleId);
      if (!targetSale || targetSale.status === 'refunded') return;
      setProducts((prev) =>
        prev.map((p) => {
          const item = targetSale.items.find((i) => i.productId === p.id);
          if (item) return { ...p, stock: p.stock + item.quantity };
          return p;
        })
      );
      setSales((prev) =>
        prev.map((s) => (s.id === saleId ? { ...s, status: 'refunded' } : s))
      );
    }
  };

  const resetToDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setStoreInfo(INITIAL_STORE_INFO);
    setCurrentUser(STAFF_USERS[0]);
    clearCart();
  };

  return (
    <PosContext.Provider
      value={{
        products,
        cart,
        sales,
        storeInfo,
        currentUser,
        staffUsers,
        activeScreen,
        setActiveScreen,
        isMobileCartOpen,
        setIsMobileCartOpen,
        selectedSaleForReceipt,
        setSelectedSaleForReceipt,
        dbStatus,
        isLoading,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        setCartQuantity,
        clearCart,
        discountType,
        discountValue,
        setDiscount,
        paymentMethod,
        setPaymentMethod,
        cashReceived,
        setCashReceived,
        cartSubtotal,
        discountAmount,
        cartTaxAmount,
        cartTotal,
        cartItemCount,
        completeSale,
        categories,
        addCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        updateStoreInfo,
        switchStorePreset,
        switchStaffUser,
        logoutUser,
        loginUser,
        loginWithCredentials,
        refundSale,
        resetToDemoData,
        fetchStaffUsers,
        createStaffUser,
        updateStaffUser,
        deleteStaffUser,
        hasPermission,
        soundEnabled,
        setSoundEnabled,
        playBeep,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};
