import type { ReactNode } from "react";
import { BrandedSpinner } from "./branding/BrandedSpinner";
import { EmptyState, type EmptyStateIcon } from "./branding/EmptyState";
import { useTranslation } from "../hooks/use-translation";

export interface DataTableColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[] | undefined;
  isLoading: boolean;
  emptyMessage: string;
  emptyIcon?: EmptyStateIcon;
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderActions?: (row: T) => ReactNode;
  /** Alternating row backgrounds for easier scanning on wide/dense tables. */
  striped?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage,
  emptyIcon,
  getRowKey,
  onRowClick,
  renderActions,
  striped = false,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const columnCount = columns.length + (renderActions ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 tabular-nums dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900/40">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
              {renderActions && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  {t("Actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading && (
              <tr>
                <td className="px-4 py-8" colSpan={columnCount}>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <BrandedSpinner className="h-4 w-4" />
                    {t("Loading...")}
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && (!data || data.length === 0) && (
              <tr>
                <td className="px-4" colSpan={columnCount}>
                  <EmptyState message={emptyMessage} icon={emptyIcon} />
                </td>
              </tr>
            )}
            {data?.map((row, index) => (
              <tr
                key={getRowKey(row)}
                className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                  striped && index % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/20" : ""
                } ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`px-4 py-3 text-sm text-slate-600 dark:text-slate-300 ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
                {renderActions && (
                  <td
                    className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1">{renderActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
