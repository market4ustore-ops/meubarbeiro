const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bmiujtbzuksbbwalsnqu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXVqdGJ6dWtzYmJ3YWxzbnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzIxNTMsImV4cCI6MjA4ODE0ODE1M30.sRsVsNfkLNYXH1ipBPl8svZCKdqYP3cfVsaE5qO5FiM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteToSuperAdmin() {
  const emailToFind = 'meubarbeiroapp@outlook.com';
  
  const { data: usersFound, error: findError } = await supabase
    .from('users')
    .select('id, email, role');

  if (findError) {
    console.error('Erro ao buscar:', findError);
    return;
  }

  const target = usersFound.find(u => u.email.toLowerCase() === emailToFind.toLowerCase());

  if (target) {
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ role: 'SUPER_ADMIN' })
      .eq('id', target.id)
      .select();

    if (updateError) {
      console.error('Erro ao atualizar:', updateError);
    } else {
      console.log(`Sucesso! O usuário ${target.email} agora é SUPER_ADMIN.`);
    }
  } else {
    console.log(`Usuário ${emailToFind} NÃO encontrado no banco.`);
    console.log('E-mails cadastrados:', usersFound.map(u => u.email));
  }
}

promoteToSuperAdmin();
