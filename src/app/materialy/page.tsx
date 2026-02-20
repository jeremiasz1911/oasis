import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MaterialyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Materiały</h1>
        <Button asChild variant="outline">
          <Link href="/">← Wróć</Link>
        </Button>
      </div>

      <p className="mt-4 text-muted-foreground">
        Tu zrobimy listy plików, podgląd, kategorie i uprawnienia.
      </p>
    </div>
  );
}
