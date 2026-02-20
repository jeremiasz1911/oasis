export type Song = {
  id: string;
  title: string;
  categories: string[]; // category ids (slugs)
  hasChords?: boolean;
};

export type SongCategory = {
  id: string; // slug (docId)
  name: string;
  order: number;
};

export type SongSectionKind =
  | "verse"
  | "chorus"
  | "bridge"
  | "intro"
  | "outro"
  | "other";

export type SongSection = {
  id: string; // stable id for reorder
  label: string; // e.g. "Zwrotka 1", "Refren"
  kind: SongSectionKind;
  body: string; // plain text or chordpro (if song.format = chordpro)
};

export type SongFull = {
  id: string;
  title: string;
  titleLower?: string;
  categories: string[];
  format: "plain" | "chordpro";
  hasChords: boolean;
  body: string; // legacy/aggregated
  sections?: SongSection[]; // preferred
};
