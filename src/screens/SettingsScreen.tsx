import React, { useState, useEffect } from 'react';
import {
  Store,
  Users,
  Printer,
  ShieldCheck,
  RotateCcw,
  Check,
  ChevronRight,
  Shield,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Database,
  Lock,
  Mail,
  UserCheck,
  AlertCircle,
  Activity,
  Save,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { StaffUser } from '../types';
import { api } from '../services/api';

const AVAILABLE_PERMISSIONS: { key: string; label: string; desc: string }[] = [
  { key: 'pos.checkout', label: 'Process Checkout', desc: 'Can add items to cart and complete sales' },
  { key: 'pos.discount', label: 'Apply Discounts', desc: 'Can give item/order level discounts' },
  { key: 'products.create', label: 'Add Products', desc: 'Can create new items in inventory' },
  { key: 'products.edit', label: 'Edit Products', desc: 'Can update prices, barcodes and descriptions' },
  { key: 'products.stock', label: 'Adjust Stock', desc: 'Can restock and update inventory quantities' },
  { key: 'products.delete', label: 'Delete Products', desc: 'Can delete items from catalog' },
  { key: 'sales.view', label: 'View Sales History', desc: 'Can inspect past invoices and receipts' },
  { key: 'sales.refund', label: 'Issue Refunds', desc: 'Can refund sales and restock items' },
  { key: 'staff.manage', label: 'Manage Staff & RBAC', desc: 'Can create/modify user authority' },
  { key: 'settings.update', label: 'Store Settings', desc: 'Can modify store profile and tax rate' },
];

export const SettingsScreen: React.FC = () => {
  const {
    storeInfo,
    updateStoreInfo,
    switchStorePreset,
    currentUser,
    staffUsers,
    fetchStaffUsers,
    createStaffUser,
    updateStaffUser,
    deleteStaffUser,
    dbStatus,
    soundEnabled,
    setSoundEnabled,
    socketConnected,
  } = usePos();

  const [activeTab, setActiveTab] = useState<
    'store' | 'authority' | 'database' | 'printer' | 'presets' | 'subscription'
  >('authority');

  // Form states for Store
  const [storeName, setStoreName] = useState(storeInfo.name);
  const [branch, setBranch] = useState(storeInfo.branch);
  const [phone, setPhone] = useState(storeInfo.phone);
  const [address, setAddress] = useState(storeInfo.address);
  const [currency, setCurrency] = useState(storeInfo.currency);
  const [taxRate, setTaxRate] = useState(storeInfo.taxRate.toString());
  const [receiptFooter, setReceiptFooter] = useState(storeInfo.receiptFooter);
  const [printerSize, setPrinterSize] = useState(storeInfo.printerSize);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // User Authority Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffPin, setStaffPin] = useState('1234');
  const [staffRole, setStaffRole] = useState<'Admin' | 'Manager' | 'Cashier'>('Cashier');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['pos.checkout', 'sales.view']);
  const [staffStatus, setStaffStatus] = useState<'active' | 'suspended'>('active');
  const [staffPhone, setStaffPhone] = useState('');
  const [userModalError, setUserModalError] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchStaffUsers();
    api.getAuditLogs().then((res) => setAuditLogs(res.logs || [])).catch(() => {});
  }, [fetchStaffUsers]);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStoreInfo({
      name: storeName,
      branch,
      phone,
      address,
      currency,
      taxRate: parseFloat(taxRate) || 0,
      receiptFooter,
      printerSize,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const openAddUser = () => {
    setEditingStaff(null);
    setStaffName('');
    setStaffEmail('');
    setStaffPassword('password123');
    setStaffPin('1234');
    setStaffRole('Cashier');
    setSelectedPermissions(['pos.checkout', 'sales.view']);
    setStaffStatus('active');
    setStaffPhone('');
    setUserModalError('');
    setUserModalOpen(true);
  };

  const openEditUser = (user: StaffUser) => {
    setEditingStaff(user);
    setStaffName(user.name);
    setStaffEmail(user.email);
    setStaffPassword('');
    setStaffPin(user.pin || '');
    setStaffRole(user.role as any);
    setSelectedPermissions(user.permissions || ['pos.checkout', 'sales.view']);
    setStaffStatus(user.status || 'active');
    setStaffPhone(user.phone || '');
    setUserModalError('');
    setUserModalOpen(true);
  };

  const handleRoleChange = (role: 'Admin' | 'Manager' | 'Cashier') => {
    setStaffRole(role);
    if (role === 'Admin') {
      setSelectedPermissions(AVAILABLE_PERMISSIONS.map((p) => p.key));
    } else if (role === 'Manager') {
      setSelectedPermissions([
        'pos.checkout',
        'pos.discount',
        'products.create',
        'products.edit',
        'products.stock',
        'sales.view',
        'sales.refund',
      ]);
    } else {
      setSelectedPermissions(['pos.checkout', 'sales.view']);
    }
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError('');

    try {
      if (editingStaff) {
        await updateStaffUser(editingStaff.id, {
          name: staffName,
          role: staffRole,
          permissions: selectedPermissions,
          status: staffStatus,
          pin: staffPin,
          phone: staffPhone,
          ...(staffPassword ? { password: staffPassword } : {}),
        });
      } else {
        await createStaffUser({
          name: staffName,
          email: staffEmail,
          password: staffPassword || 'password123',
          pin: staffPin,
          role: staffRole,
          permissions: selectedPermissions,
          phone: staffPhone,
        });
      }
      setUserModalOpen(false);
      fetchStaffUsers();
      api.getAuditLogs().then((res) => setAuditLogs(res.logs || [])).catch(() => {});
    } catch (err) {
      setUserModalError((err as Error).message || 'Failed to save staff authority.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Settings & User Authority
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage MongoDB collections, Role-Based Access Control (RBAC), and store configs
          </p>
        </div>

        {/* MongoDB Status Banner */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>MongoDB Persistence Active</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Navigation list */}
        <div className="md:col-span-4 space-y-1.5">
          {[
            {
              id: 'authority',
              label: 'User Authority & RBAC',
              desc: `${staffUsers.length} staff roles in MongoDB`,
              icon: ShieldCheck,
            },
            {
              id: 'database',
              label: 'MongoDB Database',
              desc: `${dbStatus?.mode || 'Active'} · Collections`,
              icon: Database,
            },
            {
              id: 'store',
              label: 'Shop Information',
              desc: `${storeInfo.name} · ${storeInfo.branch}`,
              icon: Store,
            },
            {
              id: 'printer',
              label: 'Printer Settings',
              desc: `Format: ${storeInfo.printerSize}`,
              icon: Printer,
            },
            {
              id: 'subscription',
              label: 'Subscription & Realtime',
              desc: `${storeInfo.subscription?.plan || 'Pro'} · ${storeInfo.subscription?.status || 'Active'}`,
              icon: Activity,
            },
            {
              id: 'presets',
              label: 'Store Type Presets',
              desc: 'Grocery, Fashion, Electronics',
              icon: Shield,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-white hover:bg-slate-100/80 text-slate-700 border border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate">{item.label}</p>
                    <p
                      className={`text-[11px] truncate ${
                        isActive ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                />
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
          {/* User Authority & RBAC Tab */}
          {activeTab === 'authority' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    User Authority & Permissions (MongoDB RBAC)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Roles, permissions, and terminal credentials persisted in MongoDB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAddUser}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Staff Member</span>
                </button>
              </div>

              {/* Staff Table / Cards */}
              <div className="space-y-3">
                {staffUsers.map((staff) => {
                  const isCurrent = currentUser?.id === staff.id;
                  const isSuspended = staff.status === 'suspended';

                  return (
                    <div
                      key={staff.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/30'
                          : isSuspended
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-slate-200/80 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : staff.role === 'SuperAdmin'
                              ? 'bg-purple-600 text-white'
                              : staff.role === 'Manager'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {staff.avatarInitials}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {staff.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                staff.role === 'SuperAdmin'
                                  ? 'bg-purple-100 text-purple-700'
                                  : staff.role === 'Admin'
                                  ? 'bg-blue-100 text-blue-700'
                                  : staff.role === 'Manager'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {staff.role}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                                Current
                              </span>
                            )}
                            {isSuspended && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                Suspended
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500">
                            <span>{staff.email}</span>
                            <span className="mx-1.5">·</span>
                            <span className="font-mono text-slate-400">PIN: {staff.pin}</span>
                            {staff.phone && (
                              <>
                                <span className="mx-1.5">·</span>
                                <span>{staff.phone}</span>
                              </>
                            )}
                          </div>

                          {/* Permission chips */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(staff.permissions || []).slice(0, 4).map((perm) => (
                              <span
                                key={perm}
                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono"
                              >
                                {perm}
                              </span>
                            ))}
                            {(staff.permissions || []).length > 4 && (
                              <span className="text-[10px] text-slate-400 px-1 py-0.5">
                                +{(staff.permissions || []).length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditUser(staff)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Authority</span>
                        </button>
                        {staff.role !== 'SuperAdmin' && !isCurrent && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Delete user ${staff.name}?`)) {
                                await deleteStaffUser(staff.id);
                              }
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MongoDB Database Console Tab */}
          {activeTab === 'database' && (
            <div className="space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">
                  MongoDB Status & Audit Logs
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspection details for document database collections and recent administrative actions
                </p>
              </div>

              {/* Status card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-800 text-sm">
                      Database: {dbStatus?.database || 'shoppos'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                    {dbStatus?.mode === 'remote-mongodb' ? 'MongoDB Atlas' : 'Embedded MongoDB Engine'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">users collection</span>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {staffUsers.length} docs
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">products collection</span>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {dbStatus?.collections.products || '12'} docs
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">sales collection</span>
                    <span className="font-mono font-bold text-base text-slate-900">
                      {dbStatus?.collections.sales || '5'} docs
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 pt-1">
                  Tip: Provide <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">MONGODB_URI</code> in environment variables to sync directly with your MongoDB Atlas or remote cluster.
                </p>
              </div>

              {/* Audit Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recent MongoDB Audit Events</span>
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">No logs yet.</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log._id} className="p-3 bg-white text-xs flex justify-between gap-3">
                        <div>
                          <span className="font-mono font-bold text-blue-600 text-[11px]">
                            {log.action}
                          </span>
                          <span className="text-slate-600 ml-2">{log.details}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Shop Information Tab */}
          {activeTab === 'store' && (
            <form onSubmit={handleSaveStore} className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Shop Information</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This appears on printed receipts and customer invoices
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Branch / Outlet
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="৳">৳ (BDT Taka)</option>
                    <option value="$">$ (USD Dollar)</option>
                    <option value="₹">₹ (INR Rupee)</option>
                    <option value="€">€ (EUR Euro)</option>
                    <option value="£">£ (GBP Pound)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tax / VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Receipt Footer Note
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                {savedSuccess ? (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Changes saved to MongoDB!
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </form>
          )}

          {/* Printer Settings Tab */}
          {activeTab === 'printer' && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Receipt Printer Settings</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure thermal POS printer paper roll size and behavior
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Paper Roll Standard
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: '80mm', title: '80mm Thermal', desc: 'Standard POS receipt' },
                    { id: '58mm', title: '58mm Thermal', desc: 'Compact portable' },
                    { id: 'A4', title: 'A4 Document', desc: 'Full page invoice' },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => {
                        setPrinterSize(size.id as '80mm' | '58mm' | 'A4');
                        updateStoreInfo({
                          printerSize: size.id as '80mm' | '58mm' | 'A4',
                        });
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        printerSize === size.id
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Printer className="w-5 h-5 mb-1 text-blue-600" />
                      <p className="text-xs font-bold">{size.title}</p>
                      <p className="text-[10px] text-slate-400">{size.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Audio Beep on Sale & Scan</p>
                  <p className="text-[11px] text-slate-400">
                    Play checkout audio chime when scanning or finishing sales
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    soundEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>
          )}

          {/* Presets Tab */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Store Type Presets</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Instantly reconfigure ShopPOS for grocery, fashion, or electronics retail
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    key: 'grocery',
                    name: 'Green Mart',
                    type: 'Grocery & Supermarket',
                    desc: 'Default catalog with Rice, Cooking Oil, Sugar, Lentils, Tea, Biscuits, Milk.',
                  },
                  {
                    key: 'fashion',
                    name: 'Apex Trendz',
                    type: 'Fashion & Apparel',
                    desc: 'Clothing boutique with Cotton T-Shirts, Denim Jeans, Polo Shirts, and sizes.',
                  },
                  {
                    key: 'electronics',
                    name: 'TechPulse',
                    type: 'Electronics & Gadgets',
                    desc: 'Gadget shop with 20W Chargers, Braided Cables, Wireless Earbuds, Power Banks.',
                  },
                ].map((preset) => {
                  const isCurrent = storeInfo.storeType === preset.key;
                  return (
                    <div
                      key={preset.key}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        isCurrent ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">{preset.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                            {preset.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{preset.desc}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          switchStorePreset(preset.key as 'grocery' | 'fashion' | 'electronics');
                          setStoreName(preset.name);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                          isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isCurrent ? 'Active Preset' : 'Activate'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subscription & Realtime Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Realtime Subscription & SaaS Sync</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live Socket.IO connection and administrative subscription state
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold w-fit">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className={socketConnected ? 'text-emerald-700' : 'text-rose-700'}>
                    {socketConnected ? 'Socket.IO Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              {/* Plan Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Current Plan
                    </span>
                    <h4 className="text-xl font-extrabold text-white mt-0.5">
                      {storeInfo.subscription?.plan || 'Professional'} Plan
                    </h4>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      storeInfo.subscription?.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : storeInfo.subscription?.status === 'expired'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {storeInfo.subscription?.status === 'active'
                      ? '● Active'
                      : storeInfo.subscription?.status === 'expired'
                      ? '● Expired'
                      : '● Suspended'}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-700/60 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Billing Cycle</span>
                    <span className="font-semibold text-slate-200 capitalize">
                      {storeInfo.subscription?.billingCycle || 'monthly'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Renewal Fee</span>
                    <span className="font-semibold text-slate-200">
                      ৳ {storeInfo.subscription?.amount || 2500}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Expiry Date</span>
                    <span className="font-semibold text-slate-200 font-mono text-[11px]">
                      {storeInfo.subscription?.expiryDate
                        ? new Date(storeInfo.subscription.expiryDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Store ID</span>
                    <span className="font-semibold text-blue-300 font-mono text-[11px]">
                      {currentUser?.storeId || 'store_001'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Simulation & Test Panel */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Admin Realtime Testing Panel
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Simulate platform admin events and test instant live socket broadcasting without page refresh:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (currentUser?.storeId) {
                        await api.adminSuspendStore(currentUser.storeId);
                      }
                    }}
                    className="p-3 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p>1. Simulate Admin Suspend</p>
                      <p className="text-[10px] font-normal text-rose-500">
                        Triggers ACCOUNT_SUSPENDED → immediate logout
                      </p>
                    </div>
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (currentUser?.storeId) {
                        await api.adminApprovePayment(currentUser.storeId, undefined, 2);
                      }
                    }}
                    className="p-3 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p>2. Simulate Approve Payment</p>
                      <p className="text-[10px] font-normal text-emerald-600">
                        Triggers PAYMENT_APPROVED → instant Active
                      </p>
                    </div>
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (currentUser?.storeId) {
                        await api.adminExpireSubscription(currentUser.storeId);
                      }
                    }}
                    className="p-3 bg-white hover:bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p>3. Simulate Expire Subscription</p>
                      <p className="text-[10px] font-normal text-amber-600">
                        Triggers SUBSCRIPTION_EXPIRED → blocks checkout
                      </p>
                    </div>
                    <RotateCcw className="w-4 h-4 shrink-0 text-amber-600" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (currentUser?.storeId) {
                        await api.adminActivateStore(currentUser.storeId);
                      }
                    }}
                    className="p-3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p>4. Simulate Admin Activate</p>
                      <p className="text-[10px] font-normal text-blue-600">
                        Triggers ACCOUNT_ACTIVATED
                      </p>
                    </div>
                    <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit User Authority Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingStaff ? `Edit Authority: ${editingStaff.name}` : 'Add Staff Member & Assign RBAC'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 overflow-y-auto space-y-4">
              {userModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="e.g. Tariqul Islam"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingStaff}
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="tariqul@shoppos.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {editingStaff ? 'New Password (Optional)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Terminal PIN (4-Digit)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Role & Authority</label>
                  <select
                    value={staffRole}
                    onChange={(e) => handleRoleChange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="Admin">Admin (Full Control)</option>
                    <option value="Manager">Manager (Catalog & Sales)</option>
                    <option value="Cashier">Cashier (Checkout Only)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Account Status</label>
                  <select
                    value={staffStatus}
                    onChange={(e) => setStaffStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Matrix */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Granular Permissions ({selectedPermissions.length} granted)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-slate-200/80 rounded-xl p-2 bg-slate-50/50">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-800">{perm.label}</p>
                          <p className="text-[10px] text-slate-400">{perm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {editingStaff ? 'Update Authority in MongoDB' : 'Create & Persist in MongoDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
