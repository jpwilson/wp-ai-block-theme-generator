const LIBRARY_KEY = 'wp-theme-library-v1';
const PREVIEW_KEY = 'wp-theme-gen-preview-current';
const MAX_ENTRIES = 30;

export interface ThemeLibraryEntry {
  id: string;
  name: string;
  slug: string;
  description: string;
  siteType: string;
  style: string;
  colorMood: string;
  industry: string;
  createdAt: string;      // ISO date string
  zipBase64: string;
  fileCount: number;
  toolCallCount: number;
}

export interface PreviewPayload {
  zipBase64: string;
  slug: string;
}

// ── Library CRUD ──────────────────────────────────────────────────────────────

export function loadLibrary(): ThemeLibraryEntry[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ThemeLibraryEntry[];
  } catch {
    return [];
  }
}

export function saveToLibrary(entry: ThemeLibraryEntry): void {
  try {
    const entries = loadLibrary();
    const filtered = entries.filter((e) => e.id !== entry.id);
    const updated = [entry, ...filtered].slice(0, MAX_ENTRIES);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function deleteFromLibrary(id: string): ThemeLibraryEntry[] {
  try {
    const entries = loadLibrary().filter((e) => e.id !== id);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries));
    return entries;
  } catch {
    return [];
  }
}

// ── Preview handoff (new-tab) ─────────────────────────────────────────────────

export function storePreviewPayload(payload: PreviewPayload): void {
  try {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadPreviewPayload(): PreviewPayload | null {
  try {
    const raw = localStorage.getItem(PREVIEW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PreviewPayload;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}
