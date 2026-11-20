# DESIGN.md: Sumi Ledger

This file is the design contract for SKF FeeTrack. Every rebuilt page follows it.

## Vibe

A calm karate accountant's desk. Ink-green surfaces, warm paper text, one vermillion seal accent, and tabular numerals. It reads like a ledger kept by a senior instructor: precise, quiet and fast. No game chrome, no pixel type, no neon.

## Non negotiables

1. One primary action per screen.
2. Lists are ledger rows, not card grids. Cards only for real objects.
3. Money is set in tabular mono, right aligned. Never pixel or decorative.
4. Every create/edit/confirm is a bottom sheet.
5. Navigation appears once: bottom bar on phone, slim rail on desktop, full destinations in the account drawer. No dashboard shortcut copies.
6. Mobile first at 320px. 200% text zoom must not clip or scroll sideways.
7. A karate master sees money, people, attention and training signals first. Anything decorative goes.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--color-base` | `#0c100e` | page background |
| `--color-panel` | `#121714` | rows, sections |
| `--color-raised` | `#1a201c` | sheets, dialogs |
| `--color-paper` | `#f4efe3` | primary text, active tabs |
| `--color-ink` | `#171b18` | text on paper |
| `--color-hairline` | `#283029` | borders |
| `--color-text-dim` | `#aeb6ac` | secondary text |
| `--color-text-faint` | `#79827a` | tertiary text |
| `--color-brand` | `#c4503a` | seal, active nav mark |
| `--color-action` | `#d2a24a` | needs action |
| `--color-settled` | `#7fae90` | paid, complete, healthy |
| `--color-overdue` | `#d96656` | overdue, failed, error |

Focus ring: 2px `--color-action`, offset 3px.

## Type

| Job | Font | Class |
|---|---|---|
| UI and labels | DM Sans | default body |
| Titles and hero numbers | Newsreader | `.font-display` |
| Eyebrow labels | DM Sans | `.eyebrow` |
| Money, dates, IDs, dense numbers | IBM Plex Mono | `.numeric`, `.font-mono`, `.tnum` |

Sizes are fluid. Never use pixel or game fonts. Do not use mono for long prose. Do not use decorative caps where a normal label reads faster.

## Spacing, radius, motion

- Spacing scale: 4, 8, 12, 16, 24, 32.
- Radius: rows 12, cards 16, pills 999.
- Page padding: `clamp(0.75rem, 0.4rem + 1.4vw, 1.75rem)`.
- Motion: sheets 160ms, row stagger 20ms, fades 240ms. No count-up animation on money.
- Respect `prefers-reduced-motion`.

## Accessibility

- 44px minimum target.
- 4.5:1 contrast for text and icons.
- Focus visible on every control.
- Screen reader labels for icon-only buttons and pills.
- 320px viewport and 200% text zoom are release blockers if they clip.
- No information by color alone; pair status with a word.

## Component contract

Lives in `src/components/ui/`.

| Component | Job |
|---|---|
| `PageShell` | single fluid content shell plus nav chrome |
| `HudBar` | top bar: title, month, branch, search, bell, account |
| `LedgerRow` | dense ledger row with status spine and right-aligned amount |
| `StatusPill` | due, paid, partial, overdue, break, credit |
| `MeterBar`, `MeterRing` | quiet progress, never a game gauge |
| `Sheet` | bottom sheet used by all create/edit/confirm |
| `AmountInput` | large tabular money input |
| `StatTile` | compact metric with mono value |
| `SegmentedTabs` | section or range switch |

## Empty states

Never "No items found." Example: "Nothing due. June is fully paid."

## Website intelligence

The Insights destination answers the whole funnel, not just traffic:

- Visits, unique visitors, page views and returning visitors.
- Portal logins: attempts, successes and failures.
- Lead submissions and failures.
- Where visitors came from, which pages they saw, which devices they used.
- A unified signal feed of page views, visitor journeys and operational events.
- Home Practice watch/completion signals for instructors.

Every metric must be readable on a phone without horizontal scrolling. Tables may scroll inside their own panel only when the data genuinely cannot wrap.
