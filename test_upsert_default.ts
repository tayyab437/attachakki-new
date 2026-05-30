import { createClient } from '@supabase/supabase-js';
const window = { atob: (str) => Buffer.from(str, 'base64').toString() };
const URL_B64 = "aHR0cHM6Ly9vaXZzenlndGl1dWlqZmp3ZXVkbi5zdXBhYmFzZS5jbw==";
const KEY_B64 = "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW05cGRuTjZlV2QwYVhWMWFXcG1hbmRsZFdSdUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnprM05qa3dPVFVzSW1WNGNDSTZNakE1TlRNME5UQTVOWDAuZUxySGFfTGJrQ19xSjZYYWhBeXZsQ285a05KdHhYXzI5UE1nMU9Ia29OTQ==";
const supabase = createClient(window.atob(URL_B64), window.atob(KEY_B64));

async function run() {
    const defaultShopId = '11111111-1111-1111-1111-111111111111';
    // 1. Shops
    const shops = [
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
    ];
    console.log("Upserting default shop...");
    const { error: sErr } = await supabase.from('shops').upsert(shops, { onConflict: 'id' });
    console.log("Shop Err:", sErr);
}
run();
