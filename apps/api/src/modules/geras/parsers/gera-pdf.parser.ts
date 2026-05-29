// eslint-disable-next-line @typescript-eslint/no-require-imports
const _pdfParseMod = require('pdf-parse');
// pdf-parse v2 is an ES module with CJS shim — the function lives at .default
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> =
  typeof _pdfParseMod === 'function' ? _pdfParseMod : _pdfParseMod.default;

export interface GeraHeaderParsed {
  externalNumber: string | null;
  requestedAt: Date | null;
  expectedDelivery: Date | null;
  deadline: Date | null;
  type: string | null;
  unitName: string | null;
}

export interface GeraItemParsed {
  externalCode: string;
  description: string;
  declaredBalance: number | null;
  consumption: number | null;
  requested: number;
}

export interface GeraPdfResult {
  header: GeraHeaderParsed;
  items: GeraItemParsed[];
  rawText: string;
  errors: string[];
}

// Regex para data/hora do cabeçalho: "28/05/2026 - 11:11:00" ou "28/05/2026"
function parseBrDateTime(s: string): Date | null {
  const dt = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s*[-–]?\s*(\d{2}):(\d{2})/);
  if (dt) {
    return new Date(`${dt[3]}-${dt[2]}-${dt[1]}T${dt[4]}:${dt[5]}:00.000Z`);
  }
  const d = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (d) {
    return new Date(`${d[3]}-${d[2]}-${d[1]}T00:00:00.000Z`);
  }
  return null;
}

