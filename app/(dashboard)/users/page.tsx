import React from "react";
import ClientUserManagement from "../../components/users/ClientUserManagement";
import { getUsers } from "@/actions/user.actions";

export default async function UserManagement() {
  const users = await getUsers();
  return <ClientUserManagement initialUsers={users} />;
}
