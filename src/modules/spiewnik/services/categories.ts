import { db } from "@/lib/firebase/client";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import type { SongCategory } from "../types";

type CategoryDoc = {
  name: string;
  order?: number;
};

export async function fetchSongCategories(): Promise<SongCategory[]> {
  const col = collection(db, "songCategories");
  const qy = query(col, orderBy("order", "asc"), orderBy("name", "asc"));
  const snap = await getDocs(qy);

  return snap.docs.map((d) => {
    const data = d.data() as CategoryDoc;
    return {
      id: d.id,
      name: data.name ?? d.id,
      order: typeof data.order === "number" ? data.order : 0,
    };
  });
}
