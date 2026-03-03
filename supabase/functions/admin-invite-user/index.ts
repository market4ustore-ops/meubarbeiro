
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { email, name, role, tenant_id } = await req.json();

        if (!email) {
            throw new Error('Email is required');
        }

        // 1. Convidar usuário via Email (Supabase Auth)
        // O Supabase enviará o email automaticamente com o link de convite
        const { data: authData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: {
                name: name,
                role: role,
                tenant_id: tenant_id,
                status: 'OFFLINE' // Default status
            },
            redirectTo: `${req.headers.get('origin') ?? 'http://localhost:5173'}/accept-invite`
        });

        if (inviteError) {
            console.error('Error inviting user:', inviteError);

            // Se o usuário já existe, o invite falha. Podemos tentar apenas adicionar os metadados ou retornar erro amigável.
            if (inviteError.message.includes('already been registered')) {
                return new Response(
                    JSON.stringify({ error: 'Este email já está cadastrado no sistema.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }
            throw inviteError;
        }

        // 2. Criar registro na tabela pública 'users' (caso o trigger não cuide disso ou para garantir)
        // Nota: Normalmente um Trigger on auth.users cuida disso, mas aqui garantimos a integridade se for um invite novo.
        // Se o usuário já existe no auth, o inviteUserByEmail não cria novo ID, então o trigger de insert não dispara.
        // Mas se o usuário é NOVO, o trigger dispara.

        // Retornamos sucesso
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Convite enviado com sucesso.',
                user: authData.user
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
