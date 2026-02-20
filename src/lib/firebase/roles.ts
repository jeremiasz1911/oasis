import { db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export type UserRole = "guest" | "moderator" | "admin";

export async function fetchUserRole(uid: string): Promise<UserRole> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return "guest";

  const role = (snap.data() as any)?.role as UserRole | undefined;
  if (role === "admin" || role === "moderator") return role;
  return "guest";
}

export function isStaff(role: UserRole) {
  return role === "admin" || role === "moderator";
}
