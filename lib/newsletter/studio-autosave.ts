/**
 * Pure helpers for newsletter studio autosave so agent live-sync cannot be
 * clobbered by a stale debounced PUT.
 */

export function shouldRunScheduledAutosave(input: {
  scheduledGeneration: number;
  currentGeneration: number;
  scheduledHtml: string;
  currentHtml: string;
}) {
  return (
    input.scheduledGeneration === input.currentGeneration &&
    input.scheduledHtml === input.currentHtml
  );
}

/** After a PUT finishes, re-save if the editor moved on while the request was in flight. */
export function shouldResaveAfterPersist(input: {
  attemptedHtml: string;
  currentHtml: string;
}) {
  return input.attemptedHtml !== input.currentHtml;
}

export function bumpSaveGeneration(current: number) {
  return current + 1;
}
