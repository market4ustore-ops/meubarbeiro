# Relatório de Diagnóstico Técnico e Auditoria QA

Este relatório apresenta uma auditoria técnica profunda do ecossistema MeuBarbeiro, focando em segurança, performance, padronização e débito técnico.

## 1. Sumário Executivo

A saúde geral do código é **Estável, mas com Focos Críticos**. O sistema possui uma arquitetura moderna baseada em Supabase e React, porém apresenta sinais de crescimento rápido que resultaram em débitos técnicos significativos, especialmente em tipagem e segurança de fluxos financeiros. A vulnerabilidade mais crítica encontra-se na integração de pagamentos (Webhooks), que pode ser explorada para forjar assinaturas.

---

## 2. Tabela de Achados

| Arquivo/Linha | Problema | Impacto | Severidade | Status |
| :--- | :--- | :--- | :--- | :--- |
| `supabase/functions/cakto-webhook/index.ts:88` | **Vulnerabilidade Crítica**: Pula verificação de assinatura se secret estiver ausente. | Segurança | **Crítica** | Aberto |
| `lib/supabase.ts` (Múltiplas) | **Débito Técnico**: Uso excessivo de `as any` (Typing Debt). | Manutenibilidade | **Alta** | Aberto |
| `lib/supabase.ts:497` | **Performance/Atomicidade**: Loop de atualização de estoque via client-side. | Integridade de Dados | **Alta** | Aberto |
| `lib/supabase.ts:200` | **Performance**: `getDashboardStats` realiza 6+ queries sequenciais independentes. | Experiência / Custo | **Média** | Aberto |
| `AgendaPage.tsx`, `ClientsPage.tsx` | **Redundância (DRY)**: Lógica de fetch de dados duplicada nas páginas. | Débito Técnico | **Média** | Aberto |
| `supabase/functions/...` | **Qualidade**: `console.log` em logs de produção / Webhooks. | Observabilidade | **Baixa** | Aberto |

---

## 3. Detalhamento dos Pontos Críticos

### 3.1 Vulnerabilidade no Webhook (Cakto)
A lógica atual permite que, se a variável de ambiente `CAKTO_WEBHOOK_SECRET` não for configurada corretamente, o sistema aceite qualquer payload como válido. Isso permite que um atacante simule pagamentos aprovados.
*   **Recomendação**: Tornar a verificação de assinatura obrigatória (`throw error` se secret ausente).

### 3.2 Débito de Tipagem (`as any`)
O uso de `as any` anula os benefícios do TypeScript e esconde quebras de contrato do banco de dados. Isso foi causado por discrepâncias entre o `database.types.ts` e as interfaces manuais.
*   **Recomendação**: Refatorar as interfaces em `types.ts` para herdar diretamente de `Database['public']['Tables'][T]['Row']`.

### 3.3 Falta de Atomicidade no `processSale`
A baixa de estoque em loop pode falhar no meio do processo, deixando o estoque inconsistente (ex: debitou o produto A mas falhou no B).
*   **Recomendação**: Mover a lógica de `processSale` para uma **Database Function (RPC)** com transação SQL nativa.

---

## 4. Plano de Refatoração Sugerido

### Fase 1: Segurança Imediata (Prioridade 1)
1.  Corrigir o Webhook da Cakto para exigir assinatura.
2.  Validar permissões de RLS para a tabela `financial_transactions` (Garantir que um usuário não possa editar transações de outro tenant).

### Fase 2: Performance e Integridade (Prioridade 2)
1.  Implementar RPC `process_sale_v2` para lidar com Baixa de Estoque + Transação Financeira + Status de Agendamento em uma única transação.
2.  Agrupar métricas do dashboard em uma view materializada ou RPC otimizado.

### Fase 3: Padronização (Prioridade 3)
1.  Eliminar `as any` do `lib/supabase.ts`.
2.  Centralizar fetches de clientes e agendamentos exclusivamente via helpers em `lib/supabase.ts`.
