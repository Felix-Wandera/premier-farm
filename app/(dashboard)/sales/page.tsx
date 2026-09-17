import React from "react";
import ClientSalesFinances from "../../components/sales/ClientSalesFinances";
import { getFinancialOverview, getTransactions, getWeeklyCashFlow } from "@/actions/financial.actions";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SalesFinances() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "MANAGER")) {
    redirect("/");
  }

  const [overview, transactions, cashFlow] = await Promise.all([
    getFinancialOverview(),
    getTransactions(),
    getWeeklyCashFlow()
  ]);

  return <ClientSalesFinances overview={overview} transactions={transactions} cashFlow={cashFlow} />;
}
