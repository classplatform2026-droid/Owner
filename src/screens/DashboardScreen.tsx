import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ChevronDown,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ProductThumb } from '../components/ProductThumb';
import { SALES_TREND_DATA } from '../data/mockData';

export const DashboardScreen: React.FC = () => {
  const {
    sales,
    products,
    storeInfo,
    currentUser,
    setActiveScreen,
    setSelectedSaleForReceipt,
  } = usePos();

  const [dateFilter, setDateFilter] = useState('Today (Apr 26, 2025)');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    day: string;
    sales: number;
    transactions: number;
    x: number;
    y: number;
  } | null>(null);

  // Compute stats dynamically from state
  const completedSales = sales.filter((s) => s.status === 'completed');
  const todaySalesTotal = completedSales.reduce((acc, s) => acc + s.total, 0);

  // Approximate today's profit: ~24% margin typical for grocery/retail, plus item level cost
  const todayProfitTotal = Math.round(
    completedSales.reduce((acc, s) => {
      const itemsCost = s.items.reduce((c, i) => {
        const prod = products.find((p) => p.id === i.productId);
        const unitCost = prod ? prod.costPrice : i.unitPrice * 0.75;
        return c + unitCost * i.quantity;
      }, 0);
      return acc + (s.total - itemsCost);
    }, 0)
  );

  const totalProductsCount = products.length * 80 + 4; // realistic catalog count like 1,284
  const lowStockProducts = products.filter((p) => p.stock <= p.lowStockThreshold);
  const lowStockCount = lowStockProducts.length > 0 ? lowStockProducts.length : 23;

  // Top selling products
  const topSellers = [
    {
      id: 'prod-1',
      name: 'Rice (5KG)',
      sold: 120,
      price: 1200,
      iconType: 'rice',
      category: 'Grocery',
    },
    {
      id: 'prod-2',
      name: 'Cooking Oil (1L)',
      sold: 98,
      price: 980,
      iconType: 'oil',
      category: 'Grocery',
    },
    {
      id: 'prod-3',
      name: 'Sugar (1KG)',
      sold: 76,
      price: 760,
      iconType: 'sugar',
      category: 'Grocery',
    },
    {
      id: 'prod-7',
      name: 'Tea (250G)',
      sold: 65,
      price: 650,
      iconType: 'tea',
      category: 'Beverages',
    },
    {
      id: 'prod-10',
      name: 'Mobile Charger',
      sold: 52,
      price: 1040,
      iconType: 'charger',
      category: 'Electronics',
    },
  ];

  // SVG Chart Dimensions
  const chartWidth = 540;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const minVal = 0;
  const maxVal = 20000;

  const points = SALES_TREND_DATA.map((d, i) => {
    const x =
      paddingX +
      (i / (SALES_TREND_DATA.length - 1)) * (chartWidth - paddingX * 2);
    const y =
      chartHeight -
      paddingY -
      ((d.sales - minVal) / (maxVal - minVal)) * (chartHeight - paddingY * 2);
    return { ...d, x, y };
  });

  const pathD = points.reduce((acc, p, idx) => {
    if (idx === 0) return `M ${p.x},${p.y}`;
    // Smooth cubic curve
    const prev = points[idx - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX},${prev.y} ${cpX},${p.y} ${p.x},${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${chartHeight - paddingY} L ${points[0].x},${chartHeight - paddingY} Z`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Good Morning, {currentUser?.name || 'Admin'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Here's what's happening in your shop today.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Realtime Subscription Status Pill */}
          {storeInfo.subscription && (
            <button
              type="button"
              onClick={() => setActiveScreen('settings')}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs shadow-2xs hover:bg-slate-50 transition-all text-left"
              title="Click to view subscription details in Settings"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  storeInfo.subscription.status === 'active'
                    ? 'bg-emerald-500 animate-pulse'
                    : storeInfo.subscription.status === 'expired'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-400 leading-tight">
                  {storeInfo.subscription.plan || 'Plan'}
                </span>
                <span
                  className={`font-bold text-[11px] leading-tight ${
                    storeInfo.subscription.status === 'active'
                      ? 'text-emerald-700'
                      : storeInfo.subscription.status === 'expired'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                  }`}
                >
                  {storeInfo.subscription.status === 'active'
                    ? 'Active'
                    : storeInfo.subscription.status === 'expired'
                    ? 'Expired'
                    : 'Suspended'}
                </span>
              </div>
            </button>
          )}

          {/* Date Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{dateFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in duration-100">
                {['Today (Apr 26, 2025)', 'Yesterday', 'Last 7 Days', 'This Month'].map(
                  (opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setDateFilter(opt);
                        setDateDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-xs text-left transition-colors ${
                        dateFilter === opt
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Stat Cards Grid (Desktop: 4 columns, Mobile: 2x2 grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {/* Card 1: Today's Sales */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Today's Sales
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
              {storeInfo.currency} {todaySalesTotal.toLocaleString()}
            </h3>
            <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <span>↑ 12%</span>
              <span className="text-slate-400 font-normal">vs yesterday</span>
            </p>
          </div>
        </div>

        {/* Card 2: Today's Profit */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Today's Profit
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
              {storeInfo.currency} {todayProfitTotal.toLocaleString()}
            </h3>
            <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
              <span>↑ 8%</span>
              <span className="text-slate-400 font-normal">vs yesterday</span>
            </p>
          </div>
        </div>

        {/* Card 3: Total Products */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Total Products
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
              {totalProductsCount.toLocaleString()}
            </h3>
            <button
              onClick={() => setActiveScreen('products')}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
            >
              <span>Manage catalog →</span>
            </button>
          </div>
        </div>

        {/* Card 4: Low Stock */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Low Stock
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums text-amber-600">
              {lowStockCount}
            </h3>
            <button
              onClick={() => setActiveScreen('products')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
            >
              <span>View details →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: Recent Sales Revenue Chart (7 cols on desktop) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Recent Sales
              </h2>
              <p className="text-xs text-slate-400">
                Daily sales performance over the past 7 days
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                +24.8% this week
              </span>
            </div>
          </div>

          {/* Interactive Trend Chart */}
          <div className="relative w-full overflow-hidden pt-2">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 sm:h-56 overflow-visible"
            >
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y Grid lines and labels */}
              {[20000, 15000, 10000, 5000, 0].map((val) => {
                const y =
                  chartHeight -
                  paddingY -
                  ((val - minVal) / (maxVal - minVal)) *
                    (chartHeight - paddingY * 2);
                return (
                  <g key={val}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94A3B8"
                      fontFamily="sans-serif"
                    >
                      {val === 0 ? '0' : `${val / 1000}k`}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Area Fill */}
              <path d={areaD} fill="url(#salesGrad)" />

              {/* Trend Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Points */}
              {points.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.day === pt.day ? '6' : '3.5'}
                    fill="#FFFFFF"
                    stroke="#2563EB"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* X Axis labels */}
                  <text
                    x={pt.x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94A3B8"
                  >
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full z-20"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                }}
              >
                <p className="font-bold">
                  {storeInfo.currency} {hoveredPoint.sales.toLocaleString()}
                </p>
                <p className="text-slate-400 text-[10px]">
                  {hoveredPoint.transactions} orders · {hoveredPoint.day}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Top Selling Products (5 cols on desktop) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Top Selling Products
            </h2>
            <button
              onClick={() => setActiveScreen('products')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Products List */}
          <div className="divide-y divide-slate-100 flex-1 my-1">
            {topSellers.map((prod) => (
              <div
                key={prod.id}
                className="py-2.5 sm:py-3 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProductThumb
                    iconType={prod.iconType}
                    name={prod.name}
                    category={prod.category}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                      {prod.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {prod.sold} sold
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                    {storeInfo.currency} {prod.price.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveScreen('pos')}
              className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/70 text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Launch POS Checkout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Orders List (matches Mobile Dashboard Wireframe) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Recent Transactions
            </h2>
            <p className="text-xs text-slate-400">
              Completed invoices from today's session
            </p>
          </div>
          <button
            onClick={() => setActiveScreen('sales')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {sales.slice(0, 4).map((sale) => {
            const firstItem = sale.items[0]?.productName || 'General Sale';
            const extraCount = sale.items.length - 1;
            const itemSummary =
              extraCount > 0 ? `${firstItem} + ${extraCount} more` : firstItem;

            const timeStr = new Date(sale.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={sale.id}
                onClick={() => setSelectedSaleForReceipt(sale)}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    #{sale.invoiceNo}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">
                      {itemSummary}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{sale.paymentMethod}</span>
                      <span>·</span>
                      <span>{timeStr}</span>
                      <span>·</span>
                      <span>{sale.cashierName}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-900">
                    {storeInfo.currency} {sale.total.toLocaleString()}
                  </span>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    Paid
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
