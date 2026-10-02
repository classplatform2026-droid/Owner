import React, { useState, useMemo } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowLeft,
  X,
  Check,
  CreditCard,
  Banknote,
  Search,
  Barcode,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ProductThumb } from '../components/ProductThumb';
import { Product, PaymentMethod } from '../types';

interface PosScreenProps {
  searchQuery?: string;
  onOpenBarcodeModal?: () => void;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  searchQuery = '',
  onOpenBarcodeModal,
}) => {
  const {
    products,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    discountType,
    discountValue,
    discountAmount,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    cashReceived,
    setCashReceived,
    cartSubtotal,
    cartTaxAmount,
    cartTotal,
    cartItemCount,
    completeSale,
    storeInfo,
    isMobileCartOpen,
    setIsMobileCartOpen,
    categories: contextCategories,
  } = usePos();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [internalSearch, setInternalSearch] = useState('');
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [tempDiscountValue, setTempDiscountValue] = useState<string>('0');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerInput, setShowCustomerInput] = useState(false);

  // Extract unique categories based on products and context
  const categories = useMemo(() => {
    const set = new Set<string>(['All', ...(contextCategories || [])]);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [contextCategories, products]);

  // Filter products by category and search (combining header search or local search)
  const effectiveSearch = (searchQuery || internalSearch).toLowerCase().trim();

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchCat =
        selectedCategory === 'All' || prod.category === selectedCategory;
      const matchQuery =
        !effectiveSearch ||
        prod.name.toLowerCase().includes(effectiveSearch) ||
        prod.sku.toLowerCase().includes(effectiveSearch) ||
        prod.barcode.toLowerCase().includes(effectiveSearch);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, effectiveSearch]);

  const handleOpenDiscount = () => {
    setTempDiscountType(discountType);
    setTempDiscountValue(discountValue.toString());
    setDiscountModalOpen(true);
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempDiscountValue) || 0;
    setDiscount(tempDiscountType, val);
    setDiscountModalOpen(false);
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) return;
    completeSale({
      name: customerName.trim() || undefined,
      phone: customerPhone.trim() || undefined,
    });
    setCustomerName('');
    setCustomerPhone('');
    setShowCustomerInput(false);
  };

  const receivedNum = parseFloat(cashReceived) || 0;
  const changeDue = receivedNum >= cartTotal ? receivedNum - cartTotal : 0;

  // Render the Cart Content (shared between Desktop Right Sidebar & Mobile Modal)
  const renderCartContent = (isMobileView = false) => (
    <div className="flex flex-col h-full">
      {/* Cart Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMobileView && (
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="p-1 -ml-1 text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Current Sale
          </h2>
          <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
            {cartItemCount}
          </span>
        </div>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Tap products or scan barcode to add items to this checkout
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const itemTotal = item.product.price * item.quantity;
            return (
              <div
                key={item.product.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ProductThumb
                    iconType={item.product.iconType}
                    name={item.product.name}
                    category={item.product.category}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {storeInfo.currency} {item.product.price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Stepper */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/60">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded-md bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs text-xs font-bold transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-mono text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="w-6 h-6 rounded-md bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs text-xs font-bold transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right w-16">
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                      {storeInfo.currency} {itemTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Checkout Controls */}
      {cart.length > 0 && (
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
          {/* Customer attachment toggle */}
          <div>
            {!showCustomerInput ? (
              <button
                onClick={() => setShowCustomerInput(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                + Add Customer Phone / Name
              </button>
            ) : (
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 text-[11px]">
                    Customer Information
                  </span>
                  <button
                    onClick={() => setShowCustomerInput(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Customer Phone (e.g. 01712...)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Customer Name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">
                {storeInfo.currency} {cartSubtotal.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handleOpenDiscount}
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <Tag className="w-3 h-3" />
                <span>
                  Discount{' '}
                  {discountAmount > 0
                    ? `(${discountType === 'percentage' ? `${discountValue}%` : 'Flat'})`
                    : ''}
                </span>
              </button>
              <span className="font-mono tabular-nums text-slate-800 font-semibold">
                {discountAmount > 0 ? `- ` : ''}
                {storeInfo.currency} {discountAmount.toLocaleString()}
              </span>
            </div>

            {storeInfo.taxRate > 0 && (
              <div className="flex justify-between">
                <span>Tax ({storeInfo.taxRate}%)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {storeInfo.currency} {cartTaxAmount.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900">
              <span className="text-sm font-bold">Total</span>
              <span className="text-xl font-extrabold font-mono text-blue-600 tabular-nums">
                {storeInfo.currency} {cartTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Cash Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  paymentMethod === 'Cash'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash</span>
              </button>

              {/* bKash Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bKash')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  paymentMethod === 'bKash'
                    ? 'bg-[#E2136E] text-white border-[#E2136E] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-pink-50/50'
                }`}
              >
                <span className="font-black tracking-tight text-[11px]">bKash</span>
              </button>

              {/* Nagad Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Nagad')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  paymentMethod === 'Nagad'
                    ? 'bg-[#F7941D] text-white border-[#F7941D] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50/50'
                }`}
              >
                <span className="font-black tracking-tight text-[11px]">Nagad</span>
              </button>
            </div>
          </div>

          {/* Cash Received & Change Calculations (when Cash is active) */}
          {paymentMethod === 'Cash' && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Cash Received:</span>
                <div className="flex items-center gap-1 w-28">
                  <span className="text-slate-400 font-mono">{storeInfo.currency}</span>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={cartTotal.toString()}
                    className="w-full text-right font-mono font-bold text-slate-900 border-b border-slate-300 focus:outline-none focus:border-blue-500 px-1 py-0.5"
                  />
                </div>
              </div>

              {/* Quick Cash Chips */}
              <div className="flex gap-1 justify-end pt-1">
                {[cartTotal, 500, 1000, 2000]
                  .filter((v, i, arr) => arr.indexOf(v) === i && v >= cartTotal)
                  .slice(0, 3)
                  .map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashReceived(amount.toString())}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-mono text-slate-700"
                    >
                      {storeInfo.currency}
                      {amount}
                    </button>
                  ))}
              </div>

              {receivedNum > 0 && (
                <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold text-[11px]">
                  <span className="text-slate-500">Change Due:</span>
                  <span
                    className={`font-mono tabular-nums ${
                      changeDue >= 0 ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {changeDue >= 0
                      ? `${storeInfo.currency} ${changeDue.toLocaleString()}`
                      : 'Insufficient Cash'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Complete Sale Button */}
          <button
            onClick={handleCompleteSale}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Complete Sale</span>
            <span className="text-blue-200 font-mono text-xs">
              ({storeInfo.currency} {cartTotal.toLocaleString()})
            </span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* Left/Center: Catalog, Categories & Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/70 overflow-hidden">
        {/* Mobile Search Bar inside POS screen */}
        <div className="p-3 bg-white border-b border-slate-200/80 md:hidden flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder="Search product..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {onOpenBarcodeModal && (
            <button
              onClick={onOpenBarcodeModal}
              className="p-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
            >
              <Barcode className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills (horizontal scrollable) */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200/60 overflow-x-auto flex items-center gap-2 shrink-0 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
              <Layers className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-600">
                No products found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with another keyword or pick 'All' categories
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const inCartItem = cart.find(
                  (item) => item.product.id === product.id
                );
                const isOutOfStock = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer select-none relative ${
                      isOutOfStock ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      inCartItem
                        ? 'ring-2 ring-blue-500/20 border-blue-500 bg-blue-50/20'
                        : ''
                    }`}
                  >
                    {/* In cart badge */}
                    {inCartItem && (
                      <span className="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {inCartItem.quantity} in cart
                      </span>
                    )}

                    {/* Product Thumbnail */}
                    <div className="flex items-center justify-center py-2 sm:py-3">
                      <ProductThumb
                        iconType={product.iconType}
                        name={product.name}
                        category={product.category}
                        size="md"
                      />
                    </div>

                    {/* Details & Price */}
                    <div className="mt-2 space-y-1">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                          {storeInfo.currency} {product.price.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) addToCart(product);
                          }}
                          disabled={isOutOfStock}
                          className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <span>Stock: {product.stock}</span>
                        {product.stock <= product.lowStockThreshold && (
                          <span className="text-amber-600 font-semibold">Low</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Sticky Bottom Bar (when cart has items) */}
        {cart.length > 0 && (
          <div className="md:hidden fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
              </p>
              <p className="text-base font-extrabold font-mono text-blue-600">
                {storeInfo.currency} {cartTotal.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="py-2.5 px-5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              View Cart
            </button>
          </div>
        )}
      </div>

      {/* Right Desktop Cart Sidebar (380px fixed on desktop) */}
      <div className="hidden lg:flex w-96 bg-white border-l border-slate-200/80 flex-col h-full shrink-0 z-10 shadow-xs">
        {renderCartContent(false)}
      </div>

      {/* Mobile Cart Sheet / Modal */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl max-h-[85vh] h-full flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {renderCartContent(true)}
          </div>
        </div>
      )}

      {/* Discount Configuration Modal */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 w-full max-w-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Add Discount</h3>
              <button
                onClick={() => setDiscountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscount} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTempDiscountType('flat')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    tempDiscountType === 'flat'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Flat Amount ({storeInfo.currency})
                </button>
                <button
                  type="button"
                  onClick={() => setTempDiscountType('percentage')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    tempDiscountType === 'percentage'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Percentage (%)
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Discount Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  autoFocus
                  value={tempDiscountValue}
                  onChange={(e) => setTempDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDiscount('flat', 0);
                    setDiscountModalOpen(false);
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                >
                  Remove
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
