# Documento de Requisitos de Produto (PRD) - MeuBarbeiro

## 1. Visão Geral do Produto
O **MeuBarbeiro** é uma plataforma SaaS (Software as a Service) mobile-first projetada para a gestão completa de barbearias. O sistema centraliza agendamentos, controle de estoque, fluxo financeiro e gestão de clientes, permitindo que donos de barbearias e barbeiros independentes otimizem suas operações e aumentem sua produtividade.

---

## 2. Objetivos do Produto
- **Eficiência Operacional:** Simplificar o processo de agendamento e checkout.
- **Transparência Financeira:** Oferecer uma fonte única de verdade para todas as transações (agendamentos e vendas de produtos).
- **Controle de Inventário:** Automatizar a baixa de estoque e alertar sobre níveis baixos.
- **Escalabilidade SaaS:** Suportar múltiplos tenants (lojas) com isolamento de dados e permissões específicas.

---

## 3. Público-Alvo
- **Donos de Barbearias:** Gestores que precisam de visão macro do negócio, faturamento e estoque.
- **Barbeiros:** Profissionais que precisam gerenciar sua agenda diária e produtividade.
- **Clientes Finais:** Usuários que buscam facilidade para agendar serviços (via web app).

---

## 4. Requisitos Funcionais

### 4.1. Gestão de Agenda e Agendamentos
- Visualização de agenda diária/semanal por barbeiro.
- Criação, edição e cancelamento de agendamentos.
- Alteração de status (Pendente, Confirmado, Finalizado).
- **Checkout em 1-Clique:** Finalização rápida de agendamentos simples diretamente pela agenda.

### 4.2. PDV (Ponto de Venda) e Checkout
- Modal de checkout centralizado.
- Venda de serviços e produtos em uma única transação.
- Aplicação de descontos e seleção de forma de pagamento.
- Integração com fluxo financeiro para registro automático de receitas.

### 4.3. Gestão de Estoque
- Cadastro de produtos com variações (ex: tamanho, tipo).
- Controle de estoque mínimo com alertas visuais.
- Baixa automática de estoque no momento da venda (PDV).
- Histórico de entradas e saídas.

### 4.4. Gestão de Clientes
- Cadastro completo de clientes (nome, telefone, histórico).
- Histórico unificado de agendamentos e compras por cliente.
- Busca inteligente e preenchimento automático em agendamentos/vendas.

### 4.5. Dashboard e Relatórios
- Métricas em tempo real: Conversão de agendamentos, Receita Total, Ticket Médio.
- Filtros por período (Hoje, Semana, Mês).
- Gráficos de desempenho por barbeiro e categoria de produto.

### 4.6. Planos e Assinaturas (SaaS)
- **Tiers de Serviço:** ESSENTIAL, PROFESSIONAL, PREMIUM.
- **Funcionalidades por Plano:**
  - **WhatsApp:** Notificações automáticas para clientes.
  - **Inventário:** Controle total de produtos e variações.
  - **Relatórios:** Visão analítica de faturamento e desempenho.
  - **Cartão Digital:** Cartão de fidelidade virtual para clientes.
  - **Multi-filial:** Gestão de múltiplas unidades (exclusivo para Premium).
- **Gestão de Assinaturas:** Integração com Cakto para renovações automáticas e controle de status (Ativo, Expirado, Suspenso).

### 4.7. Multi-tenancy e Segurança
- Isolamento de dados por `shop_id` (tenant).
- Níveis de acesso: Admin (Dono), Barbeiro (Operador) e Super Admin (Plataforma).
- Autenticação via Supabase Auth.

---

## 5. Requisitos Não Funcionais

### 5.1. Segurança
- **Políticas de RLS (Row Level Security):** Garantir que usuários acessem apenas dados de sua própria loja.
- **Validação de Webhooks:** Verificação rigorosa de assinaturas em integrações de pagamento (ex: Cakto).

### 5.2. Performance
- Carregamento rápido de modais core (Checkout, Cadastro).
- Consultas otimizadas para dashboard para evitar múltiplas queries sequenciais.
- Uso de RPCs (Remote Procedure Calls) no banco de dados para transações complexas (ex: processSale).

### 5.3. Interface e UX
- Design mobile-first com foco em usabilidade rápida (poucos cliques).
- Consistência visual em componentes de feedback (Empty States, Badges, Modais).
- Suporte a PWA (Progressive Web App).

---

## 6. Stack Tecnológica
- **Frontend:** React, Vite, TypeScript.
- **Estilização:** Tailwind CSS / CSS Nativo.
- **Backend/Banco de Dados:** Supabase (PostgreSQL, Edge Functions, Realtime).
- **Pagamentos:** Integração via Webhooks (Cakto).

---

## 7. Roadmap e Melhorias Futuras
1. **Fase 1 (Segurança):** Tornar obrigatória a verificação de assinatura em webhooks.
2. **Fase 2 (Performance):** Migrar lógica de venda para RPC SQL para garantir atomicidade.
3. **Fase 3 (Funcionalidades):** Implementar sistema de fidelidade para clientes e notificações push para agendamentos.
4. **Fase 4 (Análise):** Implementar visualização de gráficos avançados de retenção de clientes.
