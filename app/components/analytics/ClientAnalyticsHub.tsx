"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart3,
  Droplet,
  DollarSign,
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
import { CattleIcon } from "../ui/AnimalIcon";
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
    <span className={`${good ? styles.deltaPos : styles.deltaNeg} tabular-nums`}>
      {isPositive ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

export default function ClientAnalyticsHub({ initialData }: { initialData: AnalyticsData }) {
  const { hasPermission } = useAuth();
  const canExport = hasPermission("exports:download");

  const [data, setData] = useState<AnalyticsData>(initialData);
  const [activeTab, setActiveTab] = useState<
    "overview" | "milk" | "finances" | "herd" | "inventory"
  >("overview");
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
    { value: "ytd", label: "YTD" },
    { value: "custom", label: "Custom" },
  ];

  const dropAlertCows = data.milk.cowLeaderboard.filter((c) => c.dropAlertPct !== null);

  return (
    <div className={styles.container}>
      {/* Print-Only Masthead */}
      <div className={styles.printHeader}>
        <div>
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#047857",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {APP_BRAND_NAME} • Executive Management Report
          </div>
          <h1 style={{ margin: "2px 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>
            {data.meta.farmName} — Performance Summary
          </h1>
          <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "2px" }}>
            {data.meta.location} • Period: <strong>{data.meta.periodLabel}</strong> ({data.meta.from} to{" "}
            {data.meta.to})
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#64748b" }}>
          Generated {new Date(data.meta.generatedAt).toLocaleString()}
        </div>
      </div>

      {/* Screen Header */}
      <header className={`${styles.header} ${styles.noPrint}`}>
        <div>
          <h1 className={styles.pageTitle}>Analytics &amp; Reports</h1>
          <p className={styles.subtitle}>
            {data.meta.periodLabel} ({data.meta.daysSpan} days)
          </p>
        </div>

        {canExport && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.actionBtnSecondary}
              onClick={() => window.print()}
              title="Print or Save Executive Summary as PDF"
            >
              <Printer size={16} />
              <span className={styles.btnLabelDesktop}>Print / PDF</span>
            </button>
            <button
              type="button"
              className={styles.actionBtnPrimary}
              onClick={() => setIsExportOpen(true)}
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </header>

      {/* Date Range Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.presetRow}>
          <div className={styles.presetPills}>
            <Calendar
              size={15}
              style={{ color: "var(--color-text-sub)", flexShrink: 0, marginRight: "2px" }}
            />
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
                className={`${styles.presetPill} ${
                  preset === p.value ? styles.presetPillActive : ""
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {isPending && (
            <div className={styles.refreshingPill}>
              <Loader2 size={14} className="animate-spin" /> Refreshing...
            </div>
          )}
        </div>

        {preset === "custom" && (
          <div className={styles.customDateRow}>
            <input
              type="date"
              className={styles.dateInput}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              aria-label="From date"
            />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-sub)" }}>to</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              aria-label="To date"
            />
            <button
              type="button"
              className={styles.actionBtnPrimary}
              onClick={() => applyFilter("custom", customFrom, customTo)}
              disabled={isPending}
            >
              Apply
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
          <BarChart3 size={16} /> Overview
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "milk" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("milk")}
        >
          <Droplet size={16} /> Milk &amp; Cows
        </button>
        {canViewFinances && (
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "finances" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("finances")}
          >
            <DollarSign size={16} /> Finances
          </button>
        )}
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "herd" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("herd")}
        >
          <CattleIcon size={16} /> Herd &amp; Health
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "inventory" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          <Package size={16} /> Stock Runway
        </button>
      </nav>

      {/* Interactive Screen Tabs */}
      <div className={styles.screenOnlySection}>
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === "overview" && (
          <>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Milk Output</span>
                  <DeltaBadge pct={data.milk.litersDeltaPct} />
                </div>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.milk.totalLiters.toLocaleString()} L
                </div>
                <div className={`${styles.kpiSub} tabular-nums`}>
                  <span>{data.milk.avgDailyLiters} L/d</span> •{" "}
                  <span>{data.milk.avgLitersPerCowPerDay} L/cow</span>
                </div>
              </div>

              {canViewFinances && data.finances ? (
                <div className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Net Profit</span>
                    <DeltaBadge pct={data.finances.netDeltaPct} />
                  </div>
                  <div
                    className={`${styles.kpiValue} tabular-nums`}
                    style={{ color: data.finances.netProfit >= 0 ? "#10b981" : "#ef4444" }}
                  >
                    {formatMoney(data.finances.netProfit, currency)}
                  </div>
                  <div className={`${styles.kpiSub} tabular-nums`}>
                    <span>Margin {data.finances.profitMarginPct}%</span>
                  </div>
                </div>
              ) : (
                <div className={styles.kpiCard}>
                  <div className={styles.kpiTop}>
                    <span className={styles.kpiLabel}>Milking Cows</span>
                  </div>
                  <div className={`${styles.kpiValue} tabular-nums`}>
                    {data.milk.activeLactatingCows}
                  </div>
                  <div className={styles.kpiSub}>
                    <span>{data.milk.milkedCowsCount} milked</span>
                  </div>
                </div>
              )}

              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Living Herd</span>
                </div>
                <div className={`${styles.kpiValue} tabular-nums`}>{data.herd.livingTotal}</div>
                <div className={`${styles.kpiSub} tabular-nums`}>
                  <span>+{data.herd.periodAdditions} new</span> •{" "}
                  <span>{data.herd.sick} sick</span>
                </div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Watchlist</span>
                </div>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.herd.overdueEvents.length +
                    data.inventory.criticalCount +
                    dropAlertCows.length}
                </div>
                <div className={styles.kpiSub}>
                  <span>{data.herd.overdueEvents.length} breeding</span> •{" "}
                  <span>{data.inventory.criticalCount} stock</span>
                </div>
              </div>
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Milk Production Trend (Liters)</h3>
                    <p className={styles.cardSubtitle}>
                      Slide finger or tap points to inspect session yields
                    </p>
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

            {(dropAlertCows.length > 0 ||
              data.herd.overdueEvents.length > 0 ||
              data.inventory.criticalCount > 0) && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Priority Management Attention</h3>
                    <p className={styles.cardSubtitle}>
                      Automated anomaly &amp; threshold detections across the ranch
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {dropAlertCows.map((cow) => (
                    <div key={`drop-${cow.id}`} className={styles.alertBannerDanger}>
                      <span>
                        <strong>Milk Drop Alert:</strong> {cow.name}
                        {cow.tagNumber ? ` (#${cow.tagNumber})` : ""} is down{" "}
                        <strong>{cow.dropAlertPct}%</strong> over the last 7 days vs prior 14-day
                        baseline.
                      </span>
                      <Link href={`/herd/${cow.id}`} className={styles.alertBannerLinkDanger}>
                        Inspect &rarr;
                      </Link>
                    </div>
                  ))}
                  {data.herd.overdueEvents.slice(0, 4).map((ev) => (
                    <div key={`ov-${ev.id}`} className={styles.alertBannerWarn}>
                      <span>
                        <strong>Overdue {ev.eventType}:</strong> {ev.animalName}
                        {ev.tagNumber ? ` (#${ev.tagNumber})` : ""} expected {ev.expectedDate} (
                        {ev.daysOverdue}d overdue).
                      </span>
                      <Link href="/breeding" className={styles.alertBannerLinkWarn}>
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
                  <span className={styles.kpiLabel}>Period Output</span>
                  <DeltaBadge pct={data.milk.litersDeltaPct} />
                </div>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.milk.totalLiters.toLocaleString()} L
                </div>
                <div className={`${styles.kpiSub} tabular-nums`}>
                  Prev: {data.milk.prevTotalLiters.toLocaleString()} L
                </div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Avg Ranch / Day</span>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.milk.avgDailyLiters} L
                </div>
                <div className={styles.kpiSub}>Over {data.meta.daysSpan} days</div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Avg / Cow / Day</span>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.milk.avgLitersPerCowPerDay} L
                </div>
                <div className={styles.kpiSub}>{data.milk.milkedCowsCount} cows milked</div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Retained / Unsold</span>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.milk.retainedOrVarianceLiters} L
                </div>
                <div className={styles.kpiSub}>Sold logged: {data.milk.soldMilkLiters} L</div>
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
                    <h3 className={styles.cardTitle}>Cow Lactation Curve</h3>
                    <p className={styles.cardSubtitle}>Single-cow yield trajectory</p>
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
                  <p className={styles.cardSubtitle}>Ranked by average daily yield</p>
                </div>
              </div>

              {data.milk.cowLeaderboard.length === 0 ? (
                <p className={styles.emptyTableMsg}>No cow milking logs recorded in this period.</p>
              ) : (
                <>
                  {/* Mobile Ranked Cards (< 640px) */}
                  <div className={styles.mobileCardList}>
                    {data.milk.cowLeaderboard.map((cow, idx) => (
                      <Link
                        key={cow.id}
                        href={`/herd/${cow.id}`}
                        className={styles.mobileDataCard}
                      >
                        <div className={styles.mobileCardTop}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                            <span className={`${styles.rankBadge} tabular-nums`}>#{idx + 1}</span>
                            <strong className={styles.mobileCardTitle}>
                              {cow.name} {cow.tagNumber ? `(#${cow.tagNumber})` : ""}
                            </strong>
                          </div>
                          {cow.dropAlertPct !== null ? (
                            <span className={styles.badgeCritical}>
                              <AlertTriangle size={11} /> −{cow.dropAlertPct}%
                            </span>
                          ) : (
                            <span className={styles.badgeHealthy}>Steady</span>
                          )}
                        </div>
                        <div className={`${styles.mobileMetricsRow} tabular-nums`}>
                          <div>
                            <span>Avg / Day</span>
                            <strong>{cow.avgDailyLiters} L</strong>
                          </div>
                          <div>
                            <span>Total Yield</span>
                            <strong>{cow.totalLiters} L</strong>
                          </div>
                          <div>
                            <span>Days</span>
                            <strong>{cow.milkingDays} d</strong>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Desktop Table (>= 640px) */}
                  <div className={styles.desktopTableWrapper}>
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
                        {data.milk.cowLeaderboard.map((cow, idx) => (
                          <tr key={cow.id}>
                            <td className="tabular-nums">
                              <strong>#{idx + 1}</strong>
                            </td>
                            <td>
                              <Link
                                href={`/herd/${cow.id}`}
                                style={{
                                  fontWeight: 700,
                                  color: "var(--color-primary)",
                                  textDecoration: "none",
                                }}
                              >
                                {cow.name} {cow.tagNumber ? `(#${cow.tagNumber})` : ""}
                              </Link>
                            </td>
                            <td>{cow.species}</td>
                            <td className="tabular-nums">{cow.milkingDays} d</td>
                            <td className="tabular-nums">
                              <strong>{cow.totalLiters} L</strong>
                            </td>
                            <td className="tabular-nums">
                              <strong>{cow.avgDailyLiters} L/d</strong>
                            </td>
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
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
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {formatMoney(data.finances.totalIncome, currency)}
                </div>
                <div className={`${styles.kpiSub} tabular-nums`}>
                  Prev: {formatMoney(data.finances.prevIncome, currency)}
                </div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Expenses</span>
                  <DeltaBadge pct={data.finances.expenseDeltaPct} invertColors />
                </div>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {formatMoney(data.finances.totalExpenses, currency)}
                </div>
                <div className={`${styles.kpiSub} tabular-nums`}>
                  Prev: {formatMoney(data.finances.prevExpenses, currency)}
                </div>
              </div>

              <div className={styles.kpiCard}>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>Net Profit</span>
                  <DeltaBadge pct={data.finances.netDeltaPct} />
                </div>
                <div
                  className={`${styles.kpiValue} tabular-nums`}
                  style={{ color: data.finances.netProfit >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {formatMoney(data.finances.netProfit, currency)}
                </div>
                <div className={styles.kpiSub}>Margin: {data.finances.profitMarginPct}%</div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Cost / Liter</span>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.finances.unitEconomics.costPerLiterProduced !== null
                    ? `${currency} ${data.finances.unitEconomics.costPerLiterProduced}`
                    : "N/A"}
                </div>
                <div className={styles.kpiSub}>
                  {data.finances.unitEconomics.realizedMilkPricePerLiter !== null
                    ? `Sold @ ${currency} ${data.finances.unitEconomics.realizedMilkPricePerLiter}/L`
                    : "Unit cost produced"}
                </div>
              </div>
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Cash Flow &amp; Net Trajectory</h3>
                    <p className={styles.cardSubtitle}>
                      Revenue vs operating expenses ({data.meta.periodLabel})
                    </p>
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
                    <p className={styles.cardSubtitle}>Tap any slice or category to inspect</p>
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
                {data.finances.expenseByCategory.length === 0 ? (
                  <p className={styles.emptyTableMsg}>No expenses in this period.</p>
                ) : (
                  <>
                    <div className={styles.mobileCardList}>
                      {data.finances.expenseByCategory.map((e) => (
                        <div key={e.category} className={styles.mobileDataCardStatic}>
                          <div className={styles.mobileCardTop}>
                            <strong className={styles.mobileCardTitle}>{e.label}</strong>
                            <span className={`${styles.rankBadge} tabular-nums`}>
                              {e.sharePct}%
                            </span>
                          </div>
                          <div className="tabular-nums" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                            {formatMoney(e.amount, currency)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={styles.desktopTableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.finances.expenseByCategory.map((e) => (
                            <tr key={e.category}>
                              <td>
                                <strong>{e.label}</strong>
                              </td>
                              <td className="tabular-nums">{formatMoney(e.amount, currency)}</td>
                              <td className="tabular-nums">{e.sharePct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Top Buyers &amp; Revenue Channels</h3>
                {data.finances.topBuyers.length === 0 ? (
                  <p className={styles.emptyTableMsg}>No sales in this period.</p>
                ) : (
                  <>
                    <div className={styles.mobileCardList}>
                      {data.finances.topBuyers.map((b, i) => (
                        <div key={i} className={styles.mobileDataCardStatic}>
                          <div className={styles.mobileCardTop}>
                            <strong className={styles.mobileCardTitle}>{b.buyerName}</strong>
                            <span className={`${styles.rankBadge} tabular-nums`}>
                              {b.count} tx
                            </span>
                          </div>
                          <div
                            className="tabular-nums"
                            style={{ fontWeight: 800, color: "#10b981", fontSize: "0.95rem" }}
                          >
                            {formatMoney(b.totalAmount, currency)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={styles.desktopTableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Buyer / Channel</th>
                            <th>Transactions</th>
                            <th>Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.finances.topBuyers.map((b, i) => (
                            <tr key={i}>
                              <td>
                                <strong>{b.buyerName}</strong>
                              </td>
                              <td className="tabular-nums">{b.count}</td>
                              <td className="tabular-nums">
                                <strong>{formatMoney(b.totalAmount, currency)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
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
                <div className={`${styles.kpiValue} tabular-nums`}>{data.herd.livingTotal}</div>
                <div className={styles.kpiSub}>
                  {data.herd.active} Healthy • {data.herd.sick} Sick
                </div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Herd Turnover</span>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  +{data.herd.periodAdditions} / −{data.herd.periodSales + data.herd.periodDeaths}
                </div>
                <div className={styles.kpiSub}>
                  {data.herd.periodSales} Sold • {data.herd.mortalityRatePct}% Mort.
                </div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Gestations</span>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.herd.pendingPregnanciesCount}
                </div>
                <div className={styles.kpiSub}>{data.herd.overdueEvents.length} overdue</div>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Health Logs</span>
                <div className={`${styles.kpiValue} tabular-nums`}>
                  {data.herd.healthSummary.vaccinations +
                    data.herd.healthSummary.treatments +
                    data.herd.healthSummary.checkups}
                </div>
                <div className={styles.kpiSub}>
                  {data.herd.healthSummary.vaccinations} Vac • {data.herd.healthSummary.treatments}{" "}
                  Treat
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
                    <h3 className={styles.cardTitle}>6-Month Calving &amp; Check Forecast</h3>
                    <p className={styles.cardSubtitle}>
                      Plan maternity pens and steaming-up rations ahead
                    </p>
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
                    <h3 className={styles.cardTitle}>
                      Chronic / Repeat-Treated Animals (Last 90 Days)
                    </h3>
                    <p className={styles.cardSubtitle}>
                      Animals with 2 or more medical treatments
                    </p>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className={styles.mobileCardList}>
                  {data.herd.repeatTreatedAnimals.map((a) => (
                    <Link key={a.id} href={`/herd/${a.id}`} className={styles.mobileDataCard}>
                      <div className={styles.mobileCardTop}>
                        <strong className={styles.mobileCardTitle}>
                          {a.name} {a.tagNumber ? `(#${a.tagNumber})` : ""}
                        </strong>
                        <span className={styles.badgeCritical}>{a.count} treatments</span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--color-text-sub)" }}>
                        {a.species} • {a.lastReason}
                      </div>
                      {canViewFinances && a.totalCost !== null && (
                        <div className="tabular-nums" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#ef4444" }}>
                          90d Vet Cost: {formatMoney(a.totalCost, currency)}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className={styles.desktopTableWrapper}>
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
                            <Link
                              href={`/herd/${a.id}`}
                              style={{
                                fontWeight: 700,
                                color: "var(--color-primary)",
                                textDecoration: "none",
                              }}
                            >
                              {a.name} {a.tagNumber ? `(#${a.tagNumber})` : ""}
                            </Link>
                          </td>
                          <td>{a.species}</td>
                          <td>
                            <span className={styles.badgeCritical}>{a.count} treatments</span>
                          </td>
                          <td>{a.lastReason}</td>
                          {canViewFinances && (
                            <td className="tabular-nums">
                              {a.totalCost !== null ? formatMoney(a.totalCost, currency) : "—"}
                            </td>
                          )}
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
                  Based on 30-day Stock-Out consumption across your ranch
                </p>
              </div>
            </div>

            {data.inventory.items.length === 0 ? (
              <p className={styles.emptyTableMsg}>No inventory items configured yet.</p>
            ) : (
              <>
                {/* Mobile Cards (< 640px) */}
                <div className={styles.mobileCardList}>
                  {data.inventory.items.map((item) => (
                    <div key={item.id} className={styles.mobileDataCardStatic}>
                      <div className={styles.mobileCardTop}>
                        <div>
                          <strong className={styles.mobileCardTitle}>{item.name}</strong>
                          <span style={{ display: "block", fontSize: "0.73rem", color: "var(--color-text-sub)" }}>
                            {item.category}
                          </span>
                        </div>
                        {item.status === "CRITICAL" ? (
                          <span className={styles.badgeCritical}>Critical</span>
                        ) : item.status === "REORDER_SOON" ? (
                          <span className={styles.badgeWarn}>Reorder (&lt;14d)</span>
                        ) : (
                          <span className={styles.badgeHealthy}>Healthy</span>
                        )}
                      </div>
                      <div className={`${styles.mobileMetricsRow} tabular-nums`}>
                        <div>
                          <span>In Stock</span>
                          <strong>
                            {item.quantity} {item.unit}
                          </strong>
                        </div>
                        <div>
                          <span>Daily Burn</span>
                          <strong>
                            {item.dailyBurnRate > 0 ? `${item.dailyBurnRate}/d` : "—"}
                          </strong>
                        </div>
                        <div>
                          <span>Runway</span>
                          <strong>
                            {item.estimatedDaysLeft !== null
                              ? `${item.estimatedDaysLeft} days`
                              : "No usage"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (>= 640px) */}
                <div className={styles.desktopTableWrapper}>
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
                      {data.inventory.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                          </td>
                          <td>{item.category}</td>
                          <td className="tabular-nums">
                            <strong>{item.quantity}</strong> {item.unit}
                          </td>
                          <td className="tabular-nums">
                            {item.used30d} {item.unit}
                          </td>
                          <td className="tabular-nums">
                            {item.dailyBurnRate > 0
                              ? `${item.dailyBurnRate} ${item.unit}/d`
                              : "—"}
                          </td>
                          <td className="tabular-nums">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ================= CONSOLIDATED PRINT EXECUTIVE REPORT ================= */}
      <div className={styles.printOnlySection}>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Milk Produced</span>
            <div className={styles.kpiValue}>{data.milk.totalLiters.toLocaleString()} L</div>
            <div className={styles.kpiSub}>
              Avg {data.milk.avgDailyLiters} L/d ({data.milk.avgLitersPerCowPerDay} L/cow/d)
            </div>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Living Herd</span>
            <div className={styles.kpiValue}>{data.herd.livingTotal}</div>
            <div className={styles.kpiSub}>
              {data.herd.active} Healthy • {data.herd.sick} Sick • Mortality{" "}
              {data.herd.mortalityRatePct}%
            </div>
          </div>
          {canViewFinances && data.finances ? (
            <>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Gross Revenue</span>
                <div className={styles.kpiValue}>
                  {formatMoney(data.finances.totalIncome, currency)}
                </div>
                <div className={styles.kpiSub}>
                  Expenses: {formatMoney(data.finances.totalExpenses, currency)}
                </div>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Net Profit</span>
                <div className={styles.kpiValue}>
                  {formatMoney(data.finances.netProfit, currency)}
                </div>
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
                  <td>
                    {c.name} {c.tagNumber ? `(#${c.tagNumber})` : ""}
                  </td>
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
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>
                    {item.used30d} {item.unit}
                  </td>
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
