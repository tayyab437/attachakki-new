import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://oivszygtiuuijfjweudn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdnN6eWd0aXV1aWpmandldWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjkwOTUsImV4cCI6MjA5NTM0NTA5NX0.eLrHa_LbkC_qJ6XahAyvlCo9kNJtxX_29PMg1OHkoNM');

async function check() {
  const { data, error } = await supabase.from('shops').select('*');
  console.log('shops:', data, error);
}
check();
