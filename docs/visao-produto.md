# FarmaGest — Visão de Produto

## O que é

Sistema web para a **Secretaria Municipal de Saúde de Duque de Caxias** controlar o estoque e a distribuição de medicamentos e correlatos para suas unidades de saúde.

## Para quem é

| Perfil | Quem | O que faz |
|---|---|---|
| **Coordenação** | Marylyn (cliente) | Faz triagem, aprova movimentações, vê relatórios |
| **Administrativo** | Equipe de almoxarifado | Lança entradas (notas fiscais) |
| **Auxiliares** | Equipe operacional | Separam fisicamente conforme triagem |
| **Unidade** | Responsáveis nas UBS/UPAs | Solicitam abastecimento, dão baixa nos consumos |

## Problema central

Frase da cliente: **"estoque totalmente furado"**. Causas:

1. Quem controla entradas/saídas é uma equipe diferente da Coordenação → descompasso
2. Sem controle de lote nem validade de nenhum item
3. Sem relatórios para gestão
4. Processo usa planilha Excel + folha de papel circulando entre equipes

## O que o sistema entrega

### Funcionalidades MVP

**Cadastros:**
- Itens (medicamentos e correlatos) com flag 344/98
- Lotes com data de validade
- Unidades de saúde
- Usuários (4 perfis)

**Movimentação:**
- Entrada (NF de compra)
- Saída (atendimento de pedido)
- Ajuste de estoque
- Histórico completo por item

**Pedidos (substituindo a "folha de papel"):**
- Solicitação pela unidade
- Triagem pela Coordenação
- Separação pelos Auxiliares
- Atendimento gera saída automática

**Visualização:**
- Painel inicial executivo (home)
- Painel de estoque (zerado / crítico / ok)
- Alertas de validade próxima (30/60/90 dias)

**Relatórios (os 3 explicitamente pedidos pela cliente):**
- Saída por unidade
- Consolidado de todas as unidades
- Consumo médio diário e mensal

### Funcionalidades fora do MVP

NÃO implementar sem consulta:
- Módulo SNGPC para medicamentos 344/98 (Fase 2)
- Pedidos formais de municípios vizinhos (Fase 2)
- Integração com "sistema da prefeitura" (Fase 2)
- Dashboard executivo separado para Secretária (Fase 2)
- App mobile (Futuro)
- IA / previsão de demanda (Futuro)

## Critérios de sucesso

Em 6 meses de operação real, o sistema deve ter:

1. Eliminado a planilha Excel atual do processo
2. Zero divergências entre saldo do sistema e contagem física da Marylyn
3. Os 3 relatórios sendo gerados mensalmente sem dor
4. Lote e validade controlados em 100% das movimentações
5. A Marylyn conseguindo responder qualquer pergunta sobre estoque sem consultar terceiros

## Riscos altos

- **Resistência política:** o Administrativo perde escopo de responsabilidade. Precisa de patrocínio do nível acima da Marylyn.
- **Conectividade nas unidades:** se não tiverem internet estável, não dão baixa, e o sistema fica defasado.

## Stack

- **Estrutura:** monorepo único com pnpm workspaces
- **Backend (`apps/api`):** NestJS + Prisma + PostgreSQL
- **Frontend (`apps/web`):** Next.js 15 + Tailwind + shadcn/ui
- **Tipos compartilhados (`packages/shared`):** TypeScript + Zod
- **Hospedagem:** Railway (3 ambientes)
- **URL produção:** `farmagest.nodelab.com.br`

## Identidade visual

Baseada na Prefeitura Municipal de Duque de Caxias — azul institucional `#1F3864` + dourado `#FAC775`. Detalhes em `docs/identidade-visual.md`.
