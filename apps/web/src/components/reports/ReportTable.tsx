'use client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface ReportTableProps {
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
  excludeKeys?: (key: string) => boolean;
  maxRows?: number;
}

export function ReportTable({ rows, totals, excludeKeys, maxRows }: ReportTableProps) {
  if (!rows.length) return <p className="text-sm text-slate-500 py-8 text-center">Nenhum registro encontrado.</p>;

  const visibleRows = maxRows ? rows.slice(0, maxRows) : rows;
  const headers = Object.keys(rows[0]).filter((k) => !excludeKeys?.(k) && !k.startsWith('_'));

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            {headers.map((h) => (
              <TableHead key={h} className="text-xs font-semibold text-slate-600 whitespace-nowrap px-3 py-2">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row, i) => (
            <TableRow key={i} className="hover:bg-slate-50/50">
              {headers.map((h) => (
                <TableCell key={h} className="text-xs text-slate-700 px-3 py-1.5 whitespace-nowrap">
                  {String(row[h] ?? '—')}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {totals && (
            <TableRow className="bg-slate-100 font-semibold border-t-2 border-slate-300">
              {headers.map((h) => (
                <TableCell key={h} className="text-xs text-slate-800 px-3 py-2 whitespace-nowrap">
                  {String(totals[h] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
      {maxRows && rows.length > maxRows && (
        <p className="text-xs text-slate-500 text-center py-2 border-t border-slate-200">
          Mostrando {maxRows} de {rows.length} registros. Exporte para ver todos.
        </p>
      )}
    </div>
  );
}
