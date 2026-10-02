import React, { useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Store,
  LogOut,
  User,
  ShoppingBag,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

interface TopHeaderProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onBarcodeScanClick?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchPlaceholder = 'Search anything...',
  searchValue = '',
  onSearchChange,
  onBarcodeScanClick,
}) => {
  const {
    currentUser,
    staffUsers,
    switchStaffUser,
    logoutUser,
    activeScreen,
    setActiveScreen,
    cartItemCount,
    setIsMobileCartOpen,
    storeInfo,
    soundEnabled,
    setSoundEnabled,
  } = usePos();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 h-18 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile Brand / Screen Indicator */}
      <div className="flex items-center gap-3 md:hidden">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
          <Store className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-slate-900 text-base leading-tight block">
            ShopPOS
          </span>
          <span className="text-[10px] text-slate-500 font-medium leading-none">
            {storeInfo.name}
          </span>
        </div>
      </div>

      {/* Desktop Search Bar (or POS product search) */}
      <div className="hidden md:flex items-center flex-1 max-w-xl mr-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-sm text-slate-800 rounded-xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {onBarcodeScanClick && (
            <button
              onClick={onBarcodeScanClick}
              title="Scan or enter barcode"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <span className="font-mono text-[10px]">SCAN</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Store Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
          <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-800">{storeInfo.name}</span>
          <span className="text-[10px] text-slate-400">({storeInfo.branch})</span>
          {currentUser?.storeId && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
              {currentUser.storeId}
            </span>
          )}
        </div>

        {/* Sound Feedback Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Sound alerts enabled' : 'Muted'}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors hidden sm:flex"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-blue-600" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 sm:p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
                <span className="text-[11px] text-blue-600 font-medium cursor-pointer hover:underline">
                  Mark all read
                </span>
              </div>
              <div className="divide-y divide-slate-100 text-xs py-2">
                <div className="py-2.5 flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">
                      Low stock alert: Energy Drink
                    </p>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      Only 3 cans remaining in inventory
                    </p>
                  </div>
                </div>
                <div className="py-2.5 flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">
                      Payment received via bKash
                    </p>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      Invoice #1004 · ৳ 980
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Cart Button in POS screen */}
        {activeScreen === 'pos' && (
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="md:hidden relative p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        )}

        {/* User Profile & Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200/60"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shadow-2xs">
              {currentUser?.avatarInitials || 'A'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser?.name || 'Admin'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                {currentUser?.role || 'Manager'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500">{currentUser?.email}</p>
              </div>

              <div className="py-1">
                <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400">
                  Switch Active Staff
                </div>
                {staffUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      switchStaffUser(user);
                      setUserMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left ${
                      currentUser?.id === user.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>
                      {user.name} ({user.role})
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={() => {
                    setActiveScreen('settings');
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Shop Settings</span>
                </button>
                <button
                  onClick={() => {
                    logoutUser();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
