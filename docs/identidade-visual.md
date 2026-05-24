# Identidade Visual — Padrão Duque de Caxias

## Paleta de cores

Inspirada na identidade visual oficial da Prefeitura Municipal de Duque de Caxias.

### Cores institucionais

| Token | Hex | Uso |
|---|---|---|
| `pmdc.blue.DEFAULT` | `#1F3864` | Cor primária — botões, sidebar, headers, links |
| `pmdc.blue.dark` | `#152A4F` | Hover de botões primários |
| `pmdc.blue.light` | `#2C4F8C` | Variação suave |
| `pmdc.blue.soft` | `#E6EBF4` | Fundos sutis (highlight de seleção) |
| `pmdc.gold.DEFAULT` | `#FAC775` | Destaque — item ativo no menu, avatar |

### Cores de status (estoque e operação)

| Token | Hex | Uso |
|---|---|---|
| `status.danger.DEFAULT` | `#A32D2D` | Texto/ícone de itens zerados, alertas críticos |
| `status.danger.bg` | `#FCEBEB` | Fundo de badge danger |
| `status.warning.DEFAULT` | `#854F0B` | Texto/ícone de itens críticos, próximos do vencimento |
| `status.warning.bg` | `#FAEEDA` | Fundo de badge warning |
| `status.success.DEFAULT` | `#3B6D11` | Texto/ícone de estoque ok, ações bem-sucedidas |
| `status.success.bg` | `#EAF3DE` | Fundo de badge success |
| `status.info.DEFAULT` | `#185FA5` | Texto/ícone de informações neutras |
| `status.info.bg` | `#E6F1FB` | Fundo de badge info |

### Cinzas neutros (Slate do Tailwind)

Usar a paleta `slate-*` padrão. Equivalências relevantes:
- Texto principal: `slate-900` (#0F172A)
- Texto secundário: `slate-500` (#64748B)
- Texto auxiliar: `slate-700` (#334155)
- Bordas: `slate-200` (#E2E8F0)
- Fundos: `slate-50` (#F8FAFC) e `slate-100` (#F1F5F9)

## Tipografia

A Prefeitura usa as fontes Equip e Geometria. Como são proprietárias, no FarmaGest usamos **Inter** (web-safe, sans-serif geométrica equivalente).

### Hierarquia

| Nível | Classe Tailwind | Tamanho | Peso |
|---|---|---|---|
| H1 (página) | `text-2xl font-semibold` | 24px | 600 |
| H2 (seção) | `text-lg font-semibold` | 18px | 600 |
| H3 (subseção) | `text-base font-semibold` | 16px | 600 |
| Corpo | `text-sm` | 14px | 400 |
| Auxiliar | `text-xs text-slate-500` | 12px | 400 |
| Label tabela | `text-xs uppercase tracking-wide text-slate-500 font-medium` | 11px | 500 |

Fonte monoespaçada (códigos de item, lote): **JetBrains Mono**.

## Logo e marca

### Nome do produto

**FarmaGest**

Sempre escrito assim, com F e G maiúsculos. Sem espaço.

### Selo institucional

Em todo lugar que faça sentido contextualizar o sistema (login, sidebar, capa de relatório):

**PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS**

Em caixa alta, espaçamento `tracking-wider`, tamanho pequeno (`text-[10px]` ou `text-xs`).

### Logo provisório

Enquanto não tivermos a marca oficial digitalizada da Prefeitura:
- Ícone genérico (lucide-react: `Pill`, `Beaker`, `FlaskConical`)
- Em um quadrado arredondado azul (`bg-pmdc-blue rounded-xl`)
- Tamanho 36x36 a 64x64 conforme contexto

Quando a marca oficial for disponibilizada pela Prefeitura, substituir.

## Componentes visuais padrão

### Botão primário
- `bg-pmdc-blue text-white hover:bg-pmdc-blue-dark`
- Padding: `px-4 py-2.5`
- Border radius: `rounded-lg`
- Font: `text-sm font-medium`

### Botão secundário (ghost)
- `bg-white text-slate-700 border border-slate-300 hover:bg-slate-50`

### Card
- `bg-white border border-slate-200 rounded-xl p-5`
- Sombra leve em hover (opcional): `hover:shadow-sm`

### Badge de status
- Padding: `px-2 py-1`
- Border radius: `rounded-md`
- Font: `text-xs font-medium`
- Cores conforme paleta de status

### Input
- `bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm`
- Focus: `outline-none ring-2 ring-pmdc-blue`

### Tabela
- Header: `bg-slate-50 text-xs uppercase tracking-wide text-slate-500 font-medium`
- Linhas: hover `bg-slate-50`, separador `border-b border-slate-100`

## Tom de voz da interface

- **Direto e profissional**, sem ser frio
- Mensagens de erro: específicas e acionáveis ("Não foi possível salvar o item. Verifique se o código não está duplicado.")
- Mensagens de sucesso: curtas ("Item cadastrado com sucesso")
- Confirmações de ação destrutiva: verbo no infinitivo ("Cancelar pedido?")
- Tratamento: terceira pessoa, formal mas natural

## Iconografia

Biblioteca: **lucide-react** (alinhada com shadcn/ui).

Ícones recorrentes:
- `Home` — painel inicial
- `Package` — itens / estoque
- `Truck` — entradas
- `ClipboardCheck` — triagem
- `Building2` — unidades
- `BarChart3` — relatórios
- `Users` — usuários
- `Settings` — configurações
- `Search`, `Filter`, `Plus`, `Edit`, `Check`, `X`, `AlertCircle`
- `ArrowUpRight` / `ArrowDownRight` — entrada/saída

Tamanho padrão: `size-4` (16px) inline, `size-5` (20px) em headers, `size-6` (24px) em destaques.

## Acessibilidade

- Contraste WCAG AA mínimo (azul `#1F3864` em branco passa AAA)
- Cor NUNCA é o único indicador (sempre tem texto ou ícone)
- Tamanho mínimo de fonte interativa: 14px
- Tamanho mínimo de alvo de toque: 44x44px
- Focus visível em todos os elementos interativos
- Suporte completo a navegação por teclado

## Espaçamento e ritmo

Seguir escala Tailwind padrão:
- Padding interno de cards: `p-5` ou `p-6`
- Gap entre elementos: `gap-3` (12px) ou `gap-4` (16px)
- Margin entre seções: `mb-6` (24px) ou `mb-8` (32px)
- Linha base de layout: `space-y-4`

## Referências externas

- Site institucional: https://duquedecaxias.rj.gov.br
- Manual de marca: https://duquedecaxias.rj.gov.br/pagina/servicos/identidade-visual
- Tabler Icons (alternativa): https://tabler.io/icons
