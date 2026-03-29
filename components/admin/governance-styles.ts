/**
 * Shared visual tokens for Governance dashboard + rule builder (spacing, borders, type).
 * Keeps panels, headers, and tables visually aligned.
 */
export const G = {
  /** Outer panel (builder / preview) */
  panel: 'rounded-xl border border-[#2a2a2a] bg-[#141414]',
  /** Summary strip (active rule set) */
  summaryPanel:
    'rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]',
  /** Tabbed content cards — use on Card `className` (Card already supplies radius + border shell) */
  contentCard: 'border-[#2a2a2a] bg-[#181818]',
  /** Small icon container (card headers, tabs) */
  iconTile:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/65',
  /** Larger icon (active rule strip) */
  iconTileLg:
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70',
  /** Top bar inside panel */
  panelHeader: 'flex shrink-0 items-center border-b border-white/[0.06] px-4 py-3',
  /** Bottom action bar */
  panelFooter: 'flex shrink-0 items-center border-t border-white/[0.06] px-4 py-3',
  /** Section eyebrow (uppercase label) */
  eyebrow: 'text-[11px] font-medium uppercase tracking-wider text-white/40',
  /** Subsection title inside scroll area */
  sectionTitle: 'text-[12px] font-semibold tracking-tight text-white/90',
  /** Field label (sentence case) */
  fieldLabel: 'text-[12px] font-medium text-white/65',
  /** Muted helper */
  helper: 'text-[11px] leading-relaxed text-white/38',
  /** Inputs */
  input:
    'h-9 rounded-md border border-[#2e2e2e] bg-[#0f0f0f] text-sm text-white placeholder:text-white/25',
  /** Inner card (threshold tile, ladder row) */
  insetCard: 'rounded-lg border border-white/[0.06] bg-white/[0.02] p-4',
  /** Table shell */
  tableShell: 'h-[min(432px,50vh)] w-full rounded-xl border border-[#262626] bg-[#121212]',
  /** Table header cell */
  th: 'h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-white/45',
  /** Table body cell */
  td: 'px-4 py-3 align-middle text-[12px] text-white/55',
} as const;

/** Matched builder + preview column height */
export const GOV_BUILDER_HEIGHT =
  'min-h-[300px] h-[min(528px,calc(100vh-240px))] max-h-[648px]';
