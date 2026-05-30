import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { 
  Store, CheckCircle, Palette, LogOut
} from 'lucide-react';

export default function SettingsView() {
  const { currentShop, settings, updateShopProfile, updateSettings, logout } = useStore();

  // Form states
  const [shopName, setShopName] = useState(currentShop?.name || '');
  const [phone, setPhone] = useState(currentShop?.phone || '');
  const [address, setAddress] = useState(currentShop?.address || '');
  const [taxRate, setTaxRate] = useState<number>(currentShop?.tax_rate || 5);
  const [invoiceFooter, setInvoiceFooter] = useState(currentShop?.invoice_footer || '');
  const [currency, setCurrency] = useState(currentShop?.currency || 'PKR');

  // Status message
  const [msg, setMsg] = useState('');

  // Synchronize React state hooks when currentShop updates dynamically (fixes empty settings fields upon initial mount)
  useEffect(() => {
    if (currentShop) {
      setShopName(currentShop.name || '');
      setPhone(currentShop.phone || '');
      setAddress(currentShop.address || '');
      setTaxRate(currentShop.tax_rate || 5);
      setInvoiceFooter(currentShop.invoice_footer || '');
      setCurrency(currentShop.currency || 'PKR');
    }
  }, [currentShop]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateShopProfile({
        name: shopName,
        phone,
        address,
        tax_rate: Number(taxRate),
        invoice_footer: invoiceFooter,
        currency
      });
      setMsg('Shop business metrics modified successfully.');
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setMsg('Could not save custom shop settings.');
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6 font-sans text-left max-w-4xl mx-auto" id="settings-view-panel">
      
      {/* SHOP METRIC PROFILE */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-5">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <Store className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Custom Shop settings</h3>
            <p className="text-[11px] text-gray-500">Modify details embedded on PDF invoice statements</p>
          </div>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs flex items-center gap-2 transition-all">
            <CheckCircle className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span className="font-semibold">{msg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Shop Name *</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 focus:ring-1 focus:ring-orange-500 focus:outline-none rounded-xl transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Currency Type</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 focus:ring-1 focus:ring-orange-500 focus:outline-none rounded-xl font-semibold text-gray-800 transition-all"
            >
              <option value="PKR">PKR (₨ - Pakistan)</option>
              <option value="INR">INR (₹ - India)</option>
              <option value="AED">AED (AED - United Arab Emirates)</option>
              <option value="$">USD ($ - United States Dollar)</option>
              <option value="SAR">SAR (SR - Saudi Arabia)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Shop Mobile Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 focus:ring-1 focus:ring-orange-500 focus:outline-none rounded-xl transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Milling Tax Rate (%)</label>
            <input
              type="number"
              min={0}
              required
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 focus:ring-1 focus:ring-orange-500 focus:outline-none rounded-xl font-mono transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Shop Address Location</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 focus:ring-1 focus:ring-orange-500 focus:outline-none rounded-xl transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Invoice Footer Subtext Notes</label>
            <input
              type="text"
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 focus:ring-1 focus:ring-orange-500 focus:outline-none rounded-xl transition-all"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end pt-3 border-t border-gray-100">
            <button
              type="submit"
              className="px-6 py-3 bg-gray-950 hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              Save Business Profile
            </button>
          </div>
        </form>
      </div>

      {/* PROFILE THEME CUSTOMIZATION PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-5" id="profile-theme-customizer-card">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <Palette className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Custom Profile Themes</h3>
            <p className="text-[11px] text-gray-500">Personalize the styling and workspace colors of your shop</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { id: 'light', name: 'Sunset Amber', bgClass: 'bg-orange-500', borderClass: 'border-orange-200', textClass: 'text-orange-700', desc: 'Warm golden rustic milling vibes' },
            { id: 'emerald', name: 'Emerald Organic', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-200', textClass: 'text-emerald-700', desc: 'Fresh minty organic grain workspace' },
            { id: 'royal', name: 'Royal Velvet', bgClass: 'bg-indigo-600', borderClass: 'border-indigo-200', textClass: 'text-indigo-700', desc: 'Sovereign indigo executive styling' },
            { id: 'dark', name: 'Midnight Cosmic', bgClass: 'bg-slate-800', borderClass: 'border-slate-700', textClass: 'text-slate-200', desc: 'Sleek eye-safe charcoal dark theme' }
          ].map((th) => {
            const active = (settings?.theme || 'light') === th.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={async () => {
                  try {
                    await updateSettings({ theme: th.id });
                    setMsg(`Active workspace profile theme updated to "${th.name}"!`);
                    setTimeout(() => setMsg(''), 4000);
                  } catch (e: any) {
                    alert('Could not update profile theme setting: ' + e.message);
                  }
                }}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  active ? 'border-orange-600 bg-orange-50/20 shadow-xs ring-1 ring-orange-500' : 'border-gray-200 bg-gray-50/30 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-5 w-5 rounded-full ${th.bgClass} flex items-center justify-center border border-white shrink-0 shadow-xs`} />
                    <span className="font-bold text-xs text-gray-900">{th.name}</span>
                  </div>
                  {active && (
                    <span className="text-[9px] bg-orange-600 text-white font-extrabold px-2 py-0.5 rounded-lg shrink-0">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">{th.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SESSION MANAGEMENT PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-gray-900">Workspace Control Session</h4>
          <p className="text-[10.5px] text-gray-500 mt-1">Exit your active terminal session on this device securely.</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-5 py-2.5 border border-red-200 hover:bg-red-50 text-red-650 font-bold rounded-xl transition cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-xs">Log Out Session</span>
        </button>
      </div>

    </div>
  );
}
