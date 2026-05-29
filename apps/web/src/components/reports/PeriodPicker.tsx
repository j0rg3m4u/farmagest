'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReportPreset, ReportFilters } from '@/hooks/use-reports';

interface PeriodPickerProps {
  value: ReportFilters;
  onChange: (f: ReportFilters) => void;
}

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'last_30_days', label: '30 dias' },
  { value: 'last_60_days', label: '60 dias' },
  { value: 'last_90_days', label: '90 dias' },
  { value: 'this_year', label: 'Este ano' },
];

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  function selectPreset(preset: ReportPreset) {
    if (preset === 'custom') {
      setShowCustom(true);
      onChange({ ...value, preset: 'custom' });
    } else {
      setShowCustom(false);
      onChange({ ...value, preset, dateFrom: undefined, dateTo: undefined });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => selectPreset(p.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            value.preset === p.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => selectPreset('custom')}
        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
          value.preset === 'custom'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
        }`}
      >
        Personalizado
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <div>
            <Label className="text-xs text-slate-500">De</Label>
            <Input
              type="date"
              value={value.dateFrom ?? ''}
              onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
              className="h-7 text-xs w-36"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Até</Label>
            <Input
              type="date"
              value={value.dateTo ?? ''}
              onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
              className="h-7 text-xs w-36"
            />
          </div>
        </div>
      )}
    </div>
  );
}
