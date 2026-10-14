// A line with a soft area underneath, drawn as SVG.
// data: [{ label, value }]
function LineChart({ data, height = 210, color = '#4f46e5', ariaLabel = 'Line chart', emptyText = 'No data yet' }) {
  if (data.length === 0) return <div className="text-muted small py-3">{emptyText}</div>;

  const W = 520, H = height, padL = 34, padR = 12, padT = 14, padB = 30;
  const max = Math.max(1, Math.ceil(Math.max(...data.map((d) => d.value)) * 1.1));
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = H - padB;

  const x = (i) => padL + (data.length === 1 ? plotW / 2 : (i * plotW) / (data.length - 1));
  const y = (v) => padT + (1 - v / max) * plotH;

  const linePoints = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPath = `M ${x(0)},${baseY} L ${linePoints.split(' ').join(' L ')} L ${x(data.length - 1)},${baseY} Z`;
  const labelEvery = Math.ceil(data.length / 7);              // keeps the x axis readable for long ranges

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-100" role="img" aria-label={ariaLabel}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(max * t)} y2={y(max * t)} stroke="#e2e8f0" />
          <text x={padL - 6} y={y(max * t) + 3} textAnchor="end" fontSize="9.5" fill="#64748b">{Math.round(max * t)}</text>
        </g>
      ))}
      <path d={areaPath} fill={color} fillOpacity="0.12" />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r="3.4" fill="#fff" stroke={color} strokeWidth="2">
            <title>{`${d.label}: ${d.value}`}</title>
          </circle>
          {i % labelEvery === 0 && (
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="9.5" fill="#64748b">{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
export default LineChart;
