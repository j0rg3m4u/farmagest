# FarmaGest — Pacote de contexto para desenvolvimento

Este diretório contém todo o contexto necessário para o **Claude Code** desenvolver o sistema FarmaGest. A ideia é simples: você abre o VSCode no seu monorepo, copia este pacote pra raiz dele, e o Claude Code consulta tudo automaticamente quando você pede pra implementar algo.

## Estratégia: monorepo único com pnpm workspaces

```
farmagest/                                    ← repo único no GitHub
├── .claude/                                  ← este pacote vai aqui
│   └── skills/
│       ├── farmagest-context/SKILL.md        # contexto geral + regras de negócio
│       ├── nestjs-backend/SKILL.md           # padrões do backend
│       ├── nextjs-frontend/SKILL.md          # padrões do frontend
│       └── shared-types/SKILL.md             # padrões do pacote compartilhado
├── prompts/
│   └── sprint-0-setup.md                     # prompt da Sprint 0 (atual)
├── docs/
│   ├── visao-produto.md                      # visão de produto resumida
│   ├── arquitetura.md                        # arquitetura técnica + monorepo
│   ├── modelo-dados.md                       # schema Prisma completo + tipos no shared
│   └── identidade-visual.md                  # paleta, tipografia, padrões visuais
├── apps/                                     ← criado pelo Claude Code na Sprint 0
│   ├── api/                                  # backend NestJS
│   └── web/                                  # frontend Next.js
├── packages/                                 ← criado pelo Claude Code na Sprint 0
│   └── shared/                               # tipos compartilhados
├── package.json                              # root, pnpm workspaces
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
└── README.md
```

## Como usar

### Setup inicial (antes da Sprint 0)

1. Crie o diretório do projeto:
   ```bash
   mkdir -p ~/projetos/farmagest && cd ~/projetos/farmagest
   ```

2. Descompacte este pacote dentro dele. A estrutura final deve ficar:
   ```
   farmagest/
   ├── .claude/skills/...
   ├── prompts/...
   ├── docs/...
   └── README.md
   ```

3. Abra o VSCode:
   ```bash
   code .
   ```

### Iniciar a Sprint 0

No Claude Code dentro do VSCode, mande:

> "Leia o arquivo `prompts/sprint-0-setup.md` e execute as tarefas. Vamos passo a passo — me confirme antes de cada tarefa principal."

Ele vai consultar automaticamente:
- `.claude/skills/farmagest-context/SKILL.md` para entender o domínio
- `.claude/skills/nestjs-backend/SKILL.md` para padrões do back
- `.claude/skills/nextjs-frontend/SKILL.md` para padrões do front
- `.claude/skills/shared-types/SKILL.md` para padrões do pacote compartilhado
- `docs/*.md` para detalhes específicos

E executar tudo seguindo os padrões certos.

### Próximas sprints

Cada sprint terá seu próprio prompt em `prompts/`. O próximo a ser criado é `sprint-1-auth-cadastros.md` (será gerado quando você terminar a Sprint 0).

## Roadmap

| Sprint | Foco | Duração | Status |
|---|---|---|---|
| 0 | Setup monorepo, infra, primeiro deploy | 1 sem | 🎯 Atual |
| 1 | Auth + Usuários + Unidades | 2 sem | Aguardando |
| 2 | Itens + Lotes + Importação | 2 sem | Aguardando |
| 3 | Movimentação + Painel de estoque | 3 sem | Aguardando |
| 4 | Triagem + Ciclo de pedido | 3 sem | Aguardando |
| 5 | Relatórios + Painel executivo | 2 sem | Aguardando |
| 6 | QA + Treinamento + Go-live | 2 sem | Aguardando |

**Total: 15 semanas (~4 meses)**.

## Princípios gerais

- **Validar antes de avançar:** cada sprint termina com deploy em homologação para o cliente testar.
- **Não over-engineer:** simples > clever. Otimização vem depois de funcionar.
- **Tipos no shared:** se um tipo é usado em mais de um app, vai pra `@farmagest/shared`.
- **Auditável por padrão:** todo endpoint que modifica dados gera AuditLog.
- **TypeScript estrito** em todos os pacotes.
- **Acessibilidade:** WCAG AA mínimo.

## Cliente

- **Nome:** Marylyn (Coordenadora de Correlatos da Secretaria Municipal de Saúde)
- **Município:** Duque de Caxias / RJ
- **E-mail:** macedo.mry@gmail.com

## Workflow recomendado

1. Leia `docs/visao-produto.md` antes de começar (5 minutos).
2. Confirme acesso aos pré-requisitos da Sprint 0 (GitHub, Railway, DNS, Node 20, pnpm).
3. Abra o Claude Code e mande executar `prompts/sprint-0-setup.md`.
4. Ao final, valide pelo checklist e me avise para gerarmos o prompt da Sprint 1.

## Manutenção deste pacote

Se ao longo do desenvolvimento alguma decisão técnica mudar (ex: troca de biblioteca, ajuste de regra de negócio):

1. Atualize o SKILL.md ou doc relevante.
2. Faça commit junto com a mudança de código.
3. Garante que o Claude Code sempre tem a versão mais atual do contexto.

## Decisões importantes já tomadas

- **Monorepo com pnpm workspaces** (não dois repos separados)
- **NestJS** no backend (não Next.js fullstack)
- **Validação com Zod** em ambos os lados (não class-validator)
- **JWT** stateless (não session com cookie no backend)
- **Hospedagem no Railway**, 1 projeto, 3 ambientes
- **Subdomínio `farmagest.nodelab.com.br`** inicialmente (migrar pra domínio próprio depois se o sistema decolar)
