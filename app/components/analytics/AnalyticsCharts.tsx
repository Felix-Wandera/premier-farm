"use client";

import React, { useState, useId } from "react";

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

function niceMax(val: number): number {
  if (val <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
  const residual = val / magnitude;
  if (residual <= 1) return 1 * magnitude;
  if (residual <= 2) return 2 * magnitude;
  if (residual <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

/**
 * Maps a touch or pointer event clientX onto the closest index [0..count-1] within an SVG plot area.
 */
function resolveSvgTouchIndex(
  svgEl: SVGSVGElement,
  clientX: number,
  viewBoxWidth: number,
  padLeft: number,
  plotW: number,
  count: number
): number {
  if (count <= 1) return 0;
  const rect = svgEl.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  const svgX = ((clientX - rect.left) / rect.width) * viewBoxWidth;
  const ratio = Math.max(0, Math.min(1, (svgX - padLeft) / plotW));
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
}

function resolveSvgSlotIndex(
  svgEl: SVGSVGElement,
  clientX: number,
  viewBoxWidth: number,
  padLeft: number,
  plotW: number,
  count: number
): number {
  if (count <= 1) return 0;
  const rect = svgEl.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  const svgX = ((clientX - rect.left) / rect.width) * viewBoxWidth;
  const ratio = Math.max(0, Math.min(0.9999, (svgX - padLeft) / plotW));
  return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
}

const tooltipBoxStyle: React.CSSProperties = {
  position: "absolute",
  top: "4px",
  right: "6px",
  zIndex: 20,
  backgroundColor: "var(--color-surface, #ffffff)",
  color: "var(--color-text-main, #0f172a)",
  border: "1px solid var(--color-border, #cbd5e1)",
  borderRadius: "12px",
  padding: "0.5rem 0.7rem",
  boxShadow: "0 10px 24px -5px rgba(0, 0, 0, 0.18)",
  fontSize: "0.76rem",
  pointerEvents: "none",
  minWidth: "140px",
  maxWidth: "85%",
};

const legendRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.8rem",
  flexWrap: "wrap",
  marginTop: "0.35rem",
  fontSize: "0.78rem",
};

// ============================================================================
// 1. STACKED AREA / LINE CHART (WITH TOUCH SCRUBBING)
// ============================================================================
export function StackedAreaChart({
  data,
  xKey,
  series,
  unit = "",
  stacked = true,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: SeriesConfig[];
  unit?: string;
  stacked?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const activeSeries = series.filter((s) => !hiddenKeys.has(s.key));

  if (!data || data.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6, fontSize: "0.88rem" }}>
        No data recorded for this period.
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const padLeft = 48;
  const padRight = 14;
  const padTop = 16;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const computed = data.map((row) => {
    let running = 0;
    const layers: Record<string, { y0: number; y1: number; raw: number }> = {};
    for (const s of activeSeries) {
      const raw = Number(row[s.key]) || 0;
      if (stacked) {
        layers[s.key] = { y0: running, y1: running + raw, raw };
        running += raw;
      } else {
        layers[s.key] = { y0: 0, y1: raw, raw };
        if (raw > running) running = raw;
      }
    }
    return { label: String(row[xKey] ?? ""), layers, peak: running };
  });

  const maxY = niceMax(Math.max(...computed.map((c) => c.peak), 1));
  const xFor = (i: number) =>
    computed.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (computed.length - 1)) * plotW;
  const yFor = (val: number) => padTop + plotH - (val / maxY) * plotH;

  const tickStep = Math.max(1, Math.ceil(computed.length / 6));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Number((maxY * t).toFixed(1)));

  const toggleSeries = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < series.length - 1) next.add(key);
      return next;
    });
  };

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    setHoverIdx(
      resolveSvgTouchIndex(e.currentTarget, touch.clientX, width, padLeft, plotW, computed.length)
    );
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {hoverIdx !== null && computed[hoverIdx] && (
        <div style={tooltipBoxStyle} className="tabular-nums">
          <div style={{ fontWeight: 700, marginBottom: "4px", borderBottom: "1px solid var(--color-border)", paddingBottom: "3px" }}>
            {computed[hoverIdx].label}
          </div>
          {activeSeries.map((s) => (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "2px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.color }} />
                {s.label}:
              </span>
              <strong>
                {computed[hoverIdx].layers[s.key]?.raw ?? 0}
                {unit}
              </strong>
            </div>
          ))}
          {stacked && activeSeries.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "4px", paddingTop: "3px", borderTop: "1px dashed var(--color-border)", fontWeight: 700 }}>
              <span>Total:</span>
              <span>
                {Number(computed[hoverIdx].peak.toFixed(1))}
                {unit}
              </span>
            </div>
          )}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", flex: 1, overflow: "visible", touchAction: "pan-y" }}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
      >
        <defs>
          {activeSeries.map((s) => (
            <linearGradient key={s.key} id={`grad-${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>

        {yTicks.map((tv, idx) => {
          const y = yFor(tv);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="var(--color-border, #e2e8f0)"
                strokeDasharray={idx === 0 ? undefined : "4 4"}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="12.5"
                fontWeight="600"
                fill="var(--color-text-sub, #64748b)"
              >
                {formatCompact(tv)}
              </text>
            </g>
          );
        })}

        {activeSeries.map((s) => {
          const topPoints = computed.map((c, i) => `${xFor(i)},${yFor(c.layers[s.key].y1)}`);
          const bottomPoints = [...computed]
            .map((c, i) => `${xFor(i)},${yFor(c.layers[s.key].y0)}`)
            .reverse();
          const areaPath = `M ${topPoints.join(" L ")} L ${bottomPoints.join(" L ")} Z`;
          const linePath = `M ${topPoints.join(" L ")}`;

          return (
            <g key={s.key}>
              {computed.length > 1 && (
                <>
                  <path d={areaPath} fill={`url(#grad-${uid}-${s.key})`} />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}
              {computed.length === 1 && (
                <circle cx={xFor(0)} cy={yFor(computed[0].layers[s.key].y1)} r={5.5} fill={s.color} />
              )}
            </g>
          );
        })}

        {computed.map((c, i) => {
          if (i % tickStep !== 0 && i !== computed.length - 1) return null;
          return (
            <text
              key={i}
              x={xFor(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="var(--color-text-sub, #64748b)"
            >
              {c.label}
            </text>
          );
        })}

        {hoverIdx !== null && computed[hoverIdx] && (
          <g>
            <line
              x1={xFor(hoverIdx)}
              x2={xFor(hoverIdx)}
              y1={padTop}
              y2={padTop + plotH}
              stroke="var(--color-text-sub, #64748b)"
              strokeDasharray="3 3"
              strokeWidth={1.3}
            />
            {activeSeries.map((s) => (
              <circle
                key={s.key}
                cx={xFor(hoverIdx)}
                cy={yFor(computed[hoverIdx].layers[s.key].y1)}
                r={5}
                fill={s.color}
                stroke="var(--color-surface, #fff)"
                strokeWidth={2}
              />
            ))}
          </g>
        )}

        {computed.map((_, i) => {
          const colW = plotW / Math.max(1, computed.length);
          const x = computed.length === 1 ? padLeft : xFor(i) - colW / 2;
          return (
            <rect
              key={i}
              x={Math.max(padLeft, x)}
              y={padTop}
              width={colW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onClick={() => setHoverIdx((prev) => (prev === i ? null : i))}
            />
          );
        })}
      </svg>

      {series.length > 1 && (
        <div style={legendRowStyle}>
          {series.map((s) => {
            const hidden = hiddenKeys.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSeries(s.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-main)",
                  opacity: hidden ? 0.4 : 1,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: s.color }} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. STACKED OR GROUPED VERTICAL BAR CHART (WITH TOUCH SCRUBBING)
// ============================================================================
export function MultiBarChart({
  data,
  xKey,
  series,
  stacked = false,
  unit = "",
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: SeriesConfig[];
  stacked?: boolean;
  unit?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6, fontSize: "0.88rem" }}>
        No data available.
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const padLeft = 48;
  const padRight = 14;
  const padTop = 16;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const rawMax = Math.max(
    ...data.map((row) =>
      stacked
        ? series.reduce((acc, s) => acc + (Number(row[s.key]) || 0), 0)
        : Math.max(...series.map((s) => Number(row[s.key]) || 0))
    ),
    1
  );
  const maxY = niceMax(rawMax);
  const yFor = (val: number) => padTop + plotH - (val / maxY) * plotH;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Number((maxY * t).toFixed(1)));

  const slotW = plotW / data.length;
  const barGroupW = Math.min(44, slotW * 0.68);
  const tickStep = Math.max(1, Math.ceil(data.length / 6));

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    setHoverIdx(
      resolveSvgSlotIndex(e.currentTarget, touch.clientX, width, padLeft, plotW, data.length)
    );
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {hoverIdx !== null && data[hoverIdx] && (
        <div style={tooltipBoxStyle} className="tabular-nums">
          <div style={{ fontWeight: 700, marginBottom: "4px", borderBottom: "1px solid var(--color-border)", paddingBottom: "3px" }}>
            {String(data[hoverIdx][xKey])}
          </div>
          {series.map((s) => (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "2px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "2px", backgroundColor: s.color }} />
                {s.label}:
              </span>
              <strong>
                {Number(data[hoverIdx][s.key]) || 0}
                {unit}
              </strong>
            </div>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", flex: 1, overflow: "visible", touchAction: "pan-y" }}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
      >
        {yTicks.map((tv, idx) => {
          const y = yFor(tv);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="var(--color-border, #e2e8f0)"
                strokeDasharray={idx === 0 ? undefined : "4 4"}
              />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="12.5" fontWeight="600" fill="var(--color-text-sub, #64748b)">
                {formatCompact(tv)}
              </text>
            </g>
          );
        })}

        {data.map((row, i) => {
          const centerX = padLeft + i * slotW + slotW / 2;
          const isHovered = hoverIdx === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onClick={() => setHoverIdx((prev) => (prev === i ? null : i))}
            >
              {isHovered && (
                <rect
                  x={padLeft + i * slotW + 2}
                  y={padTop}
                  width={Math.max(4, slotW - 4)}
                  height={plotH}
                  rx={6}
                  fill="rgba(100, 116, 139, 0.1)"
                />
              )}

              {stacked ? (
                (() => {
                  const segments = series.reduce<Array<{ key: string; color: string; yTop: number; h: number; nextCum: number }>>(
                    (acc, s) => {
                      const prevCum = acc.length > 0 ? acc[acc.length - 1].nextCum : 0;
                      const val = Number(row[s.key]) || 0;
                      const yTop = yFor(prevCum + val);
                      const yBottom = yFor(prevCum);
                      acc.push({
                        key: s.key,
                        color: s.color,
                        yTop,
                        h: Math.max(0, yBottom - yTop),
                        nextCum: prevCum + val,
                      });
                      return acc;
                    },
                    []
                  );
                  return segments.map((seg) => (
                    <rect
                      key={seg.key}
                      x={centerX - barGroupW / 2}
                      y={seg.yTop}
                      width={barGroupW}
                      height={seg.h}
                      rx={seg.h > 3 ? 2 : 0}
                      fill={seg.color}
                    />
                  ));
                })()
              ) : (
                series.map((s, sIdx) => {
                  const val = Number(row[s.key]) || 0;
                  const singleW = Math.max(4, (barGroupW - (series.length - 1) * 3) / series.length);
                  const x = centerX - barGroupW / 2 + sIdx * (singleW + 3);
                  const yTop = yFor(val);
                  const h = Math.max(0, padTop + plotH - yTop);
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={yTop}
                      width={singleW}
                      height={h}
                      rx={3}
                      fill={s.color}
                    />
                  );
                })
              )}

              {(i % tickStep === 0 || i === data.length - 1) && (
                <text
                  x={centerX}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="var(--color-text-sub, #64748b)"
                >
                  {String(row[xKey])}
                </text>
              )}

              <rect
                x={padLeft + i * slotW}
                y={padTop}
                width={slotW}
                height={plotH}
                fill="transparent"
              />
            </g>
          );
        })}
      </svg>

      <div style={legendRowStyle}>
        {series.map((s) => (
          <div key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 3. CASH FLOW COMBO CHART (WITH TOUCH SCRUBBING)
// ============================================================================
export function CashFlowComboChart({
  data,
  formatMoneyFn,
}: {
  data: Array<{ label: string; income: number; expense: number; net: number }>;
  formatMoneyFn: (val: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6, fontSize: "0.88rem" }}>
        No financial records in this period.
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const padLeft = 52;
  const padRight = 14;
  const padTop = 16;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxPos = Math.max(...data.map((d) => Math.max(d.income, d.expense, d.net)), 1);
  const minNeg = Math.min(...data.map((d) => Math.min(0, d.net)), 0);
  const upper = niceMax(maxPos);
  const lower = minNeg < 0 ? -niceMax(Math.abs(minNeg)) : 0;
  const span = upper - lower || 1;

  const yFor = (val: number) => padTop + plotH - ((val - lower) / span) * plotH;
  const zeroY = yFor(0);

  const slotW = plotW / data.length;
  const groupW = Math.min(36, slotW * 0.64);
  const barW = Math.max(3, (groupW - 3) / 2);
  const tickStep = Math.max(1, Math.ceil(data.length / 6));

  const yTicks =
    lower < 0
      ? [lower, lower / 2, 0, upper / 2, upper]
      : [0, upper * 0.25, upper * 0.5, upper * 0.75, upper];

  const netLinePoints = data
    .map((d, i) => `${padLeft + i * slotW + slotW / 2},${yFor(d.net)}`)
    .join(" L ");

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    setHoverIdx(
      resolveSvgSlotIndex(e.currentTarget, touch.clientX, width, padLeft, plotW, data.length)
    );
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {hoverIdx !== null && data[hoverIdx] && (
        <div style={tooltipBoxStyle} className="tabular-nums">
          <div style={{ fontWeight: 700, marginBottom: "4px", borderBottom: "1px solid var(--color-border)", paddingBottom: "3px" }}>
            {data[hoverIdx].label}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: "#10b981" }}>
            <span>Income:</span>
            <strong>{formatMoneyFn(data[hoverIdx].income)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: "#ef4444", marginTop: "2px" }}>
            <span>Expenses:</span>
            <strong>{formatMoneyFn(data[hoverIdx].expense)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: "#3b82f6", marginTop: "4px", paddingTop: "3px", borderTop: "1px dashed var(--color-border)", fontWeight: 700 }}>
            <span>Net:</span>
            <span>{formatMoneyFn(data[hoverIdx].net)}</span>
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", flex: 1, overflow: "visible", touchAction: "pan-y" }}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
      >
        {yTicks.map((tv, idx) => {
          const y = yFor(tv);
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke={tv === 0 ? "var(--color-text-sub, #94a3b8)" : "var(--color-border, #e2e8f0)"}
                strokeDasharray={tv === 0 ? undefined : "4 4"}
                strokeWidth={tv === 0 ? 1.2 : 1}
              />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="12.5" fontWeight="600" fill="var(--color-text-sub, #64748b)">
                {formatCompact(tv)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const centerX = padLeft + i * slotW + slotW / 2;
          const incY = yFor(d.income);
          const expY = yFor(d.expense);

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onClick={() => setHoverIdx((prev) => (prev === i ? null : i))}
            >
              {hoverIdx === i && (
                <rect
                  x={padLeft + i * slotW + 2}
                  y={padTop}
                  width={Math.max(4, slotW - 4)}
                  height={plotH}
                  rx={6}
                  fill="rgba(100, 116, 139, 0.1)"
                />
              )}
              <rect
                x={centerX - groupW / 2}
                y={incY}
                width={barW}
                height={Math.max(0, zeroY - incY)}
                rx={2.5}
                fill="#10b981"
              />
              <rect
                x={centerX - groupW / 2 + barW + 3}
                y={expY}
                width={barW}
                height={Math.max(0, zeroY - expY)}
                rx={2.5}
                fill="#ef4444"
              />
              {(i % tickStep === 0 || i === data.length - 1) && (
                <text x={centerX} y={height - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--color-text-sub, #64748b)">
                  {d.label}
                </text>
              )}
              <rect x={padLeft + i * slotW} y={padTop} width={slotW} height={plotH} fill="transparent" />
            </g>
          );
        })}

        {data.length > 1 && (
          <path
            d={`M ${netLinePoints}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}

        {hoverIdx !== null && data[hoverIdx] && (
          <circle
            cx={padLeft + hoverIdx * slotW + slotW / 2}
            cy={yFor(data[hoverIdx].net)}
            r={5}
            fill="#3b82f6"
            stroke="var(--color-surface, #fff)"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}
      </svg>

      <div style={legendRowStyle}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
          <span style={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: "#10b981" }} />
          <span>Income</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
          <span style={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: "#ef4444" }} />
          <span>Expenses</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
          <span style={{ width: 14, height: 3, borderRadius: "2px", backgroundColor: "#3b82f6" }} />
          <span>Net Profit</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. INTERACTIVE DONUT CHART (TAP + HOVER)
// ============================================================================
export function InteractiveDonutChart({
  data,
  colors,
  formatValueFn,
}: {
  data: Array<{ label: string; amount: number; sharePct: number }>;
  colors: string[];
  formatValueFn: (val: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const total = data.reduce((acc, item) => acc + item.amount, 0);
  if (!data || data.length === 0 || total <= 0) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6, fontSize: "0.88rem" }}>
        No expenses recorded in this period.
      </div>
    );
  }

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const computedSlices = data.reduce<
    Array<{ label: string; amount: number; sharePct: number; dashLength: number; dashOffset: number; nextCum: number }>
  >((acc, slice) => {
    const prevCum = acc.length > 0 ? acc[acc.length - 1].nextCum : 0;
    const fraction = slice.amount / total;
    acc.push({
      ...slice,
      dashLength: Math.max(0, fraction * circumference),
      dashOffset: -prevCum * circumference,
      nextCum: prevCum + fraction,
    });
    return acc;
  }, []);

  const activeSlice = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: "0.85rem", height: "100%", flexWrap: "wrap" }}>
      <svg viewBox="0 0 200 200" style={{ width: "165px", height: "165px", flexShrink: 0 }}>
        {computedSlices.map((slice, idx) => {
          const isHovered = hoverIdx === idx;

          return (
            <circle
              key={slice.label}
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke={colors[idx % colors.length]}
              strokeWidth={isHovered ? 28 : 23}
              strokeDasharray={`${slice.dashLength} ${circumference}`}
              strokeDashoffset={slice.dashOffset}
              transform="rotate(-90 100 100)"
              style={{ cursor: "pointer", transition: "stroke-width 0.15s ease" }}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              onClick={() => setHoverIdx((prev) => (prev === idx ? null : idx))}
            />
          );
        })}

        <text x="100" y="94" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text-sub, #64748b)">
          {activeSlice ? activeSlice.label.slice(0, 16) : "Total Spend"}
        </text>
        <text x="100" y="114" textAnchor="middle" fontSize="13.5" fontWeight="800" fill="var(--color-text-main, #0f172a)">
          {activeSlice ? `${activeSlice.sharePct}%` : formatValueFn(total)}
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, minWidth: "160px" }}>
        {data.map((slice, idx) => (
          <button
            key={slice.label}
            type="button"
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={() => setHoverIdx((prev) => (prev === idx ? null : idx))}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              fontSize: "0.8rem",
              padding: "0.35rem 0.55rem",
              borderRadius: "8px",
              border: "none",
              fontFamily: "inherit",
              color: "var(--color-text-main)",
              backgroundColor: hoverIdx === idx ? "var(--color-bg)" : "transparent",
              cursor: "pointer",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: colors[idx % colors.length], flexShrink: 0 }} />
              {slice.label}
            </span>
            <span className="tabular-nums" style={{ fontWeight: 700, color: "var(--color-text-sub)" }}>
              {slice.sharePct}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 5. HORIZONTAL BAR DISTRIBUTION CHART
// ============================================================================
export function HorizontalCategoryBars({
  data,
  color = "#8b5cf6",
}: {
  data: Array<{ cohort: string; count: number }>;
  color?: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.85rem", height: "100%", padding: "0.25rem 0" }}>
      {data.map((row) => {
        const widthPct = (row.count / maxCount) * 100;
        const sharePct = total > 0 ? Math.round((row.count / total) * 100) : 0;

        return (
          <div key={row.cohort} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem" }}>
              <span style={{ fontWeight: 600 }}>{row.cohort}</span>
              <span className="tabular-nums" style={{ color: "var(--color-text-sub)", fontWeight: 700 }}>
                {row.count} ({sharePct}%)
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "12px",
                borderRadius: "99px",
                backgroundColor: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(row.count > 0 ? 4 : 0, widthPct)}%`,
                  height: "100%",
                  borderRadius: "99px",
                  backgroundColor: color,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
