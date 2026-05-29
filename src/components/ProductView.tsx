import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  Package, Plus, Search, Tag, Trash2, Edit2, AlertCircle, Sparkles, 
  Settings, CheckCircle, Scale, Coins, Info 
} from 'lucide-react';
import { Product } from '../types';

export default function ProductView() {
  const { products, categories, addProduct, updateProduct, deleteProduct, addCategory, currentShop } = useStore();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New product form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category_id, setCategoryId] = useState('');
  const [unit, setUnit] = useState<'KG' | 'Bag' | 'Maund' | 'Ton'>('KG');
  const [cost_price, setCostPrice] = useState<number>(100);
  const [sale_price, setSalePrice] = useState<number>(130);
  const [stock, setStock] = useState<number>(50);
  const [min_stock_alert, setMinStockAlert] = useState<number>(20);

  // New Category States
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Search filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      category_id: category_id || null,
      name,
      sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
      unit,
      cost_price: Number(cost_price),
      sale_price: Number(sale_price),
      stock: Number(stock),
      min_stock_alert: Number(min_stock_alert),
      image_url: null
    };

    if (editingId) {
      updateProduct(editingId, payload);
    } else {
      addProduct(payload);
    }

    resetForm();
  };

  const handleEdit = (prod: Product) => {
    setEditingId(prod.id);
    setName(prod.name);
    setSku(prod.sku);
    setCategoryId(prod.category_id || '');
    setUnit(prod.unit);
    setCostPrice(prod.cost_price);
    setSalePrice(prod.sale_price);
    setStock(prod.stock);
    setMinStockAlert(prod.min_stock_alert);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSku('');
    setCategoryId('');
    setUnit('KG');
    setCostPrice(100);
    setSalePrice(130);
    setStock(50);
    setMinStockAlert(20);
    setShowForm(false);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName, newCatDesc);
    setNewCatName('');
    setNewCatDesc('');
    setShowCatForm(false);
  };

  const primaryCurrency = currentShop?.currency || 'PKR';

  return (
    <div className="space-y-6" id="product-master-panel">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Milling & Flour Catalog</h2>
          <p className="text-xs text-gray-500">Add grain variants, wheat flour (Atta/Maida) prices, and trigger alerts.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatForm(true)}
            className="flex items-center gap-1 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>New Category</span>
          </button>

          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1 px-4 py-2 bg-gray-950 hover:bg-gray-900 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Flour</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS ROW */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 border border-gray-150 rounded-2xl shadow-3xs">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search flour name or SKU code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-gray-50 text-gray-800 border border-gray-200 focus:border-gray-500 rounded-xl focus:outline-none focus:bg-white text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-gray-500 shrink-0">Flour Segment:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full md:w-48 bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-3 rounded-xl focus:outline-none text-xs"
          >
            <option value="all">All Category Products</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CATEGORY FORM MODAL SIMULATOR */}
      {showCatForm && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-150 shadow-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900">Add Flour Category</span>
              <button onClick={() => setShowCatForm(false)} className="text-xs text-gray-400 hover:text-gray-900">Close</button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Category Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bran Feed / Fine Atta"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Details"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:bg-white rounded-xl h-20"
                ></textarea>
              </div>
              <button type="submit" className="w-full text-xs font-bold py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors">
                Save Segment Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MAIN ADD/EDIT FORM */}
      {showForm && (
        <div className="bg-amber-50/50 border border-amber-200/50 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-orange-950 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-orange-600" />
              <span>{editingId ? 'Modify Premium Flour Entry' : 'Configure New Flour Product'}</span>
            </h3>
            <button onClick={resetForm} className="text-xs font-semibold text-gray-500 hover:text-gray-900">
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Product/Flour Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Chakki Atta (Sargodha Grade-A)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">SKU Master Code</label>
              <input
                type="text"
                placeholder="Auto-generated"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Category Segment</label>
              <select
                value={category_id}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              >
                <option value="">Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sale Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              >
                <option value="KG">KG (Standard/Retail)</option>
                <option value="Bag">Bag (Sack / Bulk Packaging)</option>
                <option value="Maund">Maund (40 KG Native Unit)</option>
                <option value="Ton">Ton (Metric Tons)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Cost Price ({primaryCurrency}) *</label>
              <input
                type="number"
                min={0}
                required
                value={cost_price}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Milled Sale Price ({primaryCurrency}) *</label>
              <input
                type="number"
                min={0}
                required
                value={sale_price}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl font-mono"
              />
            </div>

            {!editingId && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Initial Stock Sacks</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Minimum Alert Guard</label>
              <input
                type="number"
                min={0}
                required
                value={min_stock_alert}
                onChange={(e) => setMinStockAlert(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl font-mono"
              />
            </div>

            <div className="md:col-span-4 flex items-center justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {editingId ? 'Modify Premium Flour' : 'Seed Milled Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRODUCTS DISPLAY LIST */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Package className="h-10 w-10 text-gray-300 mx-auto" />
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">No Products Logged</h4>
            <p className="text-gray-400 text-[11px]">Begin by adding your milled wheat grains or bags above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-xs bg-white">
              <thead className="bg-gray-50 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Flour Product Info</th>
                  <th className="px-5 py-3.5 text-center">SKU Code</th>
                  <th className="px-5 py-3.5">Category Seg</th>
                  <th className="px-5 py-3.5 text-right">Cost ({primaryCurrency})</th>
                  <th className="px-5 py-3.5 text-right">Retail ({primaryCurrency})</th>
                  <th className="px-5 py-3.5 text-center">Profit margin</th>
                  <th className="px-5 py-3.5 text-center">Live Stock</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredProducts.map(prod => {
                  const catName = categories.find(c => c.id === prod.category_id)?.name || 'Uncategorized';
                  const marginAmt = prod.sale_price - prod.cost_price;
                  const marginPercentage = ((marginAmt / prod.sale_price) * 100).toFixed(0);
                  const isLow = prod.stock <= prod.min_stock_alert;

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50 leading-loose transition-all">
                      <td className="px-5 py-3.5 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className={`block h-2 w-2 rounded-full shrink-0 ${isLow ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                          <div>
                            <span className="block">{prod.name}</span>
                            <span className="block text-[9px] font-mono font-medium text-gray-400 uppercase tracking-wider">Unit: {prod.unit}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-gray-500 text-[11px]">{prod.sku}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-150">
                          {catName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-gray-650">{prod.cost_price}</td>
                      <td className="px-5 py-3.5 text-right font-bold font-mono text-gray-900">{prod.sale_price}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          +{marginPercentage}% ({primaryCurrency} {marginAmt})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold ${isLow ? 'bg-amber-100 text-amber-800 border border-amber-200 shadow-3xs' : 'bg-gray-100 text-gray-800'}`}>
                          {prod.stock.toLocaleString()} {prod.unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleEdit(prod)}
                            className="p-1 px-2 hover:bg-gray-100 hover:text-gray-900 rounded-lg text-gray-400 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Sure you want to delete ${prod.name}?`)) {
                                deleteProduct(prod.id);
                              }
                            }}
                            className="p-1 px-2 hover:bg-red-50 hover:text-red-700 rounded-lg text-gray-400 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

    </div>
  );
}
