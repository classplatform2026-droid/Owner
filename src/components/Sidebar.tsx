import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Receipt,
  Settings,
  ChevronDown,
  Store,
  Check,
} from 'lucide-react';
import { usePos, ScreenType } from '../context/PosContext';
import { STORE_PRESETS } from '../data/mockData';

export const Sidebar: React.FC = () => {
  const {
    activeScreen,
    setActiveScreen,
    storeInfo,
    switchStorePreset,
    cartItemCount,
  } = usePos();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

  const navItems: {
    id: ScreenType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS', icon: ShoppingBag, badge: cartItemCount },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'sales', label: 'Sales', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-18 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <Store className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-slate-900 tracking-tight leading-tight">
            ShopPOS
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Retail Cloud SaaS
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Store Switcher Footer (matches reference) */}
      <div className="p-4 border-t border-slate-100 relative">
        <button
          onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
              {storeInfo.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {storeInfo.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate leading-tight">
                {storeInfo.branch}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
              storeDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown for Store Switcher */}
        {storeDropdownOpen && (
          <div className="absolute bottom-18 left-4 right-4 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 px-2 py-1 uppercase">
              Switch Preset Store
            </div>
            {(
              [
                { key: 'grocery', name: 'Green Mart', desc: 'Grocery & Essentials' },
                { key: 'fashion', name: 'Apex Trendz', desc: 'Fashion & Apparel' },
                { key: 'electronics', name: 'TechPulse', desc: 'Gadgets & Electronics' },
              ] as const
            ).map((store) => {
              const isCurrent = storeInfo.storeType === store.key;
              return (
                <button
                  key={store.key}
                  onClick={() => {
                    switchStorePreset(store.key);
                    setStoreDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <p className="font-medium">{store.name}</p>
                    <p className="text-[10px] text-slate-400">{store.desc}</p>
                  </div>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
