const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bmiujtbzuksbbwalsnqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXVqdGJ6dWtzYmJ3YWxzbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzIxNTMsImV4cCI6MjA4ODE0ODE1M30.sRsVsNfkLNYXH1ipBPl8svZCKdqYP3cfVsaE5qO5FiM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteToSuperAdmin() {
  const email = 'meubarbeiroapp@outlook.com';
  
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'SUPER_ADMIN' })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Erro ao promover usuário:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Sucesso! O usuário ${email} agora é SUPER_ADMIN.`);
  } else {
    console.log(`Usuário ${email} não encontrado na tabela public.users.`);
  }
}

promoteToSuperAdmin();
