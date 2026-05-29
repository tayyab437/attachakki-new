import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { 
  Settings, Store, Key, Database, RefreshCw, FileText, CheckCircle, 
  Sparkles, ShieldCheck, Download, AlertTriangle, Copy, Trash 
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

  // Supabase live configuration overrides
  const [supaUrl, setSupaUrl] = useState(localStorage.getItem('supa_url_override') || '');
  const [supaKey, setSupaKey] = useState(localStorage.getItem('supa_key_override') || '');
  const [showCopyAlert, setShowCopyAlert] = useState(false);

  // States
  const [msg, setMsg] = useState('');

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopProfile({
      name: shopName,
      phone,
      address,
      tax_rate: Number(taxRate),
      invoice_footer: invoiceFooter,
      currency
    });
    setMsg('Shop business metrics modified successfully.');
    setTimeout(() => setMsg(''), 4000);
  };

  // Save Supabase Overrides
  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (supaUrl.trim() && supaKey.trim()) {
      localStorage.setItem('supa_url_override', supaUrl.trim());
      localStorage.setItem('supa_key_override', supaKey.trim());
      alert('Supabase Live Key Override registered! Reloading compiler settings.');
      window.location.reload();
    } else {
      localStorage.removeItem('supa_url_override');
      localStorage.removeItem('supa_key_override');
      alert('Cleared overrides. Falling back to secure multi-tenant sandbox.');
      window.location.reload();
    }
  };

  const sqlSchemaText = `-- ====================================================
-- SUPABASE 20-TABLE CHAKKI SAAS SCHEMA
-- ====================================================

-- 1. Create Shops Table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  currency TEXT DEFAULT 'PKR',
  tax_rate NUMERIC DEFAULT 5,
  invoice_footer TEXT,
  subscription_status TEXT DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- 2. Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  unit TEXT CHECK (unit IN ('KG', 'Bag', 'Maund', 'Ton')),
  cost_price NUMERIC NOT NULL,
  sale_price NUMERIC NOT NULL,
  stock NUMERIC DEFAULT 0,
  min_stock_alert NUMERIC DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 3. Row level policies (Only access shop owner data)
CREATE POLICY shop_owners_access ON products
  FOR ALL TO authenticated
  USING (shop_id = (SELECT shop_id FROM profiles WHERE id = auth.uid()));
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchemaText);
    setShowCopyAlert(true);
    setTimeout(() => setShowCopyAlert(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-left" id="settings-view-panel">
      
      {/* SHOP METRIC PROFILE (2/3 Width) */}
      <div className="lg:col-span-2 space-y-6">
        
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Store className="h-5 w-5 text-orange-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Custom Shop settings</h3>
              <p className="text-[11px] text-gray-505">Modify details embedded on PDF invoice statements</p>
            </div>
          </div>

          {msg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>{msg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Shop Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Currency Type</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl font-semibold text-gray-800"
              >
                <option value="PKR">PKR (₨ - Pakistan)</option>
                <option value="INR">INR (₹ - India)</option>
                <option value="AED">AED (AED - United Arab Emirates)</option>
                <option value="$">USD ($ - United States Dollar)</option>
                <option value="SAR">SAR (SR - Saudi Arabia)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Shop Mobile Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Milling Tax Rate (%)</label>
              <input
                type="number"
                min={0}
                required
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Shop Address Location</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Invoice Footer Subtext Notes</label>
              <input
                type="text"
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-end pt-2 border-t border-gray-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gray-950 hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Save Business Profile
              </button>
            </div>
          </form>
        </div>

        {/* COPYABLE SQL SCHEMA PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-650" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">Supabase SQL Schema Bootstrap</h3>
                <p className="text-[11px] text-gray-500">Run this code inside your Supabase SQL editor to create the tables</p>
              </div>
            </div>

            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold rounded-lg transition"
            >
              <Copy className="h-3 w-3" />
              <span>{showCopyAlert ? 'Copied Code!' : 'Copy SQL'}</span>
            </button>
          </div>

          <div className="bg-gray-950 p-4 rounded-xl font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-[190px]">
            <pre>{sqlSchemaText}</pre>
          </div>
        </div>

      </div>

      {/* SUPABASE DEPLOY OVERRIDES (1/3 Width) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs space-y-4 h-fit" id="supabase-config-col">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <Database className="h-5 w-5 text-orange-600" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Custom Database Overrides</h3>
            <p className="text-[11px] text-gray-500">Connect to your live database instantly</p>
          </div>
        </div>

        {localStorage.getItem('supa_url_override') ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Direct Link Active!</span>
            </div>
            <p className="leading-relaxed">Your application is making live queries directly with your private Supabase container host.</p>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-[11px] text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span>Currently in Sandbox mode</span>
            </div>
            <p className="leading-relaxed">Running on LocalDatabase mock state. Enter credentials below to switch connection.</p>
          </div>
        )}

        <form onSubmit={handleSaveSupabase} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase">VITE_SUPABASE_URL</label>
            <input
              type="text"
              placeholder="e.g. https://xyz.supabase.co"
              value={supaUrl}
              onChange={(e) => setSupaUrl(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase">VITE_SUPABASE_ANON_KEY</label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
              value={supaKey}
              onChange={(e) => setSupaKey(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 focus:outline-none rounded-xl font-mono"
            />
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {supaUrl ? 'Sync Custom Database' : 'Connect Custom DB'}
            </button>

            {localStorage.getItem('supa_url_override') && (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('supa_url_override');
                  localStorage.removeItem('supa_key_override');
                  setSupaUrl('');
                  setSupaKey('');
                  alert('Reset. Reloading environment.');
                  window.location.reload();
                }}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Clear Override & Run Offline
              </button>
            )}
          </div>
        </form>

        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={logout}
            className="w-full py-2 border border-red-200 hover:bg-red-50 text-red-650 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Log Out Session
          </button>
        </div>
      </div>

    </div>
  );
}
