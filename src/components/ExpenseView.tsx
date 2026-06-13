import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  Coins, Plus, Search, Trash2, Calendar, Sparkles, AlertCircle, 
  Lightbulb, Truck, UserCheck, HardHat, Warehouse, Briefcase,
  Package, TrendingUp
} from 'lucide-react';
import { Expense } from '../types';

export default function ExpenseView() {
  const { expenses, addExpense, deleteExpense, currentShop } = useStore();
  
  // States
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<'Electricity' | 'Transport' | 'Labor' | 'Rent' | 'Packaging' | 'Maintenance' | 'Other'>('Electricity');
  const [amount, setAmount] = useState<number>(1000);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const primaryCurrency = currentShop?.currency || 'PKR';

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedCategory, searchTerm]);

  const sumTotalOutflow = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const globalTotalOutflow = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;

    addExpense({
      category,
      amount: Number(amount),
      description,
      date
    });

    setDescription('');
    setAmount(1000);
    setShowForm(false);
  };

  // Helper icons for operational categories
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Electricity': return <Lightbulb className="h-4 w-4 text-yellow-600" />;
      case 'Transport': return <Truck className="h-4 w-4 text-indigo-650" />;
      case 'Labor': return <UserCheck className="h-4 w-4 text-emerald-600" />;
      case 'Rent': return <Warehouse className="h-4 w-4 text-blue-600" />;
      case 'Maintenance': return <HardHat className="h-4 w-4 text-orange-600" />;
      case 'Packaging': return <Package className="h-4 w-4 text-purple-600" />;
      default: return <Briefcase className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 font-sans" id="expenses-ledger-page">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Operational Expenditures</h2>
          <p className="text-xs text-gray-500">Log mill utility drafts (Electricity), worker daily wages, local packaging, and machinery oiling.</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-950 hover:bg-gray-900 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Record Operation Cost</span>
        </button>
      </div>

      {/* NEW EXPENSE FORM */}
      {showForm && (
        <div className="bg-amber-50/50 border border-amber-200/50 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-orange-950 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-orange-600" />
            <span>Onboard Outflow Operating Cost</span>
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Outflow Category *</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              >
                <option value="Electricity">Electricity Motor Bills</option>
                <option value="Transport">Transport Loading Loader</option>
                <option value="Labor">Labor Worker Wages</option>
                <option value="Rent">Milling Shop Rent</option>
                <option value="Packaging">Plastic / Paper Sacks Packaging</option>
                <option value="Maintenance">Chakki Machine Maintenance</option>
                <option value="Other">Other Expenditures / Diesel</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Expense Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Milling Cost ({primaryCurrency}) *</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl font-bold font-mono text-gray-800"
              />
            </div>

            <div className="md:col-span-4 select-none">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Audit Ledger Narrative / Descriptions *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cleared high wattage motors 3-phase electricity invoice #82910..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div className="md:col-span-4 flex items-center justify-end gap-2 pt-1">
              <button 
                onClick={() => setShowForm(false)} 
                type="button" 
                className="px-4 py-2 border border-gray-205 text-gray-650 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Log Outflow Expenditure
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXPENSE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Outflow aggregated stats */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center justify-between col-span-1">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtered Costs</span>
            <div className="text-2xl font-extrabold text-gray-900 font-mono">
              {primaryCurrency} {sumTotalOutflow.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-500">Based on active filters.</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex items-center justify-between col-span-1">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Ledger Drafts</span>
            <div className="text-2xl font-extrabold text-gray-800 font-mono">
              {primaryCurrency} {globalTotalOutflow.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-500">Grand total all logs.</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Categories search filters card */}
        <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs md:col-span-2 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search narrative notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 bg-gray-50 text-gray-800 border border-gray-200 focus:outline-none rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <span className="text-xs text-gray-500 font-semibold">Cost center:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full md:w-44 bg-gray-50 border border-gray-200 text-gray-700 py-1.5 px-3 rounded-xl focus:outline-none text-xs"
            >
              <option value="all">All Expenditures</option>
              <option value="Electricity">Motor Electricity</option>
              <option value="Labor">Labor wages</option>
              <option value="Transport">Diesel Transport</option>
              <option value="Rent">Machinery / Rent</option>
              <option value="Packaging">Sacks Packaging</option>
              <option value="Maintenance">Mill Maintenance</option>
              <option value="Other">Other Expenses</option>
            </select>
          </div>
        </div>

      </div>

      {/* EXPENDITURES TABLE STATEMENT */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            No expenditure logs correspond to your active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-left text-xs bg-white">
              <thead className="bg-gray-50 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Expense Category</th>
                  <th className="px-5 py-3">Expense Narrative Description</th>
                  <th className="px-5 py-3">Incurred Date</th>
                  <th className="px-5 py-3 text-right">Draft Amount ({primaryCurrency})</th>
                  <th className="px-5 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-750">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50 leading-loose transition-all">
                    <td className="px-5 py-3.5 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded-lg shrink-0">
                          {getCategoryIcon(exp.category)}
                        </div>
                        <span>{exp.category}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 max-w-sm font-medium text-gray-650 truncate italic">
                      "{exp.description}"
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-500 font-medium">
                      {new Date(exp.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-red-700 font-mono text-xs">
                      {exp.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => {
                          if (confirm('Verify: sure to delete logged cost?')) {
                            deleteExpense(exp.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-750 hover:bg-red-50 rounded-lg"
                        title="Delete log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
