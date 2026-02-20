"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Music2 } from "lucide-react";

import { fetchSongs } from "../../services/songs";
import type { Song } from "../../types";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import SongFormDialog from "./SongFormDialog";
import { removeSong } from "../../services/songs.mutate";
import { useSongCategories } from "../../hooks/useSongCategories";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SongsAdminPage() {
  const { labelFor } = useSongCategories();

  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);

  const [items, setItems] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchSongs({ q: dq, cat: "all", take: 500 });
      setItems(res);
    } catch (e: any) {
      setErr(e?.message ?? "Błąd pobierania");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [dq]);

  const openCreate = () => {
    setDialogMode("create");
    setSelectedId(undefined);
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    setDialogMode("edit");
    setSelectedId(id);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Music2 className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-semibold">Admin • Utwory</h1>
            <div className="text-sm text-muted-foreground">CRUD utworów do Śpiewnika</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin">← Dashboard</Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj po tytule (prefix)..." />
          <div className="text-sm text-muted-foreground sm:ml-auto">
            {loading ? "Ładowanie…" : `Wyniki: ${items.length}`}
          </div>
        </CardContent>
      </Card>

      {err ? <div className="text-sm text-destructive">{err}</div> : null}

      <div className="grid gap-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Ładowanie listy…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Brak utworów.</div>
        ) : (
          items.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">{s.id}</Badge>
                    {s.categories?.slice(0, 4).map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">{labelFor(c)}</Badge>
                    ))}
                    {s.categories && s.categories.length > 4 ? (
                      <Badge variant="secondary" className="text-xs">+{s.categories.length - 4}</Badge>
                    ) : null}
                    {s.hasChords ? <Badge className="text-xs" variant="outline">Akordy</Badge> : null}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/spiewnik/${s.id}`}>Podgląd</Link>
                  </Button>
                  <Button variant="outline" onClick={() => openEdit(s.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć utwór „{s.title}”?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await removeSong(s.id);
                            await reload();
                          }}
                        >
                          Usuń
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <SongFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        songId={selectedId}
        onSaved={reload}
      />
    </div>
  );
}
