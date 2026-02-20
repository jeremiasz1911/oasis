"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "./AuthProvider";
import { isStaff } from "@/lib/firebase/roles";
import { Button } from "@/components/ui/button";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/admin/login";

  const { user, role, loading } = useAuth();

  // ✅ login route ma być publiczny
  if (isLoginRoute) return <>{children}</>;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/admin/login");
  }, [loading, user, router]);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10">Ładowanie…</div>;
  }

  if (!user) return null;

  if (!isStaff(role)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <div className="text-lg font-semibold">Brak uprawnień</div>
        <div className="text-sm text-muted-foreground">
          Twoje konto nie ma roli moderatora/admina.
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut(auth);
            router.replace("/");
          }}
        >
          Wróć na stronę główną
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
