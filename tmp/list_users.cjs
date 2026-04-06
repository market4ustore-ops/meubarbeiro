const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bmiujtbzuksbbwalsnqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXVqdGJ6dWtzYmJ3YWxzbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzIxNTMsImV4cCI6MjA4ODE0ODE1M30.sRsVsNfkLNYXH1ipBPl8svZCKdqYP3cfVsaE5qO5FiM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('email, role');

  if (error) {
    console.error('Erro:', error);
    return;
  }
  console.log('Users:', JSON.stringify(data));
}

listUsers();
