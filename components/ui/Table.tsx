import { ReactNode } from 'react';

interface TableProps {
  columns: string[];
  children?: ReactNode;
  mobileChildren?: ReactNode;
  label?: string;
}

export function Table({ columns, children, mobileChildren, label = 'Data table' }: TableProps) {
  return (
    <div className="neumorphic-card min-w-0">
      <div className="hidden min-w-0 md:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{label}</caption>
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
      {mobileChildren && <div className="grid gap-3 p-3 md:hidden" aria-label={`${label} mobile view`}>{mobileChildren}</div>}
    </div>
  );
}
