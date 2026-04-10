import React from "react";
import ClientSalesFinances from "../../components/sales/ClientSalesFinances";
import { getFinancialOverview, getTransactions, getWeeklyCashFlow } from "@/actions/financial.actions";

export default async function SalesFinances() {
  const [overview, transactions, cashFlow] = await Promise.all([
    getFinancialOverview(),
    getTransactions(),
    getWeeklyCashFlow()
  ]);

  return <ClientSalesFinances overview={overview} transactions={transactions} cashFlow={cashFlow} />;
}
