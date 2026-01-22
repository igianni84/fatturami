"use server";

import { removeAuthCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function logout(): Promise<void> {
  await removeAuthCookie();
  redirect("/login");
}
