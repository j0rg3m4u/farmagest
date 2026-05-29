'use client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type ChartType = 'bar' | 'line' | 'pie';

interface ReportChartProps {
  type: ChartType;
  data: Record<string, unknown>[];
  xKey: string;
  series: Array<{ key: string; label: string; color?: string }>;
  height?: number;
  valueFormatter?: (v: number) => string;
}

const COLORS = ['#1d4ed8', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d'];

export function ReportChart({
  type,
  data,
  xKey,
  series,
  height = 220,
  valueFormatter,
}: ReportChartProps) {
  if (!data.length) return <p className="text-sm text-slate-500 text-center py-6">Sem dados para exibir.</p>;

  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString('pt-BR'));
  const tooltipFmt = (v: unknown) => fmt(Number(v));

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey={series[0].key} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={tooltipFmt} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
          <Tooltip formatter={tooltipFmt} />
          <Legend />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
        <Tooltip formatter={tooltipFmt} />
        <Legend />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? COLORS[i % COLORS.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
