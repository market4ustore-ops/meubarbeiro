
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

        // Detectar a origem (Vite/Produção)
        const origin = req.headers.get('origin') || req.headers.get('referer');
        const redirectTo = origin
            ? `${origin}/accept-invite`
            : `https://meubarbeiro.com/accept-invite`;

        const { data: authData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
            data: {
                name: name,
                role: role,
                tenant_id: tenant_id,
                status: 'OFFLINE'
            },
            redirectTo: redirectTo
        });

        if (inviteError) {
            console.error('Error inviting user:', inviteError);
            if (inviteError.message.includes('already been registered')) {
                return new Response(
                    JSON.stringify({ error: 'Este email já está cadastrado no sistema.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }
            throw inviteError;
        }

        // 2. Sincronização agora é feita via Trigger no banco de dados (public.handle_new_user)


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
