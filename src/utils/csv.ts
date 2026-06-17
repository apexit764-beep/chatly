/**
 * Trigger a CSV download in the browser without any libs.
 * Usage:
 *   downloadCsv('contacts.csv', [
 *     { name: 'أحمد', phone: '...' },
 *     ...
 *   ]);
 */
export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers?: Array<{ key: keyof T; label: string }>
): void {
  if (!rows.length && !headers) return;
  const cols = headers ?? Object.keys(rows[0] ?? {}).map((k) => ({ key: k as keyof T, label: k }));
  const headerLine = cols.map((c) => csvEscape(String(c.label))).join(',');
  const dataLines = rows.map((r) =>
    cols.map((c) => csvEscape(String(r[c.key] ?? ''))).join(',')
  );
  // Prepend BOM for Excel to detect UTF-8 (important for Arabic)
  const bom = '﻿';
  const blob = new Blob([bom + [headerLine, ...dataLines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Open a printable HTML window for a given title + content.
 * Browser print dialog supports "Save as PDF".
 */
export function printAsPdf(title: string, htmlBody: string): void {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!doctype html><html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif; padding: 24px; color: #111827; }
    h1, h2, h3 { margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border-bottom: 1px solid #E5E7EB; padding: 8px 10px; text-align: start; font-size: 13px; }
    th { background: #F8F9FC; font-weight: 600; }
    .muted { color: #6B7280; font-size: 12px; }
    .right { text-align: end; }
    @media print { @page { margin: 12mm; } }
  </style>
</head>
<body>${htmlBody}</body></html>`);
  w.document.close();
  w.onload = () => {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 250);
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
