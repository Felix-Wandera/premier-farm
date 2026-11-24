import React, { Suspense } from "react";
import ClientUserManagement from "../../components/users/ClientUserManagement";
import { getUsers } from "@/actions/user.actions";
import { requirePermission } from "@/actions/utils";
import { redirect } from "next/navigation";

export default async function UserManagement() {
  try {
    await requirePermission("users:manage");
  } catch {
    redirect("/");
  }

  const users = await getUsers();
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading team...</div>}>
      <ClientUserManagement initialUsers={users} />
    </Suspense>
  );
}
