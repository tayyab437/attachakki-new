/**
 * Central State Store (Zustand) for Flour Shop SaaS
 * Supports transparent live Supabase database pooling or fallback offline sandbox.
 */

import { create } from 'zustand';
import { localDB, supabase as rawSupabase, config, initSupabase } from './supabase';
import { 
  Shop, Profile, Product, InventoryLog, Customer, CustomerTransaction, 
  Supplier, SupplierTransaction, Sale, SaleItem, Invoice, Expense, 
  Notification, ActivityLog, UserRole 
} from '../types';

interface VerificationState {
  emailSent: boolean;
  emailToVerify: string | null;
  otpToken: string | null;
  expired: boolean;
}

interface AppStore {
  // Session Configuration
  currentUser: Profile | null;
  currentShop: Shop | null;
  allShops: Shop[]; // for Super Admin mode
  allProfiles: Profile[]; // for Super Admin mode
  userRoles: { [uid: string]: UserRole };
  verification: VerificationState;

  // DB Collections (Filtered by shop_id for tenant safety)
  products: Product[];
  categories: { id: string; name: string; description: string | null }[];
  inventoryLogs: InventoryLog[];
  customers: Customer[];
  customerTransactions: CustomerTransaction[];
  suppliers: Supplier[];
  supplierTransactions: SupplierTransaction[];
  sales: Sale[];
  saleItems: SaleItem[];
  invoices: Invoice[];
  expenses: Expense[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  settings: any;

  // Global Utilities
  appMode: 'demo' | 'live_supabase';
  loading: boolean;
  errorMessage: string | null;

  // Real-time Event Subscriptions
  startRealtimeSimulation: () => () => void;
  triggerRealtimeSale: () => void;

  // Action Methods
  initStore: () => Promise<void>;
  initOfflineStore: () => void;
  refreshData: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, shopName: string) => Promise<{ success: boolean; msg: string }>;
  verifyEmailCode: (code: string) => Promise<{ success: boolean; msg: string }>;
  resendVerificationEmail: () => Promise<void>;
  login: (email: string, pass: string) => Promise<{ success: boolean; msg: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;

  // Business CRUD
  addProduct: (product: Omit<Product, 'id' | 'shop_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (name: string, description: string | null) => Promise<any>;

  adjustInventory: (data: {
    product_id: string;
    type: 'stock_in' | 'stock_out' | 'adjustment' | 'wastage';
    quantity: number;
    reason: string;
  }) => Promise<void>;

  createSale: (data: {
    customer_id: string | null;
    customer_name_manual: string | null;
    items: { product_id: string; quantity: number; sale_price: number }[];
    discount: number;
    paid_amount: number;
    payment_method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa';
  }) => Promise<string | null>;

  addCustomer: (data: { name: string; phone: string; email: string | null; initialBalance: number }) => Promise<void>;
  receiveCustomerPayment: (data: { customer_id: string; amount: number; method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'; description: string }) => Promise<void>;
  
  addSupplier: (data: { name: string; phone: string; company: string | null; initialBalance: number }) => Promise<void>;
  makeSupplierPayment: (data: { supplier_id: string; amount: number; method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'; description: string }) => Promise<void>;

  addExpense: (data: {
    category: 'Electricity' | 'Transport' | 'Labor' | 'Rent' | 'Packaging' | 'Maintenance' | 'Other';
    amount: number;
    description: string;
    date: string;
  }) => Promise<void>;

  deleteExpense: (id: string) => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateSettings: (updatedFields: any) => Promise<void>;
  updateShopProfile: (data: Partial<Shop>) => Promise<void>;

  // Super Admin controls
  toggleShopStatus: (shopId: string) => Promise<void>;
  createShopAdmin: (name: string, phone: string, address: string, currency: string) => Promise<void>;
  createUserAdmin: (data: { email: string; full_name: string; role: UserRole; shop_id: string; password?: string }) => Promise<void>;
  updateUserAdmin: (id: string, data: Partial<Profile>) => Promise<void>;
  switchShopWorkspace: (shopId: string, userId?: string) => Promise<void>;
}

/**
 * Central Database Retrying and Session Re-Establishment service.
 * Designed with exponential backoff and randomized jitter.
 */
export async function executeDbWithRetry<T>(
  operationName: string,
  op: () => Promise<any>,
  maxRetries = 2
): Promise<any> {
  let attempt = 0;
  const initialDelay = 500; // ms
  
  while (true) {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection Timeout (4.5s limit)')), 4500)
      );
      const result = await Promise.race([op(), timeoutPromise]);
      
      // If there is no error block, then execution is clean and valid.
      if (!result || !result.error) {
        return result;
      }
      
      const error = result.error;
      const errorMsg = String(error.message || '').toLowerCase();
      const errorCode = String(error.code || '');
      
      const isRLS = errorCode === '42501' || 
                    errorMsg.includes('row-level security') || 
                    errorMsg.includes('rls') || 
                    errorMsg.includes('policy') ||
                    errorMsg.includes('violates');
                    
      const isNetwork = errorMsg.includes('fetch') || 
                        errorMsg.includes('network') || 
                        errorMsg.includes('timeout') || 
                        errorMsg.includes('failed to fetch') ||
                        error.status === 0;

      // Only attempt retries for genuine network/timeout connection issues.
      // Static permissions/RLS or database structure schema errors will fail immediately to avoid blocking or delaying client feedback.
      if (isNetwork && attempt < maxRetries) {
        attempt++;
        const backoffDelay = initialDelay * Math.pow(2, attempt - 1) * (0.85 + Math.random() * 0.3);
        console.warn(`[RETRY ENGINE] '${operationName}' failed with Network block. Re-establishing session context and retrying in ${Math.round(backoffDelay)}ms (Attempt ${attempt}/${maxRetries})...`);
        
        // Attempt to re-establish session context
        if (rawSupabase) {
          try {
            if (rawSupabase.auth) {
              await rawSupabase.auth.getSession();
            }
            // Execute a simple metadata validation query to re-establish connection
            await rawSupabase.from('profiles').select('id').limit(1);
          } catch (sessionErr) {
            console.warn('[RETRY ENGINE] Session validation ping returned error:', sessionErr);
          }
        }
        
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }
      
      // If error is persistent or not a dynamic network issue (e.g. static RLS policy limits, missing table/relation)
      const opLower = operationName.toLowerCase();
      const isCritical = opLower.includes('profile') || opLower.includes('shop');
      
      if (isCritical) {
        console.error(`[RETRY ENGINE] Critical DB transaction '${operationName}' permanently failed.`);
        const textHelp = 'Go to System Settings to ensure your Live Supabase container or local connection rules are established.';
        const customMessage = `Persistent Security/RLS or Schema error on ${operationName}: ${error.message || 'Permission Denied'}. ${textHelp}`;
        
        // Update store error states
        useStore.setState({ errorMessage: customMessage });
        
        // Push to store's alert array dynamically
        const currentNotifs = useStore.getState().notifications || [];
        useStore.setState({
          notifications: [
            {
              id: `db-ret-err-${Date.now()}`,
              shop_id: useStore.getState().currentShop?.id || 'sys',
              title: 'Supabase Data Sync Issue',
              message: customMessage,
              type: 'credit_alert',
              read: false,
              created_at: new Date().toISOString()
            },
            ...currentNotifs
          ]
        });
      } else {
        // Log minor warning for optional / secondary table queries (like expenses, activity logs)
        console.warn(`[RETRY ENGINE] Secondary table database operation warning on '${operationName}': ${error.message || 'Blocked by RLS or Missing Table error'}`);
      }
      return result;
    } catch (caughtErr: any) {
      const isNetwork = String(caughtErr.message || '').toLowerCase().includes('fetch') || 
                        String(caughtErr.message || '').toLowerCase().includes('network') ||
                        String(caughtErr.message || '').toLowerCase().includes('timeout');
                        
      if (isNetwork && attempt < maxRetries) {
        attempt++;
        const backoffDelay = initialDelay * Math.pow(2, attempt - 1) * (0.85 + Math.random() * 0.3);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }
      const crashMsg = `Untracked backend crash on '${operationName}': ${caughtErr.message}`;
      const opLower = operationName.toLowerCase();
      const isCritical = opLower.includes('profile') || opLower.includes('shop');
      
      if (isCritical) {
        useStore.setState({ errorMessage: crashMsg });
        const currentNotifs = useStore.getState().notifications || [];
        useStore.setState({
          notifications: [
            {
              id: `db-crash-${Date.now()}`,
              shop_id: useStore.getState().currentShop?.id || 'sys',
              title: 'Critical Database Crash',
              message: crashMsg,
              type: 'credit_alert',
              read: false,
              created_at: new Date().toISOString()
            },
            ...currentNotifs
          ]
        });
      } else {
        console.warn(`[RETRY ENGINE] Secondary table backend crash on '${operationName}': ${caughtErr.message}`);
      }
      return { data: null, error: caughtErr };
    }
  }
}

// Proxied Supabase client that embeds transparent retry and recovery rules for store.ts queries
export const supabase = !rawSupabase ? null : new Proxy(rawSupabase, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return function(tableName: string) {
        const builder = target.from(tableName);
        
        const wrapThenable = (obj: any): any => {
          return new Proxy(obj, {
            get(t, p, r) {
              if (p === 'then') {
                return function(onfulfilled?: any, onrejected?: any) {
                  const originalThen = t.then.bind(t);
                  
                  const op = () => {
                    return new Promise((resolve, reject) => {
                      originalThen(resolve, reject);
                    });
                  };
                  
                  return executeDbWithRetry(`Select/Mutate operation on '${tableName}'`, op)
                    .then(
                      (res) => onfulfilled ? onfulfilled(res) : res,
                      (err) => onrejected ? onrejected(err) : Promise.reject(err)
                    );
                };
              }
              const val = Reflect.get(t, p, r);
              if (typeof val === 'function') {
                return function(...args: any[]) {
                  const nextBuilder = val.apply(t, args);
                  return wrapThenable(nextBuilder);
                };
              }
              return val;
            }
          });
        };
        
        return wrapThenable(builder);
      };
    }
    
    if (prop === 'rpc') {
      return function(fnName: string, args?: any) {
        const op = () => {
          return new Promise((resolve, reject) => {
            target.rpc(fnName, args).then(resolve, reject);
          });
        };
        return executeDbWithRetry(`RPC Function '${fnName}'`, op);
      };
    }
    
    return Reflect.get(target, prop, receiver);
  }
}) as any;

export const useStore = create<AppStore>((set, get) => ({
  currentUser: null,
  currentShop: null,
  allShops: [],
  allProfiles: [],
  userRoles: {},
  appMode: 'demo',
  loading: false,
  errorMessage: null,
  verification: {
    emailSent: false,
    emailToVerify: null,
    otpToken: null,
    expired: false
  },

  products: [],
  categories: [],
  inventoryLogs: [],
  customers: [],
  customerTransactions: [],
  suppliers: [],
  supplierTransactions: [],
  sales: [],
  saleItems: [],
  invoices: [],
  expenses: [],
  notifications: [],
  activityLogs: [],
  settings: {},

  initStore: async () => {
    const savedEmail = localStorage.getItem('logged_in_user_email') || 'ac.repair.in.dubai3@gmail.com';
    
    // Resolve dynamic universal database configuration from the container's environment secrets
    if (typeof initSupabase === 'function') {
      await initSupabase();
    }
    
    // Check if the custom credentials represent a live database
    if (config.isOnline && supabase) {
      set({ loading: true, appMode: 'live_supabase' });
      try {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('*');
          
        if (pErr) throw pErr;

        const { data: shops, error: sErr } = await supabase
          .from('shops')
          .select('*');
          
        if (sErr) throw sErr;

        // Pick matching user profile or top user
        const matchedProfile = profiles?.find((p: any) => p.email.toLowerCase() === savedEmail.toLowerCase()) || profiles?.[0] || null;
        if (matchedProfile) {
          const associatedShop = shops?.find((s: any) => s.id === matchedProfile.shop_id) || null;
          set({
            currentUser: matchedProfile,
            currentShop: associatedShop,
            allShops: shops || [],
            allProfiles: profiles || [],
            appMode: 'live_supabase',
            loading: false
          });
          await get().refreshData();
        } else {
          // If profile not found but DB exists, seed owner on the database
          const defaultShopId = '11111111-1111-1111-1111-111111111111';
          const defaultUserId = '22222222-2222-2222-2222-222222222222';
          
          await supabase.from('shops').insert([{
            id: defaultShopId,
            name: 'Supreme Chakki & Grain Mills',
            logo_url: null,
            phone: '+92 300 1234567',
            address: 'Main Bazaar Road, Block 4, Lahore',
            currency: 'PKR',
            tax_rate: 0,
            invoice_footer: 'Thank you for your business! Fresh flour is health.',
            subscription_status: 'trial'
          }]);

          const seededOwner = {
            id: defaultUserId,
            shop_id: defaultShopId,
            email: savedEmail,
            full_name: 'M. Ibrahim Khan (Chakki Owner)',
            role: 'owner',
            avatar_url: null,
            is_verified: true
          };

          await supabase.from('profiles').insert([seededOwner]);
          
          // Seed defaults
          const seedCatId = '11111111-1111-1111-1111-000000000001';
          await supabase.from('product_categories').insert([
            { id: seedCatId, shop_id: defaultShopId, name: 'Premium Atta', description: 'Fresh stone-ground wheat flour' }
          ]);

          await supabase.from('products').insert([
            {
              id: '11111111-1111-1111-1111-000000000101',
              shop_id: defaultShopId,
              category_id: seedCatId,
              name: 'Premium Desi Chakki Atta',
              sku: 'DESI-ATTA-001',
              unit: 'KG',
              cost_price: 110,
              sale_price: 135,
              stock: 450,
              min_stock_alert: 100
            }
          ]);

          await supabase.from('settings').insert([{
            shop_id: defaultShopId,
            theme: 'light',
            language: 'en',
            print_size: 'thermal_80mm',
            enable_whatsapp_alert: true,
            sms_api_key: '',
            tax_registered: true,
            tax_id: 'NTN-82910-82B-9'
          }]);

          const liveShops = await supabase.from('shops').select('*');
          
          set({
            currentUser: seededOwner as any,
            currentShop: liveShops.data?.[0] || null,
            allShops: liveShops.data || [],
            allProfiles: [seededOwner as any],
            appMode: 'live_supabase',
            loading: false
          });
          await get().refreshData();
        }
      } catch (err: any) {
        console.warn('Supabase Live Load Failed, falling back to Offline engine:', err);
        set({ loading: false });
        get().initOfflineStore();
      }
    } else {
      get().initOfflineStore();
    }
  },

  initOfflineStore: () => {
    const profiles = localDB.getCollection<Profile>('profiles');
    const shops = localDB.getCollection<Shop>('shops');
    
    const firstOwner = profiles.find(p => p.role === 'owner') || profiles[0];
    if (firstOwner) {
      const associatedShop = shops.find(s => s.id === firstOwner.shop_id) || shops[0] || null;
      set({ 
        currentUser: firstOwner, 
        currentShop: associatedShop,
        allShops: shops,
        allProfiles: profiles,
        appMode: 'demo'
      });
      get().refreshData();
    }
  },

  refreshData: async () => {
    const shop = get().currentShop;
    if (!shop) return;

    if (config.isOnline && supabase) {
      // Fetch datasets in parallel from Live Supabase
      try {
        const fetchTable = async (tableName: string) => {
          const dbTableName = tableName === 'categories' ? 'product_categories' : tableName;
          try {
            const { data, error } = await supabase
              .from(dbTableName)
              .select('*')
              .eq('shop_id', shop.id);
            if (error) {
              console.warn(`Live DB error fetching ${tableName}, falling back to LocalDB:`, error);
              return localDB.getCollection<any>(tableName) || [];
            }
            return data || [];
          } catch (e) {
            console.warn(`Exception fetching ${tableName} from Live DB, falling back to LocalDB:`, e);
            return localDB.getCollection<any>(tableName) || [];
          }
        };

        const [
          products,
          categories,
          inventoryLogs,
          customers,
          customerTransactions,
          suppliers,
          supplierTransactions,
          sales,
          saleItems,
          invoices,
          expenses,
          notifications,
          activityLogs
        ] = await Promise.all([
          fetchTable('products'),
          fetchTable('categories'),
          fetchTable('inventory_logs'),
          fetchTable('customers'),
          fetchTable('customer_transactions'),
          fetchTable('suppliers'),
          fetchTable('supplier_transactions'),
          fetchTable('sales'),
          fetchTable('sale_items'),
          fetchTable('invoices'),
          fetchTable('expenses'),
          fetchTable('notifications'),
          fetchTable('activity_logs')
        ]);

        let settingsObj = {};
        const localSettingsRaw = localStorage.getItem('flour_db_settings');
        const localSettings = localSettingsRaw ? JSON.parse(localSettingsRaw) : {};

        try {
          const { data: settingsData, error: setErr } = await supabase
            .from('settings')
            .select('*')
            .eq('shop_id', shop.id)
            .maybeSingle();
            
          if (settingsData && !setErr) {
            settingsObj = { ...localSettings, ...settingsData };
          } else {
            settingsObj = localSettings;
          }
        } catch (err) {
          console.warn('Supabase settings table could not be fetched, falling back to local settings:', err);
          settingsObj = localSettings;
        }

        set({
          products: products || [],
          categories: categories || [],
          inventoryLogs: inventoryLogs || [],
          customers: customers || [],
          customerTransactions: customerTransactions || [],
          suppliers: suppliers || [],
          supplierTransactions: supplierTransactions || [],
          sales: sales || [],
          saleItems: saleItems || [],
          invoices: invoices || [],
          expenses: expenses || [],
          notifications: notifications || [],
          activityLogs: activityLogs || [],
          settings: settingsObj,
          appMode: 'live_supabase'
        });
      } catch (err) {
        console.error('Supabase parallel synchronization failed:', err);
      }
    } else {
      const filterByShop = <T extends { shop_id: string }>(tbl: string): T[] => {
        const items = localDB.getCollection<T>(tbl);
        return items.filter(item => item.shop_id === shop.id);
      };

      const localSettingsRaw = localStorage.getItem('flour_db_settings');
      const settingsObj = localSettingsRaw ? JSON.parse(localSettingsRaw) : {};

      set({
        products: filterByShop<Product>('products'),
        categories: filterByShop<any>('categories'),
        inventoryLogs: filterByShop<InventoryLog>('inventory_logs'),
        customers: filterByShop<Customer>('customers'),
        customerTransactions: filterByShop<CustomerTransaction>('customer_transactions'),
        suppliers: filterByShop<Supplier>('suppliers'),
        supplierTransactions: filterByShop<SupplierTransaction>('supplier_transactions'),
        sales: filterByShop<Sale>('sales'),
        saleItems: filterByShop<SaleItem>('sale_items'),
        invoices: filterByShop<Invoice>('invoices'),
        expenses: filterByShop<Expense>('expenses'),
        notifications: filterByShop<Notification>('notifications'),
        activityLogs: filterByShop<ActivityLog>('activity_logs'),
        settings: settingsObj,
        appMode: 'demo'
      });
    }
  },

  signUp: async (email, password, fullName, shopName) => {
    set({ loading: true });
    
    if (config.isOnline && supabase) {
      try {
        const newShopId = crypto.randomUUID();
        const newUserId = crypto.randomUUID();

        const newShop: Shop = {
          id: newShopId,
          name: shopName,
          logo_url: null,
          phone: '',
          address: '',
          currency: 'PKR',
          tax_rate: 0,
          invoice_footer: 'Thank you for your business!',
          subscription_status: 'trial',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: sErr } = await supabase.from('shops').insert([newShop]);
        if (sErr) {
          (sErr as any).tableName = 'shops';
          throw sErr;
        }

        const newProfile: Profile = {
          id: newUserId,
          shop_id: newShopId,
          email: email.trim(),
          full_name: fullName,
          role: 'owner',
          avatar_url: null,
          is_verified: true,
          created_at: new Date().toISOString()
        };

        const { error: pErr } = await supabase.from('profiles').insert([newProfile]);
        if (pErr) {
          (pErr as any).tableName = 'profiles';
          throw pErr;
        }

        const liveCatId = crypto.randomUUID();
        const { error: catErr } = await supabase.from('product_categories').insert([{
          id: liveCatId,
          shop_id: newShopId,
          name: 'Premium Ground Flour',
          description: 'Finely milled wheat flour options'
        }]);
        if (catErr) {
          (catErr as any).tableName = 'product_categories';
          throw catErr;
        }

        const { error: prodErr } = await supabase.from('products').insert([{
          id: crypto.randomUUID(),
          shop_id: newShopId,
          category_id: liveCatId,
          name: 'Supreme Wholewheat Atta',
          sku: 'WHOLE-WHT-01',
          unit: 'KG',
          cost_price: 110,
          sale_price: 135,
          stock: 300,
          min_stock_alert: 50
        }]);
        if (prodErr) {
          (prodErr as any).tableName = 'products';
          throw prodErr;
        }

        try {
          const { error: setErr } = await supabase.from('settings').insert([{
            shop_id: newShopId,
            theme: 'light',
            language: 'en',
            print_size: 'thermal_80mm',
            enable_whatsapp_alert: true,
            sms_api_key: '',
            tax_registered: true,
            tax_id: 'NTN-82910-82B-9'
          }]);
          if (setErr) {
            console.warn('Registration notice: settings table insert warning. Settings will fall back to offline local storage.', setErr);
          }
        } catch (settingsError) {
          console.warn('settings table insert warning caught. Settings will fall back to offline local storage.', settingsError);
        }

        localStorage.setItem('logged_in_user_email', email.trim().toLowerCase());

        set({
          currentUser: newProfile,
          currentShop: newShop,
          loading: false,
          verification: { emailSent: false, emailToVerify: null, otpToken: null, expired: false }
        });

        await get().refreshData();
        return { success: true, msg: 'Live Supabase shop account registered!' };
      } catch (err: any) {
        set({ loading: false });
        
        const errMsg = String(err.message || '');
        const errCode = String(err.code || '');
        const isRLS = errCode === '42501' || 
                      errMsg.toLowerCase().includes('row-level security') || 
                      errMsg.toLowerCase().includes('rls') || 
                      errMsg.toLowerCase().includes('policy') ||
                      errMsg.toLowerCase().includes('violates');
        
        if (isRLS) {
          let offendingTable = err.tableName || 'unknown';
          if (offendingTable === 'unknown') {
            const tableNames = [
              'shops', 'profiles', 'categories', 'products', 'inventory_logs', 
              'customers', 'customer_transactions', 'suppliers', 'supplier_transactions', 
              'sales', 'sale_items', 'invoices', 'expenses', 'notifications', 
              'activity_logs', 'settings'
            ];
            const matched = tableNames.find(t => 
              errMsg.toLowerCase().includes(`"${t}"`) || 
              errMsg.toLowerCase().includes(`'${t}'`) || 
              errMsg.toLowerCase().includes(` ${t} `)
            );
            if (matched) {
              offendingTable = matched;
            }
          }
          
          const adviceMessage = `⚠️ [Row Level Security Violation Detected]
Database operation refused when inserting registration data on table '${offendingTable}'.

👉 ADVICE & DIAGNOSTICS:
Your connected Supabase instance has Row Level Security enabled for '${offendingTable}' but lacks an approved write policy for client connections.

🔧 HOW TO AUTHORIZE THIS OPERATION:
Option A: Run this SQL block in your Supabase SQL Editor to enable public insert access:
   ALTER TABLE ${offendingTable} ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow direct inserts" ON ${offendingTable} FOR INSERT TO public WITH CHECK (true);

Option B: Disable RLS for testing sandbox mode:
   ALTER TABLE ${offendingTable} DISABLE ROW LEVEL SECURITY;

Detailed Database Constraint: [Code ${errCode}] ${errMsg}`;
          
          return { success: false, msg: adviceMessage };
        }
        
        return { success: false, msg: `Live Database Registration Error: [Code ${errCode}] ${errMsg}` };
      }
    } else {
      // LocalDB offline logic
      const profiles = localDB.getCollection<Profile>('profiles');
      if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
        set({ loading: false });
        return { success: false, msg: 'Email address already exists' };
      }

      const newShopId = `shop-${Date.now()}`;
      const newUserId = `user-${Date.now()}`;
      const testOtpToken = Math.floor(100000 + Math.random() * 900000).toString();

      const newShop: Shop = {
        id: newShopId,
        name: shopName,
        logo_url: null,
        phone: '',
        address: '',
        currency: 'PKR',
        tax_rate: 0,
        invoice_footer: 'Thank you for your business!',
        subscription_status: 'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const newProfile: Profile = {
        id: newUserId,
        shop_id: newShopId,
        email: email,
        full_name: fullName,
        role: 'owner',
        avatar_url: null,
        is_verified: false,
        created_at: new Date().toISOString()
      };

      const shops = localDB.getCollection<Shop>('shops');
      shops.push(newShop);
      localDB.saveCollection('shops', shops);

      profiles.push(newProfile);
      localDB.saveCollection('profiles', profiles);

      const newCategories = [
        { id: `cat-1-${Date.now()}`, shop_id: newShopId, name: 'Premium Ground Flour', description: 'Finely milled grain packs' },
        { id: `cat-2-${Date.now()}`, shop_id: newShopId, name: 'Raw Grain Sacks', description: 'Whole grains bags' }
      ];
      const categories = localDB.getCollection<any>('categories');
      categories.push(...newCategories);
      localDB.saveCollection('categories', categories);

      set({
        verification: { emailSent: true, emailToVerify: email, otpToken: testOtpToken, expired: false },
        loading: false
      });

      return { 
        success: true, 
        msg: `Verification code registered: ${testOtpToken} to ${email}.` 
      };
    }
  },

  verifyEmailCode: async (code) => {
    const { verification } = get();
    if (!verification.emailSent || !verification.emailToVerify) {
      return { success: false, msg: 'No active verification session.' };
    }

    if (code !== verification.otpToken) {
      return { success: false, msg: 'Invalid verification token. Please try again.' };
    }

    const email = verification.emailToVerify;
    const profiles = localDB.getCollection<Profile>('profiles');
    const userIndex = profiles.findIndex(p => p.email.toLowerCase() === email.toLowerCase());

    if (userIndex !== -1) {
      profiles[userIndex].is_verified = true;
      localDB.saveCollection('profiles', profiles);

      const shops = localDB.getCollection<Shop>('shops');
      const currentShop = shops.find(s => s.id === profiles[userIndex].shop_id) || null;

      const defaultProducts: Product[] = [{
        id: `p-desi-${Date.now()}`,
        shop_id: currentShop?.id || '',
        category_id: null,
        name: 'Supreme Wholewheat Atta',
        sku: 'WHOLE-WHT-01',
        unit: 'KG',
        cost_price: 110,
        sale_price: 135,
        stock: 300,
        min_stock_alert: 50,
        image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }];
      const products = localDB.getCollection<Product>('products');
      products.push(...defaultProducts);
      localDB.saveCollection('products', products);

      set({
        currentUser: profiles[userIndex],
        currentShop: currentShop,
        verification: { emailSent: false, emailToVerify: null, otpToken: null, expired: false },
        allShops: shops
      });

      await get().refreshData();
      return { success: true, msg: 'Email verification successful!' };
    }

    return { success: false, msg: 'Account not found. Try signing up again.' };
  },

  resendVerificationEmail: async () => {
    const { verification } = get();
    if (verification.emailToVerify) {
      const newOtp = Math.floor(111111 + Math.random() * 888888).toString();
      set({
        verification: { ...verification, otpToken: newOtp }
      });
      console.log(`[SIMULATED CODE RETRY] Resent token: ${newOtp} to ${verification.emailToVerify}`);
    }
  },

  login: async (email, pass) => {
    set({ loading: true, errorMessage: null });

    if (config.isOnline && supabase) {
      try {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('*');
        if (pErr) throw pErr;

        const user = profiles?.find((p: any) => p.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) {
          set({ loading: false });
          return { success: false, msg: 'This user account does not exist. Please use Sign Up.' };
        }

        const { data: shops, error: sErr } = await supabase
          .from('shops')
          .select('*');
        if (sErr) throw sErr;
        
        const userShop = shops?.find((s: any) => s.id === user.shop_id) || null;
        localStorage.setItem('logged_in_user_email', email.trim().toLowerCase());

        set({
          currentUser: user,
          currentShop: userShop,
          loading: false,
          allShops: shops || []
        });

        // Log session activity
        await supabase.from('activity_logs').insert([{
          id: crypto.randomUUID(),
          shop_id: user.shop_id,
          user_email: email,
          action: 'Authorized Session (SQL-Live)',
          details: `Connected successfully. Mode: Live Cloud DB`
        }]);

        await get().refreshData();
        return { success: true, msg: 'Successfully connected and pooled remote cloud database.' };
      } catch (err: any) {
        set({ loading: false });
        return { success: false, msg: `Supabase Live Error: ${err.message}` };
      }
    } else {
      const profiles = localDB.getCollection<Profile>('profiles');
      const user = profiles.find(p => p.email.toLowerCase().trim() === email.trim().toLowerCase());

      if (!user) {
        set({ loading: false });
        return { success: false, msg: 'Invalid email address or passcode' };
      }

      if (!user.is_verified) {
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        set({
          verification: { emailSent: true, emailToVerify: email, otpToken: generatedOtp, expired: false },
          loading: false
        });
        return { success: false, msg: `Registration is incomplete. Code resent to ${email}. (Code: ${generatedOtp})` };
      }

      const shops = localDB.getCollection<Shop>('shops');
      const userShop = shops.find(s => s.id === user.shop_id) || null;

      localStorage.setItem('logged_in_user_email', email.trim().toLowerCase());

      set({
        currentUser: user,
        currentShop: userShop,
        loading: false,
        allShops: shops
      });

      const actLogs = localDB.getCollection<ActivityLog>('activity_logs');
      actLogs.push({
        id: `act-${Date.now()}`,
        shop_id: user.shop_id,
        user_email: email,
        action: 'Session Authorize',
        details: `User connected offline in role '${user.role}'`,
        created_at: new Date().toISOString()
      });
      localDB.saveCollection('activity_logs', actLogs);

      await get().refreshData();
      return { success: true, msg: 'Sandbox Authorized successfully.' };
    }
  },

  logout: () => {
    set({ currentUser: null, currentShop: null });
  },

  switchRole: async (role) => {
    const { currentUser } = get();
    if (!currentUser) return;

    if (config.isOnline && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', currentUser.id);
        if (error) throw error;
        set({ currentUser: { ...currentUser, role } });
        await get().refreshData();
      } catch (err) {
        console.error('Failed to change role over Supabase:', err);
      }
    } else {
      const updated = { ...currentUser, role };
      set({ currentUser: updated });
      const profiles = localDB.getCollection<Profile>('profiles');
      const idx = profiles.findIndex(p => p.id === currentUser.id);
      if (idx !== -1) {
        profiles[idx].role = role;
        localDB.saveCollection('profiles', profiles);
        await get().refreshData();
      }
    }
  },

  addProduct: async (product) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newProgId = config.isOnline ? crypto.randomUUID() : `prod-${Date.now()}`;
    const newProduct: Product = {
      ...product,
      id: newProgId,
      shop_id: shop.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optimistic Update: instantly display newly added product
    const currentList = get().products;
    set({
      products: [...currentList, newProduct]
    });

    if (config.isOnline && supabase) {
      // Async database insert in background
      (async () => {
        try {
          const { error } = await supabase.from('products').insert([newProduct]);
          if (error) throw error;
          
          if (newProduct.stock > 0) {
            await supabase.from('inventory_logs').insert([{
              id: crypto.randomUUID(),
              shop_id: shop.id,
              product_id: newProduct.id,
              type: 'stock_in',
              quantity: newProduct.stock,
              unit: newProduct.unit,
              reason: 'Product Stock Seed',
              created_by: get().currentUser?.id || 'sys',
              created_at: new Date().toISOString()
            }]);
          }
        } catch (err) {
          console.error('Failed to write product to live Supabase:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const products = localDB.getCollection<Product>('products');
      products.push(newProduct);
      localDB.saveCollection('products', products);

      if (newProduct.stock > 0) {
        const logs = localDB.getCollection<InventoryLog>('inventory_logs');
        logs.push({
          id: `log-${Date.now()}`,
          shop_id: shop.id,
          product_id: newProduct.id,
          type: 'stock_in',
          quantity: newProduct.stock,
          unit: newProduct.unit,
          reason: 'Initial Product Stock Seed',
          created_by: get().currentUser?.id || 'sys',
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('inventory_logs', logs);
      }
      get().refreshData();
    }
  },

  updateProduct: async (id, data) => {
    const prevProd = get().products.find(p => p.id === id);
    const prevStock = prevProd ? prevProd.stock : 0;
    const unit = prevProd ? prevProd.unit : 'KG';

    // Optimistic Update: instantly update product in UI state
    set({
      products: get().products.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p)
    });

    if (config.isOnline && supabase) {
      // Async background DB synchronization
      (async () => {
        try {
          const { error } = await supabase
            .from('products')
            .update({
              ...data,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
          if (error) throw error;

          if (data.stock !== undefined && data.stock !== prevStock) {
            const diff = data.stock - prevStock;
            await supabase.from('inventory_logs').insert([{
              id: crypto.randomUUID(),
              shop_id: get().currentShop?.id || '',
              product_id: id,
              type: diff > 0 ? 'stock_in' : 'stock_out',
              quantity: Math.abs(diff),
              unit: unit,
              reason: 'Direct Stock Override Edit',
              created_by: get().currentUser?.id || 'sys',
              created_at: new Date().toISOString()
            }]);
          }
        } catch (err) {
          console.error('Failed to sync updated product to live Supabase:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const products = localDB.getCollection<Product>('products');
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...data, updated_at: new Date().toISOString() };
        localDB.saveCollection('products', products);

        if (data.stock !== undefined && data.stock !== prevStock) {
          const diff = data.stock - prevStock;
          const logs = localDB.getCollection<InventoryLog>('inventory_logs');
          logs.push({
            id: `log-${Date.now()}`,
            shop_id: get().currentShop?.id || '',
            product_id: id,
            type: diff > 0 ? 'stock_in' : 'stock_out',
            quantity: Math.abs(diff),
            unit: products[idx].unit,
            reason: 'Direct Stock Override Edit',
            created_by: get().currentUser?.id || 'sys',
            created_at: new Date().toISOString()
          });
          localDB.saveCollection('inventory_logs', logs);
        }
      }
      get().refreshData();
    }
  },

  deleteProduct: async (id) => {
    // Optimistic Update: instantly clear product from UI state
    set({
      products: get().products.filter(p => p.id !== id)
    });

    if (config.isOnline && supabase) {
      // Async background DB delete
      (async () => {
        try {
          const { error } = await supabase.from('products').delete().eq('id', id);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to delete live product:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const products = localDB.getCollection<Product>('products').filter(p => p.id !== id);
      localDB.saveCollection('products', products);
      get().refreshData();
    }
  },

  addCategory: async (name, description) => {
    const shop = get().currentShop;
    if (!shop) return null;

    const newCat = {
      id: config.isOnline ? crypto.randomUUID() : `cat-${Date.now()}`,
      shop_id: shop.id,
      name,
      description
    };

    // Optimistic Update: instantly update list in UI
    set({
      categories: [...get().categories, newCat]
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          const { error } = await supabase.from('product_categories').insert([newCat]);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to load category to live DB:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const categories = localDB.getCollection<any>('categories');
      categories.push(newCat);
      localDB.saveCollection('categories', categories);
      get().refreshData();
    }

    return newCat;
  },

  adjustInventory: async ({ product_id, type, quantity, reason }) => {
    const shop = get().currentShop;
    if (!shop) return;

    const targetProduct = get().products.find(p => p.id === product_id);
    if (!targetProduct) return;

    const factor = (type === 'stock_in' || type === 'adjustment') ? 1 : -1;
    const finalChange = quantity * factor;
    const computedStock = Math.max(0, targetProduct.stock + finalChange);

    // Optimistic Update: instantly reflect inventory balance in UI state
    set({
      products: get().products.map(p => p.id === product_id ? { ...p, stock: computedStock, updated_at: new Date().toISOString() } : p)
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          await supabase.from('products').update({ stock: computedStock, updated_at: new Date().toISOString() }).eq('id', product_id);
          await supabase.from('inventory_logs').insert([{
            id: crypto.randomUUID(),
            shop_id: shop.id,
            product_id,
            type,
            quantity,
            unit: targetProduct.unit,
            reason,
            created_by: get().currentUser?.id || 'sys'
          }]);

          if (computedStock <= targetProduct.min_stock_alert) {
            await supabase.from('notifications').insert([{
              id: crypto.randomUUID(),
              shop_id: shop.id,
              title: 'Critical Stock Alert',
              message: `${targetProduct.name} only has ${computedStock} ${targetProduct.unit} left.`,
              type: 'low_stock',
              read: false
            }]);
          }
        } catch (err) {
          console.error('Supabase inventory log save failed:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const products = localDB.getCollection<Product>('products');
      const pIdx = products.findIndex(p => p.id === product_id);
      if (pIdx !== -1) {
        products[pIdx].stock = computedStock;
        products[pIdx].updated_at = new Date().toISOString();
        localDB.saveCollection('products', products);

        const logs = localDB.getCollection<InventoryLog>('inventory_logs');
        logs.push({
          id: `log-${Date.now()}`,
          shop_id: shop.id,
          product_id,
          type,
          quantity,
          unit: products[pIdx].unit,
          reason,
          created_by: get().currentUser?.id || 'sys',
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('inventory_logs', logs);

        if (products[pIdx].stock <= products[pIdx].min_stock_alert) {
          const alerts = localDB.getCollection<Notification>('notifications');
          alerts.push({
            id: `not-${Date.now()}`,
            shop_id: shop.id,
            title: 'Critical Stock Alert',
            message: `${products[pIdx].name} contains only ${products[pIdx].stock} ${products[pIdx].unit} left (Alert trigger is ${products[pIdx].min_stock_alert})`,
            type: 'low_stock',
            read: false,
            created_at: new Date().toISOString()
          });
          localDB.saveCollection('notifications', alerts);
        }
      }
      get().refreshData();
    }
  },

  createSale: async (data) => {
    const shop = get().currentShop;
    const user = get().currentUser;
    if (!shop || !user) return null;

    const saleId = config.isOnline ? crypto.randomUUID() : `sale-${Date.now()}`;
    let itemSubtotal = 0;
    const saleItemsList: SaleItem[] = [];

    // Calculate subtotal
    for (const line of data.items) {
      const prod = get().products.find(p => p.id === line.product_id);
      if (!prod) continue;
      const lineTotal = line.quantity * line.sale_price;
      itemSubtotal += lineTotal;

      saleItemsList.push({
        id: config.isOnline ? crypto.randomUUID() : `si-${Date.now()}-${Math.random()}`,
        shop_id: shop.id,
        sale_id: saleId,
        product_id: prod.id,
        product_name: prod.name,
        quantity: line.quantity,
        unit: prod.unit,
        unit_price: line.sale_price,
        cost_price_at_sale: prod.cost_price,
        total: lineTotal
      });
    }

    const taxAmount = parseFloat(((itemSubtotal - data.discount) * (shop.tax_rate / 100)).toFixed(2));
    const netAmount = Math.max(0, itemSubtotal - data.discount + taxAmount);
    
    let paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 'paid';
    if (data.paid_amount >= netAmount) {
      paymentStatus = 'paid';
    } else if (data.paid_amount > 0) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'unpaid';
    }

    const remainingUnpaidCharge = netAmount - data.paid_amount;
    const invNumber = `INV-${new Date().getFullYear()}-${1000 + get().sales.length + 1}`;

    const newSale: Sale = {
      id: saleId,
      shop_id: shop.id,
      customer_id: data.customer_id,
      customer_name_manual: data.customer_name_manual,
      total_amount: itemSubtotal,
      discount: data.discount,
      tax_amount: taxAmount,
      net_amount: netAmount,
      paid_amount: data.paid_amount,
      payment_method: data.payment_method,
      payment_status: paymentStatus,
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    const newInvoice: Invoice = {
      id: config.isOnline ? crypto.randomUUID() : `inv-${Date.now()}`,
      shop_id: shop.id,
      sale_id: saleId,
      invoice_number: invNumber,
      due_date: paymentStatus !== 'paid' ? new Date(Date.now() + 3600000 * 24 * 7).toISOString().split('T')[0] : null,
      notes: data.customer_id ? `Client Ledger Outstanding Invoice.` : `Instore Walk-in cash receipt.`,
      created_at: new Date().toISOString()
    };

    // --- INSTANT OPTIMISTIC STATE UPDATE ---
    const currentProducts = get().products;
    const currentCustomers = get().customers;
    const updatedProducts = currentProducts.map(p => {
      const line = data.items.find(item => item.product_id === p.id);
      if (line) {
        return { ...p, stock: Math.max(0, p.stock - line.quantity) };
      }
      return p;
    });
    const updatedCustomers = currentCustomers.map(c => {
      if (c.id === data.customer_id && remainingUnpaidCharge > 0) {
        return { ...c, balance: c.balance + remainingUnpaidCharge };
      }
      return c;
    });

    // Update state instantly so checkout completes immediately!
    set({
      products: updatedProducts,
      customers: updatedCustomers,
      sales: [newSale, ...get().sales],
      saleItems: [...saleItemsList, ...get().saleItems],
      invoices: [newInvoice, ...get().invoices]
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          // Stage 1: Update independent tables (Products, Customers)
          const prepPromises: Promise<any>[] = [];

          // Decrease stock on products and record notifications
          for (const line of data.items) {
            const prod = currentProducts.find(p => p.id === line.product_id);
            if (!prod) continue;
            const finalStock = Math.max(0, prod.stock - line.quantity);
            prepPromises.push(supabase.from('products').update({ stock: finalStock, updated_at: new Date().toISOString() }).eq('id', prod.id));
            
            if (finalStock <= prod.min_stock_alert) {
              prepPromises.push(supabase.from('notifications').insert([{
                id: crypto.randomUUID(),
                shop_id: shop.id,
                title: 'Low Stock Alert',
                message: `${prod.name} has been depleted to ${finalStock} ${prod.unit} via sale ${saleId}`,
                type: 'low_stock',
                read: false
              }]));
            }
          }

          // Customer balance updates
          if (data.customer_id) {
            const activeCustomer = currentCustomers.find(c => c.id === data.customer_id);
            if (activeCustomer) {
              if (remainingUnpaidCharge > 0) {
                const updatedBal = activeCustomer.balance + remainingUnpaidCharge;
                prepPromises.push(supabase.from('customers').update({ balance: updatedBal }).eq('id', data.customer_id));
              }
            }
          }

          if (prepPromises.length > 0) {
            await Promise.all(prepPromises);
          }

          // Stage 2: Insert the Sale record (parent table referenced by children)
          const { error: saleErr } = await supabase.from('sales').insert([newSale]);
          if (saleErr) {
            throw saleErr;
          }

          // Stage 3: Insert dependent child records referencing sales(id)
          const childPromises: Promise<any>[] = [];

          if (saleItemsList.length > 0) {
            childPromises.push(supabase.from('sale_items').insert(saleItemsList));
          }
          childPromises.push(supabase.from('invoices').insert([newInvoice]));

          // Insert customer transactions linked to the sale
          if (data.customer_id) {
            const activeCustomer = currentCustomers.find(c => c.id === data.customer_id);
            if (activeCustomer) {
              if (remainingUnpaidCharge > 0) {
                childPromises.push(supabase.from('customer_transactions').insert([{
                  id: crypto.randomUUID(),
                  shop_id: shop.id,
                  customer_id: data.customer_id,
                  type: 'credit',
                  amount: remainingUnpaidCharge,
                  sale_id: saleId,
                  description: `Outstanding credit balance. PKR ${data.paid_amount} deposit.`
                }]));
              }
              if (data.paid_amount > 0) {
                childPromises.push(supabase.from('customer_transactions').insert([{
                  id: crypto.randomUUID(),
                  shop_id: shop.id,
                  customer_id: data.customer_id,
                  type: 'payment_received',
                  amount: data.paid_amount,
                  sale_id: saleId,
                  description: `Deposit toward checkout sale`,
                  payment_method: data.payment_method
                }]));
              }
            }
          }

          const customerLabel = data.customer_id 
            ? (currentCustomers.find(c => c.id === data.customer_id)?.name || 'Credit Account')
            : (data.customer_name_manual || 'Walk-in customer');

          childPromises.push(supabase.from('activity_logs').insert([{
            id: crypto.randomUUID(),
            shop_id: shop.id,
            user_email: user.email,
            action: 'Created POS Transaction',
            details: `Invoice ${invNumber} generated for ${customerLabel}. Paid: PKR ${data.paid_amount.toLocaleString()}.`
          }]));

          childPromises.push(supabase.from('notifications').insert([{
            id: crypto.randomUUID(),
            shop_id: shop.id,
            title: 'POS Sale Executed',
            message: `Invoice ${invNumber} generated successfully.`,
            type: 'success',
            read: false
          }]));

          await Promise.all(childPromises);
        } catch (err) {
          console.error('Supabase live transaction insert failed:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      // Offline LocalDB mutations
      const products = localDB.getCollection<Product>('products');
      const sales = localDB.getCollection<Sale>('sales');
      const saleItems = localDB.getCollection<SaleItem>('sale_items');
      const invoices = localDB.getCollection<Invoice>('invoices');
      const customers = localDB.getCollection<Customer>('customers');
      const custTransactions = localDB.getCollection<CustomerTransaction>('customer_transactions');

      for (const line of data.items) {
        const pIdx = products.findIndex(p => p.id === line.product_id);
        if (pIdx === -1) continue;
        products[pIdx].stock = Math.max(0, parseFloat((products[pIdx].stock - line.quantity).toFixed(2)));
        products[pIdx].updated_at = new Date().toISOString();

        if (products[pIdx].stock <= products[pIdx].min_stock_alert) {
          const alerts = localDB.getCollection<Notification>('notifications');
          alerts.push({
            id: `not-${Date.now()}-${Math.random()}`,
            shop_id: shop.id,
            title: 'Low Stock Alert',
            message: `${products[pIdx].name} has been depleted to ${products[pIdx].stock} ${products[pIdx].unit} via sale ${saleId}`,
            type: 'low_stock',
            read: false,
            created_at: new Date().toISOString()
          });
          localDB.saveCollection('notifications', alerts);
        }
      }
      localDB.saveCollection('products', products);

      if (data.customer_id && remainingUnpaidCharge > 0) {
        const cIdx = customers.findIndex(c => c.id === data.customer_id);
        if (cIdx !== -1) {
          customers[cIdx].balance += remainingUnpaidCharge;
          custTransactions.push({
            id: `tx-${Date.now()}`,
            shop_id: shop.id,
            customer_id: data.customer_id,
            type: 'credit',
            amount: remainingUnpaidCharge,
            sale_id: saleId,
            description: `Credit outstanding from checkout sale. PKR ${data.paid_amount} deposit.`,
            payment_method: null,
            created_at: new Date().toISOString()
          });
        }
      }

      if (data.customer_id && data.paid_amount > 0) {
        custTransactions.push({
          id: `tx-dep-${Date.now()}`,
          shop_id: shop.id,
          customer_id: data.customer_id,
          type: 'payment_received',
          amount: data.paid_amount,
          sale_id: saleId,
          description: `Deposit toward checkout sale`,
          payment_method: data.payment_method,
          created_at: new Date().toISOString()
        });
      }

      localDB.saveCollection('customers', customers);
      localDB.saveCollection('customer_transactions', custTransactions);

      sales.push(newSale);
      localDB.saveCollection('sales', sales);

      saleItems.push(...saleItemsList);
      localDB.saveCollection('sale_items', saleItems);

      invoices.push(newInvoice);
      localDB.saveCollection('invoices', invoices);

      const logs = localDB.getCollection<ActivityLog>('activity_logs');
      const customerLabel = data.customer_id 
        ? (customers.find(c => c.id === data.customer_id)?.name || 'Credit Client')
        : (data.customer_name_manual || 'Walk-in customer');
      logs.push({
        id: `act-${Date.now()}`,
        shop_id: shop.id,
        user_email: user.email,
        action: 'Created Transaction',
        details: `Completed receipt ${invNumber} for ${customerLabel}. Total: PKR ${netAmount.toLocaleString()}`,
        created_at: new Date().toISOString()
      });
      localDB.saveCollection('activity_logs', logs);

      const notesList = localDB.getCollection<Notification>('notifications');
      notesList.push({
        id: `not-sale-${Date.now()}`,
        shop_id: shop.id,
        title: 'Receipt Created',
        message: `Invoice ${invNumber} generated for PKR ${netAmount.toLocaleString()}`,
        type: 'success',
        read: false,
        created_at: new Date().toISOString()
      });
      localDB.saveCollection('notifications', notesList);

      get().refreshData();
    }

    return saleId;
  },

  addCustomer: async (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newCustId = config.isOnline ? crypto.randomUUID() : `cust-${Date.now()}`;
    const newCust: Customer = {
      id: newCustId,
      shop_id: shop.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      balance: data.initialBalance,
      created_at: new Date().toISOString()
    };

    // Optimistic Update: instantly show the newly added customer
    set({
      customers: [...get().customers, newCust]
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          const { error } = await supabase.from('customers').insert([newCust]);
          if (error) throw error;

          if (data.initialBalance !== 0) {
            await supabase.from('customer_transactions').insert([{
              id: crypto.randomUUID(),
              shop_id: shop.id,
              customer_id: newCust.id,
              type: 'opening_balance',
              amount: Math.abs(data.initialBalance),
              sale_id: null,
              description: 'Account Opening Ledger Balance Set'
            }]);
          }
        } catch (err) {
          console.error('Failed to write customer to Supabase:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const customers = localDB.getCollection<Customer>('customers');
      customers.push(newCust);
      localDB.saveCollection('customers', customers);

      if (data.initialBalance !== 0) {
        const txs = localDB.getCollection<CustomerTransaction>('customer_transactions');
        txs.push({
          id: `tx-${Date.now()}`,
          shop_id: shop.id,
          customer_id: newCust.id,
          type: 'opening_balance',
          amount: Math.abs(data.initialBalance),
          sale_id: null,
          description: 'Account Opening Ledger Balance Setter',
          payment_method: null,
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('customer_transactions', txs);
      }
      get().refreshData();
    }
  },

  receiveCustomerPayment: async ({ customer_id, amount, method, description }) => {
    const shop = get().currentShop;
    if (!shop) return;

    const matchedCust = get().customers.find(c => c.id === customer_id);
    if (!matchedCust) return;
    const computedBal = Math.max(-1000000, matchedCust.balance - amount);

    // Optimistic Update: instantly update customer balance in UI
    set({
      customers: get().customers.map(c => c.id === customer_id ? { ...c, balance: computedBal } : c)
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          await supabase.from('customers').update({ balance: computedBal }).eq('id', customer_id);
          await supabase.from('customer_transactions').insert([{
            id: crypto.randomUUID(),
            shop_id: shop.id,
            customer_id,
            type: 'payment_received',
            amount,
            sale_id: null,
            description: description || 'Account balance repayment ledger settlement',
            payment_method: method
          }]);

          await supabase.from('notifications').insert([{
            id: crypto.randomUUID(),
            shop_id: shop.id,
            title: 'Customer Payment Received',
            message: `Credit ledger payment of PKR ${amount.toLocaleString()} received from ${matchedCust.name}`,
            type: 'success',
            read: false
          }]);
        } catch (err) {
          console.error('Failed to log client payment to remote DB:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const customers = localDB.getCollection<Customer>('customers');
      const idx = customers.findIndex(c => c.id === customer_id);
      if (idx !== -1) {
        customers[idx].balance = computedBal;
        localDB.saveCollection('customers', customers);

        const txs = localDB.getCollection<CustomerTransaction>('customer_transactions');
        txs.push({
          id: `tx-pay-${Date.now()}`,
          shop_id: shop.id,
          customer_id,
          type: 'payment_received',
          amount,
          sale_id: null,
          description: description || 'Account balance repayment ledger settlement',
          payment_method: method,
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('customer_transactions', txs);

        const alerts = localDB.getCollection<Notification>('notifications');
        alerts.push({
          id: `not-${Date.now()}`,
          shop_id: shop.id,
          title: 'Ledger Payment Received',
          message: `Registered payment of PKR ${amount.toLocaleString()} from ${customers[idx].name} (${method})`,
          type: 'success',
          read: false,
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('notifications', alerts);
      }
      get().refreshData();
    }
  },

  addSupplier: async (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newSupId = config.isOnline ? crypto.randomUUID() : `sup-${Date.now()}`;
    const newSup: Supplier = {
      id: newSupId,
      shop_id: shop.id,
      name: data.name,
      phone: data.phone,
      company: data.company,
      balance: data.initialBalance,
      created_at: new Date().toISOString()
    };

    // Optimistic Update: instantly add Supplier to list
    set({
      suppliers: [...get().suppliers, newSup]
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          const { error } = await supabase.from('suppliers').insert([newSup]);
          if (error) throw error;

          if (data.initialBalance !== 0) {
            await supabase.from('supplier_transactions').insert([{
              id: crypto.randomUUID(),
              shop_id: shop.id,
              supplier_id: newSup.id,
              type: 'grain_purchased',
              amount: Math.abs(data.initialBalance),
              description: 'Opening balance wheat grains invoice bag charges.'
            }]);
          }
        } catch (err) {
          console.error('Failed to create Supplier on Supabase:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const suppliers = localDB.getCollection<Supplier>('suppliers');
      suppliers.push(newSup);
      localDB.saveCollection('suppliers', suppliers);

      if (data.initialBalance !== 0) {
        const txs = localDB.getCollection<SupplierTransaction>('supplier_transactions');
        txs.push({
          id: `sup-tx-${Date.now()}`,
          shop_id: shop.id,
          supplier_id: newSup.id,
          type: 'grain_purchased',
          amount: Math.abs(data.initialBalance),
          description: 'Account Opening Ledger Balance (Raw Grain Stock Debt)',
          payment_method: null,
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('supplier_transactions', txs);
      }
      get().refreshData();
    }
  },

  makeSupplierPayment: async ({ supplier_id, amount, method, description }) => {
    const shop = get().currentShop;
    if (!shop) return;

    const targetSupplier = get().suppliers.find(s => s.id === supplier_id);
    if (!targetSupplier) return;
    const computedBal = Math.max(0, targetSupplier.balance - amount);

    // Optimistic Update: instantly reduce supplier debt balance
    set({
      suppliers: get().suppliers.map(s => s.id === supplier_id ? { ...s, balance: computedBal } : s)
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          await supabase.from('suppliers').update({ balance: computedBal }).eq('id', supplier_id);
          await supabase.from('supplier_transactions').insert([{
            id: crypto.randomUUID(),
            shop_id: shop.id,
            supplier_id,
            type: 'payment_made',
            amount,
            description: description || 'Repayment to grain supplier',
            payment_method: method
          }]);

          // Supplier payout as grain business cost
          await supabase.from('expenses').insert([{
            id: crypto.randomUUID(),
            shop_id: shop.id,
            category: 'Maintenance',
            amount,
            description: `Grain Payout to Supplier ${targetSupplier.name}: ${description}`,
            date: new Date().toISOString().split('T')[0],
            created_by: get().currentUser?.id || 'sys'
          }]);
        } catch (err) {
          console.error('Failed to submit supplier payment on live DB:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      const suppliers = localDB.getCollection<Supplier>('suppliers');
      const idx = suppliers.findIndex(s => s.id === supplier_id);
      if (idx !== -1) {
        suppliers[idx].balance = computedBal;
        localDB.saveCollection('suppliers', suppliers);

        const txs = localDB.getCollection<SupplierTransaction>('supplier_transactions');
        txs.push({
          id: `sup-tx-pay-${Date.now()}`,
          shop_id: shop.id,
          supplier_id,
          type: 'payment_made',
          amount,
          description: description || 'Direct balance checkout repayment',
          payment_method: method,
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('supplier_transactions', txs);

        const expenses = localDB.getCollection<any>('expenses');
        expenses.push({
          id: `exp-${Date.now()}`,
          shop_id: shop.id,
          category: 'Maintenance',
          amount,
          description: `Grain Payout to Supplier ${suppliers[idx].name}: ${description}`,
          date: new Date().toISOString().split('T')[0],
          created_by: get().currentUser?.id || 'sys',
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('expenses', expenses);
      }
      get().refreshData();
    }
  },

  addExpense: async (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newExp: Expense = {
      ...data,
      id: config.isOnline ? crypto.randomUUID() : `exp-${Date.now()}`,
      shop_id: shop.id,
      created_by: get().currentUser?.id || 'sys',
      created_at: new Date().toISOString()
    };

    // Keep LocalDB copy up to date as offline fallback
    const expensesColl = localDB.getCollection<Expense>('expenses');
    expensesColl.push(newExp);
    localDB.saveCollection('expenses', expensesColl);

    // Optimistic Update: instantly add expense to visual table
    set({
      expenses: [...get().expenses, newExp]
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          const { error } = await supabase.from('expenses').insert([newExp]);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to log expense on Supabase:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      get().refreshData();
    }
  },

  deleteExpense: async (id) => {
    // Keep LocalDB copy up to date as offline fallback
    const expensesColl = localDB.getCollection<Expense>('expenses').filter(e => e.id !== id);
    localDB.saveCollection('expenses', expensesColl);

    // Optimistic Update: instantly remove expense from table
    set({
      expenses: get().expenses.filter(e => e.id !== id)
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          const { error } = await supabase.from('expenses').delete().eq('id', id);
          if (error) throw error;
        } catch (err) {
          console.error('Failed to delete expense on Supabase:', err);
        } finally {
          get().refreshData();
        }
      })();
    } else {
      get().refreshData();
    }
  },

  clearNotification: async (id) => {
    if (config.isOnline && supabase) {
      try {
        await supabase.from('notifications').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to clear notifications:', err);
      }
    } else {
      const notifications = localDB.getCollection<Notification>('notifications').filter(n => n.id !== id);
      localDB.saveCollection('notifications', notifications);
    }
    await get().refreshData();
  },

  markAllNotificationsRead: async () => {
    if (config.isOnline && supabase) {
      try {
        await supabase.from('notifications').update({ read: true }).eq('shop_id', get().currentShop?.id);
      } catch (err) {
        console.error('Failed to read all notifications:', err);
      }
    } else {
      const notifications = localDB.getCollection<Notification>('notifications').map(n => ({ ...n, read: true }));
      localDB.saveCollection('notifications', notifications);
    }
    await get().refreshData();
  },

  updateSettings: async (updatedFields) => {
    const shop = get().currentShop;
    if (!shop) return;

    const current = get().settings || {};
    const merged = { shop_id: shop.id, ...current, ...updatedFields };

    // Optimistically update settings state so the UI (theme, etc) updates immediately
    set({ settings: merged });
    localStorage.setItem('flour_db_settings', JSON.stringify(merged));

    if (config.isOnline && supabase) {
      set({ loading: true });
      try {
        const { error } = await supabase.from('settings').upsert([merged]);
        if (error) {
          console.warn('Silent live DB update settings error, fell back to local storage:', error);
        } else {
          await supabase.from('activity_logs').insert([{
            id: crypto.randomUUID(),
            shop_id: shop.id,
            user_email: get().currentUser?.email || 'admin',
            action: 'Settings Modified',
            details: 'Updated global system rules, tax codes, or SMS parameters on the live database.'
          }]);
        }
      } catch (err) {
        console.error('Failed to upsert settings to Supabase settings table:', err);
      } finally {
        set({ loading: false });
      }
    } else {
      const logs = localDB.getCollection<ActivityLog>('activity_logs');
      logs.push({
        id: `act-${Date.now()}`,
        shop_id: get().currentShop?.id || '',
        user_email: get().currentUser?.email || 'admin',
        action: 'Settings Modified',
        details: 'Updated global system rules.',
        created_at: new Date().toISOString()
      });
      localDB.saveCollection('activity_logs', logs);
    }

    await get().refreshData();
  },

  updateShopProfile: async (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const merged = { ...shop, ...data, updated_at: new Date().toISOString() };

    // Optimistically update currentShop and allShops immediately
    set({ 
      currentShop: merged,
      allShops: get().allShops.map(s => s.id === shop.id ? merged : s)
    });

    // Save fallback info locally
    const shops = localDB.getCollection<Shop>('shops');
    const idx = shops.findIndex(s => s.id === shop.id);
    if (idx !== -1) {
      shops[idx] = merged;
      localDB.saveCollection('shops', shops);
    }

    if (config.isOnline && supabase) {
      set({ loading: true });
      try {
        const { error } = await supabase.from('shops').update(data).eq('id', shop.id);
        if (error) {
          console.warn('Live DB update shop profile error, fell back to local storage:', error);
          throw new Error(error.message || 'Supabase permission/constraint issue updating shops table.');
        }
      } catch (err: any) {
        console.error('Failed to modify shop on Supabase:', err);
        throw err;
      } finally {
        set({ loading: false });
      }
    }

    await get().refreshData();
  },

  toggleShopStatus: async (shopId) => {
    if (config.isOnline && supabase) {
      try {
        const shop = get().allShops.find(s => s.id === shopId);
        if (!shop) return;
        const newStatus: 'trial' | 'active' | 'suspended' = shop.subscription_status === 'active' ? 'suspended' : 'active';
        await supabase.from('shops').update({ subscription_status: newStatus }).eq('id', shopId);
        
        // Update allShops state in memory so the toggle works instantly
        const updatedShops = get().allShops.map(s => s.id === shopId ? { ...s, subscription_status: newStatus } : s);
        set({ allShops: updatedShops });
        
        if (get().currentShop?.id === shopId) {
          const updatedCurrentShop = updatedShops.find(s => s.id === shopId) || null;
          set({ currentShop: updatedCurrentShop });
        }
      } catch (err) {
        console.error('Failed to suspend shop status on Supabase:', err);
      }
    } else {
      const shops = localDB.getCollection<Shop>('shops');
      const idx = shops.findIndex(s => s.id === shopId);
      if (idx !== -1) {
        const currentStatus = shops[idx].subscription_status;
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        shops[idx].subscription_status = newStatus;
        localDB.saveCollection('shops', shops);
        set({ allShops: shops });
        if (get().currentShop?.id === shopId) {
          set({ currentShop: shops[idx] });
        }
      }
    }
    await get().refreshData();
  },

  createShopAdmin: async (name, phone, address, currency) => {
    const newId = crypto.randomUUID();
    const newShop: Shop = {
      id: newId,
      name,
      logo_url: null,
      phone,
      address,
      currency,
      tax_rate: 0,
      invoice_footer: 'Thank you for your business!',
      subscription_status: 'trial',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (config.isOnline && supabase) {
      try {
        const { error } = await supabase.from('shops').insert([newShop]);
        if (error) throw error;
        const { data } = await supabase.from('shops').select('*');
        if (data) set({ allShops: data });
      } catch (err) {
        console.error('Failed to create shop on Supabase:', err);
      }
    } else {
      const shops = localDB.getCollection<Shop>('shops');
      shops.push(newShop);
      localDB.saveCollection('shops', shops);
      set({ allShops: shops });
    }
  },

  createUserAdmin: async (data) => {
    const newId = crypto.randomUUID();
    const newProfile: Profile = {
      id: newId,
      shop_id: data.shop_id,
      email: data.email.trim().toLowerCase(),
      full_name: data.full_name,
      role: data.role,
      avatar_url: null,
      is_verified: true,
      created_at: new Date().toISOString(),
      password: data.password || '1234'
    };
    if (config.isOnline && supabase) {
      try {
        const { error } = await supabase.from('profiles').insert([newProfile]);
        if (error) throw error;
        const { data: list } = await supabase.from('profiles').select('*');
        if (list) set({ allProfiles: list });
      } catch (err) {
        console.warn('Failed to insert user profile in Supabase:', err);
      }
    } else {
      const profiles = localDB.getCollection<Profile>('profiles');
      profiles.push(newProfile);
      localDB.saveCollection('profiles', profiles);
      set({ allProfiles: profiles });
    }
  },

  updateUserAdmin: async (id, data) => {
    if (config.isOnline && supabase) {
      try {
        const { error } = await supabase.from('profiles').update(data).eq('id', id);
        if (error) throw error;
        const { data: list } = await supabase.from('profiles').select('*');
        if (list) set({ allProfiles: list });
      } catch (err) {
        console.error('Failed to update profile on Supabase:', err);
      }
    } else {
      const profiles = localDB.getCollection<Profile>('profiles');
      const idx = profiles.findIndex(p => p.id === id);
      if (idx !== -1) {
        profiles[idx] = { ...profiles[idx], ...data };
        localDB.saveCollection('profiles', profiles);
        set({ allProfiles: profiles });
      }
    }
  },

  switchShopWorkspace: async (shopId, userId) => {
    const shop = get().allShops.find(s => s.id === shopId) || null;
    if (!shop) return;
    
    let user: Profile | null = null;
    if (userId) {
      user = get().allProfiles.find(p => p.id === userId) || null;
    }
    if (!user) {
      user = get().allProfiles.find(p => p.shop_id === shopId) || null;
    }
    
    if (!user) {
      const email = `manager-${shopId.slice(0, 5)}@gmail.com`;
      await get().createUserAdmin({
        email,
        full_name: `${shop.name} Manager`,
        role: 'manager',
        shop_id: shopId,
        password: '1234'
      });
      user = get().allProfiles.find(p => p.shop_id === shopId) || null;
    }

    if (user) {
      set({
        currentShop: shop,
        currentUser: user
      });
      await get().refreshData();
    }
  },

  /**
   * INTERACTIVE REALTIME SIMULATION
   */
  triggerRealtimeSale: () => {
    // Disabled as requested - nothing is simulated
  },

  startRealtimeSimulation: () => {
    // Disabled as requested - nothing is simulated
    return () => {};
  }
}));
