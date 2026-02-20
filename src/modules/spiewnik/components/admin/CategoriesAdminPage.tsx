"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Tags } from "lucide-react";

import { fetchSongCategories } from "../../services/categories";
import { removeCategory } from "../../services/categories.mutate";
import type { SongCategory } from "../../types";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import CategoryFormDialog from "./CategoryFormDialog";

export default function CategoriesAdminPage() {
  const [items, setItems] = useState<SongCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<SongCategory | null>(null);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchSongCategories();
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
  }, []);

  const openCreate = () => {
    setDialogMode("create");
    setSelected(null);
    setDialogOpen(true);
  };

  const openEdit = (c: SongCategory) => {
    setDialogMode("edit");
    setSelected(c);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tags className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-semibold">Admin • Kategorie Śpiewnika</h1>
            <div className="text-sm text-muted-foreground">Tworzenie / edycja / usuwanie kategorii</div>
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

      {err ? <div className="text-sm text-destructive">{err}</div> : null}

      <div className="grid gap-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Ładowanie…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Brak kategorii. Dodaj pierwszą.</div>
        ) : (
          items.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">{c.id}</Badge>
                    <Badge variant="secondary" className="text-xs">order: {c.order}</Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEdit(c)}>
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
                        <AlertDialogTitle>Usunąć kategorię „{c.name}”?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await removeCategory(c.id);
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

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initial={selected ? { id: selected.id, name: selected.name, order: selected.order } : null}
        onSaved={reload}
      />
    </div>
  );
}
