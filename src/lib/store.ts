/**
 * Central State Store (Zustand) for Flour Shop SaaS
 * Supports transparent live Supabase database pooling or fallback offline sandbox.
 */

import { create } from 'zustand';
import { localDB, supabase as rawSupabase, config, initSupabase } from './supabase';
import { 
  Shop, Profile, Product, InventoryLog, Customer, CustomerTransaction, 
  Supplier, SupplierTransaction, Sale, SaleItem, Invoice, Expense, 
  Notification, ActivityLog, UserRole, ProductCategory
} from '../types';

const formatErr = (err: any): string => {
  const msg = err?.message || err?.toString() || 'Unknown error occurred';
  if (msg.includes('products_unit_check') || msg.includes('unit_check')) {
    return 'Failed to save product: Your live Supabase database has an active legacy CHECK constraint "products_unit_check" restricting allowed unit values. To fix this instantly, please run this statement in your Supabase SQL Editor: ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_unit_check;';
  }
  return msg;
};


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
  connectionState: 'online' | 'slow' | 'offline' | 'syncing';
  checkConnectivity: () => Promise<void>;

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
    supplier_id?: string | null;
    unit_cost?: number | null;
    total_amount?: number | null;
    paid_amount?: number | null;
  }) => Promise<void>;
  deleteInventoryLog: (id: string) => Promise<void>;

  createSale: (data: {
    customer_id: string | null;
    customer_name_manual: string | null;
    items: { product_id: string; quantity: number; sale_price: number }[];
    discount: number;
    paid_amount: number;
    payment_method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa';
  }) => Promise<string | null>;

  addCustomer: (data: { name: string; phone: string; email: string | null; initialBalance: number }) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  addCustomerTransaction: (data: { 
    customer_id: string; 
    amount: number; 
    type: 'credit' | 'payment_received';
    method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa' | null; 
    description: string;
    net_amount?: number | null;
    paid_on_spot?: number | null;
  }) => Promise<void>;
  deleteCustomerTransaction: (id: string) => Promise<void>;
  
  addSupplier: (data: { name: string; phone: string; company: string | null; initialBalance: number }) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  makeSupplierPayment: (data: { supplier_id: string; amount: number; method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'; description: string }) => Promise<void>;
  deleteSupplierTransaction: (id: string) => Promise<void>;

  addExpense: (data: {
    category: 'Electricity' | 'Transport' | 'Labor' | 'Rent' | 'Packaging' | 'Maintenance' | 'Other';
    amount: number;
    description: string;
    date: string;
  }) => Promise<void>;

  deleteExpense: (id: string) => Promise<void>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateSettings: (updatedFields: any) => Promise<void>;
  updateShopProfile: (data: Partial<Shop>) => Promise<void>;
  syncLocalToCloud: () => Promise<void>;

  // POS Editing state
  editingSaleId: string | null;
  setEditingSaleId: (id: string | null) => void;
  voidSale: (id: string) => Promise<void>;

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
        setTimeout(() => reject(new Error('Connection Timeout (15s limit)')), 15000)
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
        const isMissingTable = String(error.message || '').toLowerCase().includes('relation') && String(error.message || '').toLowerCase().includes('does not exist');
        
        console.error(`[RETRY ENGINE] Critical DB transaction '${operationName}' permanently failed.`);
        const textHelp = isMissingTable 
          ? 'It seems your Supabase tables are missing. Please run the SQL in supabase_schema.sql within your Supabase SQL Editor to continue.' 
          : 'Go to System Settings to ensure your Live Supabase container or local connection rules are established.';
        
        const customMessage = isMissingTable
          ? `Supabase Schema Uninitialized: The '${operationName.split("'")[1]}' relation was not found. Please setup your tables.`
          : `Persistent Security/RLS or Schema error on ${operationName}: ${error.message || 'Permission Denied'}. ${textHelp}`;
        
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
  connectionState: 'online',
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

  editingSaleId: null,
  setEditingSaleId: (id) => set({ editingSaleId: id }),

  checkConnectivity: async () => {
    // If no credentials or config offline, we are offline
    if (!config.isOnline || !rawSupabase) {
      set({ connectionState: 'offline' });
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({ connectionState: 'offline' });
      return;
    }

    try {
      const start = Date.now();
      // Fast check to select 1 id row from profiles
      const pingPromise = rawSupabase.from('profiles').select('id').limit(1);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
      
      await Promise.race([pingPromise, timeoutPromise]);
      const duration = Date.now() - start;
      const prevState = get().connectionState;
      const nextState = duration > 2000 ? 'slow' : 'online';
      
      set({ connectionState: nextState });

      // Auto-sync if we transition from offline/slow to genuine online!
      if ((prevState === 'offline' || prevState === 'slow') && nextState === 'online') {
        console.log('[AUTO-SYNC] Stable internet detected. Automatically compiling and syncing live entries...');
        set({ connectionState: 'syncing' });
        await get().syncLocalToCloud();
      } else if (nextState === 'online') {
        // Periodically pull data in the background to keep idle devices in sync
        get().refreshData().catch(console.error);
      }
    } catch (err) {
      console.warn('[CONNECTIVITY CHECK] Supabase server is unreachable or offline:', err);
      set({ connectionState: 'offline' });
    }
  },

  initStore: async () => {
    const savedEmail = localStorage.getItem('logged_in_user_email');
    
    // Resolve dynamic universal database configuration from the container's environment secrets
    if (typeof initSupabase === 'function') {
      await initSupabase();
    }
    
    // Check if the custom credentials represent a live database
    if (config.isOnline && supabase) {
      set({ loading: true, appMode: 'live_supabase' });
      try {
        // Automatic universal migration sync: guarantee that sandbox offline data gets pushed!
        const localProfilesCheck = localStorage.getItem('flour_db_profiles');
        const hasSyncedCheck = sessionStorage.getItem('has_auto_synced');
        
        // If we have local data but it's just the default demo data, we might want to clear it 
        // once we successfully know who the live user is. 
        // For now, prioritize syncing if there's anything valid.
        if (localProfilesCheck && !hasSyncedCheck) {
            try {
              await get().syncLocalToCloud(); 
              sessionStorage.setItem('has_auto_synced', 'true');
            } catch (e) {
              console.warn('[SILENT] Initial sync failed, likely due to missing tables. Proceeding to profile check.');
            }
        }

        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('*');
          
        if (pErr) {
          const isMissingTable = String(pErr.message || '').toLowerCase().includes('relation') && String(pErr.message || '').toLowerCase().includes('does not exist');
          if (isMissingTable) {
            console.error('[BOOTSTRAP] Profiles table missing. Falling back to Sandbox mode.');
            config.isOnline = false;
            set({ appMode: 'demo', loading: false });
            await get().refreshData();
            return;
          }
          throw pErr;
        }

        const { data: shops, error: sErr } = await supabase
          .from('shops')
          .select('*');
          
        if (sErr) throw sErr;

        if (profiles && profiles.length === 0) {
          // If DB is completely empty, seed initial data but do NOT auto-login unless requested
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
            email: 'ac.repair.in.dubai3@gmail.com',
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

          // Also insert initial inventory log for the seed product so pre-computation matches perfectly
          await supabase.from('inventory_logs').insert([
            {
              id: '11111111-1111-1111-1111-000000000301',
              shop_id: defaultShopId,
              product_id: '11111111-1111-1111-1111-000000000101',
              type: 'stock_in',
              quantity: 450,
              unit: 'KG',
              reason: 'Initial Product Stock Seed',
              created_by: '11111111-1111-1111-1111-222222222222',
              created_at: new Date().toISOString()
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
          const liveProfiles = await supabase.from('profiles').select('*');
          
          set({
            currentUser: null,
            currentShop: null,
            allShops: liveShops.data || [],
            allProfiles: liveProfiles.data || [],
            appMode: 'live_supabase',
            loading: false
          });
        } else {
          // Normal flow - data exists. See if we have an active session to auto-login.
          const matchedProfile = savedEmail ? profiles?.find((p: any) => p.email.toLowerCase() === savedEmail.toLowerCase()) : null;
          const associatedShop = matchedProfile ? (shops?.find((s: any) => s.id === matchedProfile.shop_id) || null) : null;
          
          set({
            currentUser: matchedProfile || null,
            currentShop: associatedShop,
            allShops: shops || [],
            allProfiles: profiles || [],
            appMode: 'live_supabase',
            loading: false
          });
          
          if (matchedProfile) {
            await get().refreshData();
            if (config.isOnline && supabase) {
              // Trigger a background sync to push any pending offline changes that were stuck
              get().syncLocalToCloud().catch(console.error);
            }
          }
        }
      } catch (err: any) {
        console.warn('Supabase Live Load Failed:', err);
        const errMsg = String(err.message || '').toLowerCase();
        const isNetwork = errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('timeout') || err.status === 0;
        
        if (isNetwork) {
          console.log('[INIT RETRY FALLBACK] Network offline. Bootstrapping local offline store fallback...');
          // Toggle online flag false and load offline store
          config.isOnline = false;
          set({ connectionState: 'offline' });
          get().initOfflineStore();
        } else {
          set({ loading: false, currentUser: null, currentShop: null });
        }
      }
    } else {
      set({ loading: false, currentUser: null, currentShop: null });
    }
  },

  initOfflineStore: () => {
    const profiles = localDB.getCollection<Profile>('profiles');
    const shops = localDB.getCollection<Shop>('shops');
    const savedEmail = localStorage.getItem('logged_in_user_email');
    
    const matchedProfile = savedEmail ? profiles.find(p => p.email.toLowerCase() === savedEmail.toLowerCase()) : null;
    if (matchedProfile) {
      const associatedShop = shops.find(s => s.id === matchedProfile.shop_id) || shops[0] || null;
      set({ 
        currentUser: matchedProfile, 
        currentShop: associatedShop,
        allShops: shops,
        allProfiles: profiles,
        appMode: 'demo'
      });
      get().refreshData();
    } else {
      set({ 
        currentUser: null, 
        currentShop: null,
        allShops: shops,
        allProfiles: profiles,
        appMode: 'demo'
      });
    }
  },

  refreshData: async () => {
    const shop = get().currentShop;
    if (!shop) return;

    const isMissingTableStr = (err: any) => {
      const msg = String(err?.message || '').toLowerCase();
      return msg.includes('relation') && msg.includes('does not exist');
    };

    // --- PHASE 1: LOAD FROM LOCAL CACHE IMMEDIATELY ---
    const filterByShop = <T extends { shop_id: string }>(tbl: string): T[] => {
      const items = localDB.getCollection<T>(tbl);
      return items.filter(item => item.shop_id === shop.id);
    };

    const localSettingsRaw = localStorage.getItem('flour_db_settings');
    const localSettings = localSettingsRaw ? JSON.parse(localSettingsRaw) : {};

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
      settings: localSettings,
      appMode: config.isOnline ? 'live_supabase' : 'demo'
    });

    // --- PHASE 2: FETCH FROM LIVE DB IF ONLINE ---
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
              if (isMissingTableStr(error)) {
                console.warn(`[SCHEMA WARNING] Live DB table '${dbTableName}' is missing. Skipping Live fetch for this table.`);
              } else {
                console.warn(`Live DB error fetching ${tableName}:`, error);
              }
              return null; // Return null to signify fetch failure (keep local)
            }
            return data || [];
          } catch (e) {
            console.warn(`Exception fetching ${tableName} from Live DB:`, e);
            return null;
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

        let settingsObj = localSettings;
        try {
          const { data: settingsData, error: setErr } = await supabase
            .from('settings')
            .select('*')
            .eq('shop_id', shop.id)
            .maybeSingle();
            
          if (settingsData && !setErr) {
            settingsObj = { ...localSettings, ...settingsData };
          }
        } catch (err) {
          console.warn('Supabase settings table could not be fetched:', err);
        }

        // Only update state if fetch was successful (not null)
        // --- MERGE CLOUD DATA WITH PENDING LOCAL CHANGES ---
        const mergeLocal = <T extends { id: string; shop_id: string; pending_sync?: boolean }>(cloud: T[] | null, localKey: string): T[] | null => {
          if (cloud === null) return null;
          const localItems = localDB.getCollection<T>(localKey);
          const pendingItems = localItems.filter(i => i.pending_sync && i.shop_id === shop.id);
          
          // Prioritize pending local versions over cloud versions for the same ID
          const merged = [
            ...cloud.filter(c => !pendingItems.some(p => p.id === c.id)),
            ...pendingItems
          ];
          
          // Update local cache for this shop specifically
          const otherShopItems = localItems.filter(i => i.shop_id !== shop.id);
          localDB.saveCollection(localKey, [...otherShopItems, ...merged]);
          
          return merged;
        };

        const newState: Partial<AppStore> = { settings: settingsObj, appMode: 'live_supabase' };
        
        const products_M = mergeLocal<Product>(products, 'products');
        if (products_M) newState.products = products_M;
        
        const categories_M = mergeLocal<ProductCategory>(categories, 'categories');
        if (categories_M) newState.categories = categories_M;

        const invLogs_M = mergeLocal<InventoryLog>(inventoryLogs, 'inventory_logs');
        if (invLogs_M) newState.inventoryLogs = invLogs_M;

        const customers_M = mergeLocal<Customer>(customers, 'customers');
        if (customers_M) newState.customers = customers_M;

        const custTrans_M = mergeLocal<CustomerTransaction>(customerTransactions, 'customer_transactions');
        if (custTrans_M) newState.customerTransactions = custTrans_M;

        const suppliers_M = mergeLocal<Supplier>(suppliers, 'suppliers');
        if (suppliers_M) newState.suppliers = suppliers_M;

        const supTrans_M = mergeLocal<SupplierTransaction>(supplierTransactions, 'supplier_transactions');
        if (supTrans_M) newState.supplierTransactions = supTrans_M;

        const sales_M = mergeLocal<Sale>(sales, 'sales');
        if (sales_M) newState.sales = sales_M;

        const saleItems_M = mergeLocal<SaleItem>(saleItems, 'sale_items');
        if (saleItems_M) newState.saleItems = saleItems_M;

        const invoices_M = mergeLocal<Invoice>(invoices, 'invoices');
        if (invoices_M) newState.invoices = invoices_M;

        const expenses_M = mergeLocal<Expense>(expenses, 'expenses');
        if (expenses_M) newState.expenses = expenses_M;

        const notifications_M = mergeLocal<Notification>(notifications, 'notifications');
        if (notifications_M) newState.notifications = notifications_M;

        const activityLogs_M = mergeLocal<ActivityLog>(activityLogs, 'activity_logs');
        if (activityLogs_M) newState.activityLogs = activityLogs_M;

        // --- PRE-COMPUTE ACCURATE INVENTORY STOCK AVOIDING RACE CONDITIONS ---
        if (newState.products && newState.inventoryLogs && newState.saleItems) {
          newState.products = newState.products.map(p => {
            const productLogs = newState.inventoryLogs!.filter((l: InventoryLog) => l.product_id === p.id);
            const productSalesCount = newState.saleItems!.filter((si: SaleItem) => si.product_id === p.id).reduce((sum, si) => sum + si.quantity, 0);

            let calculatedStock = 0;
            let hasStockInLog = false;

            productLogs.forEach((l: InventoryLog) => {
              if (l.type === 'stock_in') {
                hasStockInLog = true;
              }
              const isSaleLog = l.reason?.startsWith('Sale') || l.reason?.startsWith('Void Sale') || l.reason?.includes('Sale INV-') || l.reason?.includes('Void Sale Ref:');
              // Only count non-sale logs for stock calculation to avoid double-deducted sales
              if (!isSaleLog) {
                const isLoss = l.type === 'stock_out' || l.type === 'wastage';
                const isGain = l.type === 'stock_in' || l.type === 'adjustment';
                if (isGain) calculatedStock += l.quantity;
                if (isLoss) calculatedStock -= l.quantity;
              }
            });

            // If there's a stock_in log, calculate stock dynamically based on trace ledger + sales items.
            // Otherwise, use pre-existing database value
            let finalStock = p.stock;
            if (hasStockInLog) {
              finalStock = Math.max(0, calculatedStock - productSalesCount);
            }

            if (p.stock !== finalStock) {
              return { ...p, stock: finalStock };
            }
            return p;
          });

          // Pre-emptively push correct stock to local cache to keep Phase 1 clean on next load
          const locProds = localDB.getCollection<Product>('products');
          const otherShopItems = locProds.filter(i => i.shop_id !== shop.id);
          localDB.saveCollection('products', [...otherShopItems, ...newState.products]);
        }

        set(newState);
      } catch (err) {
        console.error('Supabase parallel synchronization failed:', err);
      }
    }
  },

  syncLocalToCloud: async () => {
    if (!config.isOnline || !supabase) return;

    try {
      set({ loading: true, errorMessage: 'Syncing local device data to cloud universally...' });
      
      const tablesToSync = [
        { local: 'shops', remote: 'shops' },
        { local: 'profiles', remote: 'profiles' },
        { local: 'categories', remote: 'product_categories' },
        { local: 'products', remote: 'products' },
        { local: 'customers', remote: 'customers' },
        { local: 'suppliers', remote: 'suppliers' },
        { local: 'sales', remote: 'sales' },
        { local: 'sale_items', remote: 'sale_items' },
        { local: 'inventory_logs', remote: 'inventory_logs' },
        { local: 'customer_transactions', remote: 'customer_transactions' },
        { local: 'supplier_transactions', remote: 'supplier_transactions' },
        { local: 'invoices', remote: 'invoices' },
        { local: 'expenses', remote: 'expenses' },
        { local: 'notifications', remote: 'notifications' },
        { local: 'activity_logs', remote: 'activity_logs' }
      ];

      for (const tableMap of tablesToSync) {
        const localDataRaw = localStorage.getItem(`flour_db_${tableMap.local}`);
        if (localDataRaw) {
          let items = JSON.parse(localDataRaw);
          if (Array.isArray(items) && items.length > 0) {
            // Filter out default fallback IDs (UUIDs start with 1111 or 2222)
            const allShopItems = items;
            
            const pendingItems = allShopItems.filter(item => {
              const strId = String(item.id || '');
              const isSystemPlaceholder = strId.startsWith('11111111') || strId.startsWith('22222222');
              
              // Filter out demo data IDs from supabase.ts (prod-1, cust-1, etc.)
              const isDemoId = strId.startsWith('prod-') || strId.startsWith('cust-') || 
                               strId.startsWith('sale-') || strId.startsWith('inv-') ||
                               strId.startsWith('si-') || strId.startsWith('cat-') ||
                               strId.startsWith('sup-') || strId.startsWith('exp-') ||
                               strId.startsWith('log-') || strId.startsWith('tx-') ||
                               strId.startsWith('act-') || strId.startsWith('not-');

              // Also check if this item belongs to the current shop to avoid cross-tenant sync if data was mixed
              const isWrongShop = get().currentShop && item.shop_id && item.shop_id !== get().currentShop?.id;

              return item.pending_sync === true && !isSystemPlaceholder && !isDemoId && !isWrongShop;
            });
            
            if (pendingItems.length > 0) {
              const cleanedItems = pendingItems.map(item => {
                const copy = { ...item };
                delete copy.pending_sync;
                return copy;
              });

              console.log(`Syncing ${cleanedItems.length} valid items to ${tableMap.remote}`);
              const { error } = await rawSupabase.from(tableMap.remote).upsert(cleanedItems, { onConflict: 'id' });
              if (error) {
                console.warn(`Sync warning for ${tableMap.remote}:`, error.message);
              } else {
                const updatedItems = allShopItems.map((item: any) => {
                  if (pendingItems.some(pi => pi.id === item.id)) {
                    const copy = { ...item };
                    delete copy.pending_sync;
                    return copy;
                  }
                  return item;
                });
                localStorage.setItem(`flour_db_${tableMap.local}`, JSON.stringify(updatedItems));
              }
            }
          }
        }
      }
      
      // Also sync settings specifically
      const settingsDataRaw = localStorage.getItem('flour_db_settings');
      if (settingsDataRaw) {
        const settingsItems = Object.entries(JSON.parse(settingsDataRaw)).map(([shop_id, settingsObj]) => ({
          shop_id,
          ...settingsObj as any
        }));
        if (settingsItems.length > 0) {
          await rawSupabase.from('settings').upsert(settingsItems, { onConflict: 'shop_id' });
        }
      }

      set({ loading: false, errorMessage: null });
      await get().refreshData();
    } catch (err: any) {
      console.error('Universal Sync failed:', err);
      set({ loading: false, errorMessage: `Universal Sync Error: ${err.message}` });
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

        const seededProductId = crypto.randomUUID();
        const { error: prodErr } = await supabase.from('products').insert([{
          id: seededProductId,
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

        // Insert inventory log for seeded product so pre-computation matches perfectly
        await supabase.from('inventory_logs').insert([{
          id: crypto.randomUUID(),
          shop_id: newShopId,
          product_id: seededProductId,
          type: 'stock_in',
          quantity: 300,
          unit: 'KG',
          reason: 'Initial Product Stock Seed',
          created_by: newProfile.id,
          created_at: new Date().toISOString()
        }]);

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
    localStorage.removeItem('logged_in_user_email');
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
    const user = get().currentUser;
    if (!shop || !user) return;

    const newProd: Product = {
      ...product,
      id: crypto.randomUUID(),
      shop_id: shop.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_sync: true
    };

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const productsLocal = localDB.getCollection<Product>('products');
    productsLocal.push(newProd);
    localDB.saveCollection('products', productsLocal);

    if (newProd.stock > 0) {
      const logsLocal = localDB.getCollection<InventoryLog>('inventory_logs');
      logsLocal.push({
        id: crypto.randomUUID(),
        shop_id: shop.id,
        product_id: newProd.id,
        type: 'stock_in',
        quantity: newProd.stock,
        unit: newProd.unit,
        reason: 'Initial Product Stock Seed',
        created_by: user.id,
        created_at: new Date().toISOString(),
        pending_sync: true
      });
      localDB.saveCollection('inventory_logs', logsLocal);
    }

    // Update UI State instantly
    set({
      products: [...get().products, newProd],
      notifications: [{
        id: crypto.randomUUID(),
        shop_id: shop.id,
        title: 'Product Added',
        message: `${newProd.name} is now available in your catalog.`,
        type: 'success',
        read: false,
        created_at: new Date().toISOString(),
        pending_sync: true
      }, ...get().notifications],
      errorMessage: null
    });

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Product saved locally, will sync later:', err);
        }
      })();
    }
  },

  updateProduct: async (id, data) => {
    const shop = get().currentShop;
    if (!shop) return;
    
    const prevProd = get().products.find(p => p.id === id);
    if (!prevProd) return;
    const prevStock = prevProd.stock;

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const productsLocal = localDB.getCollection<Product>('products');
    const idx = productsLocal.findIndex(p => p.id === id);
    if (idx !== -1) {
      productsLocal[idx] = { ...productsLocal[idx], ...data, updated_at: new Date().toISOString(), pending_sync: true };
      localDB.saveCollection('products', productsLocal);

      if (data.stock !== undefined && data.stock !== prevStock) {
        const diff = data.stock - prevStock;
        const logsLocal = localDB.getCollection<InventoryLog>('inventory_logs');
        logsLocal.push({
          id: crypto.randomUUID(),
          shop_id: shop.id,
          product_id: id,
          type: diff > 0 ? 'stock_in' : 'stock_out',
          quantity: Math.abs(diff),
          unit: productsLocal[idx].unit,
          reason: 'Direct Stock Override Edit',
          created_by: get().currentUser?.id || 'sys',
          created_at: new Date().toISOString(),
          pending_sync: true
        });
        localDB.saveCollection('inventory_logs', logsLocal);
      }
    }

    // Update UI State instantly
    set({
      products: get().products.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p),
      errorMessage: null
    });

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Product update saved locally, will sync later:', err);
        }
      })();
    }
  },

  deleteProduct: async (id) => {
    if (config.isOnline && supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;

        const productsLocal = localDB.getCollection<Product>('products').filter(p => p.id !== id);
        localDB.saveCollection('products', productsLocal);

        set({
          products: get().products.filter(p => p.id !== id),
          errorMessage: null
        });
      } catch (err: any) {
        console.error('Failed to delete live product:', err);
        const errMsg = formatErr(err);
        set({ errorMessage: errMsg });
        throw new Error(errMsg);
      } finally {
        await get().refreshData();
      }
    } else {
      const productsLocal = localDB.getCollection<Product>('products').filter(p => p.id !== id);
      localDB.saveCollection('products', productsLocal);

      set({
        products: get().products.filter(p => p.id !== id),
        errorMessage: null
      });

      await get().refreshData();
    }
  },

  addCategory: async (name, description) => {
    const shop = get().currentShop;
    if (!shop) return null;

    const newCat = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      name,
      description,
      pending_sync: true
    };

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const categoriesLocal = localDB.getCollection<any>('categories');
    categoriesLocal.push(newCat);
    localDB.saveCollection('categories', categoriesLocal);

    // Update UI State instantly
    set({
      categories: [...get().categories, newCat],
      errorMessage: null
    });

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Category saved locally, will sync later:', err);
        }
      })();
    }

    return newCat;
  },

  adjustInventory: async ({ product_id, type, quantity, reason, supplier_id, unit_cost, total_amount, paid_amount }) => {
    const shop = get().currentShop;
    const user = get().currentUser;
    if (!shop || !user) return;

    const targetProduct = get().products.find(p => p.id === product_id);
    if (!targetProduct) return;

    const factor = (type === 'stock_in' || type === 'adjustment') ? 1 : -1;
    const finalChange = quantity * factor;
    const computedStock = Math.max(0, targetProduct.stock + finalChange);
    
    // Cost Update Check
    const finalCost = unit_cost ?? targetProduct.cost_price;
    const isCostChanged = isFinite(Number(unit_cost)) && Number(unit_cost) !== targetProduct.cost_price;

    // Supplier Balance Logic
    let supplierBalanceChange = 0;
    let supplierTransType: SupplierTransaction['type'] | null = null;
    let supplierTransDesc = reason;

    if (supplier_id) {
      const transValue = total_amount ?? (quantity * finalCost);
      if (type === 'stock_in') {
        supplierBalanceChange = transValue - (paid_amount ?? 0);
        supplierTransType = 'stock_purchase';
        supplierTransDesc = `Ref: Stock In ${quantity} ${targetProduct.unit} of ${targetProduct.name}. Total: ${transValue}, Paid: ${paid_amount ?? 0}. ${reason}`;
      } else if (type === 'stock_out') {
        supplierBalanceChange = -transValue;
        supplierTransType = 'stock_return';
        supplierTransDesc = `Ref: Stock Out (Return) ${quantity} ${targetProduct.unit} of ${targetProduct.name}. Value: ${transValue}. ${reason}`;
      }
    }

    // Optimistic Log
    const newLog: InventoryLog = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      product_id,
      type,
      quantity,
      unit: targetProduct.unit,
      reason,
      supplier_id,
      unit_cost: finalCost,
      created_by: user.id,
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    const newSupTxs: SupplierTransaction[] = [];
    if (supplier_id && supplierTransType) {
      newSupTxs.push({
        id: crypto.randomUUID(),
        shop_id: shop.id,
        supplier_id,
        type: supplierTransType,
        amount: type === 'stock_in' ? (total_amount ?? (quantity * finalCost)) : (total_amount ?? (quantity * finalCost)),
        description: supplierTransDesc,
        payment_method: 'Cash',
        created_at: new Date().toISOString(),
        pending_sync: true
      });

      if (type === 'stock_in' && (paid_amount ?? 0) > 0) {
        newSupTxs.push({
          id: crypto.randomUUID(),
          shop_id: shop.id,
          supplier_id,
          type: 'payment_made',
          amount: paid_amount!,
          description: `Payment during stock in of ${targetProduct.name}`,
          payment_method: 'Cash',
          created_at: new Date().toISOString(),
          pending_sync: true
        });
      }
    }

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const productsLocal = localDB.getCollection<Product>('products');
    const pIdx = productsLocal.findIndex(p => p.id === product_id);
    if (pIdx !== -1) {
      productsLocal[pIdx].stock = computedStock;
      productsLocal[pIdx].cost_price = finalCost;
      productsLocal[pIdx].updated_at = new Date().toISOString();
      productsLocal[pIdx].pending_sync = true;
      localDB.saveCollection('products', productsLocal);
    }

    const logsLocal = localDB.getCollection<InventoryLog>('inventory_logs');
    logsLocal.push(newLog);
    localDB.saveCollection('inventory_logs', logsLocal);

    if (supplier_id) {
      const suppliersLocal = localDB.getCollection<Supplier>('suppliers');
      const sIdx = suppliersLocal.findIndex(s => s.id === supplier_id);
      if (sIdx !== -1) {
        suppliersLocal[sIdx].balance = parseFloat((suppliersLocal[sIdx].balance + supplierBalanceChange).toFixed(2));
        suppliersLocal[sIdx].pending_sync = true;
        localDB.saveCollection('suppliers', suppliersLocal);
      }

      const supTransLocal = localDB.getCollection<SupplierTransaction>('supplier_transactions');
      supTransLocal.push(...newSupTxs);
      localDB.saveCollection('supplier_transactions', supTransLocal);
    }

    // Alert Logic Local
    if (computedStock <= targetProduct.min_stock_alert) {
      const alertsLocal = localDB.getCollection<Notification>('notifications');
      alertsLocal.push({
        id: crypto.randomUUID(),
        shop_id: shop.id,
        title: 'Critical Stock Alert',
        message: `${targetProduct.name} contains only ${computedStock} ${targetProduct.unit} left (Alert trigger is ${targetProduct.min_stock_alert})`,
        type: 'low_stock',
        read: false,
        created_at: new Date().toISOString(),
        pending_sync: true
      });
      localDB.saveCollection('notifications', alertsLocal);
    }

    // Update UI State instantly
    set({
      products: get().products.map(p => p.id === product_id ? { ...p, stock: computedStock, cost_price: finalCost, updated_at: new Date().toISOString() } : p),
      suppliers: supplier_id ? get().suppliers.map(s => s.id === supplier_id ? { ...s, balance: parseFloat((s.balance + supplierBalanceChange).toFixed(2)) } : s) : get().suppliers,
      inventoryLogs: [newLog, ...get().inventoryLogs],
      supplierTransactions: [...newSupTxs, ...get().supplierTransactions],
      notifications: [{
        id: crypto.randomUUID(),
        shop_id: shop.id,
        title: 'Inventory Updated',
        message: `${targetProduct.name} stock: ${computedStock} ${targetProduct.unit}. ${isCostChanged ? 'Cost updated.' : ''}`,
        type: 'success',
        read: false,
        created_at: new Date().toISOString()
      }, ...get().notifications]
    });

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Inventory adjustment saved locally, will sync later:', err);
        }
      })();
    }
  },

  createSale: async (data: any) => {
    const shop = get().currentShop;
    const user = get().currentUser;
    if (!shop || !user) return null;

    const saleId = crypto.randomUUID();
    let itemSubtotal = 0;
    const saleItemsList: SaleItem[] = [];

    // Calculate subtotal
    for (const line of data.items) {
      const prod = get().products.find(p => p.id === line.product_id);
      if (!prod) continue;
      const lineTotal = Math.round(line.quantity * line.sale_price * 100) / 100;
      itemSubtotal += lineTotal;

      saleItemsList.push({
        id: crypto.randomUUID(),
        shop_id: shop.id,
        sale_id: saleId,
        product_id: prod.id,
        product_name: prod.name,
        quantity: line.quantity,
        unit: prod.unit,
        unit_price: line.sale_price,
        cost_price_at_sale: prod.cost_price,
        total: lineTotal,
        pending_sync: true
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
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      sale_id: saleId,
      invoice_number: invNumber,
      due_date: paymentStatus !== 'paid' ? new Date(Date.now() + 3600000 * 24 * 7).toISOString().split('T')[0] : null,
      notes: data.customer_id ? `Client Ledger Outstanding Invoice.` : `Instore Walk-in cash receipt.`,
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const salesLocal = localDB.getCollection<Sale>('sales');
    const saleItemsLocal = localDB.getCollection<SaleItem>('sale_items');
    const invoicesLocal = localDB.getCollection<Invoice>('invoices');
    const productsLocal = localDB.getCollection<Product>('products');
    const customersLocal = localDB.getCollection<Customer>('customers');
    const transLocal = localDB.getCollection<CustomerTransaction>('customer_transactions');
    const logsLocal = localDB.getCollection<InventoryLog>('inventory_logs');

    salesLocal.push(newSale);
    saleItemsLocal.push(...saleItemsList);
    invoicesLocal.push(newInvoice);

    // Update product stock locally and create logs
    for (const item of data.items) {
      const pIdx = productsLocal.findIndex(p => p.id === item.product_id);
      if (pIdx !== -1) {
        const prod = productsLocal[pIdx];
        const oldStock = prod.stock;
        prod.stock = Math.max(0, parseFloat((prod.stock - item.quantity).toFixed(2)));
        prod.updated_at = new Date().toISOString();
        prod.pending_sync = true;

        logsLocal.push({
          id: crypto.randomUUID(),
          shop_id: shop.id,
          product_id: item.product_id,
          type: 'stock_out',
          quantity: item.quantity,
          unit: prod.unit,
          reason: `Sale ${invNumber}`,
          created_by: user.id,
          created_at: new Date().toISOString(),
          pending_sync: true
        });
      }
    }

    // Update customer balance locally
    if (data.customer_id) {
      const cIdx = customersLocal.findIndex(c => c.id === data.customer_id);
      if (cIdx !== -1) {
        // We always record the debt portion in the ledger for tracking
        // Even if 0, it helps show the invoice history
        customersLocal[cIdx].balance += remainingUnpaidCharge;
        customersLocal[cIdx].pending_sync = true;
        
        transLocal.push({
          id: crypto.randomUUID(),
          shop_id: shop.id,
          customer_id: data.customer_id,
          type: 'credit',
          amount: remainingUnpaidCharge,
          sale_id: saleId,
          description: `Sale Invoice: ${invNumber}`,
          payment_method: data.paid_amount > 0 ? data.payment_method : null,
          created_at: new Date().toISOString(),
          pending_sync: true,
          net_amount: netAmount,
          paid_on_spot: data.paid_amount
        });
        
        // Note: We don't add a separate 'payment_received' for the spot payment 
        // if it was part of the sale, as the 'credit' amount is already net of it.
        // This keeps the ledger cleaner (1 row per sale invoice).
      }
    }

    // Update UI State instantly with optimistic updates
    const tempTxId = `temp-${Date.now()}`;
    const opTx: CustomerTransaction = {
      id: tempTxId,
      shop_id: shop.id,
      customer_id: data.customer_id || '',
      type: 'credit',
      amount: remainingUnpaidCharge,
      sale_id: saleId,
      description: `Sale Invoice: ${invNumber}`,
      payment_method: data.paid_amount > 0 ? data.payment_method : null,
      created_at: new Date().toISOString(),
      net_amount: netAmount,
      paid_on_spot: data.paid_amount
    };

    set({
      sales: [newSale, ...get().sales],
      saleItems: [...saleItemsList, ...get().saleItems],
      invoices: [newInvoice, ...get().invoices],
      customers: data.customer_id ? get().customers.map(c => c.id === data.customer_id ? { ...c, balance: c.balance + remainingUnpaidCharge } : c) : get().customers,
      customerTransactions: data.customer_id ? [opTx, ...get().customerTransactions] : get().customerTransactions
    });

    // Still sync to local and refresh
    localDB.saveCollection('sales', salesLocal);
    localDB.saveCollection('sale_items', saleItemsLocal);
    localDB.saveCollection('invoices', invoicesLocal);
    localDB.saveCollection('products', productsLocal);
    localDB.saveCollection('customers', customersLocal);
    localDB.saveCollection('customer_transactions', transLocal);
    localDB.saveCollection('inventory_logs', logsLocal);

    // Update UI State fully properly in background
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && get().connectionState === 'online' && supabase) {
      (async () => {
        try {
          // Attempt immediate sync for the entries we just created locally
          await get().syncLocalToCloud();
        } catch (err) {
          console.warn('[OFFLINE QUEUE] Sale saved to local buffer, will retry on next stable connection pulse:', err);
        }
      })();
    }

    return saleId;
  },

  voidSale: async (saleId: string) => {
    const shop = get().currentShop;
    const user = get().currentUser;
    if (!shop || !user) return;

    // 1. Identify target sale and items
    const sale = get().sales.find(s => s.id === saleId);
    if (!sale) return;

    const targetSaleItems = get().saleItems.filter(si => si.sale_id === saleId);

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const salesLocal = localDB.getCollection<Sale>('sales');
    const saleItemsLocal = localDB.getCollection<SaleItem>('sale_items');
    const invoicesLocal = localDB.getCollection<Invoice>('invoices');
    const productsLocal = localDB.getCollection<Product>('products');
    const customersLocal = localDB.getCollection<Customer>('customers');
    const transLocal = localDB.getCollection<CustomerTransaction>('customer_transactions');
    const logsLocal = localDB.getCollection<InventoryLog>('inventory_logs');

    // Restore stock and log return
    for (const item of targetSaleItems) {
      const pIdx = productsLocal.findIndex(p => p.id === item.product_id);
      if (pIdx !== -1) {
        productsLocal[pIdx].stock = parseFloat((productsLocal[pIdx].stock + item.quantity).toFixed(2));
        productsLocal[pIdx].updated_at = new Date().toISOString();
        productsLocal[pIdx].pending_sync = true;

        logsLocal.push({
          id: crypto.randomUUID(),
          shop_id: shop.id,
          product_id: item.product_id,
          type: 'stock_in',
          quantity: item.quantity,
          unit: item.unit,
          reason: `Void Sale Ref: ${saleId}`,
          created_by: user.id,
          created_at: new Date().toISOString(),
          pending_sync: true
        });
      }
    }

    // Restore customer balance if debt existed
    if (sale.customer_id) {
      const cIdx = customersLocal.findIndex(c => c.id === sale.customer_id);
      if (cIdx !== -1) {
        const debtPortion = sale.net_amount - sale.paid_amount;
        customersLocal[cIdx].balance = parseFloat((customersLocal[cIdx].balance - debtPortion).toFixed(2));
        customersLocal[cIdx].pending_sync = true;
      }
    }

    // Remove from local collections
    const updatedSales = salesLocal.filter(s => s.id !== saleId);
    const updatedSaleItems = saleItemsLocal.filter(si => si.sale_id !== saleId);
    const updatedInvoices = invoicesLocal.filter(inv => inv.sale_id !== saleId);
    const updatedCustomerTxs = transLocal.filter(tx => tx.sale_id !== saleId);

    localDB.saveCollection('sales', updatedSales);
    localDB.saveCollection('sale_items', updatedSaleItems);
    localDB.saveCollection('invoices', updatedInvoices);
    localDB.saveCollection('products', productsLocal);
    localDB.saveCollection('customers', customersLocal);
    localDB.saveCollection('customer_transactions', updatedCustomerTxs);
    localDB.saveCollection('inventory_logs', logsLocal);

    // Update UI State
    set({
      sales: updatedSales,
      saleItems: updatedSaleItems,
      invoices: updatedInvoices,
      products: get().products.map(p => {
        const item = targetSaleItems.find(si => si.product_id === p.id);
        return item ? { ...p, stock: parseFloat((p.stock + item.quantity).toFixed(2)) } : p;
      }),
      customers: sale.customer_id ? get().customers.map(c => c.id === sale.customer_id ? { ...c, balance: parseFloat((c.balance - (sale.net_amount - sale.paid_amount)).toFixed(2)) } : c) : get().customers,
      customerTransactions: updatedCustomerTxs
    });

    get().refreshData();

    // --- PHASE 2: CLOUD SYNC ---
    if (config.isOnline && rawSupabase) {
      try {
        // We delete from sales and rely on DB cascade or manual item removal
        await rawSupabase.from('sales').delete().eq('id', saleId);
        await rawSupabase.from('sale_items').delete().eq('sale_id', saleId);
        await rawSupabase.from('invoices').delete().eq('sale_id', saleId);
        await rawSupabase.from('customer_transactions').delete().eq('sale_id', saleId);
        
        // Sync the updated products and customers (balance changes) and logs
        await get().syncLocalToCloud();
      } catch (err) {
        console.error('Failed to sync void sale to cloud:', err);
      }
    }
  },

  addCustomer: async (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newCust: Customer = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      balance: data.initialBalance,
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const customersLocal = localDB.getCollection<Customer>('customers');
    customersLocal.push(newCust);
    localDB.saveCollection('customers', customersLocal);

    if (data.initialBalance !== 0) {
      const txsLocal = localDB.getCollection<CustomerTransaction>('customer_transactions');
      txsLocal.push({
        id: crypto.randomUUID(),
        shop_id: shop.id,
        customer_id: newCust.id,
        type: data.initialBalance > 0 ? 'credit' : 'payment_received',
        amount: Math.abs(data.initialBalance),
        sale_id: null,
        description: 'Opening Balance',
        payment_method: null,
        created_at: new Date().toISOString(),
        pending_sync: true
      });
      localDB.saveCollection('customer_transactions', txsLocal);
    }

    // Update UI State instantly
    set({
      customers: [...get().customers, newCust],
      errorMessage: null
    });

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Customer saved locally, will sync later:', err);
        }
      })();
    }
  },

  deleteCustomer: async (id: string) => {
    const shop = get().currentShop;
    if (!shop) return;

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const customersLocal = localDB.getCollection<Customer>('customers');
    const updatedCustomers = customersLocal.filter(c => c.id !== id);
    localDB.saveCollection('customers', updatedCustomers);

    // Delete related transactions locally too
    const txsLocal = localDB.getCollection<CustomerTransaction>('customer_transactions');
    const updatedTxs = txsLocal.filter(t => t.customer_id !== id);
    localDB.saveCollection('customer_transactions', updatedTxs);

    // Update UI State instantly
    set({
      customers: get().customers.filter(c => c.id !== id),
      customerTransactions: get().customerTransactions.filter(t => t.customer_id !== id)
    });

    // Refresh state
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC ---
    if (config.isOnline && supabase) {
      try {
        await supabase.from('customers').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete customer from Supabase:', err);
      }
    }
  },

  addCustomerTransaction: async ({ customer_id, amount, type, method, description, net_amount, paid_on_spot }) => {
    const shop = get().currentShop;
    if (!shop) return;

    const matchedCust = get().customers.find(c => c.id === customer_id);
    if (!matchedCust) return;
    
    // type 'payment_received' reduces balance, 'credit' increases it
    const isPayment = type === 'payment_received';
    const computedBal = parseFloat((isPayment ? matchedCust.balance - amount : matchedCust.balance + amount).toFixed(2));

    // Optimistic Transaction
    const newTx: CustomerTransaction = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      customer_id,
      type,
      amount,
      sale_id: null,
      description: description || (isPayment ? 'Account balance repayment' : 'Manual ledger charge'),
      payment_method: method,
      created_at: new Date().toISOString(),
      net_amount,
      paid_on_spot
    };

    // Optimistic Update
    set({
      customers: get().customers.map(c => c.id === customer_id ? { ...c, balance: computedBal } : c),
      customerTransactions: [newTx, ...get().customerTransactions]
    });

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const customersLocal = localDB.getCollection<Customer>('customers');
    const cIdx = customersLocal.findIndex(c => c.id === customer_id);
    if (cIdx !== -1) {
      customersLocal[cIdx].balance = computedBal;
      customersLocal[cIdx].pending_sync = true;
      localDB.saveCollection('customers', customersLocal);

      const txsLocal = localDB.getCollection<CustomerTransaction>('customer_transactions');
      txsLocal.push({
        ...newTx,
        pending_sync: true
      });
      localDB.saveCollection('customer_transactions', txsLocal);

      const alertsLocal = localDB.getCollection<Notification>('notifications');
      alertsLocal.push({
        id: crypto.randomUUID(),
        shop_id: shop.id,
        title: isPayment ? 'Customer Payment Received' : 'Customer Charge Added',
        message: `${isPayment ? 'Payment' : 'Charge'} of ${shop.currency} ${amount.toLocaleString()} logged for ${matchedCust.name}`,
        type: isPayment ? 'success' : 'info',
        read: false,
        created_at: new Date().toISOString(),
        pending_sync: true
      });
      localDB.saveCollection('notifications', alertsLocal);
    }

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Manual transaction saved locally, will sync later:', err);
        }
      })();
    }
  },

  addSupplier: async (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newSup: Supplier = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      name: data.name,
      phone: data.phone,
      company: data.company,
      balance: data.initialBalance,
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const suppliersLocal = localDB.getCollection<Supplier>('suppliers');
    suppliersLocal.push(newSup);
    localDB.saveCollection('suppliers', suppliersLocal);

    if (data.initialBalance !== 0) {
      const txsLocal = localDB.getCollection<SupplierTransaction>('supplier_transactions');
      txsLocal.push({
        id: crypto.randomUUID(),
        shop_id: shop.id,
        supplier_id: newSup.id,
        type: data.initialBalance > 0 ? 'stock_purchase' : 'payment_made',
        amount: Math.abs(data.initialBalance),
        description: 'Opening Balance',
        payment_method: null,
        created_at: new Date().toISOString(),
        pending_sync: true
      });
      localDB.saveCollection('supplier_transactions', txsLocal);
    }

    // Update UI State instantly
    set({
      suppliers: [...get().suppliers, newSup],
      errorMessage: null
    });

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Supplier saved locally, will sync later:', err);
        }
      })();
    }
  },

  deleteSupplier: async (id: string) => {
    const shop = get().currentShop;
    if (!shop) return;

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const suppliersLocal = localDB.getCollection<Supplier>('suppliers');
    const updatedSuppliers = suppliersLocal.filter(s => s.id !== id);
    localDB.saveCollection('suppliers', updatedSuppliers);

    // Delete related transactions locally
    const txsLocal = localDB.getCollection<SupplierTransaction>('supplier_transactions');
    const updatedTxs = txsLocal.filter(t => t.supplier_id !== id);
    localDB.saveCollection('supplier_transactions', updatedTxs);

    // Update UI State instantly
    set({
      suppliers: get().suppliers.filter(s => s.id !== id),
      supplierTransactions: get().supplierTransactions.filter(t => t.supplier_id !== id)
    });

    // Refresh state
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC ---
    if (config.isOnline && supabase) {
      try {
        await supabase.from('suppliers').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete supplier from Supabase:', err);
      }
    }
  },

  makeSupplierPayment: async ({ supplier_id, amount, method, description }) => {
    const shop = get().currentShop;
    const user = get().currentUser;
    if (!shop || !user) return;

    const targetSupplier = get().suppliers.find(s => s.id === supplier_id);
    if (!targetSupplier) return;
    const computedBal = Math.max(0, parseFloat((targetSupplier.balance - amount).toFixed(2)));

    // Optimistic Transaction
    const newTx: SupplierTransaction = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      supplier_id,
      type: 'payment_made',
      amount,
      description: description || 'Repayment to grain supplier',
      payment_method: method,
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    const newExp: Expense = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      category: 'Maintenance',
      amount,
      description: `Grain Payout to Supplier ${targetSupplier.name}: ${description}`,
      date: new Date().toISOString().split('T')[0],
      created_by: user.id,
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const suppliersLocal = localDB.getCollection<Supplier>('suppliers');
    const idx = suppliersLocal.findIndex(s => s.id === supplier_id);
    if (idx !== -1) {
      suppliersLocal[idx].balance = computedBal;
      suppliersLocal[idx].pending_sync = true;
      localDB.saveCollection('suppliers', suppliersLocal);

      const txsLocal = localDB.getCollection<SupplierTransaction>('supplier_transactions');
      txsLocal.push(newTx);
      localDB.saveCollection('supplier_transactions', txsLocal);

      const expensesLocal = localDB.getCollection<Expense>('expenses');
      expensesLocal.push(newExp);
      localDB.saveCollection('expenses', expensesLocal);
    }

    // Update UI State instantly
    set({
      suppliers: get().suppliers.map(s => s.id === supplier_id ? { ...s, balance: computedBal } : s),
      supplierTransactions: [newTx, ...get().supplierTransactions],
      expenses: [newExp, ...get().expenses]
    });

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Supplier payment saved locally, will sync later:', err);
        }
      })();
    }
  },

  addExpense: async (data) => {
    const shop = get().currentShop;
    const user = get().currentUser;
    if (!shop || !user) return;

    const newExp: Expense = {
      ...data,
      id: crypto.randomUUID(),
      shop_id: shop.id,
      created_by: user.id || 'sys',
      created_at: new Date().toISOString(),
      pending_sync: true
    };

    // --- PHASE 1: PERSIST TO LOCAL STORAGE IMMEDIATELY ---
    const expensesColl = localDB.getCollection<Expense>('expenses');
    expensesColl.push(newExp);
    localDB.saveCollection('expenses', expensesColl);

    const successNotif: Notification = {
      id: crypto.randomUUID(),
      shop_id: shop.id,
      title: 'Expense Recorded',
      message: `Manual expense of ${data.amount} for ${data.category} logged.`,
      type: 'success',
      read: false,
      created_at: new Date().toISOString(),
      pending_sync: true
    };
    const notificationsLocal = localDB.getCollection<Notification>('notifications');
    notificationsLocal.push(successNotif);
    localDB.saveCollection('notifications', notificationsLocal);

    // Update UI State instantly
    set({
      expenses: [...get().expenses, newExp],
      notifications: [successNotif, ...get().notifications]
    });

    // Refresh state from local to ensure consistency
    get().refreshData();

    // --- PHASE 2: ATTEMPT CLOUD SYNC IF ONLINE ---
    if (config.isOnline && supabase) {
      (async () => {
        try {
          await get().syncLocalToCloud();
        } catch (err) {
          console.error('[OFFLINE QUEUE] Expense saved locally, will sync later:', err);
        }
      })();
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

  updateExpense: async (id, data) => {
    const shop = get().currentShop;
    if (!shop) return;

    // Local Logic
    const expensesLocal = localDB.getCollection<Expense>('expenses');
    const idx = expensesLocal.findIndex(e => e.id === id);
    if (idx !== -1) {
      expensesLocal[idx] = { ...expensesLocal[idx], ...data, pending_sync: true };
      localDB.saveCollection('expenses', expensesLocal);
    }

    set({
      expenses: get().expenses.map(e => e.id === id ? { ...e, ...data } : e)
    });

    if (config.isOnline && supabase) {
      try {
        await supabase.from('expenses').update(data).eq('id', id);
      } catch (err) {
        console.error('Failed to update expense in cloud:', err);
      }
    }
    get().refreshData();
  },

  deleteInventoryLog: async (logId) => {
    const shop = get().currentShop;
    if (!shop) return;

    const log = get().inventoryLogs.find(l => l.id === logId);
    if (!log) return;

    // 1. Calculations: Reverse the stock
    const factor = (log.type === 'stock_in' || log.type === 'adjustment') ? -1 : 1;
    const stockChange = log.quantity * factor;

    // 2. Persist to Local
    const logsLocal = localDB.getCollection<InventoryLog>('inventory_logs').filter(l => l.id !== logId);
    localDB.saveCollection('inventory_logs', logsLocal);

    const productsLocal = localDB.getCollection<Product>('products');
    const pIdx = productsLocal.findIndex(p => p.id === log.product_id);
    if (pIdx !== -1) {
      productsLocal[pIdx].stock = parseFloat((productsLocal[pIdx].stock + stockChange).toFixed(2));
      productsLocal[pIdx].pending_sync = true;
      localDB.saveCollection('products', productsLocal);
    }

    // 3. If log was linked to supplier, we probably should warn or reverse, but for now let's focus on stock.
    // Reversing supplier balances correctly would require finding the specific transactions. 
    // Usually these logs are just inventory trails.

    // Update UI
    set({
      inventoryLogs: logsLocal,
      products: get().products.map(p => p.id === log.product_id ? { ...p, stock: parseFloat((p.stock + stockChange).toFixed(2)) } : p)
    });

    if (config.isOnline && supabase) {
      try {
        await supabase.from('inventory_logs').delete().eq('id', logId);
        await get().syncLocalToCloud(); // Sync the updated product stock
      } catch (err) {
        console.error('Failed to delete inventory log in cloud:', err);
      }
    }
    get().refreshData();
  },

  clearNotification: async (id) => {
    // Optimistic remove
    set({
      notifications: get().notifications.filter(n => n.id !== id)
    });

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

  updateCustomer: async (id, data) => {
    set({
      customers: get().customers.map(c => c.id === id ? { ...c, ...data } : c)
    });
    if (config.isOnline && supabase) {
      await supabase.from('customers').update(data).eq('id', id);
    }
    const local = localDB.getCollection<Customer>('customers');
    const idx = local.findIndex(c => c.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...data, pending_sync: true };
      localDB.saveCollection('customers', local);
    }
    get().refreshData();
  },

  deleteCustomerTransaction: async (id) => {
    const tx = get().customerTransactions.find(t => t.id === id);
    if (!tx) return;

    const factor = tx.type === 'payment_received' ? 1 : -1;
    const balanceChange = tx.amount * factor;

    const customers = get().customers.map(c => 
      c.id === tx.customer_id ? { ...c, balance: parseFloat(((c.balance || 0) + balanceChange).toFixed(2)) } : c
    );
    
    set({
      customers,
      customerTransactions: get().customerTransactions.filter(t => t.id !== id)
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          await supabase.from('customer_transactions').delete().eq('id', id);
          const newBal = customers.find(c => c.id === tx.customer_id)?.balance;
          await supabase.from('customers').update({ balance: newBal }).eq('id', tx.customer_id);
        } catch (err) {
          console.error('Failed to delete customer tx in cloud:', err);
        }
      })();
    }

    const localTxs = localDB.getCollection<CustomerTransaction>('customer_transactions').filter(t => t.id !== id);
    localDB.saveCollection('customer_transactions', localTxs);

    const localCusts = localDB.getCollection<Customer>('customers');
    const cIdx = localCusts.findIndex(c => c.id === tx.customer_id);
    if (cIdx !== -1) {
      localCusts[cIdx].balance = parseFloat(((localCusts[cIdx].balance || 0) + balanceChange).toFixed(2));
      localCusts[cIdx].pending_sync = true;
      localDB.saveCollection('customers', localCusts);
    }

    get().refreshData();
  },

  updateSupplier: async (id, data) => {
    set({
      suppliers: get().suppliers.map(s => s.id === id ? { ...s, ...data } : s)
    });
    if (config.isOnline && supabase) {
      await supabase.from('suppliers').update(data).eq('id', id);
    }
    const local = localDB.getCollection<Supplier>('suppliers');
    const idx = local.findIndex(s => s.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...data, pending_sync: true };
      localDB.saveCollection('suppliers', local);
    }
    get().refreshData();
  },

  deleteSupplierTransaction: async (id) => {
    const tx = get().supplierTransactions.find(t => t.id === id);
    if (!tx) return;

    // Balance is amount owed
    const factor = (tx.type === 'stock_purchase') ? -1 : 1;
    const balanceChange = tx.amount * factor;

    const suppliers = get().suppliers.map(s => 
      s.id === tx.supplier_id ? { ...s, balance: parseFloat(((s.balance || 0) + balanceChange).toFixed(2)) } : s
    );

    set({
      suppliers,
      supplierTransactions: get().supplierTransactions.filter(t => t.id !== id)
    });

    if (config.isOnline && supabase) {
      (async () => {
        try {
          await supabase.from('supplier_transactions').delete().eq('id', id);
          const newBal = suppliers.find(s => s.id === tx.supplier_id)?.balance;
          await supabase.from('suppliers').update({ balance: newBal }).eq('id', tx.supplier_id);
        } catch (err) {
          console.error('Failed to delete supplier tx in cloud:', err);
        }
      })();
    }

    const localTxs = localDB.getCollection<SupplierTransaction>('supplier_transactions').filter(t => t.id !== id);
    localDB.saveCollection('supplier_transactions', localTxs);

    const localSups = localDB.getCollection<Supplier>('suppliers');
    const sIdx = localSups.findIndex(s => s.id === tx.supplier_id);
    if (sIdx !== -1) {
      localSups[sIdx].balance = parseFloat(((localSups[sIdx].balance || 0) + balanceChange).toFixed(2));
      localSups[sIdx].pending_sync = true;
      localDB.saveCollection('suppliers', localSups);
    }

    get().refreshData();
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
