import React from 'react';

interface ProductThumbProps {
  iconType: string;
  name: string;
  category: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProductThumb: React.FC<ProductThumbProps> = ({
  iconType,
  name,
  category: _category,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 rounded-lg text-xs',
    md: 'w-16 h-16 sm:w-20 sm:h-20 rounded-xl text-sm',
    lg: 'w-24 h-24 rounded-2xl text-base',
  }[size];

  // Specific high-fidelity SVG graphics representing the packaging shown in the reference image
  const renderVisual = () => {
    switch (iconType) {
      case 'rice':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <path d="M12 16C12 14 16 12 24 12C32 12 36 14 36 16L38 40C38 42 34 44 24 44C14 44 10 42 10 40L12 16Z" fill="#D97706" fillOpacity="0.8" stroke="#B45309" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M14 18C14 18 19 15 24 15C29 15 34 18 34 18" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round"/>
              <rect x="18" y="24" width="12" height="10" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1"/>
              <circle cx="24" cy="28" r="2" fill="#B45309"/>
              <line x1="20" y1="31" x2="28" y2="31" stroke="#B45309" strokeWidth="1"/>
            </svg>
          </div>
        );
      case 'oil':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-yellow-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <rect x="21" y="8" width="6" height="6" rx="1" fill="#DC2626" stroke="#991B1B" strokeWidth="1.5"/>
              <path d="M19 14L15 20C14 21.5 14 23 14 25L14 39C14 41.2 15.8 43 18 43H30C32.2 43 34 41.2 34 39V25C34 23 34 21.5 33 20L29 14H19Z" fill="#FACC15" stroke="#CA8A04" strokeWidth="2"/>
              <path d="M16 27C16 27 21 29 24 29C27 29 32 27 32 27V36C32 36 27 38 24 38C21 38 16 36 16 36V27Z" fill="#FEF08A"/>
              <circle cx="24" cy="33" r="2" fill="#CA8A04"/>
            </svg>
          </div>
        );
      case 'sugar':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-cyan-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <rect x="13" y="12" width="22" height="30" rx="3" fill="#06B6D4" stroke="#0891B2" strokeWidth="2"/>
              <path d="M13 12C13 12 18 16 24 16C30 16 35 12 35 12" stroke="#67E8F9" strokeWidth="2"/>
              <rect x="18" y="22" width="12" height="12" rx="2" fill="#ECFEFF"/>
              <circle cx="24" cy="27" r="2.5" fill="#0891B2"/>
              <line x1="20" y1="31" x2="28" y2="31" stroke="#0891B2" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        );
      case 'lentil':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-orange-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <circle cx="24" cy="24" r="15" fill="#EA580C" stroke="#C2410C" strokeWidth="2"/>
              <circle cx="24" cy="24" r="11" fill="#F97316"/>
              <circle cx="21" cy="20" r="1.5" fill="#FFEDD5"/>
              <circle cx="27" cy="21" r="1.5" fill="#FFEDD5"/>
              <circle cx="24" cy="26" r="1.5" fill="#FFEDD5"/>
              <circle cx="19" cy="26" r="1.5" fill="#FFEDD5"/>
              <circle cx="28" cy="27" r="1.5" fill="#FFEDD5"/>
            </svg>
          </div>
        );
      case 'flour':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <path d="M14 16C14 14 17 13 24 13C31 13 34 14 34 16L36 39C36 41 32 43 24 43C16 43 12 41 12 39L14 16Z" fill="#FDE68A" stroke="#D97706" strokeWidth="2"/>
              <rect x="18" y="23" width="12" height="9" rx="1.5" fill="#FFFBEB" stroke="#B45309" strokeWidth="1"/>
              <text x="24" y="29.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#B45309">ATTA</text>
            </svg>
          </div>
        );
      case 'salt':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <rect x="14" y="12" width="20" height="30" rx="3" fill="#3B82F6" stroke="#2563EB" strokeWidth="2"/>
              <path d="M14 18C14 18 19 21 24 21C29 21 34 18 34 18" stroke="#93C5FD" strokeWidth="2"/>
              <circle cx="24" cy="29" r="4" fill="#EFF6FF"/>
              <text x="24" y="31.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#2563EB">S</text>
            </svg>
          </div>
        );
      case 'tea':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <rect x="14" y="14" width="20" height="26" rx="2" fill="#15803D" stroke="#14532D" strokeWidth="2"/>
              <rect x="17" y="18" width="14" height="18" rx="1" fill="#DCFCE7"/>
              <path d="M24 22C21 25 21 29 24 31C27 29 27 25 24 22Z" fill="#16A34A"/>
              <path d="M24 24V30" stroke="#14532D" strokeWidth="1"/>
            </svg>
          </div>
        );
      case 'biscuit':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <circle cx="20" cy="24" r="10" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5"/>
              <circle cx="28" cy="24" r="10" fill="#D97706" stroke="#92400E" strokeWidth="1.5"/>
              <circle cx="28" cy="20" r="1" fill="#78350F"/>
              <circle cx="32" cy="24" r="1" fill="#78350F"/>
              <circle cx="26" cy="26" r="1" fill="#78350F"/>
            </svg>
          </div>
        );
      case 'milk':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-sky-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <path d="M19 12H29V16L32 19V40C32 41.1 31.1 42 30 42H18C16.9 42 16 41.1 16 40V19L19 16V12Z" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2"/>
              <rect x="18" y="24" width="12" height="12" fill="#0284C7"/>
              <circle cx="24" cy="30" r="3" fill="#FFFFFF"/>
            </svg>
          </div>
        );
      case 'charger':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <rect x="16" y="18" width="16" height="20" rx="3" fill="#334155" stroke="#1E293B" strokeWidth="2"/>
              <rect x="20" y="10" width="2" height="8" rx="0.5" fill="#94A3B8"/>
              <rect x="26" y="10" width="2" height="8" rx="0.5" fill="#94A3B8"/>
              <circle cx="24" cy="28" r="3" fill="#38BDF8"/>
            </svg>
          </div>
        );
      case 'cable':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <path d="M16 28C16 18 32 18 32 30C32 36 22 36 22 30" stroke="#6366F1" strokeWidth="3" strokeLinecap="round"/>
              <rect x="13" y="27" width="6" height="10" rx="2" fill="#4338CA"/>
              <rect x="15" y="37" width="2" height="4" fill="#C7D2FE"/>
            </svg>
          </div>
        );
      case 'earbuds':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <rect x="14" y="14" width="20" height="24" rx="8" fill="#7C3AED" stroke="#5B21B6" strokeWidth="2"/>
              <circle cx="24" cy="22" r="3" fill="#C4B5FD"/>
              <line x1="14" y1="26" x2="34" y2="26" stroke="#5B21B6" strokeWidth="1.5"/>
            </svg>
          </div>
        );
      case 'tshirt':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-sky-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <path d="M17 12L10 18L13 22L16 20V38H32V20L35 22L38 18L31 12C31 15 28 17 24 17C20 17 17 15 17 12Z" fill="#0284C7" stroke="#0369A1" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'jeans':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <path d="M14 12H34L32 40L25 40L24 24L23 40L16 40L14 12Z" fill="#1E3A8A" stroke="#172554" strokeWidth="2" strokeLinejoin="round"/>
              <line x1="14" y1="16" x2="34" y2="16" stroke="#3B82F6" strokeWidth="1"/>
            </svg>
          </div>
        );
      case 'noodles':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <rect x="13" y="13" width="22" height="26" rx="3" fill="#EF4444" stroke="#B91C1C" strokeWidth="2"/>
              <ellipse cx="24" cy="24" rx="8" ry="5" fill="#FEF08A"/>
              <path d="M18 24Q21 21 24 24T30 24" stroke="#CA8A04" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
        );
      case 'energydrink':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/80 p-2">
            <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs" fill="none">
              <rect x="17" y="10" width="14" height="30" rx="3" fill="#10B981" stroke="#047857" strokeWidth="2"/>
              <polygon points="25,18 21,26 25,26 23,32 29,24 25,24" fill="#FACC15"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 font-bold text-lg">
            {name.charAt(0).toUpperCase()}
          </div>
        );
    }
  };

  return (
    <div className={`relative flex items-center justify-center overflow-hidden border border-slate-200/60 shadow-xs shrink-0 select-none ${sizeClasses}`}>
      {renderVisual()}
    </div>
  );
};
