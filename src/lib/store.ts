/**
 * Central State Store (Zustand) for Flour Shop SaaS
 * Fully simulates Supabase features (auth, multi-tenancy, real-time sync, logs)
 * with robust state mutations, automatic stock deductions, and real-time ledger generation.
 */

import { create } from 'zustand';
import { localDB } from './supabase';
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
  initStore: () => void;
  signUp: (email: string, password: string, fullName: string, shopName: string) => Promise<{ success: boolean; msg: string }>;
  verifyEmailCode: (code: string) => Promise<{ success: boolean; msg: string }>;
  resendVerificationEmail: () => Promise<void>;
  login: (email: string, pass: string) => Promise<{ success: boolean; msg: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;

  // Business CRUD
  addProduct: (product: Omit<Product, 'id' | 'shop_id' | 'created_at' | 'updated_at'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string, description: string | null) => void;

  adjustInventory: (data: {
    product_id: string;
    type: 'stock_in' | 'stock_out' | 'adjustment' | 'wastage';
    quantity: number;
    reason: string;
  }) => void;

  createSale: (data: {
    customer_id: string | null;
    customer_name_manual: string | null;
    items: { product_id: string; quantity: number; sale_price: number }[];
    discount: number;
    paid_amount: number;
    payment_method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa';
  }) => Promise<string | null>;

  addCustomer: (data: { name: string; phone: string; email: string | null; initialBalance: number }) => void;
  receiveCustomerPayment: (data: { customer_id: string; amount: number; method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'; description: string }) => void;
  
  addSupplier: (data: { name: string; phone: string; company: string | null; initialBalance: number }) => void;
  makeSupplierPayment: (data: { supplier_id: string; amount: number; method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa'; description: string }) => void;

  addExpense: (data: {
    category: 'Electricity' | 'Transport' | 'Labor' | 'Rent' | 'Packaging' | 'Maintenance' | 'Other';
    amount: number;
    description: string;
    date: string;
  }) => void;

  deleteExpense: (id: string) => void;
  clearNotification: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (updatedFields: any) => void;
  updateShopProfile: (data: Partial<Shop>) => void;

  // Super Admin controls
  toggleShopStatus: (shopId: string) => void;
}

export const useStore = create<AppStore>((set, get) => ({
  currentUser: null,
  currentShop: null,
  allShops: [],
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

  initStore: () => {
    // Determine initially active user session
    const profiles = localDB.getCollection<Profile>('profiles');
    const shops = localDB.getCollection<Shop>('shops');
    
    const firstOwner = profiles.find(p => p.role === 'owner');
    if (firstOwner) {
      const associatedShop = shops.find(s => s.id === firstOwner.shop_id) || null;
      set({ 
        currentUser: firstOwner, 
        currentShop: associatedShop,
        allShops: shops
      });
      // Fetch datasets
      get().refreshData();
    }
  },

  refreshData: () => {
    const shop = get().currentShop;
    if (!shop) return;

    const filterByShop = <T extends { shop_id: string }>(tbl: string): T[] => {
      const items = localDB.getCollection<T>(tbl);
      return items.filter(item => item.shop_id === shop.id);
    };

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
      settings: localDB.getCollection<any>('settings') || {}
    });
  },

  // Auth implementation
  signUp: async (email, password, fullName, shopName) => {
    set({ loading: true });
    
    // Check credentials or duplicate
    const profiles = localDB.getCollection<Profile>('profiles');
    if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
      set({ loading: false });
      return { success: false, msg: 'Email address already exists' };
    }

    // Prepare Shop, unique tokens, and onboarding payload
    const newShopId = `shop-${Date.now()}`;
    const newUserId = `user-${Date.now()}`;
    const testOtpToken = Math.floor(100000 + Math.random() * 900000).toString(); // e.g. "582910"

    const newShop: Shop = {
      id: newShopId,
      name: shopName,
      logo_url: null,
      phone: '',
      address: '',
      currency: 'PKR',
      tax_rate: 5,
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
      is_verified: false, // verification mandatory
      created_at: new Date().toISOString()
    };

    // Save pre-verified items in memory/local for confirmation
    const shops = localDB.getCollection<Shop>('shops');
    shops.push(newShop);
    localDB.saveCollection('shops', shops);

    profiles.push(newProfile);
    localDB.saveCollection('profiles', profiles);

    // Initial Shop Config Defaults (Categories)
    const newCategories = [
      { id: `cat-1-${Date.now()}`, shop_id: newShopId, name: 'Premium Ground Flour', description: 'Finely milled grain packs' },
      { id: `cat-2-${Date.now()}`, shop_id: newShopId, name: 'Raw Grain Sacks', description: 'Whole grains bags' }
    ];
    const categories = localDB.getCollection<any>('categories');
    categories.push(...newCategories);
    localDB.saveCollection('categories', categories);

    // Set interactive verification state
    set({
      verification: {
        emailSent: true,
        emailToVerify: email,
        otpToken: testOtpToken,
        expired: false
      },
      loading: false
    });

    return { 
      success: true, 
      msg: `Verification code emailed to ${email}. (Dev Simulation code: ${testOtpToken})` 
    };
  },

  verifyEmailCode: async (code) => {
    const { verification } = get();
    if (!verification.emailSent || !verification.emailToVerify) {
      return { success: false, msg: 'No active verification session.' };
    }

    if (code !== verification.otpToken) {
      return { success: false, msg: 'Invalid verification token. Please try again.' };
    }

    // Activate the user account
    const email = verification.emailToVerify;
    const profiles = localDB.getCollection<Profile>('profiles');
    const userIndex = profiles.findIndex(p => p.email.toLowerCase() === email.toLowerCase());

    if (userIndex !== -1) {
      profiles[userIndex].is_verified = true;
      localDB.saveCollection('profiles', profiles);

      const shops = localDB.getCollection<Shop>('shops');
      const currentShop = shops.find(s => s.id === profiles[userIndex].shop_id) || null;

      // Seed default product for this shop so it is not blank
      const defaultProducts: Product[] = [
        {
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
        }
      ];
      const products = localDB.getCollection<Product>('products');
      products.push(...defaultProducts);
      localDB.saveCollection('products', products);

      // Seed greetings log
      const initialLogs: ActivityLog[] = [{
        id: `act-${Date.now()}`,
        shop_id: currentShop?.id || '',
        user_email: email,
        action: 'Account Verified & Created',
        details: `Shop '${currentShop?.name}' registration and verification complete. Seeding default inventory.`,
        created_at: new Date().toISOString()
      }];
      const logs = localDB.getCollection<ActivityLog>('activity_logs');
      logs.push(...initialLogs);
      localDB.saveCollection('activity_logs', logs);

      set({
        currentUser: profiles[userIndex],
        currentShop: currentShop,
        verification: { emailSent: false, emailToVerify: null, otpToken: null, expired: false },
        allShops: shops
      });

      get().refreshData();
      return { success: true, msg: 'Email verification successful! Logging into your dashboard...' };
    }

    return { success: false, msg: 'Account not found. Try signing up again.' };
  },

  resendVerificationEmail: async () => {
    const { verification } = get();
    if (verification.emailToVerify) {
      const newOtp = Math.floor(111111 + Math.random() * 888888).toString();
      set({
        verification: {
          ...verification,
          otpToken: newOtp
        }
      });
      console.log(`[SIMULATED EMAIL RETRY] Resent token: ${newOtp} to ${verification.emailToVerify}`);
    }
  },

  login: async (email, pass) => {
    set({ loading: true, errorMessage: null });

    const profiles = localDB.getCollection<Profile>('profiles');
    const user = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      set({ loading: false });
      return { success: false, msg: 'Invalid email address or passcode' };
    }

    // Require email confirmation check (unless disabled or admin verified)
    if (!user.is_verified) {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      set({
        verification: {
          emailSent: true,
          emailToVerify: email,
          otpToken: generatedOtp,
          expired: false
        },
        loading: false
      });
      return { success: false, msg: `Registration is incomplete. Verification code resent to ${email}. (Code: ${generatedOtp})` };
    }

    const shops = localDB.getCollection<Shop>('shops');
    const userShop = shops.find(s => s.id === user.shop_id) || null;

    set({
      currentUser: user,
      currentShop: userShop,
      loading: false,
      allShops: shops
    });

    get().refreshData();

    // Log Activity
    const actLogs = localDB.getCollection<ActivityLog>('activity_logs');
    actLogs.push({
      id: `act-${Date.now()}`,
      shop_id: user.shop_id,
      user_email: email,
      action: 'Session Authorize',
      details: `User connected from Client Agent browser in role '${user.role}'`,
      created_at: new Date().toISOString()
    });
    localDB.saveCollection('activity_logs', actLogs);
    get().refreshData();

    return { success: true, msg: 'Authorized successfully.' };
  },

  logout: () => {
    // Audit active state exit
    const { currentUser } = get();
    if (currentUser) {
      const actLogs = localDB.getCollection<ActivityLog>('activity_logs');
      actLogs.push({
        id: `act-${Date.now()}`,
        shop_id: currentUser.shop_id,
        user_email: currentUser.email,
        action: 'Session Terminated',
        details: 'User logged out intentionally.',
        created_at: new Date().toISOString()
      });
      localDB.saveCollection('activity_logs', actLogs);
    }
    set({ currentUser: null, currentShop: null });
  },

  switchRole: (role) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const updated = { ...currentUser, role };
    set({ currentUser: updated });
    
    // Save to profiles database
    const profiles = localDB.getCollection<Profile>('profiles');
    const idx = profiles.findIndex(p => p.id === currentUser.id);
    if (idx !== -1) {
      profiles[idx].role = role;
      localDB.saveCollection('profiles', profiles);
    }
  },

  // Products CRUD
  addProduct: (product) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      shop_id: shop.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const products = localDB.getCollection<Product>('products');
    products.push(newProduct);
    localDB.saveCollection('products', products);

    // Initial Stock In Log
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
  },

  updateProduct: (id, data) => {
    const products = localDB.getCollection<Product>('products');
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      const prevStock = products[idx].stock;
      products[idx] = {
        ...products[idx],
        ...data,
        updated_at: new Date().toISOString()
      };
      localDB.saveCollection('products', products);

      // Check if stock was updated directly
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

      get().refreshData();
    }
  },

  deleteProduct: (id) => {
    const products = localDB.getCollection<Product>('products').filter(p => p.id !== id);
    localDB.saveCollection('products', products);
    get().refreshData();
  },

  addCategory: (name, description) => {
    const shop = get().currentShop;
    if (!shop) return;
    const categories = localDB.getCollection<any>('categories');
    categories.push({
      id: `cat-${Date.now()}`,
      shop_id: shop.id,
      name,
      description
    });
    localDB.saveCollection('categories', categories);
    get().refreshData();
  },

  // Inventory logic
  adjustInventory: ({ product_id, type, quantity, reason }) => {
    const shop = get().currentShop;
    if (!shop) return;

    const products = localDB.getCollection<Product>('products');
    const pIdx = products.findIndex(p => p.id === product_id);
    if (pIdx === -1) return;

    const factor = (type === 'stock_in' || type === 'adjustment') ? 1 : -1;
    const finalChange = quantity * factor;
    products[pIdx].stock = Math.max(0, products[pIdx].stock + finalChange);
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

    // Throw alerts dynamically if low stock
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

    get().refreshData();
  },

  // Sales engine with instant inventory deduction and transaction loggers
  createSale: async (data) => {
    const shop = get().currentShop;
    const user = get().currentUser;
    if (!shop || !user) return null;

    const products = localDB.getCollection<Product>('products');
    const sales = localDB.getCollection<Sale>('sales');
    const saleItems = localDB.getCollection<SaleItem>('sale_items');
    const invoices = localDB.getCollection<Invoice>('invoices');
    const customers = localDB.getCollection<Customer>('customers');
    const custTransactions = localDB.getCollection<CustomerTransaction>('customer_transactions');

    const saleId = `sale-${Date.now()}`;
    let itemSubtotal = 0;
    const saleItemsList: SaleItem[] = [];

    // 1. Process items and deduct inventory
    for (const line of data.items) {
      const pIdx = products.findIndex(p => p.id === line.product_id);
      if (pIdx === -1) continue;

      const prod = products[pIdx];
      // Deduct stock
      prod.stock = Math.max(0, prod.stock - line.quantity);
      prod.updated_at = new Date().toISOString();

      const lineTotal = line.quantity * line.sale_price;
      itemSubtotal += lineTotal;

      saleItemsList.push({
        id: `si-${Date.now()}-${Math.random()}`,
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

      // Stock notification alerts if falls below alert limit
      if (prod.stock <= prod.min_stock_alert) {
        const alerts = localDB.getCollection<Notification>('notifications');
        alerts.push({
          id: `not-${Date.now()}-${Math.random()}`,
          shop_id: shop.id,
          title: 'Low Stock Alert',
          message: `${prod.name} has been depleted to ${prod.stock} ${prod.unit} via sale ${saleId}`,
          type: 'low_stock',
          read: false,
          created_at: new Date().toISOString()
        });
        localDB.saveCollection('notifications', alerts);
      }
    }

    // Save deducted products
    localDB.saveCollection('products', products);

    const taxAmount = parseFloat(((itemSubtotal - data.discount) * (shop.tax_rate / 100)).toFixed(2));
    const netAmount = Math.max(0, itemSubtotal - data.discount + taxAmount);
    
    // Check payment status based on active customer ledger balance
    let paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 'paid';
    if (data.paid_amount >= netAmount) {
      paymentStatus = 'paid';
    } else if (data.paid_amount > 0) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'unpaid';
    }

    // 2. Customer Credit Adjustments
    const remainingUnpaidCharge = netAmount - data.paid_amount;
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
          description: `Credit amount outstanding from checkout sale. Got PKR ${data.paid_amount} deposit.`,
          payment_method: null,
          created_at: new Date().toISOString()
        });
      }
    }

    // Handle initial advance paid or Walk-in cash registers
    if (data.customer_id && data.paid_amount > 0) {
      custTransactions.push({
        id: `tx-dep-${Date.now()}`,
        shop_id: shop.id,
        customer_id: data.customer_id,
        type: 'payment_received',
        amount: data.paid_amount,
        sale_id: saleId,
        description: `Direct deposit toward checkout sale`,
        payment_method: data.payment_method,
        created_at: new Date().toISOString()
      });
    }

    // Save customers state
    localDB.saveCollection('customers', customers);
    localDB.saveCollection('customer_transactions', custTransactions);

    // 3. Assemble and save the Sale record
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
    
    sales.push(newSale);
    localDB.saveCollection('sales', sales);

    // Write Sold items list
    saleItems.push(...saleItemsList);
    localDB.saveCollection('sale_items', saleItems);

    // 4. Generate the Printable Invoice
    const invNumber = `INV-${new Date().getFullYear()}-${1000 + sales.length}`;
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      shop_id: shop.id,
      sale_id: saleId,
      invoice_number: invNumber,
      due_date: paymentStatus !== 'paid' ? new Date(Date.now() + 3600000 * 24 * 7).toISOString().split('T')[0] : null,
      notes: data.customer_id ? `Client Ledger Outstanding Invoice.` : `Instore Walk-in customer cashier payment.`,
      created_at: new Date().toISOString()
    };
    invoices.push(newInvoice);
    localDB.saveCollection('invoices', invoices);

    // Append to activity loggers
    const logs = localDB.getCollection<ActivityLog>('activity_logs');
    const customerLabel = data.customer_id 
      ? (customers.find(c => c.id === data.customer_id)?.name || 'Credit Client')
      : (data.customer_name_manual || 'Walk-in buyer');
    logs.push({
      id: `act-${Date.now()}`,
      shop_id: shop.id,
      user_email: user.email,
      action: 'POS Transaction Created',
      details: `Completed receipt ${invNumber} for ${customerLabel}. Grand Total: PKR ${netAmount.toLocaleString()} (${data.payment_method}).`,
      created_at: new Date().toISOString()
    });
    localDB.saveCollection('activity_logs', logs);

    // Dynamic celebration notification
    const notesList = localDB.getCollection<Notification>('notifications');
    notesList.push({
      id: `not-sale-${Date.now()}`,
      shop_id: shop.id,
      title: 'Sale Created Successfully',
      message: `Invoice ${invNumber} generated for PKR ${netAmount.toLocaleString()}`,
      type: 'success',
      read: false,
      created_at: new Date().toISOString()
    });
    localDB.saveCollection('notifications', notesList);

    get().refreshData();
    return saleId;
  },

  // Customer Management
  addCustomer: (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      shop_id: shop.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      balance: data.initialBalance,
      created_at: new Date().toISOString()
    };

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
  },

  receiveCustomerPayment: ({ customer_id, amount, method, description }) => {
    const shop = get().currentShop;
    if (!shop) return;

    const customers = localDB.getCollection<Customer>('customers');
    const idx = customers.findIndex(c => c.id === customer_id);
    if (idx !== -1) {
      // Repay decreases what they owe (decrease balance)
      customers[idx].balance = Math.max(-1000000, customers[idx].balance - amount);
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

      get().refreshData();
    }
  },

  // Supplier Management
  addSupplier: (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      shop_id: shop.id,
      name: data.name,
      phone: data.phone,
      company: data.company,
      balance: data.initialBalance,
      created_at: new Date().toISOString()
    };

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
  },

  makeSupplierPayment: ({ supplier_id, amount, method, description }) => {
    const shop = get().currentShop;
    if (!shop) return;

    const suppliers = localDB.getCollection<Supplier>('suppliers');
    const idx = suppliers.findIndex(s => s.id === supplier_id);
    if (idx !== -1) {
      // Payment reduces what we owe them
      suppliers[idx].balance = Math.max(0, suppliers[idx].balance - amount);
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

      // Create an expense entry for this payout since it is grain business outflow
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

      get().refreshData();
    }
  },

  // Expenses CRUD
  addExpense: (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const newExp: Expense = {
      ...data,
      id: `exp-${Date.now()}`,
      shop_id: shop.id,
      created_by: get().currentUser?.id || 'sys',
      created_at: new Date().toISOString()
    };

    const expenses = localDB.getCollection<Expense>('expenses');
    expenses.push(newExp);
    localDB.saveCollection('expenses', expenses);

    get().refreshData();
  },

  deleteExpense: (id) => {
    const expenses = localDB.getCollection<Expense>('expenses').filter(e => e.id !== id);
    localDB.saveCollection('expenses', expenses);
    get().refreshData();
  },

  // Notifications management
  clearNotification: (id) => {
    const notifications = localDB.getCollection<Notification>('notifications').filter(n => n.id !== id);
    localDB.saveCollection('notifications', notifications);
    get().refreshData();
  },

  markAllNotificationsRead: () => {
    const notifications = localDB.getCollection<Notification>('notifications').map(n => ({ ...n, read: true }));
    localDB.saveCollection('notifications', notifications);
    get().refreshData();
  },

  // Settings and Profile edits
  updateSettings: (updatedFields) => {
    const current = localDB.getCollection<any>('settings') || {};
    const merged = { ...current, ...updatedFields };
    localStorage.setItem('flour_db_settings', JSON.stringify(merged));
    
    const logs = localDB.getCollection<ActivityLog>('activity_logs');
    logs.push({
      id: `act-${Date.now()}`,
      shop_id: get().currentShop?.id || '',
      user_email: get().currentUser?.email || 'admin',
      action: 'Settings Modified',
      details: 'Updated global system rules, tax configuration, printer widths, or alert parameters.',
      created_at: new Date().toISOString()
    });
    localDB.saveCollection('activity_logs', logs);

    get().refreshData();
  },

  updateShopProfile: (data) => {
    const shop = get().currentShop;
    if (!shop) return;

    const shops = localDB.getCollection<Shop>('shops');
    const idx = shops.findIndex(s => s.id === shop.id);
    if (idx !== -1) {
      const merged = { ...shops[idx], ...data, updated_at: new Date().toISOString() };
      shops[idx] = merged;
      localDB.saveCollection('shops', shops);
      
      set({ currentShop: merged });
      get().refreshData();
    }
  },

  toggleShopStatus: (shopId) => {
    const shops = localDB.getCollection<Shop>('shops');
    const idx = shops.findIndex(s => s.id === shopId);
    if (idx !== -1) {
      const currentStatus = shops[idx].subscription_status;
      shops[idx].subscription_status = currentStatus === 'active' ? 'suspended' : 'active';
      localDB.saveCollection('shops', shops);
      
      set({ allShops: shops });
      if (get().currentShop?.id === shopId) {
        set({ currentShop: shops[idx] });
      }
      get().refreshData();
    }
  },

  /**
   * INTERACTIVE REALTIME SIMULATION
   * Simulates remote cashier actions processing sales and adjusting stock
   * to showcase real-time dashboard UI updates beautifully!
   */
  triggerRealtimeSale: () => {
    const shop = get().currentShop;
    if (!shop) return;

    const products = get().products;
    if (products.length === 0) return;

    // Pick a random product
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const rollQuantity = Math.floor(Math.random() * 15) + 1; // 1 to 15 units

    // Prepare line item
    const mockSaleItem = {
      product_id: randomProduct.id,
      quantity: Math.min(rollQuantity, randomProduct.stock > 0 ? randomProduct.stock : 25),
      sale_price: randomProduct.sale_price
    };

    get().createSale({
      customer_id: null,
      customer_name_manual: 'Zahid Hussain (Simulated)',
      items: [mockSaleItem],
      discount: 0,
      paid_amount: mockSaleItem.quantity * mockSaleItem.sale_price,
      payment_method: Math.random() > 0.5 ? 'JazzCash' : 'Cash'
    });
  },

  startRealtimeSimulation: () => {
    const interval = setInterval(() => {
      // 15% chance of spawning automatic transactions every 15 seconds
      if (Math.random() < 0.35 && get().currentUser && get().currentShop) {
        get().triggerRealtimeSale();
      }
    }, 20000);

    return () => clearInterval(interval);
  }
}));
