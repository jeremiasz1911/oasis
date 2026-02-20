// src/app/spiewnik/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import SpiewnikClient from "@/modules/spiewnik/components/SpiewnikClient";

function SpiewnikFallback() {
  return (
    <div className="mt-6 rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
      Ładowanie śpiewnika…
    </div>
  );
}

export default function SpiewnikPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Śpiewnik</h1>
        <Button asChild variant="outline">
          <Link href="/">← Wróć</Link>
        </Button>
      </div>

      <Suspense fallback={<SpiewnikFallback />}>
        <SpiewnikClient />
      </Suspense>
    </div>
  );
}