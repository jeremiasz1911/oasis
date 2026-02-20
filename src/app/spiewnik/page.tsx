import Link from "next/link";
import { Button } from "@/components/ui/button";
import SpiewnikClient from "@/modules/spiewnik/components/SpiewnikClient";

export default function SpiewnikPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Śpiewnik</h1>
        <Button asChild variant="outline">
          <Link href="/">← Wróć</Link>
        </Button>
      </div>

      <SpiewnikClient />
    </div>
  );
}