function parseBrNumber(s: string): number | null {
  if (!s || s.trim() === '' || s.trim() === '-') return null;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function parseHeader(lines: string[]): GeraHeaderParsed {
  const header: GeraHeaderParsed = {
    externalNumber: null,
    requestedAt: null,
    expectedDelivery: null,
    deadline: null,
    type: null,
    unitName: null,
  };

  for (const line of lines.slice(0, 40)) {
    // Nº do pedido: "Pedido Nº: 5810" ou "Nº do Pedido: 5810"
    const numMatch = line.match(/(?:pedido\s*n[°o]?|n[°o]\s*do\s*pedido)[:\s]+(\d+)/i);
    if (numMatch) header.externalNumber = numMatch[1];

    // Data/hora de solicitação
    const solMatch = line.match(/(?:solicita[çc][aã]o|solicitado)[:\s]+(.+)/i);
    if (solMatch) header.requestedAt = parseBrDateTime(solMatch[1]);

    // Previsão de entrega
    const prevMatch = line.match(/previs[aã]o[:\s]+(.+)/i);
    if (prevMatch) header.expectedDelivery = parseBrDateTime(prevMatch[1]);

    // Prazo
    const prazoMatch = line.match(/prazo[:\s]+(.+)/i);
    if (prazoMatch) header.deadline = parseBrDateTime(prazoMatch[1]);

    // Tipo de pedido
    const tipoMatch = line.match(/tipo[:\s]+(mensal|extraordin[aá]rio|urgente)/i);
    if (tipoMatch) header.type = tipoMatch[1];

    // Unidade
    const unitMatch = line.match(/(?:unidade|estabelecimento)[:\s]+(.+)/i);
    if (unitMatch) header.unitName = unitMatch[1].trim();
  }

  return header;
}

// Regex para linha de item do GERA
// Formato esperado: CÓDIGO  DESCRIÇÃO  SALDO  CONSUMO  GERADO  ENVIADO
// Exemplos: "MAT-1  Abaixador...  420  800  382  "
// Codigo pode ser MAT-1, MED-80, SAN-6, MAT369 (sem hifen)
const ITEM_LINE_RE = /^((?:MAT|MED|SAN|COR|mat|med|san|cor)[-\s]?\d+)\s+(.+?)\s+([\d,.]+|-)\s+([\d,.]+|-)\s+([\d,.]+)\s*([\d,.]*)\s*$/i;

function parseItems(lines: string[]): { items: GeraItemParsed[]; errors: string[] } {
  const items: GeraItemParsed[] = [];
  const errors: string[] = [];
  const headerPattern = /^(?:c[oó]d|descri[çc][aã]o|saldo|consumo|gerado|enviado)/i;
  const pageFooterPattern = /(?:página|pagina|\d+\s*de\s*\d+|\d{2}\/\d{2}\/\d{4})/i;

  let pendingCode: string | null = null;
  let pendingDesc: string[] = [];

  function flush(nums: string) {
    if (!pendingCode) return;
    const parts = nums.trim().split(/\s+/);
    const saldo = parseBrNumber(parts[0] ?? '');
    const consumo = parseBrNumber(parts[1] ?? '');
    const gerado = parseBrNumber(parts[2] ?? '');
    if (gerado == null || gerado <= 0) {
      pendingCode = null;
      pendingDesc = [];
      return;
    }
    items.push({
      externalCode: pendingCode,
      description: pendingDesc.join(' ').trim(),
      declaredBalance: saldo,
      consumption: consumo,
      requested: gerado,
    });
    pendingCode = null;
    pendingDesc = [];
  }

  for (const line of lines) {
    if (!line.trim() || headerPattern.test(line) || pageFooterPattern.test(line)) continue;

    const match = ITEM_LINE_RE.exec(line);
    if (match) {
      flush('');  // flush any pending without numbers (won't emit)
      const code = match[1].replace(/\s/, '-').toUpperCase();
      const descRaw = match[2];
      const numsStr = `${match[3]} ${match[4]} ${match[5]}`;
      const saldo = parseBrNumber(match[3]);
      const consumo = parseBrNumber(match[4]);
      const gerado = parseBrNumber(match[5]);
      if (gerado != null && gerado > 0) {
        items.push({
          externalCode: code,
          description: descRaw.trim(),
          declaredBalance: saldo,
          consumption: consumo,
          requested: gerado,
        });
      }
      continue;
    }

    // Linha que começa com código mas sem números (descrição longa quebrada)
    const codeOnly = line.match(/^((?:MAT|MED|SAN|COR)[-\s]?\d+)\s+(.*)/i);
    if (codeOnly) {
      flush('');
      pendingCode = codeOnly[1].replace(/\s/, '-').toUpperCase();
      pendingDesc = [codeOnly[2]];
      continue;
    }

    // Continuação de descrição longa + números no final
    if (pendingCode) {
      const numsAtEnd = line.match(/^(.+?)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s*[\d,.]*\s*$/);
      if (numsAtEnd) {
        pendingDesc.push(numsAtEnd[1]);
        const saldo = parseBrNumber(numsAtEnd[2]);
        const consumo = parseBrNumber(numsAtEnd[3]);
        const gerado = parseBrNumber(numsAtEnd[4]);
        if (gerado != null && gerado > 0) {
          items.push({
            externalCode: pendingCode,
            description: pendingDesc.join(' ').trim(),
            declaredBalance: saldo,
            consumption: consumo,
            requested: gerado,
          });
        }
        pendingCode = null;
        pendingDesc = [];
      } else {
        pendingDesc.push(line.trim());
      }
    }
  }

  return { items, errors };
}

export async function parseGeraPdf(buffer: Buffer): Promise<GeraPdfResult> {
  const data = await pdfParse(buffer);
  const rawText = data.text;
  const lines = rawText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  const header = parseHeader(lines);

  // Encontrar início da lista de pedido
  const listStart = lines.findIndex(
    (l: string) => /lista\s*de\s*pedido/i.test(l) || /itens\s*do\s*pedido/i.test(l),
  );

  const itemLines = listStart >= 0 ? lines.slice(listStart + 1) : lines;
  const { items, errors } = parseItems(itemLines);

  return { header, items, rawText, errors };
}
