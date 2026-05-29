'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { downloadReport } from '@/hooks/use-reports';
import { toast } from 'sonner';
import type { ReportFilters } from '@/hooks/use-reports';

interface ExportButtonProps {
  path: string;
  filters: ReportFilters;
  filename: string;
  format: 'pdf' | 'excel';
  label?: string;
}

export function ExportButton({ path, filters, filename, format, label }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      await downloadReport(path, { ...filters, format }, filename);
    } catch {
      toast.error('Erro ao exportar relatório');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
      {label ?? (format === 'pdf' ? 'PDF' : 'Excel')}
    </Button>
  );
}
