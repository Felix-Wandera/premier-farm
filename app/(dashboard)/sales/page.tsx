import React from "react";
import ClientSalesFinances from "../../components/sales/ClientSalesFinances";
import { getFinancialOverview, getTransactions, getWeeklyCashFlow } from "@/actions/financial.actions";
import { requirePermission } from "@/actions/utils";
import { redirect } from "next/navigation";

export default async function SalesFinances() {
  try {
    await requirePermission("finances:view");
  } catch {
    redirect("/");
  }

  const [overview, transactions, cashFlow] = await Promise.all([
    getFinancialOverview(),
    getTransactions(),
    getWeeklyCashFlow(),
  ]);

  return <ClientSalesFinances overview={overview} transactions={transactions} cashFlow={cashFlow} />;
}
