import React from "react";
import ClientDashboard from "../components/dashboard/ClientDashboard";
import { getDashboardStats } from "@/actions/dashboard.actions";

export default async function Dashboard() {
  const stats = await getDashboardStats();
  return <ClientDashboard stats={stats} />;
}
