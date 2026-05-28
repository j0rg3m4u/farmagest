'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [20, 50, 100];

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  function handlePageInputBlur() {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      onPageChange(n);
    } else {
      setPageInput(String(page));
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 pt-3 text-sm text-slate-500">
      {/* Info */}
      <span className="shrink-0">
        Mostrando <span className="font-medium text-slate-700">{from}–{to}</span> de{' '}
        <span className="font-medium text-slate-700">{total}</span> registros
      </span>

      {/* Controles centrais */}
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={15} />
        </Button>

        {totalPages > 5 ? (
          <div className="flex items-center gap-1.5">
            <Input
              className="w-14 h-8 text-center text-sm"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputBlur}
              onKeyDown={(e) => e.key === 'Enter' && handlePageInputBlur()}
            />
            <span className="text-slate-400">/ {totalPages}</span>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={p === page ? 'default' : 'ghost'}
                className={`h-8 w-8 p-0 text-xs ${p === page ? 'bg-pmdc-blue hover:bg-pmdc-blue-dark text-white' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ))}
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={15} />
        </Button>
      </div>

      {/* Itens por página */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-slate-400">por página:</span>
        {LIMIT_OPTIONS.map((l) => (
          <button
            key={l}
            onClick={() => { onLimitChange(l); onPageChange(1); }}
            className={`text-xs px-2 py-0.5 rounded ${
              l === limit
                ? 'bg-pmdc-blue text-white font-medium'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
