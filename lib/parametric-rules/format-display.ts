/** Format rule-set effective start for admin UI (handles legacy seed dates). */
export function formatEffectiveStartLine(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (d.getUTCFullYear() <= 2001) {
    return '1 January 2000 (system anchor)';
  }
  return d.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export function effectiveStartCaption(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() <= 2001) {
    return 'Backdated seed row so every adjudication run resolves a rule set; not the date you published.';
  }
  return null;
}
