import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  Package,
  X,
  Check,
  RefreshCw,
  FolderPlus,
  Tag,
  Sparkles,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ProductThumb } from '../components/ProductThumb';
import { Product } from '../types';

const SUGGESTED_CATEGORIES = [
  'Dairy & Eggs',
  'Bakery & Bread',
  'Fruits & Vegetables',
  'Fish & Meat',
  'Spices & Seasoning',
  'Dry Fruits & Nuts',
  'Baby Care',
  'Stationery & Office',
  'Home & Cleaning',
  'Mobile Accessories',
  'Mens Fashion',
  'Womens Fashion',
];

export const ProductsScreen: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    storeInfo,
    categories: contextCategories,
    addCategory,
    deleteCategory,
  } = usePos();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'low' | 'instock'>('all');

  // Modals state
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustStockModalProduct, setAdjustStockModalProduct] = useState<Product | null>(null);
  const [newStockVal, setNewStockVal] = useState<string>('0');

  // Category Modal State
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryModalError, setCategoryModalError] = useState('');
  const [categoryModalSuccess, setCategoryModalSuccess] = useState('');

  // Form fields for Add / Edit Product
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Grocery');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('100');
  const [formPrice, setFormPrice] = useState('150');
  const [formStock, setFormStock] = useState('20');
  const [formThreshold, setFormThreshold] = useState('5');
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formIconType, setFormIconType] = useState('rice');

  // Unified categories (combining MongoDB categories + any category present on existing products)
  const allCategories = useMemo(() => {
    const set = new Set<string>(['All', ...contextCategories]);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [contextCategories, products]);

  // Product categories for dropdown
  const productCategoryOptions = useMemo(() => {
    return allCategories.filter((c) => c !== 'All');
  }, [allCategories]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchQuery =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase());

      const isLow = p.stock <= p.lowStockThreshold;
      let matchStock = true;
      if (filterStockStatus === 'low') matchStock = isLow;
      if (filterStockStatus === 'instock') matchStock = p.stock > 0;

      return matchCat && matchQuery && matchStock;
    });
  }, [products, selectedCategory, search, filterStockStatus]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory(productCategoryOptions[0] || 'Grocery');
    setFormSku(`PRD-${Math.floor(100 + Math.random() * 900)}`);
    setFormBarcode(`890103${Math.floor(100 + Math.random() * 900)}`);
    setFormCostPrice('80');
    setFormPrice('120');
    setFormStock('25');
    setFormThreshold('5');
    setFormUnit('Pcs');
    setFormIconType('rice');
    setAddEditModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormSku(product.sku);
    setFormBarcode(product.barcode);
    setFormCostPrice(product.costPrice.toString());
    setFormPrice(product.price.toString());
    setFormStock(product.stock.toString());
    setFormThreshold(product.lowStockThreshold.toString());
    setFormUnit(product.unit);
    setFormIconType(product.iconType);
    setAddEditModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const payload = {
      name: formName.trim(),
      category: formCategory,
      sku: formSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: formBarcode.trim() || Date.now().toString().slice(-8),
      costPrice: parseFloat(formCostPrice) || 0,
      price: parseFloat(formPrice) || 0,
      stock: parseInt(formStock, 10) || 0,
      lowStockThreshold: parseInt(formThreshold, 10) || 5,
      unit: formUnit.trim() || 'Pcs',
      iconType: formIconType,
      color: '#3B82F6',
      storeType: (storeInfo.storeType as 'grocery' | 'fashion' | 'electronics') || 'grocery',
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, payload);
    } else {
      await addProduct(payload);
    }

    setAddEditModalOpen(false);
  };

  const handleSaveAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStockModalProduct) return;
    const stockNum = parseInt(newStockVal, 10);
    await adjustStock(adjustStockModalProduct.id, isNaN(stockNum) ? 0 : stockNum);
    setAdjustStockModalProduct(null);
  };

  // Add Category Handler
  const handleCreateCategory = async (nameToAdd: string) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) {
      setCategoryModalError('Please enter a valid category name.');
      return;
    }
    setCategoryModalError('');

    try {
      const created = await addCategory(trimmed);
      setCategoryModalSuccess(`Category "${created}" saved successfully!`);
      setSelectedCategory(created);
      setFormCategory(created);
      setNewCategoryName('');

      setTimeout(() => {
        setCategoryModalSuccess('');
      }, 1800);
    } catch (err) {
      setCategoryModalError((err as Error).message || 'Failed to save category');
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = async (catToDelete: string) => {
    if (catToDelete === 'All') return;
    const count = products.filter(
      (p) => p.category.toLowerCase() === catToDelete.toLowerCase()
    ).length;
    const confirmMsg =
      count > 0
        ? `Are you sure you want to delete category "${catToDelete}"? ${count} product(s) in this category will be reassigned to "Grocery".`
        : `Are you sure you want to delete category "${catToDelete}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteCategory(catToDelete);
      if (selectedCategory.toLowerCase() === catToDelete.toLowerCase()) {
        setSelectedCategory('All');
      }
      setCategoryModalSuccess(`Category "${catToDelete}" deleted successfully.`);
      setTimeout(() => setCategoryModalSuccess(''), 2200);
    } catch (err) {
      setCategoryModalError((err as Error).message || 'Failed to delete category.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Products & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your store catalog, categories, pricing, and stock levels
          </p>
        </div>

        {/* Action Buttons: Add Category & Add Product */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setNewCategoryName('');
              setCategoryModalError('');
              setCategoryModalSuccess('');
              setAddCategoryModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/80 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <span>Manage Categories</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, barcode or SKU..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Stock status tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto text-xs">
            <button
              onClick={() => setFilterStockStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterStockStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setFilterStockStatus('low')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                filterStockStatus === 'low'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>
                Low Stock (
                {products.filter((p) => p.stock <= p.lowStockThreshold).length})
              </span>
            </button>
          </div>
        </div>

        {/* Category Pills Bar + Inline Add Button */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{cat}</span>
              {cat !== 'All' && (
                <span
                  className={`text-[10px] px-1 rounded-full ${
                    selectedCategory === cat
                      ? 'bg-white/20 text-white'
                      : 'text-slate-400'
                  }`}
                >
                  {products.filter((p) => p.category === cat).length}
                </span>
              )}
            </button>
          ))}

          {/* Quick inline '+ New Category' Pill */}
          <button
            type="button"
            onClick={() => {
              setNewCategoryName('');
              setCategoryModalError('');
              setCategoryModalSuccess('');
              setAddCategoryModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-700 border border-dashed border-blue-300 flex items-center gap-1 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Categories</span>
          </button>
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">
              No products found in category "{selectedCategory}"
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add your first product to this category or view 'All' categories
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={openAddModal}
                className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                + Add Product in {selectedCategory === 'All' ? 'Grocery' : selectedCategory}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Product</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Category</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">SKU / Barcode</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= p.lowStockThreshold;
                  const isOut = p.stock <= 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/60 transition-colors group relative"
                    >
                      {/* Product Name & Icon */}
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <ProductThumb
                            iconType={p.iconType}
                            name={p.name}
                            category={p.category}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-slate-400 md:hidden">
                              {p.category} · {p.barcode}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-medium">
                          {p.category}
                        </span>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="py-3 px-4 hidden sm:table-cell font-mono text-[11px] text-slate-500">
                        <div>{p.sku}</div>
                        <div className="text-slate-400">{p.barcode}</div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {storeInfo.currency} {p.price.toLocaleString()}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {p.stock}
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Low
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setAdjustStockModalProduct(p);
                              setNewStockVal(p.stock.toString());
                            }}
                            title="Adjust Stock"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete ${p.name}?`)) {
                                await deleteProduct(p.id);
                              }
                            }}
                            title="Delete"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MANAGE / ADD CATEGORIES MODAL ================= */}
      {addCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Manage Categories</h3>
                  <p className="text-[11px] text-slate-400">Add, organize, or delete store categories</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {categoryModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{categoryModalError}</span>
                </div>
              )}

              {categoryModalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{categoryModalSuccess}</span>
                </div>
              )}

              {/* Add category section */}
              <div className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-800 block">
                  Add New Category
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setCategoryModalError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory(newCategoryName);
                      }
                    }}
                    placeholder="e.g. Dairy & Eggs, Bakery, Stationery"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateCategory(newCategoryName)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap"
                  >
                    Save
                  </button>
                </div>

                {/* Quick suggestions */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5 pt-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Quick Suggestions (Click to Add)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {SUGGESTED_CATEGORIES.filter(
                      (sug) => !allCategories.includes(sug)
                    ).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleCreateCategory(sug)}
                        className="px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 rounded-lg text-[11px] font-medium border border-slate-200 transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current Categories List with Delete Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    Existing Categories ({productCategoryOptions.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Click 🗑️ to delete category</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100 border border-slate-200/80 rounded-2xl p-2 bg-white">
                  {productCategoryOptions.map((cat) => {
                    const prodCount = products.filter(
                      (p) => p.category.toLowerCase() === cat.toLowerCase()
                    ).length;

                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {cat}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono">
                            {prodCount} {prodCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          title={`Delete category "${cat}"`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setAddCategoryModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT PRODUCT MODAL ================= */}
      {addEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setAddEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rice (5KG), Polo Shirt, Fast Charger"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category Selector with inline '+ Add' link */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => setAddCategoryModalOpen(true)}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {productCategoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Visual Icon Type
                  </label>
                  <select
                    value={formIconType}
                    onChange={(e) => setFormIconType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="rice">Rice Bag</option>
                    <option value="oil">Cooking Oil</option>
                    <option value="sugar">Sugar Pack</option>
                    <option value="lentil">Lentil / Dal</option>
                    <option value="flour">Flour / Atta</option>
                    <option value="salt">Salt Pack</option>
                    <option value="tea">Tea Box</option>
                    <option value="biscuit">Biscuits</option>
                    <option value="milk">Milk Bottle</option>
                    <option value="charger">Charger</option>
                    <option value="cable">Cable</option>
                    <option value="earbuds">Earbuds</option>
                    <option value="tshirt">T-Shirt</option>
                    <option value="jeans">Jeans</option>
                    <option value="noodles">Noodles</option>
                    <option value="energydrink">Energy Drink</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. GRO-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="e.g. 890103001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cost / Buy Price ({storeInfo.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Selling Price ({storeInfo.currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-blue-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Low Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="KG, L, Pcs"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustStockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Adjust Stock: {adjustStockModalProduct.name}
              </h3>
              <button
                onClick={() => setAdjustStockModalProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustStock} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Current Stock:</p>
                <p className="text-xl font-bold font-mono text-slate-900">
                  {adjustStockModalProduct.stock} {adjustStockModalProduct.unit}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  New Stock Count
                </label>
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-lg font-mono font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustStockModalProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
