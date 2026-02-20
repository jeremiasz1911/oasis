"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

function DisabledTile({
  title,
  desc,
  className,
}: {
  title: string;
  desc: string;
  className?: string;
}) {
  return (
    <div
      className={cn("cursor-not-allowed", className)}
      aria-disabled="true"
      title="Wkrótce"
    >
      <Card className="opacity-70">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{title}</div>
              <div className="text-sm text-muted-foreground mt-1">{desc}</div>
            </div>
            <div className="rounded-full border px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              Wkrótce
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminHome() {
  const { user, role } = useAuth();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <div className="text-sm text-muted-foreground">
            {user?.email} • rola:{" "}
            <span className="font-medium text-foreground">{role}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/">Moduły</Link>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut(auth);
              location.href = "/";
            }}
          >
            Wyloguj
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* ACTIVE */}
        <Link href="/admin/songs" className="group">
          <Card className="transition-transform group-hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="text-lg font-semibold">Utwory (Śpiewnik)</div>
              <div className="text-sm text-muted-foreground mt-1">
                Dodawanie, edycja, usuwanie
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/categories" className="group">
          <Card className="transition-transform group-hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="text-lg font-semibold">Kategorie (Śpiewnik)</div>
              <div className="text-sm text-muted-foreground mt-1">
                Lista kategorii do filtrowania
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* DISABLED */}
        <DisabledTile
          title="Materiały"
          desc="Pliki, linki, organizacja"
        />

        <DisabledTile
          className="md:col-span-3"
          title="Integracja"
          desc="Wydarzenia / aktywności"
        />
      </div>
    </div>
  );
}