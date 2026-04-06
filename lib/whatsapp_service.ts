import { supabase } from './supabase';

export type WhatsAppProvider = 'ZAVU' | 'EVOLUTION' | 'UAZAPI';

interface WhatsAppConfig {
  provider: WhatsAppProvider;
  is_active: boolean;
  api_url?: string;
  api_key: string;
  instance_id: string;
  template_name?: string;
}

export const WhatsAppService = {
  /**
   * Obtém a configuração global de WhatsApp do SaaS
   */
  async getConfig(): Promise<WhatsAppConfig | null> {
    const { data, error } = await supabase
      .from('saas_whatsapp_config')
      .select('*')
      .single();

    if (error || !data) return null;
    return data as WhatsAppConfig;
  },

  /**
   * Envia uma notificação central de WhatsApp para Barbeiro e/ou Dono
   */
  async notifyStaff({
    tenantId,
    barberId,
    message,
    type = 'info'
  }: {
    tenantId: string;
    barberId?: string;
    message: string;
    type?: 'booking' | 'order' | 'info';
  }) {
    const config = await this.getConfig();
    if (!config || !config.is_active) {
      console.warn('[WhatsAppService] Notificações desativadas ou sem configuração.');
      return;
    }

    // 1. Buscar Telefone do Dono (Tenant)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('phone, name')
      .eq('id', tenantId)
      .single();

    // 2. Buscar Telefone do Barbeiro (se aplicável)
    let barberPhone = null;
    if (barberId) {
      const { data: barber } = await supabase
        .from('users')
        .select('phone')
        .eq('id', barberId)
        .single();
      barberPhone = barber?.phone;
    }

    const recipients = [tenant?.phone];
    if (barberPhone && barberPhone !== tenant?.phone) {
        recipients.push(barberPhone);
    }

    // Limpar números vázios e duplicados
    const validRecipients = [...new Set(recipients.filter(p => !!p))];

    for (const phone of validRecipients) {
        try {
            await this.sendRawMessage(config, phone, message);
        } catch (err) {
            console.error(`[WhatsAppService] Erro ao enviar para ${phone}:`, err);
        }
    }
  },

  async sendRawMessage(config: WhatsAppConfig, phone: string, message: string) {
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Adicionar código do Brasil se o telefone tiver 10 ou 11 dígitos (ex: 11999999999)
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = `55${cleanPhone}`;
    }

    // Suporte para Evolution API (Texto Livre)
    if (config.provider === 'EVOLUTION') {
        if (!config.api_url) throw new Error('URL da Evolution API não configurada.');
        
        await fetch(`${config.api_url}/message/sendText/${config.instance_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.api_key
            },
            body: JSON.stringify({
                number: cleanPhone,
                text: message
            })
        });
    }
    // Suporte para Uazapi (Texto Livre)
    else if (config.provider === 'UAZAPI') {
        if (!config.api_url) throw new Error('URL da Uazapi não configurada.');
        
        await fetch(`${config.api_url}/send/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': config.api_key
            },
            body: JSON.stringify({
                number: cleanPhone,
                text: message,
                delay: 2 // Opcional: pequeno delay para segurança
            })
        });
    }
    // Suporte para Zavu (Official Template)
    else if (config.provider === 'ZAVU') {
        const url = 'https://api.zavu.dev/v1/messages';
        
        // No Zavu Oficial, enviamos via template. 
        // Para simplificar a automação SaaS, usamos o template cadastrado.
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.api_key}`
            },
            body: JSON.stringify({
                recipient: cleanPhone,
                sender: config.instance_id,
                type: 'template',
                template: {
                    name: config.template_name || 'notificacao_barbearia',
                    language: { code: 'pt_BR' },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: message } // Passamos a mensagem formatada para a variável {{1}} do template
                            ]
                        }
                    ]
                }
            })
        });
    }
  }
};
