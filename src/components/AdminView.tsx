import React, { useMemo } from 'react';
import { useStore } from '../lib/store';
import { 
  ShieldCheck, Users, Eye, Building2, ToggleLeft, ToggleRight, 
  BarChart, Activity, Sparkles, Server, CheckCircle2 
} from 'lucide-react';

export default function AdminView() {
  const { allShops, toggleShopStatus } = useStore();

  const adminStats = useMemo(() => {
    const totalShops = allShops.length;
    const trialCount = allShops.filter(s => s.subscription_status === 'trial').length;
    const activeCount = allShops.filter(s => s.subscription_status === 'active' || s.subscription_status === 'trial').length;
    const suspendedCount = allShops.filter(s => s.subscription_status === 'suspended').length;

    return {
      totalShops,
      activeCount,
      trialCount,
      suspendedCount
    };
  }, [allShops]);

  return (
    <div className="space-y-6 font-sans text-left" id="super-admin-view">
      
      {/* HEADER ROW */}
      <div className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white rounded-2xl p-5 border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-50">SaaS Platform Admin Command Center</h2>
            <p className="text-indigo-200 text-xs mt-0.5">Global telemetry, multi-tenant billing analytics, and tenant activation systems</p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-indigo-300">
          <Server className="h-4 w-4 shrink-0" />
          <span>SERVER_NODE: CLOUD_RUN_US_CENTRAL_M1</span>
        </div>
      </div>

      {/* ADMIN METRICS bento cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="admin-stats-row">
        
        <div className="bg-white p-4.5 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Tenants Registered</span>
            <span className="block text-xl font-extrabold text-gray-950 mt-1 font-mono">{adminStats.totalShops} Shops</span>
          </div>
          <div className="h-9 w-9 bg-gray-50 text-gray-800 rounded-lg flex items-center justify-center font-bold">
            <Building2 className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Active Licenses</span>
            <span className="block text-xl font-extrabold text-emerald-700 mt-1 font-mono">{adminStats.activeCount} Live</span>
          </div>
          <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Billing Trial Period</span>
            <span className="block text-xl font-extrabold text-indigo-650 mt-1 font-mono">{adminStats.trialCount} Trials</span>
          </div>
          <div className="h-9 w-9 bg-indigo-50 text-indigo-650 rounded-lg flex items-center justify-center font-bold">
            <Activity className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Suspended Accounts</span>
            <span className="block text-xl font-extrabold text-red-700 mt-1 font-mono">{adminStats.suspendedCount} Locked</span>
          </div>
          <div className="h-9 w-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold">
            <BarChart className="h-4 w-4" />
          </div>
        </div>

      </div>

      {/* TENANT LIST MANAGENT PANEL */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest leading-none">Registered Shop List</h3>
            <span className="text-[10px] text-gray-500 mt-1 inline-block">Manage licenses, billing activations, and block violating establishments</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-left text-xs bg-white">
            <thead className="bg-gray-50 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Tenant Business Profile</th>
                <th className="px-5 py-3">Registered Contact info</th>
                <th className="px-5 py-3 text-center">Assigned Cur</th>
                <th className="px-5 py-3 text-center">License Status</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-750">
              {allShops.map(shop => {
                const isBlocked = shop.subscription_status === 'suspended';

                return (
                  <tr key={shop.id} className="hover:bg-gray-50 leading-loose transition-all">
                    <td className="px-5 py-3.5 font-bold text-gray-950">
                      <div className="flex items-center gap-2">
                        <div className="p-1 px-2.5 bg-gray-100 rounded font-mono text-[9px] font-semibold text-gray-550 border border-gray-150 uppercase shadow-3xs">
                          {shop.id.slice(0, 6)}
                        </div>
                        <div>
                          <span className="block">{shop.name}</span>
                          <span className="block text-[9px] text-gray-400 font-mono">Date added: {new Date(shop.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-650">
                      <span className="block font-medium">{shop.phone || 'No phone registered'}</span>
                      <span className="block text-[10px] text-gray-400 truncate max-w-xs">{shop.address || 'No address logged'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-extrabold font-mono text-gray-800">
                      {shop.currency}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${isBlocked 
                        ? 'bg-red-50 text-red-750 border-red-200' 
                        : (shop.subscription_status === 'trial' ? 'bg-indigo-50 text-indigo-750 border-indigo-200' : 'bg-emerald-50 text-emerald-750 border-emerald-200')
                      }`}>
                        {shop.subscription_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Toggle licensing code for shop: ${shop.name}?`)) {
                            toggleShopStatus(shop.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-gray-900 rounded-lg flex items-center justify-center mx-auto transition"
                        title={isBlocked ? 'Unlock' : 'Lock Account'}
                      >
                        {isBlocked ? (
                          <ToggleLeft className="h-6 w-6 text-red-500 hover:text-red-700" />
                        ) : (
                          <ToggleRight className="h-6 w-6 text-emerald-500 hover:text-emerald-700" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
