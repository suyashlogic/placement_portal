// Vertical columns (a histogram) drawn as SVG. The viewBox scales it to any width.
// data: [{ label, value }]
function ColumnChart({ data, height = 190, color = '#4f46e5', ariaLabel = 'Column chart', emptyText = 'No data yet' }) {
  if (data.length === 0) return <div className="text-muted small py-3">{emptyText}</div>;

  const W = 520, H = height, padL = 8, padR = 8, padT = 18, padB = 34;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = (W - padL - padR) / data.length;
  const barW = Math.min(slot * 0.72, 54);
  const plotH = H - padT - padB;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-100" role="img" aria-label={ariaLabel}>
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="#cbd5e1" />
      {data.map((d, i) => {
        const barH = (d.value / max) * plotH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = H - padB - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 0)} rx="3" fill={color}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="#475569">{d.value}</text>
            <text x={x + barW / 2} y={H - padB + 14} textAnchor="middle" fontSize="9.5" fill="#64748b">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
export default ColumnChart;
