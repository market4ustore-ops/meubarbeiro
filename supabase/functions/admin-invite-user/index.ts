
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

        const { email, password, name, role, tenant_id } = await req.json();

        if (!email) throw new Error('Email is required');
        if (!password && req.method !== 'PATCH') throw new Error('Password is required for new users');

        // Criar usuário diretamente (sem convite por email)
        const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Confirma o email automaticamente
            user_metadata: {
                name,
                role,
                tenant_id,
                status: 'OFFLINE'
            }
        });

        if (createError) {
            console.error('Error creating user:', createError);
            if (createError.message.includes('already been registered')) {
                return new Response(
                    JSON.stringify({ error: 'Este email já está cadastrado no sistema.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }
            throw createError;
        }

        // O trigger public.handle_new_user cuidará da inserção na tabela public.users

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Membro cadastrado com sucesso.',
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
