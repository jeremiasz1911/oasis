"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (user) router.replace("/admin");
  }, [authLoading, user, router]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardContent className="p-6 space-y-4">
          <div>
            <div className="text-xl font-semibold">Panel admina</div>
            <div className="text-sm text-muted-foreground">Zaloguj się jako moderator/admin</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@..." />
          </div>

          <div className="space-y-2">
            <div className="text-sm">Hasło</div>
            <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
          </div>

          {err ? <div className="text-sm text-destructive">{err}</div> : null}

          <Button
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setErr(null);
              setLoading(true);
              try {
                await signInWithEmailAndPassword(auth, email.trim(), pass);
                router.replace("/admin");
              } catch (e: any) {
                setErr(e?.message ?? "Błąd logowania");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Logowanie…" : "Zaloguj"}
          </Button>

          <Button variant="outline" className="w-full" onClick={() => router.replace("/")}>
            Wróć do modułów
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
