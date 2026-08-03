import { ReactNode } from 'react';

interface TableProps {
  columns: string[];
  children?: ReactNode;
}

export function Table({ columns, children }: TableProps) {
  return (
    <div className="neumorphic-card responsive-table overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg/60">
            {columns.map((col) => (
            <th key={col} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
