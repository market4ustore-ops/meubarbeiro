# Plano de Implementação: Notificações WhatsApp (Uazapi)

Implementar um sistema de notificações automatizadas via WhatsApp utilizando o provedor **Uazapi**, focado inicialmente em **novos agendamentos e pedidos realizados através da página pública**.

## 📋 Visão Geral
O objetivo é garantir que o **dono da barbearia** e o **barbeiro selecionado** recebam um alerta imediato no WhatsApp sempre que um cliente realizar uma reserva ou compra via link público do estabelecimento.

---

## 🛠️ Especificações Técnicas (Uazapi)

Baseado na documentação oficial (https://docs.uazapi.com/):

- **Autenticação**: Header `token` com o Instance Token.
- **Endpoint Principal**: `POST {base_url}/send/text`
- **Payload de Texto**:
  ```json
  {
    "number": "5511999999999",
    "text": "Sua mensagem aqui",
    "delay": 1200 // Opcional, em ms
  }
  ```

---

## 🏗️ Arquitetura de Implementação

### 1. Database & Configuração
As configurações globais do SaaS já estão preparadas na tabela `saas_whatsapp_config`.

- **Campos Utilizados**:
  - `api_url`: URL base da instância (ex: `https://instancia01.uazapi.com`).
  - `api_key`: O `token` da instância.
  - `is_active`: Flag global de ativação.

### 2. Service Layer ([lib/whatsapp_service.ts](file:///c:/Users/rafae/OneDrive/Documentos/meuBarbeiro/lib/whatsapp_service.ts))
O serviço atual já possui suporte básico. Vamos expandir para:
- **Formatação de Números**: Garantir o prefixo `55` (Brasil) e remover caracteres não numéricos.
- **Tratamento de Erros**: Implementar logs de falha no Supabase para auditoria.

### 3. Edge Functions (Automação)
Para evitar que o frontend dependa da conexão do WhatsApp para finalizar uma venda, usaremos **Supabase Edge Functions** disparadas por Triggers.

- **[NEW] `whatsapp-notifier` (Edge Function)**:
  - Recebe o payload do trigger.
  - Busca as credenciais na `saas_whatsapp_config`.
  - Dispara a chamada para a Uazapi.
- **Triggers**:
  - `on_appointment_insert`: Notifica o barbeiro de um novo agendamento.
  - `on_sale_confirm`: Envia o comprovante/resumo da venda para o cliente (se disponível) e para o dono.

---

## 🚀 Fluxo de Mensagens (Escopo Inicial)

### A. Novo Agendamento (Página Pública)
- **Origem**: Formulário de agendamento do cliente no link da barbearia.
- **Destinatários**: Dono (Tenant) e Barbeiro Responsável.
- **Mensagem**: 
  > "✂️ *Novo Agendamento via Site!* \n\n Cliente: {nome} \n Data: {data} \n Horário: {hora} \n Serviço: {servico} \n\n Verifique a agenda completa no app!"

### B. Novo Pedido de Produto (Página Pública)
- **Origem**: Carrinho de compras no link da barbearia.
- **Destinatários**: Dono (Tenant).
- **Mensagem**:
  > "🛍️ *Novo Pedido Recebido!* \n\n Cliente: {nome} \n Valor: R$ {total} \n Itens: {resumo_itens} \n\n Verifique o pedido no painel financeiro!"

---

## ✅ Plano de Verificação

### 1. Testes de Conexão
- Validar se o `token` e `api_url` salvos no painel Super Admin conseguem disparar uma mensagem de teste com sucesso.
- Verificar o status da instância via `GET /instance/status`.

### 2. Testes de Fluxo
1. Realizar um agendamento via link público.
2. Aguardar 30s e verificar se a mensagem chegou no WhatsApp configurado para o staff.
3. Finalizar uma venda no PDV e verificar se a mensagem de confirmação foi disparada.

### 3. Resiliência
- Simular instância offline na Uazapi e garantir que o erro não trave a transação no banco de dados (uso de `http` extension com `timeout` curto ou processamento assíncrono).

---

> [!IMPORTANT]
> **Segurança**: Nunca expor o `api_key` (token) no frontend para clientes finais. Todas as chamadas automatizadas devem passar por Edge Functions usando o `service_role`.
