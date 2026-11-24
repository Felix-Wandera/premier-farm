import React from "react";
import { redirect } from "next/navigation";
import { requirePermission } from "@/actions/utils";
import {
  AnalyticsPreset,
  getAnalyticsDashboardData,
} from "@/actions/analytics.actions";
import ClientAnalyticsHub from "../../components/analytics/ClientAnalyticsHub";

const VALID_PRESETS = new Set<AnalyticsPreset>([
  "7d",
  "30d",
  "this_month",
  "last_month",
  "90d",
  "ytd",
  "custom",
]);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  try {
    await requirePermission("analytics:view");
  } catch {
    redirect("/");
  }

  const resolvedParams = await searchParams;
  const preset =
    resolvedParams.preset && VALID_PRESETS.has(resolvedParams.preset as AnalyticsPreset)
      ? (resolvedParams.preset as AnalyticsPreset)
      : "30d";

  const initialData = await getAnalyticsDashboardData({
    preset,
    from: resolvedParams.from,
    to: resolvedParams.to,
  });

  return <ClientAnalyticsHub initialData={initialData} />;
}
