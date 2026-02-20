// src/modules/spiewnik/chords/chordpro.ts

export type ChordProLine = {
  /** Tekst bez akordów */
  lyrics: string;
  /** Linia akordów dopasowana do lyrics (spacje + znaki akordów) */
  chords: string;
  /** Czy linia była dyrektywą {..} (wtedy lyrics/chords mogą być puste) */
  isDirective?: boolean;
  /** Surowa dyrektywa, np. "{title: ...}" */
  directiveRaw?: string;
};

function padTo(str: string, len: number) {
  if (str.length >= len) return str;
  return str + " ".repeat(len - str.length);
}

/**
 * Renderuje jedną linijkę ChordPro:
 * "[D]Duchu [G]Święty" -> chords: "D     G" (z dopasowaniem), lyrics: "Duchu Święty"
 */
function renderChordProLine(line: string): ChordProLine {
  // Dyrektywy: {title: ...}, {comment: ...}, {soc}, {eoc} etc.
  const trimmed = line.trim();
  if (/^\{.*\}$/.test(trimmed)) {
    return { lyrics: "", chords: "", isDirective: true, directiveRaw: trimmed };
  }

  let lyrics = "";
  let chords = "";

  // aktualna pozycja w lyrics (liczona znakami)
  let pos = 0;

  const re = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line))) {
    const before = line.slice(lastIndex, m.index);
    // dopisz tekst przed akordem
    lyrics += before;
    pos += before.length;

    // dopasuj długość chords do aktualnej pozycji lyrics
    chords = padTo(chords, pos);

    // wstaw akord w linii akordów
    const chordText = (m[1] ?? "").trim();
    chords += chordText;

    // po akordzie nie zwiększamy pos (bo akord nie jest częścią lyrics)
    lastIndex = m.index + m[0].length;
  }

  // dopisz ogon
  const tail = line.slice(lastIndex);
  lyrics += tail;
  pos += tail.length;

  // wyrównaj chords do pełnej długości lyrics (żeby w monospaced ładnie wyglądało)
  chords = padTo(chords, pos);

  // usuń ewentualne końcowe spacje (opcjonalnie)
  // (ale zostawiamy, bo czasem pomaga w wyrównaniu w UI)
  return { lyrics, chords, isDirective: false };
}

/**
 * Parser ChordPro -> tablica linii (akordy + tekst).
 * Obsługuje:
 * - akordy w nawiasach kwadratowych: [C], [G/B], [Am7]
 * - dyrektywy w { } są oznaczane jako isDirective
 * - puste linie są zwracane jako {lyrics:"", chords:""}
 */
export function renderChordPro(body: string): ChordProLine[] {
  const src = (body ?? "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");

  return lines.map((ln) => {
    if (ln.trim() === "") return { lyrics: "", chords: "", isDirective: false };
    return renderChordProLine(ln);
  });
}