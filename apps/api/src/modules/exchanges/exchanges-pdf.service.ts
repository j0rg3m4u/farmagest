import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ExchangesPdfService {
  constructor(private prisma: PrismaService) {}

  async generatePdf(exchangeId: string): Promise<Buffer> {
    const exchange = await this.prisma.exchange.findFirst({
      where: { id: exchangeId, deletedAt: null },
      include: {
        partner: true,
        sector: true,
        createdBy: true,
        outputs: {
          include: {
            item: { select: { code: true, description: true } },
            lot: { select: { lotNumber: true, expirationDate: true } },
          },
        },
        inputs: {
          include: {
            item: { select: { code: true, description: true } },
            lot: { select: { lotNumber: true, expirationDate: true } },
          },
        },
      },
    });

    if (!exchange) throw new NotFoundException('Troca não encontrada');

    const totalOutput = exchange.outputs.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalInput = exchange.inputs.reduce((s, i) => s + Number(i.subtotal), 0);
    const diff = Math.abs(totalOutput - totalInput);
    const base = Math.max(totalOutput, totalInput);
    const diffPct = base > 0 ? (diff / base) * 100 : 0;
    const isBalanced = diffPct <= Number(exchange.tolerancePct);

    const hashContent = `${exchange.code}|${exchange.partnerId}|${totalOutput}|${totalInput}|${exchange.createdAt.toISOString()}`;
    const hash = createHash('sha256').update(hashContent).digest('hex').substring(0, 16);

    const R = (v: number) =>
      v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d: Date | null | undefined) =>
      d ? new Date(d).toLocaleDateString('pt-BR') : '—';

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;
      const LINE = '═'.repeat(80);

      // ─── Cabeçalho ───────────────────────────────────────────────────────────
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('ACORDO DE TROCA INTER-MUNICIPAL', { align: 'center' });
      doc
        .fontSize(14)
        .text(exchange.code, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(LINE, { align: 'center' });
      doc.moveDown(0.5);

      // ─── Informações da troca ────────────────────────────────────────────────
      const info = [
        ['Município proponente', 'Duque de Caxias / RJ'],
        ['Município parceiro', `${exchange.partner.name}`],
        ['Data', fmtDate(exchange.date)],
        ['Setor responsável', exchange.sector.name],
        ['Responsável', exchange.createdBy.name],
      ];

      for (const [label, value] of info) {
        doc
          .font('Helvetica-Bold')
          .text(`${label}: `, { continued: true })
          .font('Helvetica')
          .text(value);
      }

      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('JUSTIFICATIVA:');
      doc.font('Helvetica').text(exchange.justification);
      doc.moveDown(0.5);
      doc.fontSize(10).text(LINE, { align: 'center' });

      // ─── Itens enviados ───────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('ITENS ENVIADOS POR DUQUE DE CAXIAS');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');

      const colW = [60, 160, 80, 50, 60, 60];
      const headers = ['Cód.', 'Descrição', 'Lote', 'Qtd', 'V.Un.', 'Subtotal'];

      let x = 50;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x, doc.y, { width: colW[i], lineBreak: false });
        x += colW[i];
      }
      doc.moveDown(0.5);

      for (const output of exchange.outputs) {
        x = 50;
        const row = [
          output.item.code,
          output.item.description.substring(0, 28),
          output.lot?.lotNumber ?? '—',
          Number(output.quantity).toFixed(2),
          R(Number(output.unitValue)),
          R(Number(output.subtotal)),
        ];
        const y = doc.y;
        for (let i = 0; i < row.length; i++) {
          doc.text(row[i], x, y, { width: colW[i], lineBreak: false });
          x += colW[i];
        }
        doc.moveDown(0.4);
      }

      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').text(`TOTAL ENVIADO: R$ ${R(totalOutput)}`);
      doc.fontSize(10).font('Helvetica').text(LINE, { align: 'center' });

      // ─── Itens recebidos ─────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('ITENS RECEBIDOS POR DUQUE DE CAXIAS');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');

      const colW2 = [160, 90, 70, 50, 55, 55];
      const headers2 = ['Descrição', 'Lote', 'Validade', 'Qtd', 'V.Un.', 'Subtotal'];

      x = 50;
      for (let i = 0; i < headers2.length; i++) {
        doc.text(headers2[i], x, doc.y, { width: colW2[i], lineBreak: false });
        x += colW2[i];
      }
      doc.moveDown(0.5);

      for (const input of exchange.inputs) {
        x = 50;
        const lotNumber = input.lot?.lotNumber ?? input.declaredLotNumber ?? '—';
        const exp = input.lot?.expirationDate ?? input.declaredExpiration;
        const row = [
          input.item.description.substring(0, 28),
          lotNumber,
          exp ? fmtDate(new Date(exp)) : '—',
          Number(input.quantity).toFixed(2),
          R(Number(input.unitValue)),
          R(Number(input.subtotal)),
        ];
        const y = doc.y;
        for (let i = 0; i < row.length; i++) {
          doc.text(row[i], x, y, { width: colW2[i], lineBreak: false });
          x += colW2[i];
        }
        doc.moveDown(0.4);
      }

      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').text(`TOTAL RECEBIDO: R$ ${R(totalInput)}`);
      doc.fontSize(10).font('Helvetica').text(LINE, { align: 'center' });

      // ─── Balanço ─────────────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold');
      const balanceIcon = isBalanced ? '[OK]' : '[ATENCAO]';
      doc.text(
        `BALANCO: ${balanceIcon}  R$ ${R(diff)} (${diffPct.toFixed(2)}% de variacao)`,
      );
      doc.fontSize(9).font('Helvetica').text(
        isBalanced
          ? `Dentro da tolerancia acordada de ${exchange.tolerancePct}%`
          : `FORA da tolerancia de ${exchange.tolerancePct}% — requer revisao`,
      );
      doc.fontSize(10).text(LINE, { align: 'center' });

      // ─── Assinaturas ─────────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('ASSINATURAS');
      doc.moveDown(1);

      doc.fontSize(9).font('Helvetica');
      doc.text('_'.repeat(50));
      doc.text(`Duque de Caxias — ${exchange.createdBy.name}`);
      doc.text(`Setor: ${exchange.sector.name}`);
      doc.text('Data: ___/___/______');
      doc.moveDown(1.5);

      doc.text('_'.repeat(50));
      doc.text(`${exchange.partner.name} — ${exchange.partner.responsibleName}`);
      doc.text('Data: ___/___/______');
      doc.fontSize(10).text(LINE, { align: 'center' });

      // ─── Rodapé ───────────────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#666666');
      const now = new Date().toLocaleString('pt-BR');
      doc.text(
        `Documento gerado pelo FarmaGest em ${now}`,
        { align: 'center' },
      );
      doc.text(
        `Identificador: ${exchange.code} / Hash: ${hash}`,
        { align: 'center' },
      );

      doc.end();
    });
  }
}
