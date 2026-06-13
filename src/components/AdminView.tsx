import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { UserRole, Product, Customer, Supplier } from '../types';
import { localDB, supabase as rawSupabase, config } from '../lib/supabase';
import { 
  ShieldCheck, Users, Eye, Building2, ToggleLeft, ToggleRight, 
  BarChart, Activity, Sparkles, Server, CheckCircle2, PlusCircle,
  Pencil, Save, Key, Trash2, ArrowRightLeft, Lock, RefreshCcw,
  UserCheck, GraduationCap, Coins, MapPin, Phone, Database, ShoppingBag, 
  TrendingUp, History, ClipboardList, PenTool, Check, Trash
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

  const [activeSubTab, setActiveSubTab] = useState<'shops' | 'users' | 'provision' | 'direct-db'>('shops');
  
  // Status feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 4. Direct Tenant Database Selector and States
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedSubDirectTab, setSelectedSubDirectTab] = useState<'catalog' | 'stock' | 'credit' | 'dealers' | 'settings' | 'users'>('catalog');
  
  const [directProducts, setDirectProducts] = useState<any[]>([]);
  const [directCategories, setDirectCategories] = useState<any[]>([]);
  const [directInventoryLogs, setDirectInventoryLogs] = useState<any[]>([]);
  const [directCustomers, setDirectCustomers] = useState<any[]>([]);
  const [directSuppliers, setDirectSuppliers] = useState<any[]>([]);
  const [directUsers, setDirectUsers] = useState<any[]>([]);
  const [directShopObj, setDirectShopObj] = useState<any | null>(null);
  const [loadingDirectData, setLoadingDirectData] = useState<boolean>(false);

  // Catalog item fields
  const [newPName, setNewPName] = useState('');
  const [newPSku, setNewPSku] = useState('');
  const [newPUnit, setNewPUnit] = useState<'KG' | 'Bag' | 'Maund' | 'Ton' | 'Bag (10 KG)' | 'Bag (15 KG)' | 'Bag (20 KG)' | 'Bag (80 KG)'>('KG');
  const [newPCost, setNewPCost] = useState<string>('0');
  const [newPSale, setNewPSale] = useState<string>('0');
  const [newPStock, setNewPStock] = useState<string>('0');
  const [newPMinStock, setNewPMinStock] = useState<string>('5');
  const [newPCatId, setNewPCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');

  // Product editing
  const [editingDirectProductId, setEditingDirectProductId] = useState<string | null>(null);
  const [editDPName, setEditDPName] = useState('');
  const [editDPSku, setEditDPSku] = useState('');
  const [editDPCost, setEditDPCost] = useState<string>('0');
  const [editDPSale, setEditDPSale] = useState<string>('0');
  const [editDPUnit, setEditDPUnit] = useState<'KG' | 'Bag' | 'Maund' | 'Ton' | 'Bag (10 KG)' | 'Bag (15 KG)' | 'Bag (20 KG)' | 'Bag (80 KG)'>('KG');
  const [editDPMinstock, setEditDPMinstock] = useState<string>('5');
  const [editDPCatId, setEditDPCatId] = useState('');

  // Stock Adjustment Action variables
  const [adjProdId, setAdjProdId] = useState('');
  const [adjType, setAdjType] = useState<'stock_in' | 'stock_out' | 'adjustment' | 'wastage'>('stock_in');
  const [adjQty, setAdjQty] = useState<string>('0');
  const [adjReason, setAdjReason] = useState('');

  // Customer debt registry
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [custLedgerOpening, setCustLedgerOpening] = useState<string>('0');

  const [activeCustIdSelected, setActiveCustIdSelected] = useState('');
  const [custTxType, setCustTxType] = useState<'credit' | 'payment_received'>('payment_received');
  const [custTxAmount, setCustTxAmount] = useState<string>('0');
  const [custTxDescription, setCustTxDescription] = useState('');
  const [custTxMethod, setCustTxMethod] = useState<'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'>('Cash');

  // Supplier dealer ledger
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupCompany, setNewSupCompany] = useState('');
  const [supLedgerOpening, setSupLedgerOpening] = useState<string>('0');

  const [activeSupIdSelected, setActiveSupIdSelected] = useState('');
  const [supTxType, setSupTxType] = useState<'grain_purchased' | 'payment_made'>('payment_made');
  const [supTxAmount, setSupTxAmount] = useState<string>('0');
  const [supTxDescription, setSupTxDescription] = useState('');
  const [supTxMethod, setSupTxMethod] = useState<'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'>('Cash');

  // Customizable settings variables
  const [shopConfName, setShopConfName] = useState('');
  const [shopConfPhone, setShopConfPhone] = useState('');
  const [shopConfAddress, setShopConfAddress] = useState('');
  const [shopConfTax, setShopConfTax] = useState<string>('0');
  const [shopConfFooter, setShopConfFooter] = useState('');
  const [shopConfCurrency, setShopConfCurrency] = useState('PKR');

  // Direct profile modification/Security passcode resets
  const [editingDirectUserId, setEditingDirectUserId] = useState<string | null>(null);
  const [editDUName, setEditDUName] = useState('');
  const [editDURole, setEditDURole] = useState<UserRole>('owner');
  const [editDUPassword, setEditDUPassword] = useState('');

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

  // ----- SUPER ADMIN DIRECT DATABASE TENANT MANAGEMENT ACTIONS -----
  
  const refreshDirectData = async (shopId: string) => {
    if (!shopId) {
      setDirectProducts([]);
      setDirectCategories([]);
      setDirectInventoryLogs([]);
      setDirectCustomers([]);
      setDirectSuppliers([]);
      setDirectUsers([]);
      setDirectShopObj(null);
      return;
    }
    setLoadingDirectData(true);
    try {
      const activeShop = allShops.find(s => s.id === shopId) || null;
      setDirectShopObj(activeShop);

      const staff = allProfiles.filter(p => p.shop_id === shopId);
      setDirectUsers(staff);

      if (config.isOnline && rawSupabase) {
        const [pRes, cRes, custRes, supRes, logRes] = await Promise.all([
          rawSupabase.from('products').select('*').eq('shop_id', shopId),
          rawSupabase.from('product_categories').select('*').eq('shop_id', shopId),
          rawSupabase.from('customers').select('*').eq('shop_id', shopId),
          rawSupabase.from('suppliers').select('*').eq('shop_id', shopId),
          rawSupabase.from('inventory_logs').select('*').eq('shop_id', shopId)
        ]);

        setDirectProducts(pRes.data || []);
        setDirectCategories(cRes.data || []);
        setDirectCustomers(custRes.data || []);
        setDirectSuppliers(supRes.data || []);
        
        const sortedLogs = (logRes.data || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setDirectInventoryLogs(sortedLogs);
      } else {
        const pList = localDB.getCollection('products').filter((p: any) => p.shop_id === shopId);
        const cList = localDB.getCollection('categories').filter((c: any) => c.shop_id === shopId);
        const custList = localDB.getCollection('customers').filter((c: any) => c.shop_id === shopId);
        const sList = localDB.getCollection('suppliers').filter((s: any) => s.shop_id === shopId);
        const logList = localDB.getCollection('inventory_logs').filter((l: any) => l.shop_id === shopId);

        setDirectProducts(pList);
        setDirectCategories(cList);
        setDirectCustomers(custList);
        setDirectSuppliers(sList);
        
        const sortedLogs = logList.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setDirectInventoryLogs(sortedLogs);
      }
    } catch (err) {
      console.error('Failed to pull tenant data directly:', err);
    } finally {
      setLoadingDirectData(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'direct-db' && selectedShopId) {
      refreshDirectData(selectedShopId);
    }
  }, [selectedShopId, activeSubTab, allShops, allProfiles]);

  useEffect(() => {
    if (directShopObj) {
      setShopConfName(directShopObj.name || '');
      setShopConfPhone(directShopObj.phone || '');
      setShopConfAddress(directShopObj.address || '');
      setShopConfTax(String(directShopObj.tax_rate || 0));
      setShopConfFooter(directShopObj.invoice_footer || '');
      setShopConfCurrency(directShopObj.currency || 'PKR');
    }
  }, [directShopObj]);

  const formatAdminErr = (err: any): string => {
    const msg = err?.message || err?.toString() || 'Unknown error occurred';
    if (msg.includes('products_unit_check') || msg.includes('unit_check')) {
      return 'Failed to save product: Your live Supabase database has an active legacy CHECK constraint "products_unit_check" restricting allowed unit values. To fix this instantly, please run this statement in your Supabase SQL Editor: ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_unit_check;';
    }
    return msg;
  };

  const handleDirectAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId) return;
    try {
      let finalCatId = newPCatId || null;
      
      if (newCatName.trim()) {
        const newCatObj = {
          id: crypto.randomUUID(),
          shop_id: selectedShopId,
          name: newCatName.trim(),
          description: 'Auto created by admin',
          created_at: new Date().toISOString()
        };
        if (config.isOnline && rawSupabase) {
          await rawSupabase.from('product_categories').insert([newCatObj]);
        } else {
          const cats = localDB.getCollection('categories');
          cats.push(newCatObj);
          localDB.saveCollection('categories', cats);
        }
        finalCatId = newCatObj.id;
        setNewCatName('');
      }

      const pId = crypto.randomUUID();
      const productObj: Product = {
        id: pId,
        shop_id: selectedShopId,
        category_id: finalCatId,
        name: newPName.trim(),
        sku: newPSku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        unit: newPUnit,
        cost_price: Number(newPCost),
        sale_price: Number(newPSale),
        stock: Number(newPStock),
        min_stock_alert: Number(newPMinStock),
        image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('products').insert([productObj]);
        if (Number(newPStock) > 0) {
          await rawSupabase.from('inventory_logs').insert([{
            id: crypto.randomUUID(),
            shop_id: selectedShopId,
            product_id: pId,
            type: 'stock_in',
            quantity: Number(newPStock),
            unit: newPUnit,
            reason: 'Opening stock (Admin Creation)',
            created_by: currentUser?.email || 'admin@saas',
            created_at: new Date().toISOString()
          }]);
        }
      } else {
        const products = localDB.getCollection('products');
        products.push(productObj);
        localDB.saveCollection('products', products);

        if (Number(newPStock) > 0) {
          const logs = localDB.getCollection('inventory_logs');
          logs.push({
            id: crypto.randomUUID(),
            shop_id: selectedShopId,
            product_id: pId,
            type: 'stock_in',
            quantity: Number(newPStock),
            unit: newPUnit,
            reason: 'Opening stock (Admin Creation)',
            created_by: currentUser?.email || 'admin@saas',
            created_at: new Date().toISOString()
          });
          localDB.saveCollection('inventory_logs', logs);
        }
      }

      setSuccessMsg(`Added catalog product "${newPName}" successfully.`);
      setNewPName('');
      setNewPSku('');
      setNewPCost('0');
      setNewPSale('0');
      setNewPStock('0');
      setNewPCatId('');
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(formatAdminErr(err));
    }
  };

  const handleSaveDirectProductEdit = async (pId: string) => {
    try {
      const updateObj = {
        name: editDPName,
        sku: editDPSku,
        cost_price: Number(editDPCost),
        sale_price: Number(editDPSale),
        unit: editDPUnit,
        min_stock_alert: Number(editDPMinstock),
        category_id: editDPCatId || null,
        updated_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('products').update(updateObj).eq('id', pId);
      } else {
        const products = localDB.getCollection<any>('products');
        const idx = products.findIndex((p: any) => p.id === pId);
        if (idx !== -1) {
          products[idx] = { ...(products[idx] as any), ...updateObj };
          localDB.saveCollection('products', products);
        }
      }
      setSuccessMsg('Product details saved successfully.');
      setEditingDirectProductId(null);
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(formatAdminErr(err));
    }
  };

  const handleDirectDeleteProduct = async (pId: string) => {
    if (!confirm('Are you absolutely sure you want to delete this catalog item? This will erase its record from the workspace.')) return;
    try {
      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('products').delete().eq('id', pId);
      } else {
        const filtered = localDB.getCollection('products').filter((p: any) => p.id !== pId);
        localDB.saveCollection('products', filtered);
      }
      setSuccessMsg('Catalog item deleted.');
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5050);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed deleting.');
    }
  };

  const handleDirectAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !adjProdId || Number(adjQty) <= 0) {
      setErrorMsg('Choose a product and specify quantity.');
      return;
    }
    const product = directProducts.find(p => p.id === adjProdId);
    if (!product) return;

    try {
      let change = 0;
      if (adjType === 'stock_in') change = Number(adjQty);
      else if (adjType === 'stock_out' || adjType === 'wastage') change = -Number(adjQty);
      else change = Number(adjQty);

      const newStockValue = Math.max(0, product.stock + change);

      const logObj = {
        id: crypto.randomUUID(),
        shop_id: selectedShopId,
        product_id: adjProdId,
        type: adjType,
        quantity: Number(adjQty),
        unit: product.unit,
        reason: adjReason || `Admin Adjustment: ${adjType.toUpperCase()}`,
        created_by: currentUser?.email || 'admin@saas',
        created_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('products').update({ stock: newStockValue, updated_at: new Date().toISOString() }).eq('id', adjProdId);
        await rawSupabase.from('inventory_logs').insert([logObj]);
      } else {
        const products = localDB.getCollection<any>('products');
        const pIdx = products.findIndex((p: any) => p.id === adjProdId);
        if (pIdx !== -1) {
          products[pIdx].stock = newStockValue;
          products[pIdx].updated_at = new Date().toISOString();
          localDB.saveCollection('products', products);
        }

        const logs = localDB.getCollection('inventory_logs');
        logs.push(logObj);
        localDB.saveCollection('inventory_logs', logs);
      }

      setSuccessMsg(`Inventory adjusted successfully. Stock updated to ${newStockValue} ${product.unit}.`);
      setAdjProdId('');
      setAdjQty('0');
      setAdjReason('');
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed logs transaction.');
    }
  };

  const handleDirectAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !newCustName.trim()) return;
    try {
      const cId = crypto.randomUUID();
      const customerObj: Customer = {
        id: cId,
        shop_id: selectedShopId,
        name: newCustName.trim(),
        phone: newCustPhone.trim() || 'N/A',
        email: newCustEmail.trim() || null,
        balance: Number(custLedgerOpening),
        created_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('customers').insert([customerObj]);
        if (Number(custLedgerOpening) !== 0) {
          await rawSupabase.from('customer_transactions').insert([{
            id: crypto.randomUUID(),
            shop_id: selectedShopId,
            customer_id: cId,
            type: 'opening_balance',
            amount: Number(custLedgerOpening),
            sale_id: null,
            description: 'Opening balance logged by Super Admin',
            payment_method: null,
            created_at: new Date().toISOString()
          }]);
        }
      } else {
        const customers = localDB.getCollection('customers');
        customers.push(customerObj);
        localDB.saveCollection('customers', customers);

        if (Number(custLedgerOpening) !== 0) {
          const txs = localDB.getCollection('customer_transactions');
          txs.push({
            id: crypto.randomUUID(),
            shop_id: selectedShopId,
            customer_id: cId,
            type: 'opening_balance',
            amount: Number(custLedgerOpening),
            sale_id: null,
            description: 'Opening balance logged by Super Admin',
            payment_method: null,
            created_at: new Date().toISOString()
          });
          localDB.saveCollection('customer_transactions', txs);
        }
      }

      setSuccessMsg(`Customer Ledger established for "${newCustName}".`);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setCustLedgerOpening('0');
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    }
  };

  const handleDirectRecordCustomerTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !activeCustIdSelected || Number(custTxAmount) <= 0) {
      setErrorMsg('Choose customer and enter valid positive amount.');
      return;
    }
    const customer = directCustomers.find(c => c.id === activeCustIdSelected);
    if (!customer) return;

    try {
      const modifier = custTxType === 'credit' ? 1 : -1;
      const finalBalance = customer.balance + (Number(custTxAmount) * modifier);

      const txObj = {
        id: crypto.randomUUID(),
        shop_id: selectedShopId,
        customer_id: activeCustIdSelected,
        type: custTxType,
        amount: Number(custTxAmount),
        sale_id: null,
        description: custTxDescription || `Direct Adjustment: ${custTxType.toUpperCase()}`,
        payment_method: custTxMethod,
        created_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('customers').update({ balance: finalBalance }).eq('id', activeCustIdSelected);
        await rawSupabase.from('customer_transactions').insert([txObj]);
      } else {
        const customers = localDB.getCollection<any>('customers');
        const idx = customers.findIndex((c: any) => c.id === activeCustIdSelected);
        if (idx !== -1) {
          customers[idx].balance = finalBalance;
          localDB.saveCollection('customers', customers);
        }

        const txs = localDB.getCollection('customer_transactions');
        txs.push(txObj);
        localDB.saveCollection('customer_transactions', txs);
      }

      setSuccessMsg(`Balance logged. Customer balance is now ${finalBalance}.`);
      setActiveCustIdSelected('');
      setCustTxAmount('0');
      setCustTxDescription('');
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    }
  };

  const handleDirectAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !newSupName.trim()) return;
    try {
      const sId = crypto.randomUUID();
      const supObj: Supplier = {
        id: sId,
        shop_id: selectedShopId,
        name: newSupName.trim(),
        phone: newSupPhone.trim() || 'N/A',
        company: newSupCompany.trim() || null,
        balance: Number(supLedgerOpening),
        created_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('suppliers').insert([supObj]);
        if (Number(supLedgerOpening) !== 0) {
          await rawSupabase.from('supplier_transactions').insert([{
            id: crypto.randomUUID(),
            shop_id: selectedShopId,
            supplier_id: sId,
            type: 'grain_purchased',
            amount: Math.abs(Number(supLedgerOpening)),
            description: 'Dealer opening balance logged by Super Admin',
            payment_method: null,
            created_at: new Date().toISOString()
          }]);
        }
      } else {
        const suppliers = localDB.getCollection('suppliers');
        suppliers.push(supObj);
        localDB.saveCollection('suppliers', suppliers);

        if (Number(supLedgerOpening) !== 0) {
          const txs = localDB.getCollection('supplier_transactions');
          txs.push({
            id: crypto.randomUUID(),
            shop_id: selectedShopId,
            supplier_id: sId,
            type: 'grain_purchased',
            amount: Math.abs(Number(supLedgerOpening)),
            description: 'Dealer opening balance logged by Super Admin',
            payment_method: null,
            created_at: new Date().toISOString()
          });
          localDB.saveCollection('supplier_transactions', txs);
        }
      }

      setSuccessMsg(`Supplier profile logged for dealer "${newSupName}".`);
      setNewSupName('');
      setNewSupPhone('');
      setNewSupCompany('');
      setSupLedgerOpening('0');
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    }
  };

  const handleDirectRecordSupplierTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId || !activeSupIdSelected || Number(supTxAmount) <= 0) {
      setErrorMsg('Choose a supplier and valid amount.');
      return;
    }
    const supplier = directSuppliers.find(s => s.id === activeSupIdSelected);
    if (!supplier) return;

    try {
      const modifier = supTxType === 'grain_purchased' ? 1 : -1;
      const finalBalance = supplier.balance + (Number(supTxAmount) * modifier);

      const txObj = {
        id: crypto.randomUUID(),
        shop_id: selectedShopId,
        supplier_id: activeSupIdSelected,
        type: supTxType,
        amount: Number(supTxAmount),
        description: supTxDescription || `Dealer Ledger: ${supTxType.toUpperCase()}`,
        payment_method: supTxMethod,
        created_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('suppliers').update({ balance: finalBalance }).eq('id', activeSupIdSelected);
        await rawSupabase.from('supplier_transactions').insert([txObj]);
      } else {
        const suppliers = localDB.getCollection<any>('suppliers');
        const idx = suppliers.findIndex((s: any) => s.id === activeSupIdSelected);
        if (idx !== -1) {
          suppliers[idx].balance = finalBalance;
          localDB.saveCollection('suppliers', suppliers);
        }

        const txs = localDB.getCollection('supplier_transactions');
        txs.push(txObj);
        localDB.saveCollection('supplier_transactions', txs);
      }

      setSuccessMsg(`Outstanding adjusted to ${finalBalance}.`);
      setActiveSupIdSelected('');
      setSupTxAmount('0');
      setSupTxDescription('');
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error logging supplier transaction.');
    }
  };

  const handleSaveDirectShopConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId) return;
    try {
      const updateData = {
        name: shopConfName,
        phone: shopConfPhone,
        address: shopConfAddress,
        tax_rate: Number(shopConfTax),
        invoice_footer: shopConfFooter,
        currency: shopConfCurrency,
        updated_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('shops').update(updateData).eq('id', selectedShopId);
      } else {
        const shops = localDB.getCollection<any>('shops');
        const idx = shops.findIndex((s: any) => s.id === selectedShopId);
        if (idx !== -1) {
          shops[idx] = { ...(shops[idx] as any), ...updateData };
          localDB.saveCollection('shops', shops);
        }
      }

      setSuccessMsg('Mill global configs and rules updated in database.');
      useStore.getState().initStore(); 
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    }
  };

  const handleSaveDirectUserEdit = async (uId: string) => {
    try {
      const updateData = {
        full_name: editDUName,
        role: editDURole,
        password: editDUPassword,
        updated_at: new Date().toISOString()
      };

      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('profiles').update(updateData).eq('id', uId);
      } else {
        const profiles = localDB.getCollection<any>('profiles');
        const idx = profiles.findIndex((p: any) => p.id === uId);
        if (idx !== -1) {
          profiles[idx] = { ...(profiles[idx] as any), ...updateData };
          localDB.saveCollection('profiles', profiles);
        }
      }

      setSuccessMsg(`Updated user details and passcode directly in database.`);
      setEditingDirectUserId(null);
      useStore.getState().initStore();
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred.');
    }
  };

  const handleDirectDeleteUser = async (uId: string) => {
    if (!confirm('Permanently remove this user profile from the database?')) return;
    try {
      if (config.isOnline && rawSupabase) {
        await rawSupabase.from('profiles').delete().eq('id', uId);
      } else {
        const filtered = localDB.getCollection('profiles').filter((p: any) => p.id !== uId);
        localDB.saveCollection('profiles', filtered);
      }
      setSuccessMsg('Profile deleted successfully.');
      useStore.getState().initStore();
      refreshDirectData(selectedShopId);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  const startDirectUserEdit = (user: any) => {
    setEditingDirectUserId(user.id);
    setEditDUName(user.full_name);
    setEditDURole(user.role);
    setEditDUPassword(user.password || '1234');
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
            onClick={() => { 
              setActiveSubTab('direct-db'); 
              setEditingUserId(null);
              if (!selectedShopId && allShops.length > 0) {
                setSelectedShopId(allShops[0].id);
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${activeSubTab === 'direct-db' ? 'bg-indigo-600 text-white shadow-3xs animate-pulse' : 'text-gray-500 hover:text-gray-850 hover:bg-gray-100'}`}
          >
            <Database className="h-3.5 w-3.5 text-orange-500" />
            Direct Shop Database Manager
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
          Currently Switched Workspace: <span className="text-orange-705 underline font-extrabold">{currentShop?.name}</span>
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

      {/* TAB 4: DIRECT TENANT DATABASE MANAGER */}
      {activeSubTab === 'direct-db' && (
        <div className="space-y-6">
          {/* Top Tenant Selector */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Database className="h-5 w-5 text-indigo-600 animate-bounce" />
                Direct Tenant Database Controller
              </h3>
              <p className="text-[10px] text-gray-500 mt-1 font-medium">
                Modify, create, or ledger-book and balance accounts inside any shop dataset. No impersonation required.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 font-sans shrink-0">Selected Mill:</span>
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="text-xs p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-250 rounded-xl font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-gray-800 cursor-pointer min-w-56"
              >
                {allShops.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id.slice(0, 6)})</option>
                ))}
              </select>
            </div>
          </div>

          {selectedShopId ? (
            <div className="space-y-6">
              
              {/* Internal Horizontal Navigation Tabs */}
              <div className="bg-gray-100/80 p-1 rounded-xl flex flex-wrap gap-1 border border-gray-200">
                {[
                  { id: 'catalog', label: 'Catalog Products', icon: ShoppingBag, color: 'text-blue-500' },
                  { id: 'stock', label: 'Stock Ledger', icon: ClipboardList, color: 'text-amber-500' },
                  { id: 'credit', label: 'Customer Credit Ledger', icon: Coins, color: 'text-emerald-500' },
                  { id: 'dealers', label: 'Dealers Ledger', icon: TrendingUp, color: 'text-cyan-500' },
                  { id: 'settings', label: 'Shop Settings', icon: PenTool, color: 'text-purple-500' },
                  { id: 'users', label: 'Staff & Passwords', icon: Users, color: 'text-pink-500' },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = selectedSubDirectTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedSubDirectTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-white text-gray-900 shadow-3xs font-extrabold border-b-2 border-indigo-500' 
                          : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isActive ? tab.color : 'text-gray-400'}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {loadingDirectData ? (
                <div className="p-12 text-center bg-white border border-gray-150 rounded-2xl flex flex-col items-center justify-center gap-3">
                  <RefreshCcw className="h-8 w-8 text-indigo-650 animate-spin" />
                  <p className="text-xs font-bold text-gray-500 font-sans">Connecting to database node and compiling logs...</p>
                </div>
              ) : (
                <div className="transition-all duration-300">
                  
                  {/* DIRECT CATALOG TAB */}
                  {selectedSubDirectTab === 'catalog' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Products Directory Grid */}
                      <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <h4 className="text-[11px] uppercase font-black tracking-widest text-gray-900">Live Custom Inventories Directory</h4>
                            <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[9px] font-mono">{directProducts.length} items</span>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-150 text-left text-xs">
                              <thead className="bg-gray-50 font-bold text-gray-400 uppercase tracking-wider text-[9px]">
                                <tr>
                                  <th className="px-4 py-2.5">Name / Sku</th>
                                  <th className="px-4 py-2.5 text-center">Unit</th>
                                  <th className="px-4 py-2.5 text-right">Cost Price</th>
                                  <th className="px-4 py-2.5 text-right">Selling Price</th>
                                  <th className="px-4 py-2.5 text-center">Balance Stock</th>
                                  <th className="px-4 py-2.5 text-center">Operation</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-gray-750 font-sans font-medium">
                                {directProducts.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">No catalog products logged in this shop. Create one to begin.</td>
                                  </tr>
                                ) : (
                                  directProducts.map(prod => {
                                    const isEditing = editingDirectProductId === prod.id;
                                    return (
                                      <tr key={prod.id} className={`hover:bg-gray-50/60 transition ${isEditing ? 'bg-blue-50/20' : ''}`}>
                                        <td className="px-4 py-3">
                                          {isEditing ? (
                                            <div className="space-y-1">
                                              <input 
                                                type="text" 
                                                value={editDPName}
                                                onChange={(e) => setEditDPName(e.target.value)}
                                                className="w-full text-xs p-1 bg-white border border-gray-300 rounded font-sans" 
                                                placeholder="Product Name"
                                              />
                                              <input 
                                                type="text" 
                                                value={editDPSku}
                                                onChange={(e) => setEditDPSku(e.target.value)}
                                                className="w-full text-[10px] p-1 bg-white border border-gray-300 rounded font-mono text-gray-500" 
                                                placeholder="SKU"
                                              />
                                            </div>
                                          ) : (
                                            <div>
                                              <span className="block font-bold text-gray-900 leading-none">{prod.name}</span>
                                              <span className="block text-[9px] text-gray-400 font-mono mt-0.5">{prod.sku}</span>
                                            </div>
                                          )}
                                        </td>
                                        
                                        <td className="px-4 py-3 text-center">
                                          {isEditing ? (
                                            <select 
                                              value={editDPUnit} 
                                              onChange={(e) => setEditDPUnit(e.target.value as any)}
                                              className="text-[10px] p-1 bg-white border border-gray-300 rounded"
                                            >
                                              <option value="KG">KG</option>
                                              <option value="Bag">Bag</option>
                                              <option value="Maund">Maund</option>
                                              <option value="Ton">Ton</option>
                                              <option value="Bag (10 KG)">Bag (10 KG)</option>
                                              <option value="Bag (20 KG)">Bag (20 KG)</option>
                                              <option value="Bag (80 KG)">Bag (80 KG)</option>
                                            </select>
                                          ) : (
                                            <span className="bg-gray-100 text-gray-700 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{prod.unit}</span>
                                          )}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                          {isEditing ? (
                                            <input 
                                              type="number" 
                                              value={editDPCost}
                                              onChange={(e) => setEditDPCost(e.target.value)}
                                              className="w-16 text-xs p-1 bg-white border border-gray-300 rounded text-right font-mono" 
                                            />
                                          ) : (
                                            <span className="font-mono text-xs text-gray-500 font-semibold">{directShopObj?.currency} {prod.cost_price?.toLocaleString() || 0}</span>
                                          )}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                          {isEditing ? (
                                            <input 
                                              type="number" 
                                              value={editDPSale}
                                              onChange={(e) => setEditDPSale(e.target.value)}
                                              className="w-16 text-xs p-1 bg-white border border-gray-300 rounded text-right font-mono" 
                                            />
                                          ) : (
                                            <span className="font-mono text-xs text-indigo-700 font-extrabold">{directShopObj?.currency} {prod.sale_price?.toLocaleString() || 0}</span>
                                          )}
                                        </td>

                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-block font-mono text-xs font-black px-2 py-0.5 rounded-lg ${
                                            prod.stock <= (prod.min_stock_alert || 5) 
                                              ? 'bg-red-50 text-red-750 font-bold border border-red-150 animate-pulse' 
                                              : 'bg-emerald-50 text-emerald-750 font-bold border border-emerald-150'
                                          }`}>
                                            {prod.stock || 0} {prod.unit}
                                          </span>
                                        </td>

                                        <td className="px-4 py-3 text-center">
                                          {isEditing ? (
                                            <div className="flex justify-center gap-1">
                                              <button 
                                                onClick={() => handleSaveDirectProductEdit(prod.id)}
                                                className="p-1 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center justify-center transition cursor-pointer"
                                              >
                                                <Check className="h-3 w-3" />
                                              </button>
                                              <button 
                                                onClick={() => setEditingDirectProductId(null)}
                                                className="p-1 px-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-[10px] font-medium transition cursor-pointer"
                                              >
                                                Undo
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex justify-center gap-1.5">
                                              <button 
                                                onClick={() => {
                                                  setEditingDirectProductId(prod.id);
                                                  setEditDPName(prod.name);
                                                  setEditDPSku(prod.sku);
                                                  setEditDPCost(String(prod.cost_price));
                                                  setEditDPSale(String(prod.sale_price));
                                                  setEditDPUnit(prod.unit);
                                                  setEditDPMinstock(String(prod.min_stock_alert || 5));
                                                  setEditDPCatId(prod.category_id || '');
                                                }}
                                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition cursor-pointer"
                                                title="Edit product info"
                                              >
                                                <Pencil className="h-3.5 w-3.5" />
                                              </button>
                                              <button 
                                                onClick={() => handleDirectDeleteProduct(prod.id)}
                                                className="p-1 text-red-650 hover:text-red-800 hover:bg-red-50 rounded transition cursor-pointer"
                                                title="Delete catalog item"
                                              >
                                                <Trash className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Add Product Form */}
                      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs">
                        <div className="border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                          <PlusCircle className="h-5 w-5 text-indigo-600" />
                          <h4 className="text-[11px] uppercase font-black tracking-widest text-gray-900">Directly Add Product to Catalog</h4>
                        </div>
                        
                        <form onSubmit={handleDirectAddProduct} className="space-y-4 text-xs font-semibold">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Product Title / Name *</label>
                            <input 
                              type="text" 
                              required 
                              value={newPName} 
                              onChange={(e) => setNewPName(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                              placeholder="e.g. Desi Wheat Flour (Fine)"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Sku serial (Auto fallback)</label>
                              <input 
                                type="text" 
                                value={newPSku} 
                                onChange={(e) => setNewPSku(e.target.value)}
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono" 
                                placeholder="e.g. WF-70"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Stock Unit type</label>
                              <select 
                                value={newPUnit} 
                                onChange={(e) => setNewPUnit(e.target.value as any)}
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold cursor-pointer text-gray-700"
                              >
                                <option value="KG">Kilogram (KG)</option>
                                <option value="Bag">Bag</option>
                                <option value="Maund">Maund (37.32 kg)</option>
                                <option value="Ton">Metric Ton</option>
                                <option value="Bag (10 KG)">Bag (10 KG)</option>
                                <option value="Bag (15 KG)">Bag (15 KG)</option>
                                <option value="Bag (20 KG)">Bag (20 KG)</option>
                                <option value="Bag (80 KG)">Bag (80 KG)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Cost Price ({directShopObj?.currency}) *</label>
                              <input 
                                type="number" 
                                required
                                value={newPCost} 
                                onChange={(e) => setNewPCost(e.target.value)}
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-right" 
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Selling Price ({directShopObj?.currency}) *</label>
                              <input 
                                type="number" 
                                required
                                value={newPSale} 
                                onChange={(e) => setNewPSale(e.target.value)}
                                className="w-full text-xs p-2.5 bg-slate-50 border border-gray-250 rounded-xl font-mono font-bold text-indigo-700 text-right" 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Opening Stock (Bags/KGs)</label>
                              <input 
                                type="number" 
                                value={newPStock} 
                                onChange={(e) => setNewPStock(e.target.value)}
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-right" 
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Min Stock Alert level</label>
                              <input 
                                type="number" 
                                value={newPMinStock} 
                                onChange={(e) => setNewPMinStock(e.target.value)}
                                className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-right" 
                              />
                            </div>
                          </div>

                          <div className="border-t border-gray-100 pt-3">
                            <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Select Category Group</label>
                            <select 
                              value={newPCatId} 
                              onChange={(e) => setNewPCatId(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-55/60 border border-gray-200 rounded-xl text-gray-800"
                            >
                              <option value="">-- No Category Group / General --</option>
                              {directCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                            
                            <div className="mt-2.5 p-2 bg-slate-50 border border-gray-205 rounded-xl space-y-1">
                              <span className="block text-[8px] uppercase font-black text-gray-400">Or Quick Create Group:</span>
                              <input 
                                type="text"
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                placeholder="Type new group (e.g. Flour Goods)"
                                className="w-full text-[10px] p-2 bg-white border border-gray-200 rounded-lg text-gray-800"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold tracking-widest text-xs rounded-xl uppercase transition cursor-pointer transition-all shadow-3xs mt-2"
                          >
                            Add To Tenant Catalog
                          </button>
                        </form>
                      </div>

                    </div>
                  )}

                  {/* DIRECT STOCK LOGS TAB */}
                  {selectedSubDirectTab === 'stock' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Inventory Log List */}
                      <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                          <h4 className="text-[11px] uppercase font-black tracking-widest text-gray-900 flex items-center gap-1.5">
                            <History className="h-4 w-4 text-amber-500" />
                            Tenant Stock History & Journal Audit
                          </h4>
                          <span className="bg-amber-50 border border-amber-200 text-amber-850 px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase">Live Registry</span>
                        </div>
                        
                        <div className="overflow-y-auto max-h-[500px]">
                          <table className="min-w-full divide-y divide-gray-150 text-left text-xs bg-white">
                            <thead className="bg-gray-50 font-bold text-gray-400 uppercase tracking-wider text-[9px] sticky top-0">
                              <tr>
                                <th className="px-4 py-2.5">Date / Time</th>
                                <th className="px-4 py-2.5">Catalog item</th>
                                <th className="px-4 py-2.5 text-center">Flow Type</th>
                                <th className="px-4 py-2.5 text-right">Quantity</th>
                                <th className="px-4 py-2.5">Reason memo</th>
                                <th className="px-4 py-2.5 text-center">Admin</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-sans font-medium">
                              {directInventoryLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="text-center py-12 text-gray-400 text-xs text-medium">No stock flows recorded yet inside this shop log database.</td>
                                </tr>
                              ) : (
                                directInventoryLogs.map(log => {
                                  const prod = directProducts.find(p => p.id === log.product_id);
                                  const actionColors: { [key: string]: string } = {
                                    stock_in: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                                    stock_out: 'bg-amber-50 text-amber-800 border-amber-200',
                                    wastage: 'bg-red-50 text-red-800 border-red-200',
                                    adjustment: 'bg-indigo-50 text-indigo-805 border-indigo-205',
                                  };
                                  return (
                                    <tr key={log.id} className="hover:bg-gray-50 text-gray-700">
                                      <td className="px-4 py-2.5 text-[10px] text-gray-450 font-mono">
                                        {new Date(log.created_at).toLocaleString()}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className="font-bold text-gray-900 block leading-tight">{prod?.name || 'Deleted Product'}</span>
                                        <span className="block text-[8px] text-gray-400 font-mono">ID: {log.product_id.slice(0, 8)}</span>
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className={`inline-block border px-2 py-0.2 rounded-md text-[8px] font-black uppercase tracking-wider ${actionColors[log.type] || 'bg-gray-100 text-gray-700 border-gray-205'}`}>
                                          {log.type.replace('_', ' ')}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-mono font-black text-gray-805 text-xs">
                                        {log.quantity} {prod?.unit || 'KG'}
                                      </td>
                                      <td className="px-4 py-2.5 text-[11px] font-sans italic text-gray-500">
                                        {log.reason}
                                      </td>
                                      <td className="px-4 py-2.5 text-center font-mono text-[9px] text-gray-450">
                                        {log.created_by.split('@')[0]}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Record Stock Flow Adjustment */}
                      <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs">
                        <div className="border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                          <PlusCircle className="h-5 w-5 text-amber-500" />
                          <h4 className="text-[11px] uppercase font-black tracking-widest text-gray-900">Post Core Stock Adjustment</h4>
                        </div>
                        
                        <form onSubmit={handleDirectAdjustInventory} className="space-y-4 text-xs font-semibold">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Select Catalog Product *</label>
                            <select
                              required
                              value={adjProdId}
                              onChange={(e) => setAdjProdId(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold"
                            >
                              <option value="">-- Choose Product --</option>
                              {directProducts.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit} in stock)</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Adjustment ledger type *</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'stock_in', label: 'Stock-In / Recv' },
                                { id: 'stock_out', label: 'Stock-Out / Sale' },
                                { id: 'adjustment', label: 'Internal Audit Dev' },
                                { id: 'wastage', label: 'Wastage Loss' },
                              ].map(item => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setAdjType(item.id as any)}
                                  className={`p-2 rounded-xl text-[10px] font-black border text-center transition-all cursor-pointer ${
                                    adjType === item.id 
                                      ? 'bg-amber-500 text-white border-amber-600 font-extrabold shadow-3xs' 
                                      : 'bg-gray-50 text-gray-650 hover:bg-gray-100 border-gray-200'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Quantity *</label>
                            <input 
                              type="number"
                              required 
                              value={adjQty}
                              onChange={(e) => setAdjQty(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-right font-extrabold"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Adjustment Reason memo *</label>
                            <textarea
                              required
                              rows={3}
                              value={adjReason}
                              onChange={(e) => setAdjReason(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none placeholder-gray-400"
                              placeholder="e.g. Recorded raw flour sack grinding yield, monthly audit correction, milling humidity weight loss"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold tracking-widest text-xs rounded-xl uppercase transition cursor-pointer transition-all shadow-3xs"
                          >
                            Commit Stock Adjustment
                          </button>
                        </form>
                      </div>

                    </div>
                  )}

                  {/* DIRECT CREDIT LEDGER TAB */}
                  {selectedSubDirectTab === 'credit' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Customer list table */}
                      <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <h4 className="text-[11px] uppercase font-black tracking-widest text-gray-900">Custom Users Outstanding Credit Ledger</h4>
                            <span className="bg-emerald-50 text-emerald-805 font-bold px-2 py-0.5 rounded text-[10px] font-mono font-extrabold">Active Debts</span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-150 text-left text-xs bg-white">
                              <thead className="bg-gray-50 font-bold text-gray-400 uppercase tracking-wider text-[9px]">
                                <tr>
                                  <th className="px-4 py-2.5">Customer Name</th>
                                  <th className="px-4 py-2.5">Active Contact</th>
                                  <th className="px-4 py-2.5 text-right">Outstanding Credit (Dues)</th>
                                  <th className="px-4 py-2.5 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-sans font-medium text-gray-700">
                                {directCustomers.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-400 text-xs">No customer ledger accounts established for this shop. Add one to start.</td>
                                  </tr>
                                ) : (
                                  directCustomers.map(cust => (
                                    <tr key={cust.id} className="hover:bg-gray-50/60 transition">
                                      <td className="px-4 py-3">
                                        <span className="block font-bold text-gray-950 leading-none">{cust.name}</span>
                                        <span className="block text-[8px] text-gray-400 font-mono mt-1">ID: {cust.id.slice(0, 8)}</span>
                                      </td>
                                      <td className="px-4 py-3 text-gray-500">
                                        <span className="block font-semibold text-xs text-gray-800">{cust.phone || 'N/A'}</span>
                                        <span className="block text-[9px] text-gray-400 font-mono">{cust.email || 'No email logged'}</span>
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono font-black text-xs">
                                        <span className={cust.balance > 0 ? 'text-red-650' : (cust.balance < 0 ? 'text-blue-700' : 'text-gray-450')}>
                                          {directShopObj?.currency} {cust.balance?.toLocaleString() || 0}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                          cust.balance > 0 
                                            ? 'bg-red-50 text-red-750 border-red-150' 
                                            : (cust.balance < 0 ? 'bg-blue-50 text-blue-750 border-blue-150' : 'bg-gray-100 text-gray-550 border-gray-200')
                                        }`}>
                                          {cust.balance > 0 ? 'Unpaid Dues' : (cust.balance < 0 ? 'Prepaid/Adv' : 'Settled')}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Setup or Adjust Customer balance */}
                      <div className="space-y-6">
                        
                        {/* Box 1: Add new Customer */}
                        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs">
                          <div className="border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
                            <PlusCircle className="h-4.5 w-4.5 text-emerald-600" />
                            <h5 className="text-[11px] uppercase font-black tracking-widest text-gray-950">Register New Customer</h5>
                          </div>
                          <form onSubmit={handleDirectAddCustomer} className="space-y-3 text-xs font-semibold">
                            <div>
                              <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Full Name *</label>
                              <input 
                                type="text" required value={newCustName} onChange={(e) => setNewCustName(e.target.value)}
                                className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                                placeholder="Customer Name"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Phone Contact</label>
                                <input 
                                  type="text" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)}
                                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono placeholder-gray-300"
                                  placeholder="+92..."
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Open Debt Bal</label>
                                <input 
                                  type="number" value={custLedgerOpening} onChange={(e) => setCustLedgerOpening(e.target.value)}
                                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-right text-red-650"
                                />
                              </div>
                            </div>
                            <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold tracking-widest text-[9px] uppercase rounded-xl transition cursor-pointer">
                              Setup Credit Account
                            </button>
                          </form>
                        </div>

                        {/* Box 2: Record payments / credits manually */}
                        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs">
                          <div className="border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
                            <Coins className="h-4.5 w-4.5 text-indigo-650" />
                            <h5 className="text-[11px] uppercase font-black tracking-widest text-gray-950">Add Payment vs Debit Log</h5>
                          </div>
                          <form onSubmit={handleDirectRecordCustomerTx} className="space-y-3 text-xs font-semibold">
                            <div>
                              <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5 font-bold">Choose Customer *</label>
                              <select 
                                required value={activeCustIdSelected} onChange={(e) => setActiveCustIdSelected(e.target.value)}
                                className="w-full text-xs p-2 bg-gray-55/70 border border-gray-200 rounded-lg font-bold"
                              >
                                <option value="">-- Choose Account --</option>
                                {directCustomers.map(c => (
                                  <option key={c.id} value={c.id}>{c.name} (Debt: {directShopObj?.currency} {c.balance})</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Booking Action</label>
                                <select 
                                  value={custTxType} onChange={(e) => setCustTxType(e.target.value as any)}
                                  className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded-lg font-bold"
                                >
                                  <option value="payment_received">Payment Received (-)</option>
                                  <option value="credit">Issue Credit Supply (+)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Amount ({directShopObj?.currency}) *</label>
                                <input 
                                  type="number" required value={custTxAmount} onChange={(e) => setCustTxAmount(e.target.value)}
                                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-right font-extrabold"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Payment Method</label>
                                <select 
                                  value={custTxMethod} onChange={(e) => setCustTxMethod(e.target.value as any)}
                                  className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                                >
                                  <option value="Cash">Cash Hand</option>
                                  <option value="Bank">Bank Wire</option>
                                  <option value="JazzCash">JazzCash</option>
                                  <option value="EasyPaisa">EasyPaisa</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5 font-bold">Billing Reason Brief</label>
                                <input 
                                  type="text" value={custTxDescription} onChange={(e) => setCustTxDescription(e.target.value)}
                                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg"
                                  placeholder="e.g. Cleared wheat floor dues"
                                />
                              </div>
                            </div>
                            <button type="submit" className="w-full py-2 bg-indigo-650 hover:bg-indigo-750 text-white font-extrabold tracking-widest text-[9px] uppercase rounded-xl transition cursor-pointer">
                              Record Financial Booking
                            </button>
                          </form>
                        </div>

                      </div>

                    </div>
                  )}

                  {/* DIRECT DEALERS LEDGER TAB */}
                  {selectedSubDirectTab === 'dealers' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Dealers list table */}
                      <div className="lg:col-span-2 bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <h4 className="text-[11px] uppercase font-black tracking-widest text-gray-900">Tenant Grain Dealers & Raw Suppliers Ledger</h4>
                            <span className="bg-cyan-50 border border-cyan-200 text-cyan-805 font-bold px-2 py-0.5 rounded text-[9px] font-mono">Dues Outstanding</span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-150 text-left text-xs bg-white">
                              <thead className="bg-gray-50 font-bold text-gray-400 uppercase tracking-wider text-[9px]">
                                <tr>
                                  <th className="px-4 py-2.5">Dealer / Supplier</th>
                                  <th className="px-4 py-2.5">Company Affiliation</th>
                                  <th className="px-4 py-2.5 text-right">Outstanding (We Owe Them)</th>
                                  <th className="px-4 py-2.5 text-center">Ledger Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-sans font-medium text-gray-700">
                                {directSuppliers.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-400 text-xs text-medium">No raw suppliers/dealers created inside database yet.</td>
                                  </tr>
                                ) : (
                                  directSuppliers.map(sup => (
                                    <tr key={sup.id} className="hover:bg-gray-50/60 transition">
                                      <td className="px-4 py-3">
                                        <span className="block font-bold text-gray-950 leading-none">{sup.name}</span>
                                        <span className="block text-[8px] text-gray-400 font-mono mt-1">ID: {sup.id.slice(0, 8)}</span>
                                      </td>
                                      <td className="px-4 py-3 text-indigo-750">
                                        <span className="block font-semibold text-xs text-indigo-850 font-mono">{sup.company || 'Private Dealer'}</span>
                                        <span className="block text-[9px] text-gray-400">{sup.phone || 'No phone'}</span>
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono font-black text-xs">
                                        <span className={sup.balance > 0 ? 'text-red-650' : 'text-gray-450'}>
                                          {directShopObj?.currency} {sup.balance?.toLocaleString() || 0}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                          sup.balance > 0 
                                            ? 'bg-rose-50 text-rose-750 border-rose-150 font-bold animate-pulse' 
                                            : 'bg-gray-100 text-gray-550 border-gray-200'
                                        }`}>
                                          {sup.balance > 0 ? 'Payment Outstanding' : 'Balance Settled'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Setup / trans with Supplier */}
                      <div className="space-y-6">
                        
                        {/* Box 1: Add new Supplier */}
                        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs">
                          <div className="border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
                            <PlusCircle className="h-4.5 w-4.5 text-cyan-550" />
                            <h5 className="text-[11px] uppercase font-black tracking-widest text-gray-950">Add Grain Supplier / Dealer</h5>
                          </div>
                          <form onSubmit={handleDirectAddSupplier} className="space-y-3 text-xs font-semibold">
                            <div>
                              <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Dealer Full Name *</label>
                              <input 
                                type="text" required value={newSupName} onChange={(e) => setNewSupName(e.target.value)}
                                className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                                placeholder="Contact Name"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Company Brand Entity</label>
                              <input 
                                type="text" value={newSupCompany} onChange={(e) => setNewSupCompany(e.target.value)}
                                className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none placeholder-gray-300"
                                placeholder="e.g. Punjab Crop Dealers Corp"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Primary Phone</label>
                                <input 
                                  type="text" value={newSupPhone} onChange={(e) => setNewSupPhone(e.target.value)}
                                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono placeholder-gray-300"
                                  placeholder="+92..."
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Dues Opening bal</label>
                                <input 
                                  type="number" value={supLedgerOpening} onChange={(e) => setSupLedgerOpening(e.target.value)}
                                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-right text-red-650"
                                />
                              </div>
                            </div>
                            <button type="submit" className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold tracking-widest text-[9px] uppercase rounded-xl transition cursor-pointer">
                              Record Dealer Profile
                            </button>
                          </form>
                        </div>

                        {/* Box 2: Record payments / credits manually */}
                        <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs">
                          <div className="border-b border-gray-100 pb-2 mb-3 flex items-center gap-1.5">
                            <TrendingUp className="h-4.5 w-4.5 text-indigo-650" />
                            <h5 className="text-[11px] uppercase font-black tracking-widest text-gray-950">Record Grain Purchase vs Bills</h5>
                          </div>
                          <form onSubmit={handleDirectRecordSupplierTx} className="space-y-3 text-xs font-semibold">
                            <div>
                              <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5 font-bold">Choose Dealer account *</label>
                              <select 
                                required value={activeSupIdSelected} onChange={(e) => setActiveSupIdSelected(e.target.value)}
                                className="w-full text-xs p-2 bg-gray-55/70 border border-gray-200 rounded-lg font-bold"
                              >
                                <option value="">-- Choose Account --</option>
                                {directSuppliers.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} (My Debt: {directShopObj?.currency} {s.balance})</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Booking Action</label>
                                <select 
                                  value={supTxType} onChange={(e) => setSupTxType(e.target.value as any)}
                                  className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-700"
                                >
                                  <option value="payment_made">We made payment to them (-)</option>
                                  <option value="grain_purchased">Purchased Grain Crop Bill (+)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Amount ({directShopObj?.currency}) *</label>
                                <input 
                                  type="number" required value={supTxAmount} onChange={(e) => setSupTxAmount(e.target.value)}
                                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-indigo-700 text-right font-extrabold"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5">Payment Method</label>
                                <select 
                                  value={supTxMethod} onChange={(e) => setSupTxMethod(e.target.value as any)}
                                  className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-bold"
                                >
                                  <option value="Cash">Cash Hand</option>
                                  <option value="Bank">Bank Wire</option>
                                  <option value="JazzCash">JazzCash</option>
                                  <option value="EasyPaisa">EasyPaisa</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-0.5 font-bold font-bold">Billing Memo</label>
                                <input 
                                  type="text" value={supTxDescription} onChange={(e) => setSupTxDescription(e.target.value)}
                                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg placeholder-gray-300"
                                  placeholder="e.g. Purchased 40 sacks Wheat Grain"
                                />
                              </div>
                            </div>
                            <button type="submit" className="w-full py-2 bg-indigo-650 hover:bg-indigo-750 text-white font-extrabold tracking-widest text-[9px] uppercase rounded-xl transition cursor-pointer">
                              Record Financial Booking
                            </button>
                          </form>
                        </div>

                      </div>

                    </div>
                  )}

                  {/* DIRECT SHOP CONFIG SETTINGS TAB */}
                  {selectedSubDirectTab === 'settings' && (
                    <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-3xs max-w-3xl">
                      <div className="border-b border-gray-100 pb-3 mb-5 flex items-center gap-2">
                        <PenTool className="h-5 w-5 text-purple-600 animate-spin" />
                        <div>
                          <h4 className="text-xs font-black text-gray-950 uppercase tracking-wider">Tenant Global Settings & Billing Configuration</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Configure VAT tax codes, currency parameters, system name tags, and invoice paper footer directly.</p>
                        </div>
                      </div>

                      <form onSubmit={handleSaveDirectShopConfig} className="space-y-4 text-xs font-semibold">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1.5">Registered Mill Business Name *</label>
                            <input 
                              type="text" required value={shopConfName} onChange={(e) => setShopConfName(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1.5">Official Helpline / Phone *</label>
                            <input 
                              type="text" required value={shopConfPhone} onChange={(e) => setShopConfPhone(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1.5">Base System Currency Code *</label>
                            <select 
                              value={shopConfCurrency} onChange={(e) => setShopConfCurrency(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-bold"
                            >
                              <option value="PKR">Pakistani Rupee (PKR)</option>
                              <option value="INR">Indian Rupee (INR)</option>
                              <option value="AED">UAE Dirham (AED)</option>
                              <option value="SAR">Saudi Riyal (SAR)</option>
                              <option value="OMR">Omani Rial (OMR)</option>
                              <option value="USD">US Dollar ($)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1.5">VAT / NTN Bill Tax rate percentage</label>
                            <input 
                              type="number" step="0.01" value={shopConfTax} onChange={(e) => setShopConfTax(e.target.value)}
                              className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-right"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1.5">Physical Warehouse / Premise Address</label>
                          <textarea 
                            rows={2} value={shopConfAddress} onChange={(e) => setShopConfAddress(e.target.value)}
                            className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1.5 font-bold">POS Receipt footer greeting tag string</label>
                          <input 
                            type="text" value={shopConfFooter} onChange={(e) => setShopConfFooter(e.target.value)}
                            className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                            placeholder="e.g. Thanks for purchasing pure whole wheat grain goods! Visit again."
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold tracking-wider text-xs uppercase rounded-xl transition cursor-pointer"
                        >
                          Modify Rules & Global Configs
                        </button>
                      </form>
                    </div>
                  )}

                  {/* DIRECT USERS STAFF AND SECURE PASSWORDS TAB */}
                  {selectedSubDirectTab === 'users' && (
                    <div className="bg-white border border-gray-150 rounded-2xl shadow-3xs overflow-hidden">
                      <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                        <h4 className="text-[11px] uppercase font-black tracking-widest text-gray-900 leading-none">Security Access List & Clear Passcodes Directory</h4>
                        <p className="text-[10px] text-indigo-700 mt-1.5 font-bold">Supervising all staff login tokens map to {directShopObj?.name}</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-150 text-left text-xs bg-white">
                          <thead className="bg-gray-50 font-bold text-gray-400 uppercase tracking-wider text-[9px]">
                            <tr>
                              <th className="px-5 py-3">Staff Profile Name / Login email</th>
                              <th className="px-5 py-3 text-center">Perm Role Access</th>
                              <th className="px-5 py-3 text-center">Plaintext Passcode (Security Key)</th>
                              <th className="px-5 py-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-sans font-medium text-gray-700">
                            {directUsers.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center py-8 text-gray-400 text-xs">No active staff members registered to this tenant profile.</td>
                              </tr>
                            ) : (
                              directUsers.map(usr => {
                                const isEditing = editingDirectUserId === usr.id;
                                return (
                                  <tr key={usr.id} className="hover:bg-gray-50/60 transition">
                                    <td className="px-5 py-3.5">
                                      {isEditing ? (
                                        <input 
                                          type="text" value={editDUName} onChange={(e) => setEditDUName(e.target.value)}
                                          className="text-xs p-1 bg-white border border-gray-300 rounded focus:outline-none"
                                        />
                                      ) : (
                                        <div>
                                          <span className="block font-bold text-gray-950 leading-none">{usr.full_name}</span>
                                          <span className="block text-[9px] text-gray-400 font-mono mt-1">{usr.email}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                      {isEditing ? (
                                        <select 
                                          value={editDURole} onChange={(e) => setEditDURole(e.target.value as any)}
                                          className="text-[10px] p-1 font-bold text-gray-700"
                                        >
                                          <option value="owner">Owner (Full Admin)</option>
                                          <option value="manager">Manager (Milling)</option>
                                          <option value="cashier">Cashier (POS)</option>
                                          <option value="super_admin">Super Admin (Global)</option>
                                        </select>
                                      ) : (
                                        <span className="inline-block px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-indigo-200 bg-indigo-50 text-indigo-750 font-sans">
                                          {usr.role?.replace('_', ' ')}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center font-mono text-xs font-black">
                                      {isEditing ? (
                                        <input 
                                          type="text" value={editDUPassword} onChange={(e) => setEditDUPassword(e.target.value)}
                                          className="text-xs p-1 bg-white border border-gray-300 rounded focus:outline-none font-mono text-center w-24 font-bold text-indigo-850"
                                        />
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 bg-gray-55/40 border border-gray-200 px-2 py-0.5 rounded font-bold text-gray-800">
                                          <Key className="h-3 w-3 text-amber-500" />
                                          {usr.password || '1234'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                      {isEditing ? (
                                        <div className="flex justify-center gap-1">
                                          <button 
                                            onClick={() => handleSaveDirectUserEdit(usr.id)}
                                            className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold cursor-pointer"
                                          >
                                            Save Setup
                                          </button>
                                          <button 
                                            onClick={() => setEditingDirectUserId(null)}
                                            className="p-1 px-2 bg-gray-200 text-gray-700 rounded text-[9px] font-bold cursor-pointer"
                                          >
                                            Undo
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex justify-center gap-1.5">
                                          <button 
                                            onClick={() => startDirectUserEdit(usr)}
                                            className="p-1 text-indigo-650 hover:text-indigo-805 hover:bg-indigo-50 rounded transition cursor-pointer"
                                            title="Update login config"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                          </button>
                                          <button 
                                            onClick={() => handleDirectDeleteUser(usr.id)}
                                            className="p-1 text-red-650 hover:text-red-805 hover:bg-red-50 rounded transition cursor-pointer"
                                            title="Permanently erase staff"
                                          >
                                            <Trash className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-gray-150 rounded-2xl">
              <p className="text-xs font-semibold text-gray-500">Please establish/register a Mill or Shop profile first under the "Provisioning" tab.</p>
            </div>
          )}

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
