import type { BibleBookMeta } from '../services/bible.service';

/** Remove acentos e normaliza espaços. */
export function normalizeBookQuery(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

/** Troca prefixos romanos comuns no início (ex.: "II Reis" → "2 reis"). */
export function expandLeadingRomanNumerals(s: string): string {
  const t = s.trim();
  const m = t.match(/^((?:i{1,3}|iv|v|vi{0,3}|ix|x|xi{0,3}|xii|xiii|xiv|xv))\s+(.*)$/i);
  if (!m) {
    return t;
  }
  const rom = m[1].toUpperCase();
  const rest = m[2];
  const map: Record<string, string> = {
    I: '1',
    II: '2',
    III: '3',
    IV: '4',
    V: '5',
    VI: '6',
    VII: '7',
    VIII: '8',
    IX: '9',
    X: '10',
    XI: '11',
    XII: '12',
    XIII: '13',
    XIV: '14',
    XV: '15'
  };
  const digit = map[rom];
  return digit ? `${digit} ${rest}` : t;
}

/**
 * Encontra o número do livro (1–66) a partir do rótulo vindo do plano/PDF,
 * comparando com a lista da API para a versão atual.
 */
export function resolveBookNumberFromLabel(books: BibleBookMeta[], pdfBookName: string): number | null {
  const raw = pdfBookName.trim();
  if (!raw) {
    return null;
  }
  const expanded = expandLeadingRomanNumerals(raw);
  const q = normalizeBookQuery(expanded);
  const qShort = normalizeBookQuery(raw);

  let best: { number: number; score: number } | null = null;

  for (const b of books) {
    const name = normalizeBookQuery(b.name);
    const abbrev = normalizeBookQuery(b.abbrev);

    let score = 0;
    if (name === q || name === qShort) {
      score = 100;
    } else if (q === name || qShort === name) {
      score = 100;
    } else if (name.includes(q) || q.includes(name)) {
      score = 85;
    } else if (qShort !== q && (name.includes(qShort) || qShort.includes(name))) {
      score = 82;
    } else if (abbrev && (abbrev === q || abbrev === qShort || q.includes(abbrev) || abbrev.includes(q))) {
      score = 75;
    } else {
      const qTokens = q.split(' ').filter((t) => t.length > 1);
      if (qTokens.length && qTokens.every((t) => name.includes(t))) {
        score = 65;
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { number: b.number, score };
    }
  }

  return best && best.score >= 65 ? best.number : null;
}
