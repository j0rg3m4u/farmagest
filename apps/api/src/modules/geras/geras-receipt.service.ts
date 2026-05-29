import { Injectable, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GerasReceiptService {
  constructor(private prisma: PrismaService) {}

  async generateReceipt(geraId: string): Promise<Buffer> {
    const gera = await this.prisma.gera.findFirst({
      where: { id: geraId, deletedAt: null },
      include: {
        unit: { select: { id: true, name: true } },
        registeredBy: { select: { id: true, name: true } },
        items: {
          include: {
            item: { select: { id: true, code: true, description: true } },
            sector: { select: { id: true, name: true } },
            lot: { select: { id: true, lotNumber: true, expirationDate: true } },
            triagedBy: { select: { id: true, name: true } },
          },
          orderBy: { externalCode: 'asc' },
        },
      },
    });

    if (!gera) throw new NotFoundException('GERA não encontrado');

    const fmtDate = (d: Date | string | null | undefined) =>
      d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    const fmtDateTime = (d: Date | string | null | undefined) =>
      d
        ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        : '—';
    const fmtNum = (n: string | number | null | undefined) => {
      if (n == null) return '—';
      return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
    };

    const approvedItems = gera.items.filter((i) => i.status === 'APPROVED');
    const deniedItems = gera.items.filter((i) => i.status === 'DENIED');

    // Agrupar por setor
    const sectorGroups = approvedItems.reduce<Record<string, typeof approvedItems>>(
      (acc, item) => {
        const key = item.sector?.name ?? 'Sem setor';
        (acc[key] ??= []).push(item);
        return acc;
      },
      {},
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 100;
      const gray = '#64748b';
      const dark = '#1e293b';
      const green = '#16a34a';
      const red = '#dc2626';
      const divider = () => doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke('#e2e8f0');

      // ─── Cabeçalho ────────────────────────────────────────────────────────────
      doc
        .fontSize(10)
        .fillColor(gray)
        .text('SECRETARIA MUNICIPAL DE SAÚDE — DEPARTAMENTO DE FARMÁCIA E INSUMOS ESTRATÉGICOS', { align: 'center' })
        .moveDown(0.4);

      doc
        .fontSize(18)
        .fillColor(dark)
        .font('Helvetica-Bold')
        .text('COMPROVANTE DE ATENDIMENTO DE PEDIDO', { align: 'center' })
        .moveDown(0.3);

      doc
        .fontSize(20)
        .fillColor('#1d4ed8')
        .text(gera.code, { align: 'center' })
        .moveDown(0.6);

      doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).lineWidth(2).stroke('#1d4ed8');
      doc.moveDown(0.6);

      // ─── Info do pedido ───────────────────────────────────────────────────────
      doc.font('Helvetica').fontSize(10).fillColor(dark);

      const infoRows: [string, string][] = [
        ['Nº do Pedido original:', gera.externalNumber ?? '—'],
        ['Unidade Solicitante:', gera.unit?.name ?? '—'],
        ['Data do pedido:', fmtDateTime(gera.requestedAt)],
        ['Prazo de entrega:', fmtDate(gera.deadline)],
        ['Responsável pelo atendimento:', gera.registeredBy?.name ?? '—'],
        ['Data do atendimento:', fmtDateTime(new Date())],
        ['Status:', gera.status],
      ];

      for (const [label, value] of infoRows) {
        doc
          .font('Helvetica-Bold')
          .text(label, 50, doc.y, { continued: true, width: 200 })
          .font('Helvetica')
          .text(` ${value}`)
          .moveDown(0.15);
      }

      doc.moveDown(0.6);
      divider();
      doc.moveDown(0.6);

      // ─── Por setor ───────────────────────────────────────────────────────────
      for (const [sectorName, sectorItems] of Object.entries(sectorGroups)) {
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(dark)
          .text(`ITENS ATENDIDOS — ${sectorName.toUpperCase()}`)
          .moveDown(0.4);

        // Cabeçalho da tabela
        const cols = { code: 50, ext: 120, desc: 190, sol: 390, env: 440, lot: 490 };
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(gray)
          .text('Cód.', cols.code)
          .text('Cód.Ext.', cols.ext, doc.y - 8)
          .text('Descrição', cols.desc, doc.y - 8)
          .text('Solic.', cols.sol, doc.y - 8)
          .text('Enviado', cols.env, doc.y - 8)
          .text('Lote', cols.lot, doc.y - 8)
          .moveDown(0.3);

        doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).stroke('#cbd5e1');
        doc.moveDown(0.2);

        for (const gi of sectorItems) {
          const isPartial = gi.approved && Number(gi.approved) < Number(gi.requested);
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(dark)
            .text(gi.item?.code ?? '—', cols.code, doc.y, { width: 65 })
            .text(gi.externalCode ?? '—', cols.ext, doc.y - 8, { width: 65 })
            .text((gi.item?.description ?? gi.description).substring(0, 35), cols.desc, doc.y - 8, { width: 195 })
            .text(fmtNum(Number(gi.requested)), cols.sol, doc.y - 8, { width: 45, align: 'right' })
            .fillColor(isPartial ? '#d97706' : green)
            .text(fmtNum(gi.approved ? Number(gi.approved) : null), cols.env, doc.y - 8, { width: 45, align: 'right' })
            .fillColor(gray)
            .text(gi.lot?.lotNumber ?? '—', cols.lot, doc.y - 8, { width: 80 })
            .moveDown(0.15);

          if (doc.y > doc.page.height - 80) doc.addPage();
        }

        doc.moveDown(0.4);
        divider();
        doc.moveDown(0.6);
      }

      // ─── Itens negados ───────────────────────────────────────────────────────
      if (deniedItems.length > 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(red)
          .text('ITENS NEGADOS')
          .moveDown(0.4);

        for (const gi of deniedItems) {
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(dark)
            .text(
              `${gi.item?.code ?? '—'}  ${gi.externalCode ?? ''}  ${(gi.item?.description ?? gi.description).substring(0, 50)}  — Motivo: ${gi.denialReason ?? '—'}`,
            )
            .moveDown(0.2);
        }

        doc.moveDown(0.4);
        divider();
        doc.moveDown(0.6);
      }

      // ─── Totais ───────────────────────────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(dark)
        .text(`TOTAL ATENDIDO: ${approvedItems.length} tipo(s) de material`)
        .text(`TOTAL NEGADO: ${deniedItems.length} item(ns)`)
        .moveDown(1.5);

      // ─── Assinaturas ──────────────────────────────────────────────────────────
      const mid = 50 + W / 2;
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(gray)
        .moveTo(50, doc.y).lineTo(200, doc.y).stroke()
        .moveTo(mid + 20, doc.y).lineTo(mid + 170, doc.y).stroke()
        .moveDown(0.3)
        .text('DPTO de Farmácia e Insumos Estratégicos', 50, doc.y, { width: 180, align: 'center' })
        .text('Responsável Pelo Recebimento', mid + 20, doc.y - 10, { width: 180, align: 'center' });

      // ─── Rodapé ───────────────────────────────────────────────────────────────
      doc
        .moveDown(1.5)
        .fontSize(7)
        .fillColor(gray)
        .text(
          `Gerado pelo FarmaGest em ${fmtDateTime(new Date())} | ${gera.code}`,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
