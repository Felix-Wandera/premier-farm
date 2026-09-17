import React from "react";
import ClientUserManagement from "../../components/users/ClientUserManagement";
import { getUsers } from "@/actions/user.actions";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UserManagement() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  const users = await getUsers();
  return <ClientUserManagement initialUsers={users} />;
}
