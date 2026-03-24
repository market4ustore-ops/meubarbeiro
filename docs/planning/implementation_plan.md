# Plano de Implementação: Notificações Push PWA

Implementar um sistema de notificações push robusto para o PWA, focado em alertar os barbeiros/donos sobre novas vendas e novos agendamentos, garantindo que a aplicação permaneça estável.

## User Review Required

> [!IMPORTANT]
> A implementação requer a geração de chaves VAPID (Public/Private), que devem ser configuradas como segredos no Supabase.
> As notificações dependerão de permissão explícita do usuário no navegador.

## Proposed Changes

### [Database & Backend]

#### [NEW] [push_subscriptions_table.sql](file:///c:/Users/rafae/OneDrive/Documentos/meuBarbeiro/supabase/migrations/20260324120000_push_subscriptions.sql)
- Criar a tabela `push_subscriptions` para armazenar as credenciais de push de cada usuário.
- Campos: `id`, `user_id`, `subscription` (JSONB), `created_at`.
- Habilitar RLS para que usuários só gerenciem suas próprias inscrições.

#### [NEW] [notification_triggers.sql](file:///c:/Users/rafae/OneDrive/Documentos/meuBarbeiro/supabase/migrations/20260324130000_notification_triggers.sql)
- Funções de trigger para disparar notificações em:
  - `appointments` (INSERT)
  - `financial_transactions` (INSERT - apenas para novas vendas)
- Uso de `http` extension do Postgres para chamar a Edge Function de forma assíncrona (dentro de um bloco EXCEPTION para não travar a transação principal).

#### [NEW] [send-push-notification](file:///c:/Users/rafae/OneDrive/Documentos/meuBarbeiro/supabase/functions/send-push-notification/index.ts)
- Edge Function que recebe os dados da notificação.
- Busca as inscrições do usuário no banco.
- Envia os pushes usando a biblioteca `web-push`.

### [Frontend]

#### [MODIFY] [NotificationContext.tsx](file:///c:/Users/rafae/OneDrive/Documentos/meuBarbeiro/context/NotificationContext.tsx)
- Adicionar lógica para solicitar permissão de push.
- Enviar o objeto de inscrição (`PushSubscription`) para o Supabase.
- Gerenciar o estado de "Notificações Habilitadas".

#### [NEW] [sw.ts](file:///c:/Users/rafae/OneDrive/Documentos/meuBarbeiro/src/sw.ts)
- Service Worker customizado para:
  - Ouvir o evento `push`.
  - Exibir a notificação visual (`showNotification`).
  - Lidar com cliques (`notificationclick`) para abrir a página correta (Agenda ou Financeiro).

#### [MODIFY] [vite.config.ts](file:///c:/Users/rafae/OneDrive/Documentos/meuBarbeiro/vite.config.ts)
- Ajustar a configuração do `VitePWA` para usar o Service Worker customizado (`strategies: 'injectManifest'`).

### [UI Components]

#### [NEW] [PushNotificationToggle.tsx](file:///c:/Users/rafae/OneDrive/Documentos/meuBarbeiro/components/PushNotificationToggle.tsx)
- Botão/Toggle para o usuário ativar/desativar as notificações push.

## Verification Plan

### Automated Tests
- Criar scripts de teste no Postman ou via `curl` para disparar a Edge Function manualmente.
- Validar via logs do Supabase se o trigger está sendo disparado nos inserts de agendamentos.

### Manual Verification
1. **Ativação**: Entrar no app, clicar em "Ativar Notificações" e confirmar a permissão do navegador.
2. **Nova Venda**: Realizar uma "Venda Rápida" em uma aba/dispositivo e verificar se a notificação chega.
3. **Novo Agendamento**: Criar um agendamento via link público e verificar se o dono recebe o push.
4. **Resiliência**: Bloquear as notificações no navegador e garantir que as vendas/agendamentos continuem funcionando normalmente sem erros visíveis para o usuário.
