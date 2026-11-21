const PALETTE = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171', '#22d3ee'];

const niceMax = (value) => {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
};

const shortLabel = (label) => {
  const parts = String(label).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return label;
};

const tickIndexes = (count, desired = 6) => {
  if (count <= desired) return Array.from({ length: count }, (_, i) => i);
  const step = Math.ceil(count / desired);
  const indexes = [];
  for (let i = 0; i < count; i += step) indexes.push(i);
  if (indexes[indexes.length - 1] !== count - 1) indexes.push(count - 1);
  return indexes;
};

export function ChartLegend({ series }) {
  return (
    <div className="admin-chart-legend">
      {series.map((item) => (
        <span key={item.name}>
          <span className="admin-legend-dot" style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

/**
 * Multi-series line/area chart. Pure SVG so the dashboard needs no extra
 * charting dependency and renders identically in every browser.
 */
export function LineChart({ labels = [], series = [], height = 250, area = true }) {
  const W = 760;
  const H = height;
  const pad = { top: 14, right: 16, bottom: 26, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const max = niceMax(Math.max(1, ...series.flatMap((item) => item.values || [0])));
  const count = labels.length;

  if (count === 0 || series.length === 0) {
    return <div className="admin-chart-empty">No data for this period yet.</div>;
  }

  const point = (value, index) => {
    const x = pad.left + (count === 1 ? innerW / 2 : (index / (count - 1)) * innerW);
    const y = pad.top + innerH - (Math.max(0, value) / max) * innerH;
    return [x, y];
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg className="admin-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Platform activity chart">
      {gridLines.map((ratio) => {
        const y = pad.top + innerH - ratio * innerH;
        return (
          <g key={ratio}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#1a2c45" strokeWidth="1" />
            <text x={pad.left - 8} y={y + 3} textAnchor="end">
              {Math.round(max * ratio).toLocaleString()}
            </text>
          </g>
        );
      })}

      {tickIndexes(count).map((index) => {
        const [x] = point(0, index);
        return (
          <text key={index} x={x} y={H - 8} textAnchor="middle">
            {shortLabel(labels[index])}
          </text>
        );
      })}

      {series.map((item, seriesIndex) => {
        const color = item.color || PALETTE[seriesIndex % PALETTE.length];
        const coordinates = item.values.map((value, index) => point(value, index));
        const path = coordinates.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        const areaPath = `${path} L${coordinates[coordinates.length - 1][0].toFixed(1)},${pad.top + innerH} L${coordinates[0][0].toFixed(1)},${pad.top + innerH} Z`;

        return (
          <g key={item.name}>
            {area && (
              <>
                <defs>
                  <linearGradient id={`grad-${seriesIndex}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill={`url(#grad-${seriesIndex})`} />
              </>
            )}
            <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            {coordinates.map(([x, y], index) => (
              <circle key={index} cx={x} cy={y} r="2.2" fill={color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function BarChart({ labels = [], series = [], height = 250 }) {
  const W = 760;
  const H = height;
  const pad = { top: 14, right: 16, bottom: 26, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  if (labels.length === 0 || series.length === 0) {
    return <div className="admin-chart-empty">No data for this period yet.</div>;
  }

  const max = niceMax(Math.max(1, ...series.flatMap((item) => item.values || [0])));
  const groupWidth = innerW / labels.length;
  const barWidth = Math.max(3, Math.min(16, (groupWidth * 0.7) / series.length));

  return (
    <svg className="admin-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Comparison bar chart">
      {[0, 0.5, 1].map((ratio) => {
        const y = pad.top + innerH - ratio * innerH;
        return (
          <g key={ratio}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#1a2c45" />
            <text x={pad.left - 8} y={y + 3} textAnchor="end">
              {Math.round(max * ratio).toLocaleString()}
            </text>
          </g>
        );
      })}

      {labels.map((label, index) => {
        const groupCenter = pad.left + groupWidth * index + groupWidth / 2;
        return (
          <g key={label}>
            {series.map((item, seriesIndex) => {
              const value = item.values[index] || 0;
              const barHeight = (value / max) * innerH;
              const x = groupCenter - (series.length * barWidth) / 2 + seriesIndex * barWidth;
              return (
                <rect
                  key={item.name}
                  x={x}
                  y={pad.top + innerH - barHeight}
                  width={Math.max(2, barWidth - 2)}
                  height={Math.max(0, barHeight)}
                  rx="2"
                  fill={item.color || PALETTE[seriesIndex % PALETTE.length]}
                />
              );
            })}
          </g>
        );
      })}

      {tickIndexes(labels.length).map((index) => (
        <text
          key={index}
          x={pad.left + groupWidth * index + groupWidth / 2}
          y={H - 8}
          textAnchor="middle"
        >
          {shortLabel(labels[index])}
        </text>
      ))}
    </svg>
  );
}

export function DonutChart({ items = [], centerLabel = 'Total' }) {
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const radius = 62;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return <div className="admin-chart-empty">No tokens recorded yet.</div>;
  }

  let offset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label="Token status distribution">
        <g transform="translate(85, 85) rotate(-90)">
          <circle r={radius} fill="none" stroke="#16263f" strokeWidth={stroke} />
          {items.map((item) => {
            const value = Number(item.value) || 0;
            const fraction = value / total;
            const dash = fraction * circumference;
            const element = (
              <circle
                key={item.label}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return element;
          })}
        </g>
        <text x="85" y="80" textAnchor="middle" style={{ fill: '#8ba1bd', fontSize: 10, textTransform: 'uppercase' }}>
          {centerLabel}
        </text>
        <text x="85" y="100" textAnchor="middle" style={{ fill: '#f4f9ff', fontSize: 20, fontWeight: 800 }}>
          {total.toLocaleString()}
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b9c8dc' }}>
            <span className="admin-legend-dot" style={{ background: item.color }} />
            <span style={{ minWidth: 78 }}>{item.label}</span>
            <strong style={{ color: '#eef5ff' }}>{(Number(item.value) || 0).toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBarList({ items = [], valueKey = 'value', labelKey = 'label' }) {
  const max = Math.max(1, ...items.map((item) => Number(item[valueKey]) || 0));

  if (items.length === 0) {
    return <div className="admin-chart-empty">No activity recorded yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        return (
          <div key={item[labelKey]}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#c6d5e8', marginBottom: 5, gap: 10 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item[labelKey]}</span>
              <strong style={{ color: '#eef5ff' }}>{value.toLocaleString()}</strong>
            </div>
            <div style={{ height: 7, borderRadius: 999, background: '#16263f', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(3, (value / max) * 100)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: item.color || 'linear-gradient(90deg, #38bdf8, #818cf8)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PALETTE };
