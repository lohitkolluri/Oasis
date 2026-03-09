'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  label: string;
  width?: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = 'No data available',
  emptyIcon,
  className = '',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div
        className={`bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl px-5 py-14 text-center shadow-[0_0_20px_rgba(255,255,255,0.03)] ${className}`}
      >
        {emptyIcon && <div className="flex justify-center mb-3 text-[#3a3a3a]">{emptyIcon}</div>}
        <p className="text-sm text-[#666666]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#161616]/80 backdrop-blur border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.03)] ${className}`}
    >
      {/* Header */}
      <div
        className="px-5 py-3 border-b border-[#2d2d2d] grid gap-4"
        style={{ gridTemplateColumns: columns.map((c) => c.width ?? '1fr').join(' ') }}
      >
        {columns.map((col) => (
          <span
            key={col.key}
            className="text-[10px] font-medium text-[#666666] uppercase tracking-[0.1em]"
          >
            {col.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#2d2d2d]">
        {data.map((row, i) => (
          <motion.div
            key={'id' in row && typeof row.id === 'string' ? row.id : i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="px-5 py-4 grid gap-4 items-center hover:bg-[#1e1e1e] transition-colors"
            style={{ gridTemplateColumns: columns.map((c) => c.width ?? '1fr').join(' ') }}
          >
            {columns.map((col) => (
              <div key={col.key}>
                {col.render ? (
                  col.render(row)
                ) : (
                  <span className="text-sm text-[#9ca3af]">{String(row[col.key] ?? '—')}</span>
                )}
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
