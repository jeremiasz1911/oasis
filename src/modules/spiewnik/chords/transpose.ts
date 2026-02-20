/**
 * Transposition helper for ChordPro chords inside [ ... ].
 * Supports Polish/German notation:
 * - H = B natural
 * - B = Bb (B-flat)
 * Also supports #, b, ♯, ♭ and slash bass chords (D/F#).
 */

function normalizeAccidentals(s: string) {
  return s.replace(/♯/g, "#").replace(/♭/g, "b");
}

const NOTES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
const NOTES_FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"] as const;

// Polish mapping: H = B, B = Bb
const NOTES_PL_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","H"] as const;
const NOTES_PL_FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","B","H"] as const;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function noteIndexEnglish(note: string): number | null {
  const n = note as any;
  const i1 = NOTES_SHARP.indexOf(n);
  if (i1 >= 0) return i1;
  const i2 = NOTES_FLAT.indexOf(n);
  if (i2 >= 0) return i2;
  return null;
}

function noteIndexPolish(root: string, accidental: string): number | null {
  // root: A-G or H or B (special)
  // In PL: H = B natural, B = Bb
  if (root === "H") return 11; // B natural
  if (root === "B" && accidental === "") return 10; // Bb
  // fallback to english with accidental
  const n = root + accidental;
  return noteIndexEnglish(n);
}

function transposeNoteToken(token: string, steps: number): string {
  const t = normalizeAccidentals(token).trim();
  if (!t) return token;

  // Match root note (A-G, H, B) + optional accidental (#/b)
  const m = /^([A-GHB])([#b]?)(.*)$/.exec(t);
  if (!m) return token;

  const root = m[1];
  const accidental = m[2] ?? "";
  const rest = m[3] ?? "";

  const isPolishStyle = root === "H" || root === "B";

  const idx = isPolishStyle ? noteIndexPolish(root, accidental) : noteIndexEnglish(root + accidental);
  if (idx == null) return token;

  const next = mod(idx + steps, 12);

  // Decide output spelling:
  // - If original had flat -> keep flats
  // - If original had sharp -> keep sharps
  // - For PL: preserve H/B convention (B means Bb, H means B)
  const prefersFlat = accidental === "b";
  const prefersSharp = accidental === "#";

  let outRoot: string;

  if (isPolishStyle) {
    if (prefersFlat) outRoot = NOTES_PL_FLAT[next];
    else if (prefersSharp) outRoot = NOTES_PL_SHARP[next];
    else {
      // 'H' or 'B' without accidental: keep PL but choose flats for black keys by default
      outRoot = NOTES_PL_FLAT[next];
    }
  } else {
    if (prefersFlat) outRoot = NOTES_FLAT[next];
    else if (prefersSharp) outRoot = NOTES_SHARP[next];
    else {
      // default: sharps (common in guitar charts)
      outRoot = NOTES_SHARP[next];
    }
  }

  return `${outRoot}${rest}`;
}

export function transposeChord(chord: string, steps: number): string {
  if (!steps) return chord;

  const s = normalizeAccidentals(chord);
  const parts = s.split("/");
  const main = parts[0] ?? "";
  const bass = parts[1];

  // transpose main chord root
  const mainT = transposeNoteToken(main, steps);
  if (!bass) return mainT;

  // transpose bass note token only (it may include modifiers rarely; treat whole)
  const bassT = transposeNoteToken(bass, steps);

  return `${mainT}/${bassT}`;
}

export function transposeChordPro(body: string, steps: number): string {
  if (!steps) return body;

  return body.replace(/\[([^\]]+)\]/g, (_m, inner) => {
    const t = (inner ?? "").trim();
    if (!t) return "[]";
    return `[${transposeChord(t, steps)}]`;
  });
}
