import { db } from "@/lib/firebase/client";
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

export async function createCategory(input: { id: string; name: string; order: number }) {
  await setDoc(doc(db, "songCategories", input.id), {
    name: input.name,
    order: input.order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCategory(input: { id: string; name: string; order: number }) {
  await updateDoc(doc(db, "songCategories", input.id), {
    name: input.name,
    order: input.order,
    updatedAt: serverTimestamp(),
  });
}

export async function removeCategory(id: string) {
  await deleteDoc(doc(db, "songCategories", id));
}
