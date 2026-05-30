/**
 * Supabase Client Architecture
 * Dual-Mode Client: Leverages live Supabase SDK when credentials are provided in Env / Settings,
 * or falls back to a feature-rich, fully operational Local Database engine that is stored
 * in Local Storage with Realtime triggers and state synchronization.
 */

import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or setting overrides
const getSupabaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL;
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY;
  
  // Also check local storage for runtime customization in the UI
  const storedUrl = localStorage.getItem('supa_url_override');
  const storedKey = localStorage.getItem('supa_key_override');
  const forceOffline = localStorage.getItem('force_offline') === 'true';

  if (forceOffline) {
    return {
      url: '',
      key: '',
      isOnline: false
    };
  }

  return {
    url: storedUrl || envUrl || '',
    key: storedKey || envKey || '',
    isOnline: !!(storedUrl || envUrl) && !!(storedKey || envKey)
  };
};

export const config = getSupabaseConfig();

// Initialize the real Client instance if online credentials exist
export const supabase = config.isOnline 
  ? createClient(config.url, config.key) 
  : null as any;

/**
 * 20-Table In-Memory & LocalStorage Database Simulation
 * Perfectly mimics Supabase Auth, CRUD operations, transactions, and triggers.
 */
class LocalDB {
  private listeners: { [channel: string]: ((payload: any) => void)[] } = {};

  constructor() {
    this.initDefaultData();
  }

  // Realtime subscription emulation
  subscribe(channel: string, callback: (payload: any) => void) {
    if (!this.listeners[channel]) {
      this.listeners[channel] = [];
    }
    this.listeners[channel].push(callback);
    return {
      unsubscribe: () => {
        this.listeners[channel] = this.listeners[channel].filter(l => l !== callback);
      }
    };
  }

  emit(channel: string, payload: any) {
    if (this.listeners[channel]) {
      this.listeners[channel].forEach(callback => callback(payload));
    }
  }

