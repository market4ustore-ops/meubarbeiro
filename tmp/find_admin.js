const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bmiujtbzuksbbwalsnqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXVqdGJ6dWtzYmJ3YWxzbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzIxNTMsImV4cCI6MjA4ODE0ODE1M30.sRsVsNfkLNYXH1ipBPl8svZCKdqYP3cfVsaE5qO5FiM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findSuperAdmin() {
  const { data, error } = await supabase
    .from('users')
    .select('email, role')
    .eq('role', 'SUPER_ADMIN');

  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Super Admins:', JSON.stringify(data));
}

findSuperAdmin();
