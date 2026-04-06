const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bmiujtbzuksbbwalsnqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXVqdGJ6dWtzYmJ3YWxzbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzIxNTMsImV4cCI6MjA4ODE0ODE1M30.sRsVsNfkLNYXH1ipBPl8svZCKdqYP3cfVsaE5qO5FiM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalPromotion() {
  const email = 'meubarbeiroapp@outlook.com';
  
  // 1. Encontrar o usuário ignorando maiúsculas/minúsculas
  const { data: users, error: findError } = await supabase
    .from('users')
    .select('id, email')
  
  if (findError) {
    console.error('Erro ao buscar usuários:', findError);
    return;
  }

  const target = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!target) {
    console.error(`Usuário ${email} não encontrado.`);
    return;
  }

  // 2. Forçar cargo e remover tenant_id
  const { data, error } = await supabase
    .from('users')
    .update({ 
        role: 'SUPER_ADMIN',
        tenant_id: null 
    })
    .eq('id', target.id)
    .select();

  if (error) {
    console.error('Erro na atualização final:', error);
  } else {
    console.log('✅ PROMOÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('Usuário:', data[0].email);
    console.log('Novo Cargo:', data[0].role);
    console.log('Tenant ID:', data[0].tenant_id);
  }
}

finalPromotion();
