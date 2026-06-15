/**
 * Shared Type Definitions for Flour Shop & Atta Chakki SaaS
 */

export type UserRole = 'super_admin' | 'owner' | 'manager' | 'cashier';

export interface Shop {
  id: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  currency: string; // e.g., "PKR", "INR", "$", "AED"
  tax_rate: number; // percentage
  invoice_footer: string | null;
  subscription_status: 'active' | 'suspended' | 'trial';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  shop_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  password?: string;
}

export interface ProductCategory {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  created_at: string;
  pending_sync?: boolean;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  sku: string;
  unit: 'KG' | 'Bag' | 'Maund' | 'Ton' | 'Bag (10 KG)' | 'Bag (15 KG)' | 'Bag (20 KG)' | 'Bag (80 KG)';
  cost_price: number;
  sale_price: number;
  stock: number;
  min_stock_alert: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  pending_sync?: boolean;
}

export interface InventoryLog {
  id: string;
  shop_id: string;
  product_id: string;
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'wastage';
  quantity: number;
  unit: string;
  reason: string;
  created_by: string;
  created_at: string;
  pending_sync?: boolean;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email: string | null;
  balance: number; // positive means they owe money (credit), negative means they pre-paid/advance
  created_at: string;
  pending_sync?: boolean;
}

export interface CustomerTransaction {
  id: string;
  shop_id: string;
  customer_id: string;
  type: 'credit' | 'payment_received' | 'opening_balance';
  amount: number;
  sale_id: string | null;
  description: string;
  payment_method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa' | null;
  created_at: string;
  pending_sync?: boolean;
}

export interface Supplier {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  company: string | null;
  balance: number; // positive = we owe them
  created_at: string;
  pending_sync?: boolean;
}

export interface SupplierTransaction {
  id: string;
  shop_id: string;
  supplier_id: string;
  type: 'grain_purchased' | 'payment_made';
  amount: number;
  description: string;
  payment_method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa' | null;
  created_at: string;
  pending_sync?: boolean;
}

export interface Sale {
  id: string;
  shop_id: string;
  customer_id: string | null; // null for Walk-in
  customer_name_manual: string | null; // manual input for walk-in Name
  total_amount: number;
  discount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  payment_method: 'Cash' | 'Bank' | 'JazzCash' | 'EasyPaisa';
  payment_status: 'paid' | 'partially_paid' | 'unpaid';
  created_by: string;
  created_at: string;
  pending_sync?: boolean;
}

export interface SaleItem {
  id: string;
  shop_id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  cost_price_at_sale: number; // for tracking precise margins
  total: number;
  pending_sync?: boolean;
}

export interface Invoice {
  id: string;
  shop_id: string;
  sale_id: string;
  invoice_number: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  pending_sync?: boolean;
}

export interface Expense {
  id: string;
  shop_id: string;
  category: 'Electricity' | 'Transport' | 'Labor' | 'Rent' | 'Packaging' | 'Maintenance' | 'Other';
  amount: number;
  description: string;
  date: string;
  created_by: string;
  created_at: string;
  pending_sync?: boolean;
}

export interface Notification {
  id: string;
  shop_id: string;
  title: string;
  message: string;
  type: 'info' | 'low_stock' | 'credit_alert' | 'success' | 'error';
  read: boolean;
  created_at: string;
  pending_sync?: boolean;
}

export interface ActivityLog {
  id: string;
  shop_id: string;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
  pending_sync?: boolean;
}
