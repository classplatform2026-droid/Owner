import React, { useState } from 'react';
import {
  Store,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Check,
  User,
  Database,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { STAFF_USERS } from '../data/mockData';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials, storeInfo, switchStorePreset, dbStatus } = usePos();

  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('admin@shoppos.com');
  const [password, setPassword] = useState('admin123');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'password') {
        await loginWithCredentials({ identifier: email.trim(), password });
      } else {
        await loginWithCredentials({ pin: pin.trim() });
      }
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (presetUser: { email: string; pass: string; pin: string }) => {
    setError('');
    setLoading(true);
    try {
      await loginWithCredentials({
        identifier: presetUser.email,
        password: presetUser.pass,
      });
    } catch (err) {
      setError((err as Error).message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-blue-100 selection:text-blue-900 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand logo & title */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            ShopPOS
          </h1>
          <p className="text-xs text-slate-500">
            Enterprise Cloud POS with MongoDB User Authority & RBAC
          </p>
        </div>

        {/* Database Status Tag */}
        <div className="flex items-center justify-center gap-2 py-1 px-3 bg-slate-50 rounded-full border border-slate-200/60 w-fit mx-auto text-[11px]">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-slate-700">
            {dbStatus?.mode === 'remote-mongodb'
              ? 'MongoDB Atlas Connected'
              : 'MongoDB Document Engine Ready'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Store Terminal Picker */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Store Terminal
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'grocery', name: 'Green Mart', type: 'Grocery' },
              { id: 'fashion', name: 'Apex Trendz', type: 'Fashion' },
              { id: 'electronics', name: 'TechPulse', type: 'Gadgets' },
            ].map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => switchStorePreset(store.id as 'grocery' | 'fashion' | 'electronics')}
                className={`py-2 px-1 rounded-xl border text-center transition-all text-xs ${
                  storeInfo.storeType === store.id
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="truncate font-semibold">{store.name}</div>
                <div className="text-[9px] text-slate-400">{store.type}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Login Method Toggle: Password vs Quick PIN */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'password' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => setMode('pin')}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'pin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Terminal 4-Digit PIN
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'password' ? (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="admin@shoppos.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <span className="text-[10px] text-slate-400 font-mono">Demo: admin123</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">Terminal PIN</label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Admin: 1234 · Cashier: 0000
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={6}
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center font-bold text-lg"
                  placeholder="••••"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying Authority...</span>
            ) : (
              <>
                <span>Sign In with Authority</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Role Logins */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Store 1: Green Mart</span>
            <span className="text-emerald-600 font-mono text-[10px]">store_001</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                role: 'SuperAdmin',
                name: 'Admin',
                email: 'admin@shoppos.com',
                pass: 'admin123',
                pin: '1234',
              },
              {
                role: 'Manager',
                name: 'Sadia',
                email: 'manager@shoppos.com',
                pass: 'manager123',
                pin: '2222',
              },
              {
                role: 'Cashier',
                name: 'Tariqul',
                email: 'cashier@shoppos.com',
                pass: 'cashier123',
                pin: '0000',
              },
            ].map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => handleQuickLogin(account)}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-colors text-center"
              >
                <div className="text-[11px] font-bold text-slate-800 truncate">
                  {account.name}
                </div>
                <div className="text-[9px] font-semibold text-blue-600">
                  {account.role}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2">
            <span>Store 2: Blue Electronics</span>
            <span className="text-blue-600 font-mono text-[10px]">store_002</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                role: 'Admin (Owner)',
                name: 'Tanvir',
                email: 'owner2@shoppos.com',
                pass: 'owner123',
                pin: '5555',
              },
              {
                role: 'Cashier',
                name: 'Kamrul',
                email: 'cashier2@shoppos.com',
                pass: 'cashier123',
                pin: '9999',
              },
            ].map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleQuickLogin(account)}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors text-center"
              >
                <div className="text-[11px] font-bold text-slate-800 truncate">
                  {account.name}
                </div>
                <div className="text-[9px] font-semibold text-emerald-600">
                  {account.role}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
