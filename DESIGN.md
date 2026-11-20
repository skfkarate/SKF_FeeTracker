# DESIGN.md: Aurora Glass v1.0

This file is the only visual contract for SKF FeeTrack. Every screen, sheet, modal, navigation surface and state follows it.

Source: `Aurora Glass complete theme and implementation plan.md` (v1.0, 20 Nov 2026), sections 1–7. Sections 8–18 and the referenced `aurora-theme.css` were not supplied; where the plan was silent, existing FeeTrack information architecture and workflows were preserved.

This is a **theme-only** migration. Status calculation, money rules, labels, routes, access and workflows are unchanged. Section 7.2–7.3 of the plan (status decision function and totals invariant) is **not implemented**; existing logic remains authoritative.

## Vibe

A quiet night sky above a glass ledger. Near-black base with a faint blue undertone, frosted glass cards, solid dark wells, large crisp numbers and one soft aurora glow. Calm, premium and fast — never playful, neon, game-like or decorative.

The reference screenshot and preview are theme references only. FeeTrack keeps its own information architecture, labels, workflows and alignment system.

## Non-negotiables

1. One bold moment per screen. On the dashboard it is the collected-money ring.
2. Numbers are the heroes: amounts and totals are the largest, clearest text.
3. Green, amber, red and blue are **payment-status colors only**. Mint and cyan appear only in the ring, highlighted chart bar, links, focus and selected tab text.
4. Every status has a word. Color is never the only signal.
5. Overdue is clear but calm: no flashing, no walls of red, no shaming words.
6. Glass is for large surfaces only — cards, menus, sheets, toasts. Never glass inside glass, rows, buttons or pills.
7. Mobile first at 320px. 200% text zoom must not clip or scroll sideways. Every target is at least 44 × 44px.
8. Teal is not a generic accent. Primary buttons use `--btn-primary-bg` / `--btn-primary-fg`.
9. Day mode swaps tokens only; it changes no layout or logic.
10. Reduce-effects falls back to solid cards and removes blur without changing content.

## Color tokens

Night is default. Day mode is `:root[data-theme="day"]`.

| Token | Night | Day | Use |
|---|---|---|---|
| `--bg` | `#030407` | `#f3f5fa` | Page background |
| `--surface-solid` | `#0b0e16` | `#ffffff` | Solid fallback and wells |
| `--glass` | `rgba(255,255,255,.045)` | `rgba(255,255,255,.72)` | Card fill |
| `--glass-hover` | `rgba(255,255,255,.06)` | `rgba(255,255,255,.90)` | Clickable card hover |
| `--glass-strong` | `rgba(255,255,255,.08)` | `rgba(255,255,255,.92)` | Menus, sheets, toasts |
| `--row-hover` | `rgba(255,255,255,.04)` | `rgba(15,23,42,.035)` | Row hover |
| `--divider` | `rgba(255,255,255,.06)` | `rgba(15,23,42,.06)` | Row dividers |
| `--border` | `rgba(255,255,255,.09)` | `rgba(15,23,42,.08)` | Card outlines |
| `--border-strong` | `rgba(255,255,255,.16)` | `rgba(15,23,42,.14)` | Hover / secondary borders |
| `--border-control` | `rgba(255,255,255,.38)` | `#78829a` | Input outlines |
| `--text` | `#f1f4fa` | `#0b1220` | Primary text |
| `--text-2` | `#aeb6c8` | `#4a5468` | Labels and sub-lines |
| `--text-3` | `#9ca5ba` | `#5e6779` | Captions and hints |
| `--accent` | `#4fe3b6` | `#0e9f78` | Ring and highlighted bar |
| `--accent-2` | `#22d3ee` | `#0891b2` | Second ring/bar gradient stop |
| `--accent-text` | `#7cf0cf` | `#0a7a5c` | Links, focus, selected tab text |
| `--btn-primary-bg` | `#f1f4fa` | `#0b1220` | Main button background |
| `--btn-primary-fg` | `#0a0d16` | `#f8fafc` | Main button text |
| `--glow-teal` | `rgba(45,212,191,.20)` | `rgba(45,212,191,.18)` | Top-right glow |
| `--glow-violet` | `rgba(109,91,255,.18)` | `rgba(109,91,255,.12)` | Top-left glow |

### Status colors

