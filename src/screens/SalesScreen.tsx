import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Printer,
  RotateCcw,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  ArrowRight,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Sale, PaymentMethod } from '../types';

export const SalesScreen: React.FC = () => {
  const { sales, storeInfo, setSelectedSaleForReceipt, refundSale } = usePos();

  const [activeTab, setActiveTab] = useState<'today' | 'previous'>('today');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'All' | PaymentMethod>('All');

  // Filter today vs previous
  const todayDateString = new Date().toDateString();

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const isToday = new Date(s.createdAt).toDateString() === todayDateString;
      const tabMatch = activeTab === 'today' ? isToday : !isToday;

      const queryMatch =
        !search ||
        s.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
        (s.customerPhone && s.customerPhone.includes(search));

      const paymentMatch =
        paymentFilter === 'All' || s.paymentMethod === paymentFilter;

      return tabMatch && queryMatch && paymentMatch;
    });
  }, [sales, activeTab, search, paymentFilter, todayDateString]);

  // Aggregate stats for current view
  const currentSalesTotal = filteredSales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.total, 0);

  const completedCount = filteredSales.filter((s) => s.status === 'completed').length;
  const avgOrderValue = completedCount > 0 ? Math.round(currentSalesTotal / completedCount) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sales & Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View transaction logs, invoice receipts, and issue refunds
          </p>
        </div>

        {/* Tab Buttons (matches Today / Previous tabs in the reference wireframe) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today's Sales
          </button>
          <button
            onClick={() => setActiveTab('previous')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'previous'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Previous History
          </button>
        </div>
      </div>

      {/* KPI mini-cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400">Total Volume</span>
          <p className="text-base sm:text-xl font-mono font-extrabold text-slate-900 mt-1 tabular-nums">
            {storeInfo.currency} {currentSalesTotal.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400">Completed Orders</span>
          <p className="text-base sm:text-xl font-mono font-extrabold text-blue-600 mt-1 tabular-nums">
            {completedCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400">Avg Ticket Size</span>
          <p className="text-base sm:text-xl font-mono font-extrabold text-emerald-600 mt-1 tabular-nums">
            {storeInfo.currency} {avgOrderValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number (#1005) or customer phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Payment Method Filter */}
        <div className="flex items-center gap-1 overflow-x-auto shrink-0">
          {(['All', 'Cash', 'bKash', 'Nagad'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentFilter(method)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                paymentFilter === method
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Invoices List (matches reference) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">No sales transactions found</p>
            <p className="text-xs text-slate-400 mt-1">
              Sales made in the POS checkout will appear here in real-time
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredSales.map((sale) => {
              const saleDate = new Date(sale.createdAt);
              const formattedDate = saleDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = saleDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const isRefunded = sale.status === 'refunded';

              return (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSaleForReceipt(sale)}
                  className={`p-4 sm:px-6 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between gap-4 ${
                    isRefunded ? 'opacity-60 bg-rose-50/20' : ''
                  }`}
                >
                  {/* Left: Invoice badge & info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-blue-100">
                      #{sale.invoiceNo}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          Invoice #{sale.invoiceNo}
                        </span>
                        {isRefunded && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            Refunded
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>
                          {formattedDate}, {formattedTime}
                        </span>
                        <span>·</span>
                        <span>{sale.items.length} items</span>
                        <span>·</span>
                        <span className="font-medium text-slate-700">
                          {sale.paymentMethod}
                        </span>
                        {sale.customerName && (
                          <>
                            <span>·</span>
                            <span className="text-slate-600 truncate">
                              {sale.customerName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Receipt Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-bold font-mono text-slate-900 tabular-nums">
                        {storeInfo.currency} {sale.total.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        by {sale.cashierName}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSaleForReceipt(sale);
                      }}
                      title="View & Print Invoice"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors hidden sm:flex"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {!isRefunded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Refund Invoice #${sale.invoiceNo}? Stock will be returned.`)) {
                            refundSale(sale.id);
                          }
                        }}
                        title="Refund Transaction"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors hidden sm:flex"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    <ArrowRight className="w-4 h-4 text-slate-300 sm:hidden" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