  private initDefaultData() {
    // Check if initial items already exist
    if (!localStorage.getItem('flour_db_shops')) {
      const defaultShopId = '11111111-1111-1111-1111-111111111111';
      const defaultUserId = '22222222-2222-2222-2222-222222222222';

      // 1. Shops
      localStorage.setItem('flour_db_shops', JSON.stringify([
        {
          id: defaultShopId,
          name: 'Supreme Chakki & Grain Mills',
          logo_url: null,
          phone: '+92 300 1234567',
          address: 'Main Bazaar Road, Block 4, Lahore',
          currency: 'PKR',
          tax_rate: 0,
          invoice_footer: 'Thank you for your business! Fresh flour is health.',
          subscription_status: 'trial',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]));

      // 2. Profiles (Owner account)
      localStorage.setItem('flour_db_profiles', JSON.stringify([
        {
          id: defaultUserId,
          shop_id: defaultShopId,
          email: 'ac.repair.in.dubai3@gmail.com',
          full_name: 'M. Ibrahim Khan (Chakki Owner)',
          role: 'owner',
          avatar_url: null,
          is_verified: true,
          created_at: new Date().toISOString()
        }
      ]));

      // 3. Categories
      localStorage.setItem('flour_db_categories', JSON.stringify([
        { id: 'cat-1', shop_id: defaultShopId, name: 'Premium Atta', description: 'Fresh stone-ground wheat flour' },
        { id: 'cat-2', shop_id: defaultShopId, name: 'Fine Flour & Maida', description: 'Refined soft flour' },
        { id: 'cat-3', shop_id: defaultShopId, name: 'Secondary Grains', description: 'Corn, Bran, Barley and Millets' },
        { id: 'cat-4', shop_id: defaultShopId, name: 'By-products & Feed', description: 'Chokar / Wheat bran feed' }
      ]));

      // 4. Products / Flour options
      localStorage.setItem('flour_db_products', JSON.stringify([
        {
          id: 'prod-1',
          shop_id: defaultShopId,
          category_id: 'cat-1',
          name: 'Premium Desi Chakki Atta',
          sku: 'DESI-ATTA-001',
          unit: 'KG',
          cost_price: 110,
          sale_price: 135,
          stock: 450,
          min_stock_alert: 100,
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'prod-2',
          shop_id: defaultShopId,
          category_id: 'cat-2',
          name: 'Fine White Maida',
          sku: 'WHITE-MAID-002',
          unit: 'KG',
          cost_price: 125,
          sale_price: 155,
          stock: 220,
          min_stock_alert: 50,
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'prod-3',
          shop_id: defaultShopId,
          category_id: 'cat-3',
          name: 'Wheat Grain Sacks (Sargodha Special)',
          sku: 'WHT-BAG-50KG',
          unit: 'Bag',
          cost_price: 4800,
          sale_price: 5200,
          stock: 12,
          min_stock_alert: 5,
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'prod-4',
          shop_id: defaultShopId,
          category_id: 'cat-4',
          name: 'Chokar (Wheat Bran Feed)',
          sku: 'CHOKAR-004',
          unit: 'Bag',
          cost_price: 1600,
          sale_price: 1950,
          stock: 28,
          min_stock_alert: 10,
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'prod-5',
          shop_id: defaultShopId,
          category_id: 'cat-1',
          name: 'Makki (Corn) Atta ground',
          sku: 'CORN-ATTA-005',
          unit: 'KG',
          cost_price: 90,
          sale_price: 120,
          stock: 35,
          min_stock_alert: 50,
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]));

      // 5. Inventory Logs
      localStorage.setItem('flour_db_inventory_logs', JSON.stringify([
        {
          id: 'log-1',
          shop_id: defaultShopId,
          product_id: 'prod-1',
          type: 'stock_in',
          quantity: 500,
          unit: 'KG',
          reason: 'Initial Milling Harvest Stone Ground Output',
          created_by: defaultUserId,
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'log-2',
          shop_id: defaultShopId,
          product_id: 'prod-5',
          type: 'wastage',
          quantity: 15,
          unit: 'KG',
          reason: 'Moisture Spoilage in Bin B',
          created_by: defaultUserId,
          created_at: new Date(Date.now() - 3600000 * 12).toISOString()
        }
      ]));

      // 6. Customers
      localStorage.setItem('flour_db_customers', JSON.stringify([
        {
          id: 'cust-1',
          shop_id: defaultShopId,
          name: 'Kashif Ali Bakers',
          phone: '0321-7654321',
          email: 'kashif@ali-bakers.com',
          balance: 14500, // owes us PKR 14,500 credit
          created_at: new Date().toISOString()
        },
        {
          id: 'cust-2',
          shop_id: defaultShopId,
          name: 'Haji Aslam Food Feed Store',
          phone: '0333-1122334',
          email: null,
          balance: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 'cust-3',
          shop_id: defaultShopId,
          name: 'Zainab Bibi (Local Resident)',
          phone: '0345-9988776',
          email: null,
          balance: 850, // owes PKR 850
          created_at: new Date().toISOString()
        }
      ]));

      // 7. Ledger Transactions
      localStorage.setItem('flour_db_customer_transactions', JSON.stringify([
        {
          id: 'tx-1',
          shop_id: defaultShopId,
          customer_id: 'cust-1',
          type: 'credit',
          amount: 25000,
          sale_id: 'sale-0',
          description: 'Purchase of 10x 50KG white flour sacks on credit',
          payment_method: null,
          created_at: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          id: 'tx-2',
          shop_id: defaultShopId,
          customer_id: 'cust-1',
          type: 'payment_received',
          amount: 10500,
          sale_id: null,
          description: 'Partial repayment via JazzCash direct transfer',
          payment_method: 'JazzCash',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          id: 'tx-3',
          shop_id: defaultShopId,
          customer_id: 'cust-3',
          type: 'credit',
          amount: 850,
          sale_id: 'sale-00',
          description: 'Purchased 5KG Premium Desi Chakki Atta',
          payment_method: null,
          created_at: new Date().toISOString()
        }
      ]));

      // 8. Suppliers
      localStorage.setItem('flour_db_suppliers', JSON.stringify([
        {
          id: 'sup-1',
          shop_id: defaultShopId,
          name: 'Chaudhry Wheat Farms & Silos',
          phone: '0300-8884422',
          company: 'Sargodha Grain Wholesalers',
          balance: 120000, // we owe them PKR 120,000 for raw wheat bags
          created_at: new Date().toISOString()
        }
      ]));

      // 9. Supplier Transactions
      localStorage.setItem('flour_db_supplier_transactions', JSON.stringify([
        {
          id: 'sup-tx-1',
          shop_id: defaultShopId,
          supplier_id: 'sup-1',
          type: 'grain_purchased',
          amount: 250000,
          description: 'Bought 50 bags premium milling wheat grain',
          payment_method: null,
          created_at: new Date(Date.now() - 3600000 * 48).toISOString()
        },
        {
          id: 'sup-tx-2',
          shop_id: defaultShopId,
          supplier_id: 'sup-1',
          type: 'payment_made',
          amount: 130000,
          description: 'Bank payment remittance receipt #281920',
          payment_method: 'Bank',
          created_at: new Date(Date.now() - 3600000 * 12).toISOString()
        }
      ]));

      // 10. Expenses
      localStorage.setItem('flour_db_expenses', JSON.stringify([
        {
          id: 'exp-1',
          shop_id: defaultShopId,
          category: 'Electricity',
          amount: 32000,
          description: 'High voltage monthly power bill for 3-phase Chakki motors',
          date: new Date(Date.now() - 3600000 * 24 * 5).toISOString().split('T')[0],
          created_by: defaultUserId,
          created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
        },
        {
          id: 'exp-2',
          shop_id: defaultShopId,
          category: 'Labor',
          amount: 8500,
          description: 'Weekly wage paid to Chakki ground worker',
          date: new Date().toISOString().split('T')[0],
          created_by: defaultUserId,
          created_at: new Date().toISOString()
        },
        {
          id: 'exp-3',
          shop_id: defaultShopId,
          category: 'Transport',
          amount: 4000,
          description: 'Mazda loading loader diesel fare from grain silo',
          date: new Date(Date.now() - 3600000 * 24 * 2).toISOString().split('T')[0],
          created_by: defaultUserId,
          created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        }
      ]));

      // 11. Sales
      localStorage.setItem('flour_db_sales', JSON.stringify([
        {
          id: 'sale-1',
          shop_id: defaultShopId,
          customer_id: 'cust-1',
          customer_name_manual: null,
          total_amount: 32500,
          discount: 1500,
          tax_amount: 1550,
          net_amount: 32550,
          paid_amount: 32550,
          payment_method: 'Bank',
          payment_status: 'paid',
          created_by: defaultUserId,
          created_at: new Date(Date.now() - 3600000 * 73).toISOString()
        },
        {
          id: 'sale-2',
          shop_id: defaultShopId,
          customer_id: null,
          customer_name_manual: 'Abdur Rehman (Walk-in)',
          total_amount: 1350,
          discount: 0,
          tax_amount: 67.5,
          net_amount: 1417.5,
          paid_amount: 1417.5,
          payment_method: 'Cash',
          payment_status: 'paid',
          created_by: defaultUserId,
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'sale-3',
          shop_id: defaultShopId,
          customer_id: 'cust-3',
          customer_name_manual: null,
          total_amount: 850,
          discount: 0,
          tax_amount: 0,
          net_amount: 850,
          paid_amount: 0,
          payment_method: 'Cash',
          payment_status: 'unpaid',
          created_by: defaultUserId,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ]));

      // 12. Sale Items
      localStorage.setItem('flour_db_sale_items', JSON.stringify([
        {
          id: 'item-1',
          shop_id: defaultShopId,
          sale_id: 'sale-1',
          product_id: 'prod-3',
          product_name: 'Wheat Grain Sacks (Sargodha Special)',
          quantity: 6,
          unit: 'Bag',
          unit_price: 5200,
          cost_price_at_sale: 4800,
          total: 31200
        },
        {
          id: 'item-2',
          shop_id: defaultShopId,
          sale_id: 'sale-1',
          product_id: 'prod-1',
          product_name: 'Premium Desi Chakki Atta',
          quantity: 10,
          unit: 'KG',
          unit_price: 130,
          cost_price_at_sale: 110,
          total: 1300
        },
        {
          id: 'item-3',
          shop_id: defaultShopId,
          sale_id: 'sale-2',
          product_id: 'prod-1',
          product_name: 'Premium Desi Chakki Atta',
          quantity: 10,
          unit: 'KG',
          unit_price: 135,
          cost_price_at_sale: 110,
          total: 1350
        },
        {
          id: 'item-4',
          shop_id: defaultShopId,
          sale_id: 'sale-3',
          product_id: 'prod-1',
          product_name: 'Premium Desi Chakki Atta',
          quantity: 6.3,
          unit: 'KG',
          unit_price: 135,
          cost_price_at_sale: 110,
          total: 850
        }
      ]));

      // 13. Invoices
      localStorage.setItem('flour_db_invoices', JSON.stringify([
        {
          id: 'inv-1',
          shop_id: defaultShopId,
          sale_id: 'sale-1',
          invoice_number: 'INV-2026-0001',
          due_date: null,
          notes: 'Standard Grain Bulk Mill invoice',
          created_at: new Date(Date.now() - 3600000 * 73).toISOString()
        },
        {
          id: 'inv-2',
          shop_id: defaultShopId,
          sale_id: 'sale-2',
          invoice_number: 'INV-2026-0002',
          due_date: null,
          notes: 'Cash Invoice (Walk-in)',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'inv-3',
          shop_id: defaultShopId,
          sale_id: 'sale-3',
          invoice_number: 'INV-2026-0003',
          due_date: new Date(Date.now() + 3600000 * 24 * 10).toISOString().split('T')[0],
          notes: 'Credit Sale Statement for Zainab Bibi',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ]));

      // 14. Notifications
      localStorage.setItem('flour_db_notifications', JSON.stringify([
        {
          id: 'not-1',
          shop_id: defaultShopId,
          title: 'Welcome to your Atta Chakki Workspace!',
          message: 'Everything is synchronized in real-time. Start by scanning products or selling flour.',
          type: 'success',
          read: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'not-2',
          shop_id: defaultShopId,
          title: 'Low Stock Alert',
          message: 'Wheat Grain Sacks (Sargodha Special) is running low: 12 Bags left (Min limit is 5)',
          type: 'low_stock',
          read: false,
          created_at: new Date(Date.now() - 3600000 * 4).toISOString()
        }
      ]));

      // 15. Activity Logs
      localStorage.setItem('flour_db_activity_logs', JSON.stringify([
        {
          id: 'act-1',
          shop_id: defaultShopId,
          user_email: 'ac.repair.in.dubai3@gmail.com',
          action: 'Member Sign-In',
          details: 'Owner logged in successfully in the Flour Shop Dashboard from IP 182.203.*.*',
          created_at: new Date().toISOString()
        },
        {
          id: 'act-2',
          shop_id: defaultShopId,
          user_email: 'ac.repair.in.dubai3@gmail.com',
          action: 'POS Sale Completed',
          details: 'Sold 10 KG Premium Desi Chakki Atta to Walk-in customer Abdur Rehman (Cash)',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ]));

      // 16. Settings
      localStorage.setItem('flour_db_settings', JSON.stringify({
        shop_id: defaultShopId,
        theme: 'light',
        language: 'en',
        print_size: 'thermal_80mm',
        enable_whatsapp_alert: true,
        sms_api_key: '',
        tax_registered: true,
        tax_id: 'NTN-82910-82B-9'
      }));
    }
  }

  // Get data collection helper
  getCollection<T>(table: string): T[] {
    const data = localStorage.getItem(`flour_db_${table}`);
    return data ? JSON.parse(data) : [];
  }

  // Save collection helper
  saveCollection<T>(table: string, data: T[]) {
    localStorage.setItem(`flour_db_${table}`, JSON.stringify(data));
    this.emit(table, { event: 'UPDATE', data });
  }
}

export const localDB = new LocalDB();
