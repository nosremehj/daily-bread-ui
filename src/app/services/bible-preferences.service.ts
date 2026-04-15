import { Injectable, signal } from '@angular/core';

export type BibleVersionCode = 'nvi' | 'ara' | 'ntlh';

const STORAGE_KEY = 'daily-bread-bible-version';

export function normalizeBibleVersion(raw: string | null | undefined): BibleVersionCode {
  const v = (raw ?? 'nvi').toLowerCase();
  if (v === 'kjv' || v === 'acf') {
    return 'ntlh';
  }
  if (v === 'ara' || v === 'ntlh') {
    return v;
  }
  return 'nvi';
}

@Injectable({ providedIn: 'root' })
export class BiblePreferencesService {
  readonly version = signal<BibleVersionCode>(this.readStored());

  setVersion(next: BibleVersionCode): void {
    this.version.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  private readStored(): BibleVersionCode {
    try {
      return normalizeBibleVersion(localStorage.getItem(STORAGE_KEY));
    } catch {
      return 'nvi';
    }
  }
}
