"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart3,
  Droplet,
  DollarSign,
  Beef,
  Package,
  Download,
  Printer,
  AlertTriangle,
  Loader2,
  Calendar,
} from "lucide-react";
import styles from "../../(dashboard)/analytics/page.module.css";
import {
  AnalyticsPreset,
  getAnalyticsDashboardData,
} from "@/actions/analytics.actions";
import { useAuth } from "../auth/AuthProvider";
import DataExportModal from "../settings/DataExportModal";
import { APP_BRAND_NAME } from "@/lib/branding";
import {
  CashFlowComboChart,
  HorizontalCategoryBars,
  InteractiveDonutChart,
  MultiBarChart,
  StackedAreaChart,
} from "./AnalyticsCharts";

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsDashboardData>>;

const CHART_COLORS = ["#047857", "#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const MILK_SESSION_SERIES = [
  { key: "morning", label: "Morning", color: "#047857" },
  { key: "midday", label: "Mid-day", color: "#f59e0b" },
  { key: "evening", label: "Evening", color: "#2563eb" },
];

function formatMoney(val: number, currency = "KES") {
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `${currency} ${Math.round(val).toLocaleString()}`;
  }
}

function DeltaBadge({ pct, invertColors = false }: { pct: number | null; invertColors?: boolean }) {
  if (pct === null || isNaN(pct)) return null;
  const isPositive = pct >= 0;
  const good = invertColors ? !isPositive : isPositive;
  return (
    <span className={good ? styles.deltaPos : styles.deltaNeg}>
      {isPositive ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

export default function ClientAnalyticsHub({ initialData }: { initialData: AnalyticsData }) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission("exports:download");

  const [data, setData] = useState<AnalyticsData>(initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "milk" | "finances" | "herd" | "inventory">("overview");
  const [preset, setPreset] = useState<AnalyticsPreset>(initialData.meta.preset);
  const [customFrom, setCustomFrom] = useState(initialData.meta.from);
  const [customTo, setCustomTo] = useState(initialData.meta.to);
  const [selectedCowId, setSelectedCowId] = useState<string>(
    initialData.milk.cowLeaderboard[0]?.id || ""
  );
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currency = data.meta.currencySymbol || "KES";
  const canViewFinances = data.meta.canViewFinances && data.finances !== null;

  const applyFilter = (nextPreset: AnalyticsPreset, fromVal?: string, toVal?: string) => {
    setPreset(nextPreset);
    if (nextPreset === "custom" && (!fromVal || !toVal)) return;

    startTransition(async () => {
      const updated = await getAnalyticsDashboardData({
        preset: nextPreset,
        from: nextPreset === "custom" ? fromVal : undefined,
        to: nextPreset === "custom" ? toVal : undefined,
      });
      setData(updated);
      if (
        updated.milk.cowLeaderboard.length > 0 &&
        !updated.milk.cowLeaderboard.some((c) => c.id === selectedCowId)
      ) {
        setSelectedCowId(updated.milk.cowLeaderboard[0].id);
      }
    });
  };

  const selectedCow =
    data.milk.cowLeaderboard.find((c) => c.id === selectedCowId) ||
    data.milk.cowLeaderboard[0] ||
    null;

  const presets: Array<{ value: AnalyticsPreset; label: string }> = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "90d", label: "90 Days" },
    { value: "ytd", label: "Year to Date" },
    { value: "custom", label: "Custom Range" },
  ];

  const dropAlertCows = data.milk.cowLeaderboard.filter((c) => c.dropAlertPct !== null);

  return (
    <div className={styles.container}>
      {/* Print-Only Masthead */}
      <div className={styles.printHeader}>
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#047857", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {APP_BRAND_NAME} • Executive Management Report
          </div>
          <h1 style={{ margin: "2px 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
            {data.meta.farmName} — Performance Summary
          </h1>
          <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "2px" }}>
            {data.meta.location} • Period: <strong>{data.meta.periodLabel}</strong> ({data.meta.from} to {data.meta.to})
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#64748b" }}>
          Generated {new Date(data.meta.generatedAt).toLocaleString()}
        </div>
      </div>

      {/* Screen Header */}
      <header className={`${styles.header} ${styles.noPrint}`}>
        <div>
          <h1 className={styles.pageTitle}>Analytics &amp; Reporting</h1>
          <p className={styles.subtitle}>
            {data.meta.farmName} • {data.meta.periodLabel} ({data.meta.daysSpan} days)
          </p>
        </div>

        <div className={styles.headerActions}>
          {canExport && (
            <>
              <button
                type="button"
                className={styles.actionBtnSecondary}
                onClick={() => window.print()}
                title="Print or Save Executive Summary as PDF"
              >
                <Printer size={16} />
                <span>Print / PDF Report</span>
              </button>
              <button
                type="button"
                className={styles.actionBtnPrimary}
                onClick={() => setIsExportOpen(true)}
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Date Range Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.presetRow}>
          <div className={styles.presetPills}>
            <Calendar size={16} style={{ color: "var(--color-text-sub)", marginRight: "4px" }} />
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => {
                  if (p.value === "custom") {
                    setPreset("custom");
                  } else {
                    applyFilter(p.value);
                  }
                }}
                className={`${styles.presetPill} ${preset === p.value ? styles.presetPillActive : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {isPending && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--color-primary)", fontWeight: 600 }}>
              <Loader2 size={15} className="animate-spin" /> Refreshing metrics...
            </div>
          )}
        </div>

        {preset === "custom" && (
          <div className={styles.customDateRow}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>From:</label>
            <input
              type="date"
              className={styles.dateInput}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>To:</label>
            <input
              type="date"
              className={styles.dateInput}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
            <button
              type="button"
              className={styles.actionBtnPrimary}
              onClick={() => applyFilter("custom", customFrom, customTo)}
              disabled={isPending}
            >
              Apply Range
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <nav className={styles.tabsNav} role="tablist">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "overview" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={17} /> Overview
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "milk" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("milk")}
        >
          <Droplet size={17} /> Milk &amp; Cow Productivity
        </button>
        {canViewFinances && (
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "finances" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("finances")}
          >
            <DollarSign size={17} /> Finances &amp; Unit Economics
          </button>
        )}
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "herd" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("herd")}
        >
          <Beef size={17} /> Herd, Breeding &amp; Health
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "inventory" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          <Package size={17} /> Inventory Burn &amp; Runway
        </button>
      </nav>

      {/* Interactive Screen Tabs */}
      <div className={styles.screenOnlySection} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === "overview" && (
          <>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Total Milk Produced</span>
                  <DeltaBadge pct={data.milk.litersDeltaPct} />
                </div>
                <div className={styles.kpiValue}>{data.milk.totalLiters.toLocaleString()} L</div>
                <div className={styles.kpiSub}>
                  <span>Avg {data.milk.avgDailyLiters} L/day</span> •{" "}
                  <span>{data.milk.avgLitersPerCowPerDay} L/cow/day</span>
                </div>
              </div>

              {canViewFinances && data.finances ? (
                <div className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Net Ranch Profit</span>
                    <DeltaBadge pct={data.finances.netDeltaPct} />
                  </div>
                  <div
                    className={styles.kpiValue}
                    style={{ color: data.finances.netProfit >= 0 ? "#16a34a" : "#dc2626" }}
                  >
                    {formatMoney(data.finances.netProfit, currency)}
                  </div>
                  <div className={styles.kpiSub}>
                    <span>Margin: {data.finances.profitMarginPct}%</span> •{" "}
                    <span>Rev: {formatMoney(data.finances.totalIncome, currency)}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Active Milking Cows</span>
                  </div>
                  <div className={styles.kpiValue}>{data.milk.activeLactatingCows}</div>
                  <div className={styles.kpiSub}>
                    <span>{data.milk.milkedCowsCount} cows milked in period</span>
                  </div>
                </div>
              )}

              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Living Herd Size</span>
                </div>
                <div className={styles.kpiValue}>{data.herd.livingTotal}</div>
                <div className={styles.kpiSub}>
                  <span>+{data.herd.periodAdditions} added</span> •{" "}
                  <span>{data.herd.sick} sick</span> •{" "}
                  <span>Mortality: {data.herd.mortalityRatePct}%</span>
                </div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Operational Watchlist</span>
                </div>
                <div className={styles.kpiValue}>
                  {data.herd.overdueEvents.length + data.inventory.criticalCount + dropAlertCows.length}
                </div>
                <div className={styles.kpiSub}>
                  <span>{data.herd.overdueEvents.length} overdue breeding</span> •{" "}
                  <span>{data.inventory.criticalCount} critical stock</span>
                </div>
              </div>
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Milk Production Trend (Liters)</h3>
                    <p className={styles.cardSubtitle}>Morning, Mid-day &amp; Evening session yields</p>
                  </div>
                </div>
                <div className={styles.chartBox}>
                  <StackedAreaChart
                    data={data.milk.series}
                    xKey="label"
                    series={MILK_SESSION_SERIES}
                    unit=" L"
                    stacked
                  />
                </div>
              </div>

              {canViewFinances && data.finances ? (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>Income vs. Expenses ({currency})</h3>
                      <p className={styles.cardSubtitle}>Cash flow bars with net profit line</p>
                    </div>
                  </div>
                  <div className={styles.chartBox}>
                    <CashFlowComboChart
                      data={data.finances.cashFlowSeries}
                      formatMoneyFn={(v) => formatMoney(v, currency)}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>Herd Composition by Species</h3>
                      <p className={styles.cardSubtitle}>Active &amp; monitored animals</p>
                    </div>
                  </div>
                  <div className={styles.chartBox}>
                    <MultiBarChart
                      data={data.herd.speciesBreakdown}
                      xKey="label"
                      stacked
                      series={[
                        { key: "female", label: "Female", color: "#10b981" },
                        { key: "male", label: "Male", color: "#2563eb" },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actionable Alerts Table */}
            {(dropAlertCows.length > 0 || data.herd.overdueEvents.length > 0 || data.inventory.criticalCount > 0) && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Priority Management Attention</h3>
                    <p className={styles.cardSubtitle}>Automated anomaly &amp; threshold detections across the ranch</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {dropAlertCows.map((cow) => (
                    <div
                      key={`drop-${cow.id}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem 1rem",
                        borderRadius: "10px",
                        backgroundColor: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.22)",
                        fontSize: "0.86rem",
                        gap: "1rem",
                      }}
                    >
                      <span>
                        <strong>Milk Drop Alert:</strong> {cow.name}{cow.tagNumber ? ` (#${cow.tagNumber})` : ""} is down{" "}
                        <strong>{cow.dropAlertPct}%</strong> over the last 7 days vs prior 14-day baseline. Check for mastitis or illness.
                      </span>
                      <Link href={`/herd/${cow.id}`} style={{ color: "#dc2626", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                        Inspect &rarr;
                      </Link>
                    </div>
                  ))}
                  {data.herd.overdueEvents.slice(0, 4).map((ev) => (
                    <div
                      key={`ov-${ev.id}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem 1rem",
                        borderRadius: "10px",
                        backgroundColor: "rgba(245, 158, 11, 0.09)",
                        border: "1px solid rgba(245, 158, 11, 0.25)",
                        fontSize: "0.86rem",
                        gap: "1rem",
                      }}
                    >
                      <span>
                        <strong>Overdue {ev.eventType}:</strong> {ev.animalName}
                        {ev.tagNumber ? ` (#${ev.tagNumber})` : ""} was expected {ev.expectedDate} ({ev.daysOverdue}d overdue).
                      </span>
                      <Link href="/breeding" style={{ color: "#d97706", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                        Resolve &rarr;
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= MILK & COWS TAB ================= */}
        {activeTab === "milk" && (
          <>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Period Milk Output</span>
                  <DeltaBadge pct={data.milk.litersDeltaPct} />
                </div>
                <div className={styles.kpiValue}>{data.milk.totalLiters.toLocaleString()} L</div>
                <div className={styles.kpiSub}>Prev period: {data.milk.prevTotalLiters.toLocaleString()} L</div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Avg Ranch Yield / Day</span>
                <div className={styles.kpiValue}>{data.milk.avgDailyLiters} L</div>
                <div className={styles.kpiSub}>Across {data.meta.daysSpan} calendar days</div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Avg Yield / Milking Cow</span>
                <div className={styles.kpiValue}>{data.milk.avgLitersPerCowPerDay} L/day</div>
                <div className={styles.kpiSub}>{data.milk.milkedCowsCount} cows milked</div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Retained / Unsold Milk</span>
                <div className={styles.kpiValue}>{data.milk.retainedOrVarianceLiters} L</div>
                <div className={styles.kpiSub}>
                  Sold with qty logged: {data.milk.soldMilkLiters} L (calf feed / home / shrinkage)
                </div>
              </div>
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Session Yield Breakdown</h3>
                    <p className={styles.cardSubtitle}>Morning vs Mid-day vs Evening (Liters)</p>
                  </div>
                </div>
                <div className={styles.chartBox}>
                  <MultiBarChart
                    data={data.milk.series}
                    xKey="label"
                    series={MILK_SESSION_SERIES}
                    stacked
                    unit=" L"
                  />
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Individual Cow Lactation Curve</h3>
                    <p className={styles.cardSubtitle}>Inspect single-cow yield trajectory</p>
                  </div>
                  {data.milk.cowLeaderboard.length > 0 && (
                    <select
                      className={styles.dateInput}
                      value={selectedCow?.id || ""}
                      onChange={(e) => setSelectedCowId(e.target.value)}
                    >
                      {data.milk.cowLeaderboard.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.tagNumber ? `(#${c.tagNumber})` : ""} — {c.avgDailyLiters} L/d
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={styles.chartBox}>
                  {selectedCow ? (
                    <StackedAreaChart
                      data={selectedCow.curve}
                      xKey="label"
                      series={[{ key: "liters", label: selectedCow.name, color: "#2563eb" }]}
                      unit=" L"
                      stacked={false}
                    />
                  ) : (
                    <div style={{ padding: "3rem", textAlign: "center", opacity: 0.6 }}>
                      No milk records logged in this date range.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>Cow Productivity Leaderboard</h3>
                  <p className={styles.cardSubtitle}>Ranked by average daily yield across milking days</p>
                </div>
              </div>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Cow</th>
                      <th>Species</th>
                      <th>Milking Days</th>
                      <th>Total Yield</th>
                      <th>Avg L / Day</th>
                      <th>Health / Trend Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.milk.cowLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", opacity: 0.6, padding: "2rem" }}>
                          No cow milking logs recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      data.milk.cowLeaderboard.map((cow, idx) => (
                        <tr key={cow.id}>
                          <td><strong>#{idx + 1}</strong></td>
                          <td>
                            <Link href={`/herd/${cow.id}`} style={{ fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}>
                              {cow.name} {cow.tagNumber ? `(#${cow.tagNumber})` : ""}
                            </Link>
                          </td>
                          <td>{cow.species}</td>
                          <td>{cow.milkingDays} d</td>
                          <td><strong>{cow.totalLiters} L</strong></td>
                          <td><strong>{cow.avgDailyLiters} L/d</strong></td>
                          <td>
                            {cow.dropAlertPct !== null ? (
                              <span className={styles.badgeCritical}>
                                <AlertTriangle size={12} /> Down {cow.dropAlertPct}% (7d)
                              </span>
                            ) : (
                              <span className={styles.badgeHealthy}>Steady</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ================= FINANCES & UNIT ECONOMICS TAB ================= */}
        {activeTab === "finances" && canViewFinances && data.finances && (
          <>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Gross Revenue</span>
                  <DeltaBadge pct={data.finances.incomeDeltaPct} />
                </div>
                <div className={styles.kpiValue}>{formatMoney(data.finances.totalIncome, currency)}</div>
                <div className={styles.kpiSub}>Prev: {formatMoney(data.finances.prevIncome, currency)}</div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Operating Expenses</span>
                  <DeltaBadge pct={data.finances.expenseDeltaPct} invertColors />
                </div>
                <div className={styles.kpiValue}>{formatMoney(data.finances.totalExpenses, currency)}</div>
                <div className={styles.kpiSub}>Prev: {formatMoney(data.finances.prevExpenses, currency)}</div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Net Profit &amp; Margin</span>
                  <DeltaBadge pct={data.finances.netDeltaPct} />
                </div>
                <div
                  className={styles.kpiValue}
                  style={{ color: data.finances.netProfit >= 0 ? "#16a34a" : "#dc2626" }}
                >
                  {formatMoney(data.finances.netProfit, currency)}
                </div>
                <div className={styles.kpiSub}>Net Margin: {data.finances.profitMarginPct}%</div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Dairy Unit Economics</span>
                <div className={styles.kpiValue}>
                  {data.finances.unitEconomics.costPerLiterProduced !== null
                    ? `${currency} ${data.finances.unitEconomics.costPerLiterProduced}/L`
                    : "N/A"}
                </div>
                <div className={styles.kpiSub}>
                  Cost/L produced
                  {data.finances.unitEconomics.realizedMilkPricePerLiter !== null
                    ? ` • Sold @ ${currency} ${data.finances.unitEconomics.realizedMilkPricePerLiter}/L`
                    : ""}
                </div>
              </div>
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Cash Flow &amp; Net Profit Trajectory</h3>
                    <p className={styles.cardSubtitle}>Revenue vs operating expenses over {data.meta.periodLabel}</p>
                  </div>
                </div>
                <div className={styles.chartBox}>
                  <CashFlowComboChart
                    data={data.finances.cashFlowSeries}
                    formatMoneyFn={(v) => formatMoney(v, currency)}
                  />
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Expense Cost Breakdown</h3>
                    <p className={styles.cardSubtitle}>Share of total ranch operating costs</p>
                  </div>
                </div>
                <div className={styles.chartBox}>
                  <InteractiveDonutChart
                    data={data.finances.expenseByCategory}
                    colors={CHART_COLORS}
                    formatValueFn={(v) => formatMoney(v, currency)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Expense Ledger by Category</h3>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.finances.expenseByCategory.length === 0 ? (
                        <tr><td colSpan={3} style={{ opacity: 0.6, textAlign: "center" }}>No expenses in period</td></tr>
                      ) : (
                        data.finances.expenseByCategory.map((e) => (
                          <tr key={e.category}>
                            <td><strong>{e.label}</strong></td>
                            <td>{formatMoney(e.amount, currency)}</td>
                            <td>{e.sharePct}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Top Buyers &amp; Revenue Channels</h3>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Buyer / Channel</th>
                        <th>Transactions</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.finances.topBuyers.length === 0 ? (
                        <tr><td colSpan={3} style={{ opacity: 0.6, textAlign: "center" }}>No sales in period</td></tr>
                      ) : (
                        data.finances.topBuyers.map((b, i) => (
                          <tr key={i}>
                            <td><strong>{b.buyerName}</strong></td>
                            <td>{b.count}</td>
                            <td><strong>{formatMoney(b.totalAmount, currency)}</strong></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================= HERD, BREEDING & HEALTH TAB ================= */}
        {activeTab === "herd" && (
          <>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Living Herd</span>
                <div className={styles.kpiValue}>{data.herd.livingTotal}</div>
                <div className={styles.kpiSub}>
                  {data.herd.active} Healthy • {data.herd.sick} Sick
                </div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Period Herd Turnover</span>
                <div className={styles.kpiValue}>
                  +{data.herd.periodAdditions} / -{data.herd.periodSales + data.herd.periodDeaths}
                </div>
                <div className={styles.kpiSub}>
                  {data.herd.periodSales} Sold • {data.herd.periodDeaths} Deceased ({data.herd.mortalityRatePct}% mortality)
                </div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Open Gestations</span>
                <div className={styles.kpiValue}>{data.herd.pendingPregnanciesCount}</div>
                <div className={styles.kpiSub}>
                  {data.herd.overdueEvents.length} overdue follow-ups
                </div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Health Interventions</span>
                <div className={styles.kpiValue}>
                  {data.herd.healthSummary.vaccinations + data.herd.healthSummary.treatments + data.herd.healthSummary.checkups}
                </div>
                <div className={styles.kpiSub}>
                  {data.herd.healthSummary.vaccinations} Vac • {data.herd.healthSummary.treatments} Treat
                  {canViewFinances && data.herd.healthSummary.totalVetCost !== null
                    ? ` • ${formatMoney(data.herd.healthSummary.totalVetCost, currency)}`
                    : ""}
                </div>
              </div>
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>6-Month Expected Calving &amp; Check Forecast</h3>
                    <p className={styles.cardSubtitle}>Plan maternity pens and steaming-up rations ahead</p>
                  </div>
                </div>
                <div className={styles.chartBox}>
                  <MultiBarChart
                    data={data.herd.calvingForecast}
                    xKey="monthLabel"
                    stacked={false}
                    series={[
                      { key: "expectedBirths", label: "Expected Births", color: "#047857" },
                      { key: "pregnancyChecks", label: "Pregnancy Checks", color: "#3b82f6" },
                    ]}
                  />
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Herd Age &amp; Replacement Pipeline</h3>
                    <p className={styles.cardSubtitle}>Age distribution across active livestock</p>
                  </div>
                </div>
                <div className={styles.chartBox}>
                  <HorizontalCategoryBars data={data.herd.ageCohorts} color="#8b5cf6" />
                </div>
              </div>
            </div>

            {data.herd.repeatTreatedAnimals.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Chronic / Repeat-Treated Animals (Last 90 Days)</h3>
                    <p className={styles.cardSubtitle}>Animals with 2 or more medical treatments</p>
                  </div>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Animal</th>
                        <th>Species</th>
                        <th>Treatments (90d)</th>
                        <th>Latest Condition</th>
                        {canViewFinances && <th>90d Vet Cost</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.herd.repeatTreatedAnimals.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <Link href={`/herd/${a.id}`} style={{ fontWeight: 700, color: "var(--color-primary)", textDecoration: "none" }}>
                              {a.name} {a.tagNumber ? `(#${a.tagNumber})` : ""}
                            </Link>
                          </td>
                          <td>{a.species}</td>
                          <td><span className={styles.badgeCritical}>{a.count} treatments</span></td>
                          <td>{a.lastReason}</td>
                          {canViewFinances && <td>{a.totalCost !== null ? formatMoney(a.totalCost, currency) : "—"}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= INVENTORY RUNWAY TAB ================= */}
        {activeTab === "inventory" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Feed &amp; Supplies Burn Rate &amp; Stock Runway</h3>
                <p className={styles.cardSubtitle}>
                  Calculated from actual 30-day Stock-Out consumption across your organization
                </p>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>In Stock</th>
                    <th>30d Consumed</th>
                    <th>Daily Burn</th>
                    <th>Est. Days Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", opacity: 0.6, padding: "2rem" }}>
                        No inventory items configured yet.
                      </td>
                    </tr>
                  ) : (
                    data.inventory.items.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.category}</td>
                        <td>
                          <strong>{item.quantity}</strong> {item.unit}
                        </td>
                        <td>{item.used30d} {item.unit}</td>
                        <td>{item.dailyBurnRate > 0 ? `${item.dailyBurnRate} ${item.unit}/d` : "—"}</td>
                        <td>
                          {item.estimatedDaysLeft !== null ? (
                            <strong>{item.estimatedDaysLeft} days</strong>
                          ) : (
                            <span style={{ opacity: 0.6 }}>No 30d usage</span>
                          )}
                        </td>
                        <td>
                          {item.status === "CRITICAL" ? (
                            <span className={styles.badgeCritical}>Critical / Restock</span>
                          ) : item.status === "REORDER_SOON" ? (
                            <span className={styles.badgeWarn}>Reorder (&lt;14d)</span>
                          ) : (
                            <span className={styles.badgeHealthy}>Healthy</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= CONSOLIDATED PRINT EXECUTIVE REPORT ================= */}
      <div className={styles.printOnlySection}>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Milk Produced</span>
            <div className={styles.kpiValue}>{data.milk.totalLiters.toLocaleString()} L</div>
            <div className={styles.kpiSub}>Avg {data.milk.avgDailyLiters} L/d ({data.milk.avgLitersPerCowPerDay} L/cow/d)</div>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Living Herd</span>
            <div className={styles.kpiValue}>{data.herd.livingTotal}</div>
            <div className={styles.kpiSub}>{data.herd.active} Healthy • {data.herd.sick} Sick • Mortality {data.herd.mortalityRatePct}%</div>
          </div>
          {canViewFinances && data.finances ? (
            <>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Gross Revenue</span>
                <div className={styles.kpiValue}>{formatMoney(data.finances.totalIncome, currency)}</div>
                <div className={styles.kpiSub}>Expenses: {formatMoney(data.finances.totalExpenses, currency)}</div>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Net Profit</span>
                <div className={styles.kpiValue}>{formatMoney(data.finances.netProfit, currency)}</div>
                <div className={styles.kpiSub}>Margin: {data.finances.profitMarginPct}%</div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Open Gestations</span>
                <div className={styles.kpiValue}>{data.herd.pendingPregnanciesCount}</div>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Critical Stock Items</span>
                <div className={styles.kpiValue}>{data.inventory.criticalCount}</div>
              </div>
            </>
          )}
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Top Producing Cows ({data.meta.periodLabel})</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cow</th>
                <th>Species</th>
                <th>Milking Days</th>
                <th>Total Yield</th>
                <th>Avg L/Day</th>
              </tr>
            </thead>
            <tbody>
              {data.milk.cowLeaderboard.slice(0, 10).map((c) => (
                <tr key={c.id}>
                  <td>{c.name} {c.tagNumber ? `(#${c.tagNumber})` : ""}</td>
                  <td>{c.species}</td>
                  <td>{c.milkingDays}</td>
                  <td>{c.totalLiters} L</td>
                  <td>{c.avgDailyLiters} L/d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canViewFinances && data.finances && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Financial Expense Summary</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Expense Category</th>
                  <th>Amount ({currency})</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {data.finances.expenseByCategory.map((e) => (
                  <tr key={e.category}>
                    <td>{e.label}</td>
                    <td>{formatMoney(e.amount, currency)}</td>
                    <td>{e.sharePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Inventory Stock &amp; Runway Summary</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>In Stock</th>
                <th>30d Burn</th>
                <th>Est. Days Left</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.inventory.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{item.used30d} {item.unit}</td>
                  <td>{item.estimatedDaysLeft !== null ? `${item.estimatedDaysLeft}d` : "—"}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DataExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultFrom={data.meta.from}
        defaultTo={data.meta.to}
      />
    </div>
  );
}
