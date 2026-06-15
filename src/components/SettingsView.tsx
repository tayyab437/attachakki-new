import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { 
  Store, CheckCircle, Palette, LogOut, Database, CloudLightning, Download, Upload, Info, RefreshCw, AlertTriangle
} from 'lucide-react';
import { config, getMaskedUrl, getMaskedKey } from '../lib/supabase';
import { getPKTodayString } from '../lib/time';


export default function SettingsView() {
  const { currentShop, settings, updateShopProfile, updateSettings, logout } = useStore();

  // Form states
  const [shopName, setShopName] = useState(currentShop?.name || '');
  const [phone, setPhone] = useState(currentShop?.phone || '');
  const [address, setAddress] = useState(currentShop?.address || '');
  const [taxRate, setTaxRate] = useState<number>(currentShop?.tax_rate ?? 0);
  const [invoiceFooter, setInvoiceFooter] = useState(currentShop?.invoice_footer || '');
  const [currency, setCurrency] = useState(currentShop?.currency || 'PKR');

  // Status message
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Supabase connection & state synchronization overrides
  const [supaUrl, setSupaUrl] = useState(localStorage.getItem('supa_url_override') || '');
  const [supaKey, setSupaKey] = useState(localStorage.getItem('supa_key_override') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveSupabaseCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErrorMsg('');
    
    if (!supaUrl.trim() || !supaKey.trim()) {
      setErrorMsg('Please enter both Supabase URL and Anon API key.');
      return;
    }

    if (!supaUrl.toLowerCase().startsWith('http://') && !supaUrl.toLowerCase().startsWith('https://')) {
      setErrorMsg('Invalid URL: Project URL must start with http:// or https://');
      return;
    }

    try {
      localStorage.setItem('supa_url_override', supaUrl.trim());
      localStorage.setItem('supa_key_override', supaKey.trim());
      localStorage.removeItem('force_offline');
      setMsg('Supabase cloud connection configuration saved! Connecting and refreshing assets...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorMsg('Failed to save configuration coordinates: ' + err.message);
    }
  };

  const clearSupabaseCredentials = () => {
    localStorage.removeItem('supa_url_override');
    localStorage.removeItem('supa_key_override');
    setMsg('Credentials successfully wiped. Reverting device to standard universal cloud database. Refreshing...');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleExportBackup = () => {
    try {
      const backupData: { [key: string]: any } = {};
      const tables = [
        'shops', 'profiles', 'categories', 'products', 'inventory_logs', 
        'customers', 'customer_transactions', 'suppliers', 'supplier_transactions', 
        'expenses', 'sales', 'sale_items', 'invoices', 'notifications', 
        'activity_logs', 'settings'
      ];
      tables.forEach(table => {
        const data = localStorage.getItem(`flour_db_${table}`);
        if (data) {
          try {
            backupData[table] = JSON.parse(data);
          } catch (e) {
            backupData[table] = data;
          }
        }
      });

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `atta_mill_local_backup_${getPKTodayString()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setMsg('Device database snapshot successfully saved as standard JSON.');
      setTimeout(() => setMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg('Could not export backup: ' + err.message);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Provided file is not a valid JSON structure.');
          }
          
          let importedCount = 0;
          Object.keys(parsed).forEach(table => {
            const rawValue = parsed[table];
            const serialized = typeof rawValue === 'object' ? JSON.stringify(rawValue) : rawValue;
            localStorage.setItem(`flour_db_${table}`, serialized);
            importedCount++;
          });
          
          if (importedCount > 0) {
            setMsg('Success! All local tables restored. Reloading directory canvas...');
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            setErrorMsg('Selected backup database did not yield any recognized elements.');
          }
        } catch (err: any) {
          setErrorMsg('Failed parsing backup format: ' + err.message);
        }
      };
    }
  };

  // Synchronize React state hooks when currentShop updates dynamically (fixes empty settings fields upon initial mount)
  useEffect(() => {
    if (currentShop) {
      setShopName(currentShop.name || '');
      setPhone(currentShop.phone || '');
      setAddress(currentShop.address || '');
      setTaxRate(currentShop.tax_rate ?? 0);
      setInvoiceFooter(currentShop.invoice_footer || '');
      setCurrency(currentShop.currency || 'PKR');
    }
  }, [currentShop]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErrorMsg('');
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
      setTimeout(() => setMsg(''), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Could not save custom shop settings. Falling back to local offline safety.');
      setTimeout(() => setErrorMsg(''), 7000);
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

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs flex items-center gap-2 transition-all">
            <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold shrink-0 text-[10px]">!</div>
            <span className="font-semibold">Notice: {errorMsg}</span>
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

      {/* CLOUD DATABASE & MULTI-DEVICE SYNC */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-5" id="cloud-database-sync-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Database className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Cloud & Multi-Device Sync</h3>
              <p className="text-[11px] text-gray-500">Universal cloud database connected via global environment secrets</p>
            </div>
          </div>
          
          <div>
            {config.isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Cloud Sync Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-805 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Offline Mode (Local Storage)
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 text-xs font-medium text-gray-750">
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-[11px] leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-indigo-900">
              <CloudLightning className="h-4 w-4 shrink-0 text-indigo-600 animate-bounce" />
              <span>Universal Zero-Setup Account Sharing is Active!</span>
            </div>
            <p className="text-indigo-805 text-xs font-semibold">
              Great news! Your flour shop ledger, customer list, dry stock heights, and invoice history are securely connected to the **universal Supabase cloud database** configured using the secrets you provided.
            </p>
            <p className="text-indigo-800 text-[11px]">
              Because it is configured universally at the build-time system level:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-indigo-805 font-bold text-[11px]">
              <li>You don't need to manually configure anything on mobile phones, tablets, or other laptops!</li>
              <li>Anyone opening this application (your field partners, employees, or customers) at different places with different devices will **instantly load the same central accounts and databases** perfectly!</li>
              <li>Data is saved in real-time, meaning instant live updates of stock edits, sales, or credit repayments.</li>
            </ul>
          </div>

          {config.isOnline ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl text-[11px] leading-relaxed text-emerald-800">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Your device is live and synced universally via protected workspace secrets! No manual credentials required.
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Universal Supabase URL</label>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                      🔒 Protected Secret
                    </span>
                  </div>
                  <input
                    type="text"
                    value={getMaskedUrl()}
                    disabled
                    readOnly
                    className="w-full text-xs p-3 bg-gray-50/80 border border-gray-200 focus:outline-none rounded-xl font-mono text-gray-400 select-all cursor-not-allowed"
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Universal Anon Key</label>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                      🔒 Protected Secret
                    </span>
                  </div>
                  <input
                    type="text"
                    value={getMaskedKey()}
                    disabled
                    readOnly
                    className="w-full text-xs p-3 bg-gray-50/80 border border-gray-200 focus:outline-none rounded-xl font-mono text-gray-400 select-none cursor-not-allowed"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                   await useStore.getState().syncLocalToCloud();
                   alert("Universal Sync Complete! The cloud database has been successfully updated with all local accounts and records.");
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold tracking-wider text-[11px] uppercase rounded-xl transition-all cursor-pointer flex items-center gap-2 justify-center"
                >
                  <RefreshCw className="h-4 w-4" />
                  Push Local Data to Universal Cloud
                </button>
                <p className="text-[10px] text-gray-500 mt-2 font-medium">Click this if you registered accounts or created shops in Sandbox mode and want them securely transferred to your global Cloud instance so staff can login from anywhere.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={saveSupabaseCredentials} className="space-y-4">
              <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl text-[11px] leading-relaxed text-amber-800">
                <span>The app is currently running in local-only fallback mode. To enable automatic live cloud syncing universally for all devices, make sure to add your Supabase credentials to the workspace secrets.</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Supabase Project URL</label>
                  <input
                    type="text"
                    value={supaUrl}
                    onChange={(e) => setSupaUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl font-mono transition-all text-gray-800"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Supabase Anon Key</label>
                  <input
                    type="password"
                    value={supaKey}
                    onChange={(e) => setSupaKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6..."
                    className="w-full text-xs p-3 bg-gray-50/50 border border-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl font-mono transition-all text-gray-800"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-[10px] text-gray-400 italic max-w-sm">
                  Once credentials are saved locally or in system secrets, your device will immediately synchronize.
                </p>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-705 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-xs flex items-center gap-2 uppercase tracking-wider"
                >
                  <CloudLightning className="h-4 w-4 animate-bounce text-yellow-400 shrink-0" />
                  Connect Live Database
                </button>
              </div>
            </form>
          )}

          {config.isOnline && (localStorage.getItem('supa_url_override') || localStorage.getItem('supa_key_override')) && (
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={clearSupabaseCredentials}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Clear Override Local Credentials
              </button>
            </div>
          )}
        </div>
      </div>

      {/* OFFLINE DATABASE BACKUP & RESTORE / MIGRATION PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-5" id="offline-data-migration-card">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-2.5 bg-amber-50 rounded-xl">
            <RefreshCw className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-950">Device Data Backup & Migration</h3>
            <p className="text-[11px] text-gray-500">Download your laptop's current offline database and restore it easily on another smartphone or browser</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 leading-relaxed text-xs">
          
          {/* Card left: Export Backup */}
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-150 flex flex-col justify-between space-y-4">
            <div>
              <span className="block font-black text-xs text-gray-950 flex items-center gap-1.5 uppercase tracking-wide">
                <Download className="h-4 w-4 text-emerald-600" />
                1. Save Backup
              </span>
              <p className="text-[10.5px] text-gray-500 mt-2">
                Export all your offline chakki data (customers, products, invoices, credit ledger bookings) into a single, compact backup file. Keeping copies safe guards against accidental browser data clearing.
              </p>
            </div>
            
            <button
              onClick={handleExportBackup}
              className="w-full sm:w-fit px-4 py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-3xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download Offline Backup (JSON)
            </button>
          </div>

          {/* Card right: Import / Restore */}
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-150 flex flex-col justify-between space-y-4">
            <div>
              <span className="block font-black text-xs text-gray-950 flex items-center gap-1.5 uppercase tracking-wide">
                <Upload className="h-4 w-4 text-blue-600" />
                2. Restore / Import
              </span>
              <p className="text-[10.5px] text-gray-500 mt-2">
                Upload your previously saved `.json` backup file on any other mobile phone or web browser to instantly copy and restore your entire shop configuration!
              </p>
            </div>

            <div className="space-y-1">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-fit px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-3xs"
              >
                <Upload className="h-3.5 w-3.5" />
                Restore / Upload JSON Backup
              </button>
            </div>
          </div>

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
