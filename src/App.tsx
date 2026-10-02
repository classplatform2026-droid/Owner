import React, { useState } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ReceiptModal } from './components/ReceiptModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';

// Screens
import { DashboardScreen } from './screens/DashboardScreen';
import { PosScreen } from './screens/PosScreen';
import { ProductsScreen } from './screens/ProductsScreen';
import { SalesScreen } from './screens/SalesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LoginScreen } from './screens/LoginScreen';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    activeScreen,
    setActiveScreen,
    selectedSaleForReceipt,
    setSelectedSaleForReceipt,
  } = usePos();

  const [headerSearch, setHeaderSearch] = useState('');
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);

  // If user is logged out, show Login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Determine search placeholder based on active screen
  const getSearchPlaceholder = () => {
    switch (activeScreen) {
      case 'pos':
        return 'Search product by name, barcode or SKU...';
      case 'products':
        return 'Search catalog products...';
      case 'sales':
        return 'Search invoice number or customer...';
      default:
        return 'Search anything in shop...';
    }
  };

  const handleHeaderSearchChange = (val: string) => {
    setHeaderSearch(val);
    // If user starts typing in header while on dashboard or settings, auto-route to POS
    if (val && activeScreen === 'dashboard') {
      setActiveScreen('pos');
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <TopHeader
          searchPlaceholder={getSearchPlaceholder()}
          searchValue={headerSearch}
          onSearchChange={handleHeaderSearchChange}
          onBarcodeScanClick={() => setBarcodeModalOpen(true)}
        />

        {/* Dynamic Screen View */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {activeScreen === 'dashboard' && <DashboardScreen />}
          {activeScreen === 'pos' && (
            <PosScreen
              searchQuery={headerSearch}
              onOpenBarcodeModal={() => setBarcodeModalOpen(true)}
            />
          )}
          {activeScreen === 'products' && <ProductsScreen />}
          {activeScreen === 'sales' && <SalesScreen />}
          {activeScreen === 'settings' && <SettingsScreen />}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>

      {/* Printable / Inspectable Invoice Receipt Modal */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
          onNewSale={() => {
            setSelectedSaleForReceipt(null);
            setHeaderSearch('');
          }}
        />
      )}

      {/* Barcode Scanner Simulation Modal */}
      {barcodeModalOpen && (
        <BarcodeScannerModal onClose={() => setBarcodeModalOpen(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <PosProvider>
      <MainLayout />
    </PosProvider>
  );
}
