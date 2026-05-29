'use client';
import { PageHeader } from '@/components/shared/PageHeader';
import { PeriodPicker } from './PeriodPicker';
import { ExportButton } from './ExportButton';
import type { ReportFilters } from '@/hooks/use-reports';

interface ReportPageProps {
  title: string;
  description?: string;
  apiPath: string;
  pdfFilename: string;
  excelFilename: string;
  filters: ReportFilters;
  onFiltersChange: (f: ReportFilters) => void;
  showPeriodPicker?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  extraFilters?: React.ReactNode;
}

export function ReportPage({
  title,
  description,
  apiPath,
  pdfFilename,
  excelFilename,
  filters,
  onFiltersChange,
  showPeriodPicker = true,
  isLoading,
  children,
  extraFilters,
}: ReportPageProps) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="flex gap-2">
            <ExportButton path={apiPath} filters={filters} filename={excelFilename} format="excel" />
            <ExportButton path={apiPath} filters={filters} filename={pdfFilename} format="pdf" />
          </div>
        }
      />

      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        {showPeriodPicker && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Período</p>
            <PeriodPicker value={filters} onChange={onFiltersChange} />
          </div>
        )}
        {extraFilters}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {!isLoading && children}
    </div>
  );
}
