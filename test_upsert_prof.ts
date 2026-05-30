import { createClient } from '@supabase/supabase-js';
const window = { atob: (str) => Buffer.from(str, 'base64').toString() };
const URL_B64 = "aHR0cHM6Ly9vaXZzenlndGl1dWlqZmp3ZXVkbi5zdXBhYmFzZS5jbw==";
const KEY_B64 = "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW05cGRuTjZlV2QwYVhWMWFXcG1hbmRsZFdSdUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzTnprM05qa3dPVFVzSW1WNGNDSTZNakE1TlRNME5UQTVOWDAuZUxySGFfTGJrQ19xSjZYYWhBeXZsQ285a05KdHhYXzI5UE1nMU9Ia29OTQ==";
const supabase = createClient(window.atob(URL_B64), window.atob(KEY_B64));

async function run() {
    const defaultShopId = '11111111-1111-1111-1111-111111111111';
    const defaultUserId = '22222222-2222-2222-2222-222222222222';
    // 2. Profiles (Owner account)
    const profiles = [
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
    ];
    console.log("Upserting profile...");
    const { error: pErr } = await supabase.from('profiles').upsert(profiles, { onConflict: 'id' });
    console.log("Profile Err:", pErr);
}
run();
