import type { Song } from "./types";

export const MOCK_SONGS: Song[] = [
  { id: "pan-jest-moca", title: "Pan jest mocą swojego ludu", categories: ["uwielbienie"] },
  { id: "abba-ojcze", title: "Abba Ojcze", categories: ["uwielbienie", "dzieci"], hasChords: true },
  { id: "krzyzu-chrystusa", title: "Krzyżu Chrystusa", categories: ["wielkopostne"], hasChords: true },
  { id: "zaufalem-panu", title: "Zaufałem Panu", categories: ["dziekczynienie"] },
  { id: "zawitaj-krolu", title: "Zawitaj Królu", categories: ["adwentowe"] },
];
