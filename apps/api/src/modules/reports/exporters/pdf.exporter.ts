// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface PdfColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface PdfReportConfig {
  title: string;
  subtitle?: string;
  filters: string[];
  generatedBy: string;
  generatedAt: Date;
  columns: PdfColumn[];
  rows: Array<Record<string, unknown>>;
  totals?: Record<string, unknown>;
}

const GRAY = '#64748b';
const DARK = '#1e293b';
const BLUE = '#1d4ed8';
const HEADER_BG = '#f1f5f9';

function fmtDate(d: Date) {
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export async function generatePdfReport(config: PdfReportConfig): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 80;
    let pageNum = 0;

    function addHeader() {
      pageNum++;
      doc
        .fontSize(8)
        .fillColor(GRAY)
        .text('SECRETARIA MUNICIPAL DE SAÚDE — DEPARTAMENTO DE FARMÁCIA E INSUMOS ESTRATÉGICOS', 40, 30, { align: 'center', width: W })
        .moveDown(0.3)
        .fontSize(14)
        .fillColor(DARK)
        .font('Helvetica-Bold')
        .text(config.title, { align: 'center', width: W })
        .moveDown(0.2);

      if (config.subtitle) {
        doc.fontSize(9).font('Helvetica').fillColor(GRAY).text(config.subtitle, { align: 'center', width: W }).moveDown(0.2);
      }

      if (config.filters.length) {
        doc.fontSize(8).fillColor(GRAY).text(`Filtros: ${config.filters.join(' | ')}`, { align: 'center', width: W }).moveDown(0.3);
      }

      doc.moveTo(40, doc.y).lineTo(40 + W, doc.y).lineWidth(1.5).stroke(BLUE);
      doc.moveDown(0.5);
    }

    function addTableHeader(y: number) {
      let x = 40;
      doc.rect(40, y, W, 14).fill(HEADER_BG);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK);
      for (const col of config.columns) {
        doc.text(col.header, x + 2, y + 3, {
          width: col.width - 4,
          align: col.align ?? 'left',
          lineBreak: false,
        });
        x += col.width;
      }
      return y + 14;
    }

    addHeader();
    let rowY = addTableHeader(doc.y);

    doc.font('Helvetica').fontSize(7);

    for (let i = 0; i < config.rows.length; i++) {
      const row = config.rows[i];
      const rowH = 12;

      if (rowY + rowH > doc.page.height - 50) {
        doc.addPage();
        addHeader();
        rowY = addTableHeader(doc.y);
      }

      if (i % 2 === 0) {
        doc.rect(40, rowY, W, rowH).fill('#f8fafc');
      }

      let x = 40;
      doc.fillColor(DARK);
      for (const col of config.columns) {
        const val = String(row[col.header] ?? '—');
        doc.text(val, x + 2, rowY + 2.5, {
          width: col.width - 4,
          align: col.align ?? 'left',
          lineBreak: false,
        });
        x += col.width;
      }

      doc.moveTo(40, rowY + rowH).lineTo(40 + W, rowY + rowH).lineWidth(0.3).stroke('#e2e8f0');
      rowY += rowH;
    }

    // Linha de totais
    if (config.totals) {
      if (rowY + 14 > doc.page.height - 50) {
        doc.addPage();
        addHeader();
        rowY = doc.y;
      }
      doc.rect(40, rowY, W, 14).fill('#e2e8f0');
      let x = 40;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(DARK);
      for (const col of config.columns) {
        const val = String(config.totals[col.header] ?? '');
        doc.text(val, x + 2, rowY + 3, {
          width: col.width - 4,
          align: col.align ?? 'left',
          lineBreak: false,
        });
        x += col.width;
      }
      rowY += 14;
    }

    // Rodapé
    doc
      .fontSize(7)
      .fillColor(GRAY)
      .text(
        `Gerado por ${config.generatedBy} em ${fmtDate(config.generatedAt)} | FarmaGest — Pág. ${pageNum}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: W },
      );

    doc.end();
  });
}
