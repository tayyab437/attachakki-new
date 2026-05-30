import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { UserRole } from '../types';
import { 
  ShieldCheck, Users, Eye, Building2, ToggleLeft, ToggleRight, 
  BarChart, Activity, Sparkles, Server, CheckCircle2, PlusCircle,
  Pencil, Save, Key, Trash2, ArrowRightLeft, Lock, RefreshCcw,
  UserCheck, GraduationCap, Coins, MapPin, Phone
} from 'lucide-react';

export default function AdminView() {
  const { 
    allShops, 
    allProfiles,
    toggleShopStatus, 
    createShopAdmin, 
    createUserAdmin, 
    updateUserAdmin, 
    switchShopWorkspace,
    currentShop,
    currentUser
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'shops' | 'users' | 'provision'>('shops');
  
  // Status feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. New Shop Form State
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCurrency, setShopCurrency] = useState('PKR');

  // 2. New User Form State
  const [userEmail, setUserEmail] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [userShopId, setUserShopId] = useState('');
  const [userPassword, setUserPassword] = useState('1234');

  // 3. Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('owner');
  const [editShopId, setEditShopId] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Core telemetry stats
  const adminStats = useMemo(() => {
    const totalShops = allShops.length;
    const totalUsers = allProfiles.length;
    const activeShops = allShops.filter(s => s.subscription_status === 'active' || s.subscription_status === 'trial').length;
    const trialCount = allShops.filter(s => s.subscription_status === 'trial').length;
    const suspendedCount = allShops.filter(s => s.subscription_status === 'suspended').length;

    return {
      totalShops,
      totalUsers,
      activeShops,
      trialCount,
      suspendedCount
    };
  }, [allShops, allProfiles]);

  // Form Submissions
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    if (!shopName.trim()) {
      setErrorMsg('Mill / Shop name is required.');
      return;
    }
    try {
      await createShopAdmin(shopName.trim(), shopPhone.trim(), shopAddress.trim(), shopCurrency);
      setSuccessMsg(`Mill establishment "${shopName}" registered successfully.`);
      setShopName('');
      setShopPhone('');
      setShopAddress('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred creating mill profile.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    if (!userFullName.trim() || !userEmail.trim()) {
      setErrorMsg('Full name and email are strictly required.');
      return;
    }
    if (!userShopId) {
      setErrorMsg('Please assign this user profile to an active flour shop.');
      return;
    }
    try {
      await createUserAdmin({
        email: userEmail.trim(),
        full_name: userFullName.trim(),
        role: userRole,
        shop_id: userShopId,
        password: userPassword
      });
      setSuccessMsg(`Provisioned user account "${userFullName}" correctly.`);
      setUserEmail('');
      setUserFullName('');
      setUserPassword('1234');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred provisioning user.');
    }
  };

  const startEditingUser = (user: any) => {
    setEditingUserId(user.id);
    setEditFullName(user.full_name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditShopId(user.shop_id);
    setEditPassword(user.password || '1234');
  };

  const handleSaveUserEdit = async (id: string) => {
    setSuccessMsg('');
    setErrorMsg('');
    if (!editFullName.trim() || !editEmail.trim()) {
      setErrorMsg('Name and email cannot be blank.');
      return;
    }
    try {
      await updateUserAdmin(id, {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        role: editRole,
        shop_id: editShopId,
        password: editPassword
      });
      setSuccessMsg('User database record modified successfully.');
      setEditingUserId(null);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating user.');
    }
  };

  const handleImpersonate = async (shopId: string, userId?: string) => {
    setSuccessMsg('');
    try {
      const shop = allShops.find(s => s.id === shopId);
      if (!shop) return;
      await switchShopWorkspace(shopId, userId);
      setSuccessMsg(`Workspace switched! You are now managing: ${shop.name}`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not switch environment workspace.');
    }
  };

  return (
    <div className="space-y-6 font-sans text-left" id="super-admin-view">
      
      {/* SaaS Admin Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 text-white/5 font-extrabold translate-x-12 translate-y-[-10px] text-8xl pointer-events-none uppercase">
          SAAS
        </div>
        <div className="flex items-start gap-3 relative z-10">
          <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-xl shrink-0 mt-0.5 animate-pulse">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-50 flex items-center gap-2">
              Chakki SaaS Super User Terminal
              <span className="bg-orange-550 text-black font-extrabold text-[8px] tracking-widest uppercase px-1.5 py-0.5 rounded">
                ROOT MODE
              </span>
            </h2>
            <p className="text-indigo-200 text-xs mt-0.5">Globally configure tenant memberships, view active credentials/passwords, and manage store catalog databases</p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-indigo-300 relative z-10 bg-indigo-950/40 p-1.5 px-3 rounded-lg border border-indigo-900/30">
          <Server className="h-4 w-4 shrink-0" />
          <span>PORT: 3000 | USER: {currentUser?.email}</span>
        </div>
      </div>

      {/* FEEDBACK SYSTEM */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-r-xl text-xs flex items-center gap-3 transition-all animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-800 border-l-4 border-red-500 rounded-r-xl text-xs flex items-center gap-3 transition-all">
          <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold shrink-0 text-xs">!</div>
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* ADMIN METRICS row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="admin-stats-row">
        
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Total Shops</span>
            <span className="block text-lg font-extrabold text-gray-950 mt-1 font-mono">{adminStats.totalShops} Mills</span>
          </div>
          <div className="h-9 w-9 bg-gray-50 text-gray-800 rounded-xl flex items-center justify-center font-bold">
            <Building2 className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Total Logins</span>
            <span className="block text-lg font-extrabold text-blue-700 mt-1 font-mono">{adminStats.totalUsers} profiles</span>
          </div>
          <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Licensing Active</span>
            <span className="block text-lg font-extrabold text-emerald-700 mt-1 font-mono">{adminStats.activeShops} Live</span>
          </div>
          <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400">Trial Period</span>
            <span className="block text-lg font-extrabold text-indigo-650 mt-1 font-mono">{adminStats.trialCount} Trials</span>
          </div>
          <div className="h-9 w-9 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center font-bold">
            <Activity className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-3xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-bold text-gray-400 font-extrabold">Suspended Accounts</span>
            <span className="block text-lg font-extrabold text-red-700 mt-1 font-mono">{adminStats.suspendedCount} Locked</span>
          </div>
          <div className="h-9 w-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold">
            <BarChart className="h-4 w-4" />
          </div>
        </div>

      </div>

      {/* TABBED INTERFACE SELECTOR */}
      <div className="border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 py-1">
          <button
            onClick={() => { setActiveSubTab('shops'); setEditingUserId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${activeSubTab === 'shops' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Mills & Shops Directory ({allShops.length})
          </button>
          
          <button
            onClick={() => { setActiveSubTab('users'); setEditingUserId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${activeSubTab === 'users' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
          >
            <Users className="h-3.5 w-3.5" />
            Registered Staff & Users ({allProfiles.length})
          </button>
          
          <button
            onClick={() => { setActiveSubTab('provision'); setEditingUserId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${activeSubTab === 'provision' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Register Mill / Add User
          </button>
        </div>

        <div className="text-[10px] text-gray-500 font-bold bg-gray-50 p-1.5 px-3 border border-gray-200 rounded-lg">
          Currently Switched Workspace: <span className="text-orange-700 underline font-extrabold">{currentShop?.name}</span>
        </div>
      </div>

      {/* TAB 1: MILLS & SHOPS DIRECTORY */}
      {activeSubTab === 'shops' && (
        <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest leading-none">Registered Shop List</h3>
              <p className="text-[10px] text-gray-500 mt-1 font-medium">Toggle shop activation or launch workspace impersonation to add catalog products, record ledger stocks, and adjust credentials.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-150 text-left text-xs bg-white">
              <thead className="bg-gray-50 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Tenant Business Profile</th>
                  <th className="px-5 py-3">Registered Contact Info</th>
                  <th className="px-5 py-3 text-center">Base Currency</th>
                  <th className="px-5 py-3 text-center">Total Staff</th>
                  <th className="px-5 py-3 text-center">License Status</th>
                  <th className="px-5 py-3 text-center">Manage Workspace Data</th>
                  <th className="px-5 py-3 text-center">Block Establishment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-750">
                {allShops.map(shop => {
                  const isBlocked = shop.subscription_status === 'suspended';
                  const isCurrent = currentShop?.id === shop.id;
                  const staffCount = allProfiles.filter(p => p.shop_id === shop.id).length;

                  return (
                    <tr key={shop.id} className={`hover:bg-gray-50 leading-relaxed transition-all ${isCurrent ? 'bg-orange-50/20' : ''}`}>
                      <td className="px-5 py-3.5 font-bold text-gray-950">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1 px-2.5 bg-gray-100 rounded-lg font-mono text-[9px] font-semibold text-gray-550 border border-gray-150 uppercase shadow-3xs shrink-0 self-center">
                            {shop.id.slice(0, 6)}
                          </div>
                          <div>
                            <span className="block font-semibold text-gray-900 leading-tight">
                              {shop.name} {isCurrent && <span className="bg-orange-100 text-orange-850 font-extrabold text-[8px] tracking-wide px-1.5 py-0.5 rounded-md uppercase ml-1.5">Active Sandbox</span>}
                            </span>
                            <span className="block text-[9px] text-gray-400 font-mono mt-0.5">Date added: {shop.created_at ? new Date(shop.created_at).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-650">
                        <span className="block font-semibold text-xs text-gray-800">{shop.phone || 'No phone registered'}</span>
                        <span className="block text-[10px] text-gray-450 truncate max-w-xs">{shop.address || 'No address logged'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-extrabold font-mono text-gray-800">
                        {shop.currency}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-gray-800 font-mono">
                        {staffCount} profiles
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black border ${isBlocked 
                          ? 'bg-red-50 text-red-750 border-red-200' 
                          : (shop.subscription_status === 'trial' ? 'bg-indigo-50 text-indigo-750 border-indigo-200' : 'bg-emerald-50 text-emerald-750 border-emerald-200')
                        }`}>
                          {shop.subscription_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleImpersonate(shop.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wide transition-all shadow-3xs cursor-pointer ${
                            isCurrent
                              ? 'bg-orange-650 text-white cursor-default'
                              : 'bg-white hover:bg-orange-50 text-orange-700 border border-orange-250'
                          }`}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          {isCurrent ? 'Impersonating' : 'Impersonate Shop'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Toggle licensing code for shop: ${shop.name}?`)) {
                              toggleShopStatus(shop.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-gray-900 rounded-lg flex items-center justify-center mx-auto transition cursor-pointer"
                          title={isBlocked ? 'Unlock Account' : 'Block / Lock Account'}
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
      )}

      {/* TAB 2: STAFF & USER PROFILE DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
            <div className="p-4 bg-gray-50/50 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest leading-none">Registered User & Staff Profiles</h3>
              <p className="text-[10px] text-gray-500 mt-1 font-medium">Full database of client login profiles. View or modify information like user access levels, emails, associations, passwords and custom entries.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-150 text-left text-xs bg-white">
                <thead className="bg-gray-50 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Full Name & Email</th>
                    <th className="px-5 py-3">Assigned Access Level (Role)</th>
                    <th className="px-5 py-3">Belongs to Mill establishment</th>
                    <th className="px-5 py-3">Password / Passcode</th>
                    <th className="px-5 py-3 text-center">Manage workspace</th>
                    <th className="px-5 py-3 text-center">Edit Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-750">
                  {allProfiles.map(profile => {
                    const shopDesc = allShops.find(s => s.id === profile.shop_id);
                    const isEditing = editingUserId === profile.id;
                    const isCurrentU = currentUser?.id === profile.id;

                    return (
                      <tr key={profile.id} className={`hover:bg-gray-50 transition-all ${isEditing ? 'bg-indigo-50/20' : ''} ${isCurrentU ? 'bg-gray-550/5 font-semibold' : ''}`}>
                        
                        {/* 1. Name and Email */}
                        <td className="px-5 py-3">
                          {isEditing ? (
                            <div className="space-y-1.5 max-w-xs">
                              <input 
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="w-full text-xs p-1 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-sans text-gray-900"
                                placeholder="Full Name"
                              />
                              <input 
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="w-full text-xs p-1 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono text-gray-900"
                                placeholder="Email address"
                              />
                            </div>
                          ) : (
                            <div>
                              <span className="block font-bold text-gray-950 flex items-center gap-1.5">
                                {profile.full_name}
                                {profile.email.toLowerCase() === 'ac.repair.in.dubai3@gmail.com' && (
                                  <span className="bg-purple-100 text-purple-800 text-[8px] font-black px-1 py-0.2 rounded-md uppercase tracking-widest shrink-0">
                                    Primary ROOT
                                  </span>
                                )}
                              </span>
                              <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{profile.email}</span>
                            </div>
                          )}
                        </td>

                        {/* 2. Access Role */}
                        <td className="px-5 py-3">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as UserRole)}
                              className="text-xs p-1 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-gray-800"
                            >
                              <option value="owner">Owner (Complete Access)</option>
                              <option value="manager">Manager (Milling & Books)</option>
                              <option value="cashier">Cashier (POS Sales Limit)</option>
                              <option value="super_admin">Super Admin (Global Root)</option>
                            </select>
                          ) : (
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                              profile.role === 'super_admin' 
                                ? 'bg-purple-50 text-purple-750 border-purple-200' 
                                : (profile.role === 'owner' ? 'bg-orange-50 text-orange-755 border-orange-200' : 'bg-gray-100 text-gray-700 border-gray-200')
                            }`}>
                              {profile.role.replace('_', ' ')}
                            </span>
                          )}
                        </td>

                        {/* 3. Shop Association */}
                        <td className="px-5 py-3">
                          {isEditing ? (
                            <select
                              value={editShopId}
                              onChange={(e) => setEditShopId(e.target.value)}
                              className="text-xs p-1 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-gray-800 max-w-xs"
                            >
                              {allShops.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.id.slice(0,5)})</option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-semibold text-xs text-indigo-750 flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              {shopDesc?.name || 'Unknown / General Warehouse'}
                            </span>
                          )}
                        </td>

                        {/* 4. Password / Passcode */}
                        <td className="px-5 py-3 font-mono text-xs">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Lock className="h-3 w-3 text-gray-400" />
                              <input 
                                type="text"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="w-24 text-xs p-1 bg-white border border-gray-300 rounded font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none text-gray-900 font-bold"
                              />
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded text-gray-700 font-bold">
                              <Key className="h-3 w-3 text-amber-500" />
                              {profile.password || '1234'}
                            </span>
                          )}
                        </td>

                        {/* 5. Impersonate / switch workspace */}
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleImpersonate(profile.shop_id, profile.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black transition cursor-pointer shadow-3xs hover:scale-[1.02] ${
                              isCurrentU 
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                            }`}
                            disabled={isCurrentU}
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            Launch Workspace
                          </button>
                        </td>

                        {/* 6. Edit Actions */}
                        <td className="px-5 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center gap-2 justify-center">
                              <button
                                onClick={() => handleSaveUserEdit(profile.id)}
                                className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="p-1 px-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-medium transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditingUser(profile)}
                              className="p-1 mx-auto text-indigo-650 hover:text-indigo-800 flex items-center justify-center transition cursor-pointer hover:bg-indigo-50 rounded-lg p-1.5"
                              title="Modify Profile Information"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROVISION FORMS */}
      {activeSubTab === 'provision' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Create Shop Form Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs">
            <div className="border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Register New Flour Mill / Shop</h3>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Established Mill Name *</label>
                <input 
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Shaheen Atta Chakki, Khyber Miller Corp"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Business Phone</label>
                  <input 
                    type="text"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. +92 300 1234567"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">System Base Currency</label>
                  <select
                    value={shopCurrency}
                    onChange={(e) => setShopCurrency(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-gray-700"
                  >
                    <option value="PKR">Pakistani Rupee (PKR)</option>
                    <option value="AED">UAE Dirham (AED)</option>
                    <option value="SAR">Saudi Riyal (SAR)</option>
                    <option value="OMR">Omani Rial (OMR)</option>
                    <option value="INR">Indian Rupee (INR)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GBP">UK Pound (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Mill/Chakki Address</label>
                <textarea
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  rows={2}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Plot 4B, Industrial Area, Peshawar, Pakistan"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl tracking-wider transition-all shadow-3xs cursor-pointer"
              >
                Provision Flour Mill Establishment
              </button>
            </form>
          </div>

          {/* Provision User Profile Form Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs">
            <div className="border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Provision Custom User & Staff Profile</h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">User Full Name *</label>
                <input 
                  type="text"
                  required
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. Malik Muhammad Farooq"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Login Email Address *</label>
                <input 
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                  placeholder="e.g. farooq.millowner@gmail.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Access Authorization (Role)</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold text-gray-700"
                  >
                    <option value="owner">Owner (Full Shop Admin)</option>
                    <option value="manager">Manager (Milling & Stocks)</option>
                    <option value="cashier">Cashier (POS Checkout-only)</option>
                    <option value="super_admin">Super Admin (Global SaaS Root)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Default password / Pin *</label>
                  <input 
                    type="text"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono font-bold text-gray-800"
                    placeholder="e.g. 1234"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assign to Mill/Shop *</label>
                <select
                  required
                  value={userShopId}
                  onChange={(e) => setUserShopId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-gray-700"
                >
                  <option value="">-- Select Active Shop --</option>
                  {allShops.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id.slice(0, 6)})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl tracking-wider transition-all shadow-3xs cursor-pointer"
              >
                Assemble & Provision Staff Account
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ADMIN MANUAL SUMMARY GUIDE */}
      <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 text-xs font-medium text-gray-700 space-y-2">
        <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Sparkles className="h-4.5 w-4.5 text-orange-650" />
          Multi-Tenant Workspace Impersonation Guide
        </h4>
        <p className="leading-relaxed">
          As a Super Admin, you can perform full system operations on any tenant shop or customer ledger:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-gray-650 text-[11px]">
          <li>To add or modify catalog items for a specific mill, find they store in the <strong className="text-gray-900">Mills & Shops Directory</strong> or <strong className="text-gray-900">Registered Staff</strong> and click <strong className="text-gray-900">Impersonate Shop / Launch Workspace</strong>.</li>
          <li>Once impersonated, use the sidebar navigation links to go to <strong className="text-gray-900 font-bold">Products, Stock, Customer credit index, or Settings</strong>. Every change or action you perform will happen inside that shop's isolated database collection!</li>
          <li>You can switch between any tenant seamlessly, or exit impersonation back to your primary Admin store at any time using the warning banner at the top of your screen.</li>
        </ul>
      </div>

    </div>
  );
}
