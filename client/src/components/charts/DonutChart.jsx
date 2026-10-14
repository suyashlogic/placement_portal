// A ring split into coloured arcs, plus a legend. Each arc is a circle whose stroke-dasharray shows only
// part of its length: `${arcLength} ${restOfCircle}`, moved round the ring by stroke-dashoffset.
// data: [{ label, value, color }]
function DonutChart({ data, centerLabel = 'total', ariaLabel = 'Donut chart', emptyText = 'No data yet' }) {
  const parts = data.filter((d) => d.value > 0);
  const total = parts.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-muted small py-3">{emptyText}</div>;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let used = 0;

  return (
    <div className="d-flex flex-wrap align-items-center gap-4">
      <svg viewBox="0 0 100 100" style={{ width: 170, height: 170 }} role="img" aria-label={ariaLabel}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#eef2f7" strokeWidth="16" />
        {parts.map((d) => {
          const length = (d.value / total) * circumference;
          const offset = used;
          used += length;
          return (
            <circle key={d.label} cx="50" cy="50" r={radius} fill="none" stroke={d.color} strokeWidth="16"
              strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset}
              transform="rotate(-90 50 50)">
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          );
        })}
        <text x="50" y="49" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f2937">{total}</text>
        <text x="50" y="60" textAnchor="middle" fontSize="6" fill="#64748b">{centerLabel}</text>
      </svg>

      <ul className="list-unstyled mb-0 small flex-grow-1" style={{ minWidth: 150 }}>
        {parts.map((d) => (
          <li key={d.label} className="d-flex align-items-center mb-1">
            <span className="d-inline-block rounded-1 me-2" style={{ width: 10, height: 10, backgroundColor: d.color }}></span>
            <span className="flex-grow-1">{d.label}</span>
            <strong>{d.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
export default DonutChart;
