/**
 * Sanitizing helpers shared by the demo builder and the browser entry.
 *
 * The demo replays a real week: timestamps, durations, categories, and apps are
 * the ones Dayflow recorded. Only the model-facing copy (titles and summaries)
 * is replaced, because that text names documents, colleagues, and projects.
 * @module scripts/demo/fixture
 */

/** One card's replacement copy. */
export interface Copy {
  title: string;
  summary: string;
}

/**
 * Replace every card's title and summary in place.
 * @param payload - one panel payload (month, week, or a single day).
 * @param copy - record id to replacement copy, keyed by language.
 * @param language - which language to write.
 * @returns the same payload, sanitized.
 */
export function applyCopy<T>(payload: T, copy: Record<string, { en: Copy; zh: Copy }>, language: 'en' | 'zh'): T {
  const root = payload as { days?: { cards: { record_id: number; title: string; summary: string }[] }[]; cards?: { record_id: number }[] };
  const days = root.days ?? (root.cards === undefined ? [] : [root as never]);
  for (const day of days) {
    for (const card of day.cards) {
      const entry = copy[String(card.record_id)];
      if (entry === undefined) continue;
      card.title = entry[language].title;
      card.summary = entry[language].summary;
    }
  }
  return payload;
}
