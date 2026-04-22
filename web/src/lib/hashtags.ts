export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/#[\p{L}\p{N}_]+/gu);
  if (!matches) return [];
  const seen = new Set<string>();
  return matches.filter(tag => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface TagCount {
  tag: string;
  count: number;
}

export function countHashtags(texts: (string | null | undefined)[]): TagCount[] {
  const map = new Map<string, { tag: string; count: number }>();
  for (const text of texts) {
    for (const tag of extractHashtags(text)) {
      const key = tag.toLowerCase();
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { tag, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
