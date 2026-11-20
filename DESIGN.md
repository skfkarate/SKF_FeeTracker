# DESIGN.md: Aurora Glass

This file is the only design contract for SKF FeeTrack. Every screen, sheet, modal, navigation surface and state follows it.

## Vibe

A quiet night sky above a glass ledger. Deep night-blue base, frosted blue-grey panels, near-black contrast wells, big clean numbers and one soft teal glow. It is minimal, precise and calm — never playful, neon, game-like or decorative.

The reference screenshot is a **theme reference only**. FeeTrack keeps its own information architecture, labels, workflows and alignment system.

## Non-negotiables

1. One primary action per screen.
2. Lists are dense ledger rows, not card grids. Cards are for real objects.
3. Money and dates use IBM Plex Mono with tabular numerals. Numbers are the largest text in a section.
4. Every create, edit and confirm action is a bottom sheet.
5. Navigation appears once: bottom bar on phone, slim rail on desktop, full destinations in the **More** sheet. There is no hamburger menu or full navigation drawer.
6. Account and logout live in a compact top-right account control.
7. Mobile first at 320px. 200% text zoom must not clip or scroll sideways.
8. Green, amber and red are **payment-status colors only**. Never use them for navigation, active states, generic errors, warnings, success toasts or charts.
9. Teal is the single accent for focus, active navigation, primary actions and the one soft ambient glow.
10. Near-black wells are used for inputs, insets and dense data areas to create “black contrast” without crushing the page.

## Color tokens

| Token | Hex / value | Use |
|---|---|---|
| `--color-base` | `#1a1c23` | page background |
| `--color-base-deep` | `#101219` | fixed deep backdrop under glass |
| `--color-panel` | `rgba(38, 49, 55, 0.54)` | frosted cards and rows |
| `--color-panel-strong` | `rgba(38, 49, 55, 0.78)` | dense rows, hovered panels |
| `--color-raised` | `rgba(29, 34, 44, 0.94)` | sheets, dialogs, menus |
| `--color-well` | `#0f1118` | inputs, insets, black contrast wells |
| `--color-text` | `#f1f4fa` | primary text and big numbers |
| `--color-text-dim` | `#b7c2d1` | secondary text |
| `--color-text-faint` | `#8794a6` | tertiary text and labels |
| `--color-hairline` | `rgba(189, 211, 222, 0.12)` | quiet borders |
| `--color-hairline-strong` | `rgba(189, 211, 222, 0.24)` | strong borders |
| `--color-accent` | `#4ae0bd` | primary, focus, active navigation, soft glow |
| `--color-accent-strong` | `#7af0d5` | accent hover |
| `--color-accent-ink` | `#061815` | text on accent |
| `--color-accent-dim` | `rgba(74, 224, 189, 0.10)` | accent wash |
| `--color-paid` | `#6fdca4` | **payment status only**: paid, credit |
| `--color-due` | `#fcd24e` | **payment status only**: due, partial, installment, verifying |
| `--color-overdue` | `#ff9b9b` | **payment status only**: overdue, rejected |

Focus ring: 2px `--color-accent`, offset 3px.

## Type

| Job | Font | Class |
|---|---|---|
| UI, titles and labels | DM Sans | default body, `.font-display` |
| Money, dates, IDs and dense numbers | IBM Plex Mono | `.numeric`, `.font-mono`, `.tnum` |

Two fonts only. No serif display face, no pixel fonts, no decorative caps. Use `text-wrap: balance` on headings. Body text stays at least 15px; labels stay at least 11px.

## Alignment system

- Content width: `min(100%, 1280px)`.
- Page padding: `clamp(14px, 4px + 1.4vw, 28px)`; compact controls use fixed-px minimums so 200% text zoom cannot shrink tap targets.
- Vertical rhythm: 4, 8, 12, 16, 20, 24, 32.
- Section gap: 20px on phone, 24px from tablet.
- Header: 68px; active rail mark and bottom tab mark use the same 28px teal pill.
- Rows: 12px radius, 14–16px vertical padding, title and amount share one baseline grid.
- Cards: 18px radius, 20px padding, 1px hairline border.
- Numeric columns are right aligned and use tabular figures.
- Sheets: 24px top radius, 20px horizontal padding, 16px internal gaps, safe-area footer.
- Keep one clear alignment axis: brand/header → section title → card/row content → amount.

## Motion

- Sheets: 180ms.
- Fades: 220ms.
- Row stagger: 18ms.
- No count-up animation on money.
- Respect `prefers-reduced-motion`.

## Accessibility

- 44px minimum target.
- 4.5:1 contrast for text and icons.
- Visible focus on every control.
- Screen reader labels for icon-only buttons and status pills.
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
| `AmountInput` | large tabular money input in a black well |
| `StatTile` | compact metric with mono value |
| `SegmentedTabs` | section or range switch |

## Navigation contract

- Phone: five fixed destinations plus **More**; desktop: the same items in a 72px rail.
- More sheet is the only place for Events, Media, Shop, Insights, Settings and Custom Ops.
- Legacy unique workflows remain reachable from their parent destinations.
- No role-based tab hiding and no duplicate dashboard shortcuts.
- The More sheet and account control are independent.

## Empty and error states

Never “No items found.” Use a specific, calm sentence such as “Nothing due. June is fully paid.” Generic errors use neutral glass and words/icons, not red. Red is reserved for overdue/rejected payments.

## Website intelligence

The Insights destination answers the whole funnel, not just traffic:

- Visits, unique visitors, page views and returning visitors.
- Portal logins: attempts, successes and failures.
- Lead submissions and failures.
- Sources, devices, pages and visitor journeys.
- Unified signal feed and Home Practice completion signals.

Every metric must be readable on a phone without horizontal scrolling. Tables may scroll inside their own panel only when data genuinely cannot wrap.
