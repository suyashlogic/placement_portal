// Quotes a value so commas, quotes and line breaks cannot break the file
const quote = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// columns: [{ header: 'Company', value: 'companyName' }  or  { header: 'Rate', value: (row) => row.rate + '%' }]
export const toCsv = (columns, rows) =>
  [
    columns.map((c) => quote(c.header)).join(','),
    ...rows.map((row) => columns.map((c) => quote(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(',')),
  ].join('\r\n');

// Teaches: creating a file in the browser. A Blob holds the text, a temporary URL points to it,
// and a hidden link click starts the download. The leading \ufeff lets Excel read the rupee sign correctly.
export const downloadCsv = (filename, columns, rows) => {
  const blob = new Blob(['\ufeff' + toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
