# DESIGN.md: Dojo Ledger HUD

This file is the design contract for SKF FeeTrack. Every rebuilt page follows it.

## Vibe

A karate dojo money console. It reads like a modern ledger with a game HUD around it. Pixel type is used for money and status labels only. Dense work stays crisp with a tabular mono. Nothing decorative hides a money action.

## Non negotiables

1. One primary action per screen.
2. Lists are rows, not card grids. Cards only for real objects.
3. Money is the biggest text, right aligned, tabular.
4. Every create/edit/confirm is a bottom sheet.
5. Game chrome never blocks or slows a money action.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--color-base` | `#000000` | page background |
| `--color-panel` | `#0a0a0a` | rows, sections |
| `--color-raised` | `#121214` | sheets, cards |
| `--color-hairline` | `#1f1f22` | borders |
| `--color-text` | `#ffffff` | primary text |
| `--color-text-dim` | `#a1a1aa` | secondary text |
| `--color-text-faint` | `#71717a` | tertiary text |
| `--color-action` | `#f5b841` | needs action, HUD focus |
| `--color-settled` | `#2dd4bf` | paid, receipts |
| `--color-overdue` | `#ef4444` | overdue, error |
| `--color-brand` | `#ff3333` | primary button, brand mark |

White focus ring, 2px, offset 3px.

## Type

| Job | Font | Class |
|---|---|---|
| UI | Manrope | default body |
| Pixel labels and money | Silkscreen | `.font-pixel-label`, `.font-pixel` |
| Dates, IDs, dense numbers | JetBrains Mono | `.font-mono` |

Sizes: 11 pixel caps, 13 body, 15 subtitle, 17 title, 20 stat, 24 panel number, 40 hero money.

Pixel font is for status words, action words, and money digits. Never use it for dates, IDs, or anything where `O` and `0`, or `I` and `1`, could be misread.

## Spacing, radius, motion

- Spacing scale: 4, 8, 12, 16, 24.
- Radius: rows 10, cards 14, pills 999.
- Motion: sheets 180ms, row stagger 20ms, amount count up 320ms once, status flash 240ms.
- Respect `prefers-reduced-motion`.

## Accessibility

- 44px minimum target.
- 4.5:1 contrast for text and icons.
- Focus visible on every control.
- Screen reader labels for icon-only buttons and pills.
- 200% text zoom must not clip.

## Component contract

Lives in `src/components/ui/`.

| Component | Job |
|---|---|
| `HudBar` | top bar: title, month, branch, search, bell, account |
| `SegmentedTabs` | month range or section switch |
| `LedgerRow` | dense row with left status spine |
| `StatusPill` | due, paid, partial, overdue, break, credit |
| `MeterRing` | collection progress |
| `MeterBar` | fund or target progress |
| `Sheet` | bottom sheet used by all create/edit/confirm |
| `AmountInput` | large tabular money input |
| `EmptyState`, `Skeleton`, toasts | reused from `src/components/common/` |

## Empty states

Never "No items found." Example: "Nothing due. June is fully paid."

## Build order

1. Tokens and fonts. Done.
2. Primitives. Done first cut here.
3. Adopt on `/custom` with no visual change, verified by screenshots.
4. Mockups for Today, Fees Month, Money Overview.
5. Rebuild pages in plan order.