import * as ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
  align?: 'left' | 'right' | 'center';
}

export interface ExcelReportConfig {
  title: string;
  sheetName: string;
  filters?: string[];
  generatedBy?: string;
  generatedAt?: Date;
  columns: ExcelColumn[];
  rows: Record<string, string | number | null>[];
  summaryRows?: Record<string, string | number | null>[];
}

const BLUE_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid',
  fgColor: { argb: 'FF1D4ED8' },
};
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' },
};
const TOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid',
  fgColor: { argb: 'FFE2E8F0' },
};

export async function generateExcelReport(config: ExcelReportConfig): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = config.generatedBy ?? 'FarmaGest';
  wb.created = config.generatedAt ?? new Date();

  const ws = wb.addWorksheet(config.sheetName.slice(0, 31));

  // Linha 1 — título
  ws.mergeCells(1, 1, 1, config.columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = config.title;
  titleCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
  titleCell.fill = BLUE_FILL;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 22;

  // Linha 2 — filtros (se houver)
  let dataStartRow = 3;
  if (config.filters?.length) {
    ws.mergeCells(2, 1, 2, config.columns.length);
    const filterCell = ws.getCell(2, 1);
    filterCell.value = `Filtros: ${config.filters.join(' | ')}`;
    filterCell.font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
    filterCell.alignment = { horizontal: 'center' };
    dataStartRow = 4;
  }

  if (config.generatedBy) {
    ws.mergeCells(dataStartRow - 1, 1, dataStartRow - 1, config.columns.length);
    const genCell = ws.getCell(dataStartRow - 1, 1);
    genCell.value = `Gerado por: ${config.generatedBy} em ${config.generatedAt?.toLocaleString('pt-BR') ?? ''}`;
    genCell.font = { italic: true, size: 8, color: { argb: 'FF94A3B8' } };
    genCell.alignment = { horizontal: 'right' };
    dataStartRow++;
  }

  // Cabeçalho das colunas
  const headerRow = ws.getRow(dataStartRow);
  config.columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, size: 9 };
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: col.align ?? 'left', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF1D4ED8' } },
    };
    ws.getColumn(idx + 1).width = col.width;
  });
  headerRow.height = 16;

  // Dados
  config.rows.forEach((row, rowIdx) => {
    const wsRow = ws.getRow(dataStartRow + 1 + rowIdx);
    config.columns.forEach((col, colIdx) => {
      const cell = wsRow.getCell(colIdx + 1);
      cell.value = row[col.key] ?? null;
      cell.font = { size: 9 };
      cell.alignment = { horizontal: col.align ?? 'left' };
      if (col.numFmt) cell.numFmt = col.numFmt;
      if (rowIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  // Totais
  if (config.summaryRows?.length) {
    const totalStartRow = dataStartRow + 1 + config.rows.length + 1;
    config.summaryRows.forEach((row, rowIdx) => {
      const wsRow = ws.getRow(totalStartRow + rowIdx);
      config.columns.forEach((col, colIdx) => {
        const cell = wsRow.getCell(colIdx + 1);
        cell.value = row[col.key] ?? null;
        cell.font = { bold: true, size: 9 };
        cell.fill = TOTAL_FILL;
        cell.alignment = { horizontal: col.align ?? 'left' };
        if (col.numFmt) cell.numFmt = col.numFmt;
      });
    });
  }

  // Freeze header
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: dataStartRow, topLeftCell: `A${dataStartRow + 1}`, activeCell: 'A1' }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Simpler overload: auto-derives ExcelColumn[] from a string[] of headers
export async function generateExcelFromRows(opts: {
  title: string;
  sheetName: string;
  filters?: string[];
  generatedBy?: string;
  generatedAt?: Date;
  headers: string[];
  rows: Record<string, unknown>[];
  totalsRow?: Record<string, unknown>;
}): Promise<Buffer> {
  const columns: ExcelColumn[] = opts.headers.map((h) => ({
    header: h,
    key: h,
    width: Math.max(12, Math.min(40, h.length + 4)),
  }));

  const rows = opts.rows.map((r) =>
    Object.fromEntries(opts.headers.map((h) => [h, r[h] as string | number | null])),
  );

  const summaryRows = opts.totalsRow
    ? [Object.fromEntries(opts.headers.map((h) => [h, opts.totalsRow![h] as string | number | null]))]
    : [];

  return generateExcelReport({
    title: opts.title,
    sheetName: opts.sheetName,
    filters: opts.filters,
    generatedBy: opts.generatedBy,
    generatedAt: opts.generatedAt,
    columns,
    rows,
    summaryRows,
  });
}
