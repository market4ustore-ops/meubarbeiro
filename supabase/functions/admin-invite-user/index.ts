
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

        const resendApiKey = Deno.env.get('RESEND_API_KEY');

        const { email, password, name, role, tenant_id } = await req.json();

        if (!email) throw new Error('Email is required');
        if (!password && req.method !== 'PATCH') throw new Error('Password is required for new users');

        // 1. Criar usuário diretamente (sem convite por email padrão do Supabase)
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

        // 2. Enviar email de boas-vindas via Resend (se a API Key estiver configurada)
        if (resendApiKey && authData.user) {
            try {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${resendApiKey}`,
                    },
                    body: JSON.stringify({
                        from: 'MeuBarbeiro <no-reply@meubarbeiro.com>', // TODO: Ajustar para o seu domínio validado
                        to: [email],
                        subject: 'Bem-vindo ao MeuBarbeiro!',
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                                <h1 style="color: #10b981; margin-bottom: 24px;">Olá, ${name}!</h1>
                                <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                                    Você foi adicionado à equipe no <strong>MeuBarbeiro</strong>.
                                </p>
                                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                                    <p style="margin: 0; font-size: 14px; color: #64748b;">Suas credenciais de acesso:</p>
                                    <p style="margin: 8px 0 0 0; font-size: 16px; color: #1e293b;"><strong>E-mail:</strong> ${email}</p>
                                    <p style="margin: 4px 0 0 0; font-size: 16px; color: #1e293b;"><strong>Senha:</strong> ${password}</p>
                                </div>
                                <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                                    Você já pode acessar o sistema e começar a gerenciar seus agendamentos:
                                </p>
                                <a href="https://meubarbeiro.com/#/login" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">
                                    Acessar Painel
                                </a>
                                <hr style="margin: 32px 0; border: 0; border-top: 1px solid #e2e8f0;" />
                                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                                    Este é um e-mail automático. Por favor, não responda.
                                </p>
                            </div>
                        `,
                    }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    console.error('Error sending email via Resend:', errorData);
                }
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
            }
        }

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
