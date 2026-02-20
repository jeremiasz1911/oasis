"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory } from "../../services/categories.mutate";
import { slugifyTitle } from "./slug";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: { id: string; name: string; order: number } | null;
  onSaved: () => void;
};

export default function CategoryFormDialog({ open, onOpenChange, mode, initial, onSaved }: Props) {
  const isEdit = mode === "edit";
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [order, setOrder] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (isEdit && initial) {
      setId(initial.id);
      setName(initial.name);
      setOrder(initial.order ?? 0);
    } else {
      setId("");
      setName("");
      setOrder(0);
    }
  }, [open, isEdit, initial]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) return;
    if (!id && name) setId(slugifyTitle(name));
  }, [open, isEdit, name, id]);

  const save = async () => {
    setErr(null);
    const cleanId = id.trim();
    const cleanName = name.trim();
    if (!cleanId) return setErr("Ustaw ID (slug).");
    if (!cleanName) return setErr("Nazwa jest wymagana.");

    setLoading(true);
    try {
      if (isEdit) await updateCategory({ id: cleanId, name: cleanName, order: Number(order) || 0 });
      else await createCategory({ id: cleanId, name: cleanName, order: Number(order) || 0 });

      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "Błąd zapisu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edytuj kategorię" : "Dodaj kategorię"}</DialogTitle>
        </DialogHeader>

        {err ? <div className="text-sm text-destructive">{err}</div> : null}

        <div className="grid gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Nazwa</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Np. Dziękczynienie" />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">ID (slug)</div>
            <Input value={id} onChange={(e) => setId(e.target.value)} disabled={isEdit} placeholder="dziekczynienie" />
            <div className="text-xs text-muted-foreground">
              {isEdit ? "ID niezmienne." : "Generuje się z nazwy (możesz zmienić)."}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Kolejność</div>
            <Input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              placeholder="np. 10"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button disabled={loading} onClick={save}>
            {loading ? "Zapisywanie…" : "Zapisz"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