Status text, fill, outline and solid tokens are defined per theme. Only these status meanings may use them:

| Status | Word | Night text | Day text |
|---|---|---|---|
| Paid | Paid | `#6eebc4` | `#046c4e` |
| Pending | Due / Pending | `#fcd34d` | `#8a4b00` |
| Partial | Partial | `#a5cbff` | `#1d4ed8` |
| Overdue | Overdue | `#ff9c9c` | `#b42318` |
| Neutral | Waived / Upcoming / non-payment | `#aeb6c8` | `#4a5468` |

`StatusPill` renders a word with a dot on desktop and the matching Lucide icon on phones. Existing FeeTrack labels are preserved; non-payment statuses use neutral tones. On phones the pill sits under the amount. Rows are solid and never status-tinted.

Pending and overdue totals use their status text color. Collected totals use a white-to-mint gradient. Row amounts and IDs keep tabular figures; display amounts and stat values use Space Grotesk.

### Avatar tints

Avatars use four non-status tints selected by a stable hash of the name: violet, sky, rose and slate. They never use green, amber, red or blue status colors.

### Charts

Current period uses a diagonal `--accent` → `--accent-2` gradient. Past periods use `--chart-past`; empty tracks use `--chart-track`. Status segments use the status solid token.

## Typography

Two fonts only, self-hosted through `next/font`:

| Job | Font | Size / line height | Weight |
|---|---|---|---|
| Display and big numbers | Space Grotesk | 52/56px, 40/44px on phone | 600, 700 |
| Everything else | Inter | 15/24px body; 12/16px captions | 400, 500, 600 |

- Nothing is smaller than 12px.
- Sentence case everywhere. No all-caps labels.
- Amounts use tabular numerals so columns align.
- Emphasis uses weight, not italics.
- `font-display` maps to Space Grotesk; body, `numeric` and `font-mono` map to Inter with tabular figures.

## Layout, spacing and shape

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Card gap: 20px. Card padding: 24–28px. Section gap: 20–28px.
- Content width: `min(100%, 1216px)`.
- Side padding: 16px ≤480px, 24px from 481px, 32px from 1101px.
- Cards: 20px radius. Sheets: 24px. Menus: 16px. Inputs: 12px. Buttons and pills: fully round. Chips: 8px. Checkboxes: 6px.
- Borders are 1px hairlines; focus is the only 2px outline.
- Rows are 64px by default; compact density may be 48px.
- Keep one alignment axis: header → section title → card/row content → amount.

## Glass, glow and depth

The fixed glow is painted by `body::before`: a 680px teal circle 200px in from the right and 100px down, plus a 600px violet circle 80px from the left and 100px down. It does not scroll or capture clicks. Optional drift exists but is off by default.

Depth levels:

| Level | Surface | Treatment |
|---|---|---|
| 0 | Page | `--bg` with fixed glow |
| 1 | Cards | `--glass`, 16px blur, `--shadow-1` |
| 2 | Menus / popovers | `--glass-strong`, 28px blur, `--shadow-2` |
| 3 | Sheets / dialogs | `--glass-strong`, 28px blur, `--shadow-3` |
| 4 | Toasts | `--glass-strong`, 28px blur, `--shadow-2` |

Fallbacks: solid `--surface-solid` when blur is unsupported, when `prefers-reduced-transparency` is set, or when `data-fx="lite"` is chosen in the account menu. `prefers-reduced-motion` shortens all motion.

## Motion

- Sheets and fades: 220ms.
- Row stagger: 18ms.
- No money count-up.
- Never animate blur. Only movement and fading may animate.

## Accessibility

- 44px minimum targets with 8px between neighbors.
- Visible 2px `--accent-text` focus ring, offset 3px.
- 4.5:1 text contrast; 3:1 control outlines.
- Screen reader labels on icon-only buttons and status pills.
- 320px and 200% text zoom are release blockers if they clip.
- Status always includes a word.

## Navigation contract

- Phone: five fixed destinations plus **More**; desktop: the same items in a 72px rail.
- More sheet is the only place for Events, Media, Shop, Insights, Settings and Custom Ops.
- Legacy/public routes stay live where unique write workflows still live, but use `PageShell`.
- No role-based tab hiding and no duplicate dashboard shortcuts.
- The More sheet and account control are independent. The account menu also holds Night/Day and Full/Lite appearance controls.

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
