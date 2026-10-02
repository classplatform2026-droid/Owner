import React, { useRef } from 'react';
import {
  CheckCircle2,
  Printer,
  PlusCircle,
  X,
  Store,
  Phone,
  Calendar,
  User,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Sale } from '../types';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  onClose,
  onNewSale,
}) => {
  const { storeInfo, setActiveScreen } = usePos();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleNewSale = () => {
    onClose();
    setActiveScreen('pos');
    onNewSale?.();
  };

  // Format date readable
  const saleDate = new Date(sale.createdAt);
  const formattedDate = saleDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = saleDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sale Details
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Sale Completed Badge */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Sale Completed!
            </h3>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">
              Invoice #{sale.invoiceNo}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {formattedDate} · {formattedTime}
            </p>
          </div>

          {/* Printable Receipt Paper Container (will also be formatted for @media print) */}
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 text-slate-800 text-xs shadow-2xs"
          >
            {/* Store branding on receipt */}
            <div className="text-center pb-4 mb-4 border-b border-dashed border-slate-300">
              <h2 className="font-extrabold text-base text-slate-900 tracking-tight">
                {storeInfo.name}
              </h2>
              <p className="text-[11px] text-slate-500">{storeInfo.branch}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{storeInfo.address}</p>
              <p className="text-[10px] text-slate-400">{storeInfo.phone}</p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-600">
                <span>Invoice: #{sale.invoiceNo}</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
              {sale.customerName && (
                <div className="text-left text-[11px] text-slate-600 mt-1">
                  Customer: <span className="font-semibold">{sale.customerName}</span>{' '}
                  {sale.customerPhone && `(${sale.customerPhone})`}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 font-bold text-slate-500 pb-1 border-b border-slate-200">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              {sale.items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 py-1.5 border-b border-slate-100 last:border-b-0 items-center font-medium"
                >
                  <span className="col-span-6 font-semibold text-slate-800 truncate pr-1">
                    {item.productName}
                  </span>
                  <span className="col-span-2 text-center font-mono text-slate-600">
                    {item.quantity}
                  </span>
                  <span className="col-span-2 text-right font-mono text-slate-600">
                    {storeInfo.currency} {item.unitPrice.toLocaleString()}
                  </span>
                  <span className="col-span-2 text-right font-mono font-bold text-slate-900">
                    {storeInfo.currency} {item.totalPrice.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">
                  {storeInfo.currency} {sale.subtotal.toLocaleString()}
                </span>
              </div>

              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount {sale.discountType === 'percentage' ? `(${sale.discountValue}%)` : ''}</span>
                  <span className="font-mono tabular-nums">
                    - {storeInfo.currency} {sale.discountAmount.toLocaleString()}
                  </span>
                </div>
              )}

              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({storeInfo.taxRate}%)</span>
                  <span className="font-mono tabular-nums">
                    {storeInfo.currency} {sale.taxAmount.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span className="font-mono tabular-nums text-blue-600">
                  {storeInfo.currency} {sale.total.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Payment Method</span>
                <span className="font-semibold text-slate-800">
                  {sale.paymentMethod}
                </span>
              </div>

              {sale.paymentMethod === 'Cash' && sale.amountReceived && (
                <>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Cash Received</span>
                    <span className="font-mono">
                      {storeInfo.currency} {sale.amountReceived.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-emerald-700">
                    <span>Change Return</span>
                    <span className="font-mono">
                      {storeInfo.currency} {(sale.changeGiven || 0).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer message */}
            <div className="text-center pt-4 mt-4 border-t border-slate-200 text-[10px] text-slate-400">
              <p>{storeInfo.receiptFooter}</p>
              <p className="mt-1 font-mono text-slate-400">
                Served by: {sale.cashierName}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm flex items-center justify-center gap-2 shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={handleNewSale}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
