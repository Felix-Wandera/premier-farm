import React from "react";
import ClientSalesFinances from "../../components/sales/ClientSalesFinances";
import { getFinancialOverview, getTransactions } from "@/actions/financial.actions";

export default async function SalesFinances() {
  const [overview, transactions] = await Promise.all([
    getFinancialOverview(),
    getTransactions()
  ]);

  return <ClientSalesFinances overview={overview} transactions={transactions} />;
}
