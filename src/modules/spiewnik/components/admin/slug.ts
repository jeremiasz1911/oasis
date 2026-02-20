import { normalizeText } from "../../utils";

export function slugifyTitle(title: string) {
  const n = normalizeText(title);
  return n
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
