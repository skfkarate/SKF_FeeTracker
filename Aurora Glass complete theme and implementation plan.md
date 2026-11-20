# Aurora Glass: complete theme and implementation plan

Theme for SKF fees track. Version 1.0, 20 November 2026. Live preview of the look: https://claude.ai/artifact/KkrNTCVpQm5L5oonDShLJs

## 1. The idea in one minute

Aurora Glass is a dark, calm, premium look for a money app. Picture a night sky with a faint teal glow in one corner. The cards sit on top like frosted glass, so the glow shows through softly. Numbers are big and crisp. Only four colors are allowed to be loud, and each one means a payment status: green for paid, amber for pending, red for overdue, and blue for partly paid.

Why it suits a fee tracker:

- People open the app to answer one question fast: who has paid and who has not. The theme makes that answer the loudest thing on screen.
- Fees are a sensitive subject with families. Soft colors and calm wording ask politely instead of shouting.
- It looks modern and trustworthy, like a good banking app, but it uses no heavy images, so it stays quick on ordinary phones.
- It is general. Nothing is tied to karate or to one business, so it works for any class, tuition, or club.

This document has two halves. Sections 2 to 13 describe the theme: every color, font, card, and animation. Sections 14 to 18 are the plan for building it into your project, including a ready-made prompt for your coding assistant. A CSS file named aurora-theme.css comes with this document and holds every value below, ready to import.

Two words used throughout. A token is a named value, such as the page background color, defined once and reused everywhere, so one change updates the whole app. Glass means a card with a see-through fill and a soft blur, so the glow behind it shows faintly.

## 2. Design principles

Six rules decide every choice in the theme.

1. **One bold moment per screen.** On the dashboard it is the collected-money ring. Everything else stays quiet so that moment lands.
2. **Color is information.** Green, amber, red, and blue are reserved for payment status. The brand mint and cyan appear only in the ring, the highlighted chart bar, links, and focus outlines.
3. **Numbers are the heroes.** Amounts and totals are the biggest, clearest text on any screen.
4. **Never rely on color alone.** Every status has a word, so people who cannot tell colors apart read it just as fast.
5. **Calm money talk.** Overdue is shown clearly but never harshly: no flashing, no walls of red, no shaming words.
6. **Fast on any phone.** Blur and glow are used on a few large surfaces only, and one setting turns every effect off.

## 3. Color

All colors are tokens. The names below are the CSS variable names used in aurora-theme.css. Night mode is the default. Day mode swaps the values and changes nothing else.

### 3.1 Night mode (default)

| Token | Value | Used for |
| --- | --- | --- |
| --bg | #070A12 | Page background |
| --surface-solid | #0F1420 | Solid card color when glass is off, and very long lists |
| --glass | rgba(255,255,255,.045) | Card fill |
| --glass-hover | rgba(255,255,255,.06) | Fill of a clickable card on hover |
| --glass-strong | rgba(255,255,255,.08) | Menus, dialogs, toasts |
| --row-hover | rgba(255,255,255,.04) | A list row on hover |
| --divider | rgba(255,255,255,.06) | Lines between rows |
| --border | rgba(255,255,255,.09) | Card outlines |
| --border-strong | rgba(255,255,255,.16) | Hover outlines, secondary buttons |
| --border-control | rgba(255,255,255,.38) | Outlines of inputs and checkboxes |
| --text | #F1F4FA | Main text and numbers |
| --text-2 | #AEB6C8 | Labels and sub-lines |
| --text-3 | #9CA5BA | Captions and hints |
| --accent | #4FE3B6 | Mint: ring, highlighted bar, logo |
| --accent-2 | #22D3EE | Cyan: second color of the ring and bar gradient |
| --accent-text | #7CF0CF | Links, focus outline, selected tab text |
| --btn-primary-bg and --btn-primary-fg | #F1F4FA and #0A0D16 | The main button |
| --glow-teal | rgba(45,212,191,.20) | Aurora glow, top right |
| --glow-violet | rgba(109,91,255,.18) | Aurora glow, top left |

### 3.2 Day mode

| Token | Value | Used for |
| --- | --- | --- |
| --bg | #F3F5FA | Page background |
| --surface-solid | #FFFFFF | Solid cards and lists |
| --glass | rgba(255,255,255,.72) | Card fill (plus a soft shadow) |
| --glass-hover | rgba(255,255,255,.90) | Clickable card on hover |
| --glass-strong | rgba(255,255,255,.92) | Menus, dialogs, toasts |
| --row-hover | rgba(15,23,42,.035) | A list row on hover |
| --divider | rgba(15,23,42,.06) | Lines between rows |
| --border | rgba(15,23,42,.08) | Card outlines |
| --border-strong | rgba(15,23,42,.14) | Hover outlines, secondary buttons |
| --border-control | #78829A | Outlines of inputs and checkboxes |
| --text | #0B1220 | Main text and numbers |
| --text-2 | #4A5468 | Labels and sub-lines |
| --text-3 | #5E6779 | Captions and hints |
| --accent | #0E9F78 | Mint, deeper so it shows on light |
| --accent-2 | #0891B2 | Cyan, deeper |
| --accent-text | #0A7A5C | Links, focus outline, selected tab text |
| --btn-primary-bg and --btn-primary-fg | #0B1220 and #F8FAFC | The main button |
| --glow-teal | rgba(45,212,191,.18) | Aurora glow, top right |
| --glow-violet | rgba(109,91,255,.12) | Aurora glow, top left |

### 3.3 Status colors

These are the only loud colors in the app. Text is the color of the words on the pill. Fill is the pill background. Solid is used for dots, chart segments, and icons.

Night mode:

| Status | Text | Fill | Outline | Solid |
| --- | --- | --- | --- | --- |
| Paid | #6EEBC4 | rgba(79,227,182,.14) | rgba(79,227,182,.28) | #4FE3B6 |
| Pending | #FCD34D | rgba(251,191,36,.14) | rgba(251,191,36,.28) | #FBBF24 |
| Overdue | #FF9C9C | rgba(255,107,107,.16) | rgba(255,107,107,.30) | #FF6B6B |
| Partial | #A5CBFF | rgba(96,165,250,.16) | rgba(96,165,250,.30) | #60A5FA |
| Neutral | #AEB6C8 | rgba(255,255,255,.07) | rgba(255,255,255,.12) | #9CA5BA |

Day mode:

| Status | Text | Fill | Outline | Solid |
| --- | --- | --- | --- | --- |
| Paid | #046C4E | rgba(16,185,129,.14) | rgba(16,185,129,.30) | #059669 |
| Pending | #8A4B00 | rgba(245,158,11,.16) | rgba(245,158,11,.34) | #D97706 |
| Overdue | #B42318 | rgba(240,68,56,.12) | rgba(240,68,56,.28) | #D92D20 |
| Partial | #1D4ED8 | rgba(59,130,246,.12) | rgba(59,130,246,.28) | #2563EB |
| Neutral | #4A5468 | rgba(15,23,42,.06) | rgba(15,23,42,.12) | #5E6779 |

### 3.4 Avatar tints

Student avatars show initials on a soft tint. The four tints below were chosen to stay away from green, amber, and red, so an avatar never hints at payment status. Pick the tint from a simple hash of the student name (for example, the sum of the character codes, divided by 4, remainder), so each student always gets the same one.

| Tint | Night: text on fill | Day: text on fill |
| --- | --- | --- |
| Violet | #B9B1FF on rgba(139,124,255,.18) | #5B4FD1 on rgba(139,124,255,.16) |
| Sky | #9ED8FF on rgba(56,189,248,.14) | #0369A1 on rgba(56,189,248,.16) |
| Rose | #F5A6D0 on rgba(244,114,182,.14) | #BE185D on rgba(244,114,182,.16) |
| Slate | #C3CAD9 on rgba(148,163,184,.16) | #475569 on rgba(148,163,184,.18) |

### 3.5 Chart colors

- Current period (the ring and the highlighted bar): a diagonal gradient from --accent to --accent-2.
- Past periods (the other bars): Night rgba(255,255,255,.38), Day #7C8AA6.
- Empty track behind a ring or bar: Night rgba(255,255,255,.08), Day #E4E9F2.
- Anything that shows a payment status in a chart uses that status’s Solid color from 3.3.

### 3.6 Measured contrast

Contrast is how clearly two colors stand apart. These numbers were calculated with the standard accessibility formula (WCAG 2), after blending every see-through fill onto what is behind it. Ratios are written as, for example, 16.6 to 1. Re-measure whenever a color changes.

| Pair | Night | Day | Needed |
| --- | --- | --- | --- |
| Main text on a card | 16.6 to 1 | 18.7 to 1 | 4.5 |
| Secondary text on a card | 9.0 to 1 | 7.6 to 1 | 4.5 |
| Caption text on a card | 7.4 to 1 | 5.7 to 1 | 4.5 |
| Caption text over the brightest part of the glow | 4.9 to 1 | not applicable | 4.5 |
| Link text | 13.2 to 1 | 5.3 to 1 | 4.5 |
| Status pill text on its fill (lowest of the four) | 7.3 to 1 | 5.6 to 1 | 4.5 |
| Avatar initials (lowest of the four) | 7.3 to 1 | 5.1 to 1 | 4.5 |
| Main button text | 17.6 to 1 | 17.9 to 1 | 4.5 |
| Outline of an input, on page / on card | 3.5 / 3.2 to 1 | 3.5 / 3.9 to 1 | 3.0 |
| Focus outline | 14.3 to 1 | 5.3 to 1 | 3.0 |
| Ring, mint / cyan | 12.3 / 11.0 to 1 | 3.4 / 3.7 to 1 | 3.0 |
| Past chart bars | 3.6 to 1 | 3.5 to 1 | 3.0 |

### 3.7 Differences from the preview

The preview dashboard was a first look. This specification improves five things, and the CSS file follows this document, not the preview.

- Secondary and caption text are a little lighter, so they stay readable over the glow.
- The teal glow is 20% strength instead of 26%, for the same reason.
- Input outlines and past chart bars are brighter, so they are easy to see.
- Avatars use the four tints above. The preview borrowed status colors for them.
- Sub-lines under names use commas (“Beginners, paid 3 Nov”) instead of middle dots.

## 4. Typography

Two fonts with clearly different jobs, both free on Google Fonts.

- **Space Grotesk** for headings and big numbers (weights 600 and 700). It has a precise, slightly technical character that makes figures feel exact.
- **Inter** for everything else (weights 400, 500, 600). It stays clear at small sizes and has equal-width digits for tidy columns.

Fallback for both: system-ui, -apple-system, Segoe UI, Roboto, sans-serif.

| Name | Font | Size / line height | Weight | Letter spacing | Used for |
| --- | --- | --- | --- | --- | --- |
| Display | Space Grotesk | 52 / 56 px (phone 40 / 44) | 700 | -0.03em | The one big collected amount |
| Stat | Space Grotesk | 36 / 40 px | 700 | -0.02em | Pending and overdue totals |
| Page title | Space Grotesk | 28 / 34 px | 700 | -0.02em | Screen titles |
| Card title | Space Grotesk | 18 / 26 px | 600 | -0.01em | Card headings |
| Body | Inter | 15 / 24 px | 400 | 0 | Paragraphs and form text |
| Body strong | Inter | 15 / 24 px | 600 | 0 | Names and amounts in lists |
| Label | Inter | 14 / 20 px | 400 | 0 | Stat labels and field labels (text-2) |
| Small | Inter | 13 / 20 px | 400 | 0 | Sub-lines under names |
| Caption | Inter | 12 / 16 px | 500 | 0.01em | Pills, axis labels, hints |

Rules:

- Nothing is smaller than 12 px.
- Sentence case everywhere. No all-caps labels.
- Amounts in lists use equal-width digits (font-variant-numeric: tabular-nums), so the columns line up.
- Paragraphs stay under about 70 characters wide.
- Emphasis uses weight, not italics.

Loading the fonts: load only the weights listed above, and use font-display: swap so text shows at once. Hosting the font files yourself (the fontsource packages make this easy) is better than depending on a third-party server, which matters on slow connections. A Google Fonts link is fine to start with.

## 5. Layout, spacing, and shape

### 5.1 Spacing

Spacing follows a 4 px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (tokens --space-1 to --space-10). The gap between cards is 20 px. Card padding is 24 to 28 px. The space between page sections is 20 to 28 px.

### 5.2 Page layout and screen sizes

| Screen width | Layout |
| --- | --- |
| Up to 480 px (phone) | One column. Side padding 16 px. The big number is 40 px. In list rows the status pill moves under the amount. A bottom navigation bar replaces the top menu. |
| 481 to 820 px (small tablet) | One column. Side padding 24 px. |
| 821 to 1100 px | The top row keeps three cards. The main row becomes two columns (1.4 and 1). |
| 1101 px and up | Full layout. Top row 1.5 : 1 : 1. Main row 1.7 : 1. Content is centered, at most 1216 px wide, with 32 px side padding. |

Every tappable thing is at least 44 by 44 px, with at least 8 px between neighbors. List rows are 64 px tall by default, with an optional 48 px compact density.

### 5.3 Shape

| Thing | Corner radius |
| --- | --- |
| Cards | 20 px |
| Dialogs and bottom sheets | 24 px |
| Menus and pop-overs | 16 px |
| Text inputs | 12 px |
| Buttons, pills, search field | Fully round (999 px) |
| Avatars | Circle |
| Small chips and tooltips | 8 px |
| Checkboxes | 6 px |

Borders are always 1 px hairlines. The only exception is the 2 px focus outline.

## 6. Glass, glow, and depth

This is the signature of the theme. It is simple to build and must stay disciplined.

### 6.1 The glass recipe

```css
.glass {
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: 20px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-1);
}
```

Strong glass (menus, dialogs, toasts) uses --glass-strong, a 28 px blur, --border-strong, and the larger shadow.

### 6.2 The aurora glow

Two large, soft circles of light sit fixed behind everything and never move with scrolling.

- Teal: a 680 px circle centered 200 px in from the right edge and 100 px down from the top. It fades from --glow-teal at the center to transparent at 68% of its radius.
- Violet: a 600 px circle centered 80 px from the left edge and 100 px down. It fades from --glow-violet to transparent the same way.

They are painted by a fixed layer behind the page (body::before in the CSS file) that ignores clicks. The glow is still by default. A very slow drift (40 seconds, a few pixels) is available as an optional extra and is off unless you turn it on.

### 6.3 Depth levels and shadows

| Level | What | Fill and blur | Shadow token |
| --- | --- | --- | --- |
| 0 | Page | Solid --bg with the glow | none |
| 1 | Cards | --glass, blur 16 | --shadow-1 |
| 2 | Menus and pop-overs | --glass-strong, blur 28 | --shadow-2 |
| 3 | Dialogs and bottom sheets | --glass-strong, blur 28 | --shadow-3 |
| 4 | Toasts | --glass-strong, blur 28 | --shadow-2 |

Night shadows: --shadow-1 is a faint inner top highlight (inset 0 1px 0 rgba(255,255,255,.05)), --shadow-2 is 0 12px 40px rgba(0,0,0,.40), --shadow-3 is 0 24px 80px rgba(0,0,0,.55). Day shadows: --shadow-1 is 0 1px 2px rgba(16,24,40,.06) plus 0 8px 24px rgba(16,24,40,.06), --shadow-2 is 0 12px 32px rgba(16,24,40,.12), --shadow-3 is 0 24px 64px rgba(16,24,40,.18).

### 6.4 Rules that keep it classy and fast

- Glass only on large surfaces: cards, menus, dialogs. Never on rows, buttons, or pills.
- Never put glass inside glass. Inner areas use a plain tint, not a second blur.
- At most six blurred surfaces on screen at once on a phone.
- Text always sits on a card, never directly on the bright part of the glow.
- Keep the teal glow at or below 20% strength. The contrast numbers in 3.6 depend on it.
- Animate only movement and fading. Never animate the blur itself.

### 6.5 Fallbacks

- If the browser cannot blur (no backdrop-filter), cards use --surface-solid.
- If the person’s device asks for less transparency (prefers-reduced-transparency), the same solid fallback applies.
- A “Reduce effects” setting (the attribute data-fx="lite" on the page) switches to solid cards, removes the blur, keeps the glow static, and lightens the shadows. Offer it in settings, and consider turning it on automatically for very low-memory phones.

## 7. The payment status system

This is the heart of a fee tracker, so it has fixed rules.

### 7.1 The statuses

| Status | Meaning | Word on the pill | Icon (Lucide) | Color |
| --- | --- | --- | --- | --- |
| Paid | The full amount has been received | Paid | check-circle-2 | Green |
| Pending | Nothing paid yet and the due date has not passed | Pending | clock | Amber |
| Partial | Some money received, the rest still owed, not yet past due | Partial | contrast | Blue |
| Overdue | Money is still owed and the due date has passed | Overdue | alert-circle | Red |
| Waived or upcoming | The fee is cancelled, or not due yet | Waived, Upcoming | minus-circle | Neutral grey |

The pill shows a small dot and the word. On phones the dot becomes the icon. The word is always there, so color is never the only signal.

### 7.2 How the app decides a status

Compare calendar dates in the person’s own time zone (India Standard Time), not exact times.

1. If the fee is waived, the status is Waived.
2. If the amount still owed is zero or less, the status is Paid. If it is below zero, also show the credit, for example “₹500 credit”.
3. Otherwise, if today is after the due date (plus any grace days), the status is Overdue. If some money was paid, it is still Overdue, and the sub-line says how much, for example “₹1,000 of ₹2,000 paid”.
4. Otherwise, if some money was paid, the status is Partial.
5. Otherwise the status is Pending.

```js
export function feeStatus({ due, paid, dueDate, graceDays = 0, waived = false }, today = new Date()) {
  if (waived) return 'waived';
  if (due - paid <= 0) return 'paid';
  const lateAfter = new Date(dueDate);
  lateAfter.setDate(lateAfter.getDate() + graceDays);
  if (today > lateAfter) return 'overdue';
  return paid > 0 ? 'partial' : 'pending';
}
```

Before using this, make sure both dates are trimmed to midnight in India Standard Time, so a fee is not marked overdue a few hours early.

### 7.3 Totals and the ring

- **Expected** is the amount due on every fee in the month, excluding waived fees.
- **Collected** is the money received on those fees. Partial payments count.
- **Overdue** is the money still owed on fees past their due date.
- **Pending** is the money still owed on fees not yet past due, including partly paid ones.
- Collected plus Pending plus Overdue always equals Expected. Show a mismatch as a bug, never hide it.
- The ring percentage is Collected divided by Expected, rounded down, so it only reads 100% when everything is paid.

### 7.4 How status is shown

- A status pill (dot and word) in every list and on every student page.
- Pending and Overdue totals take the status text color. Collected uses the white-to-mint gradient.
- Rows are not tinted by status. A wall of red rows feels like an alarm, and the pill already says it.
- Sorting in the fee list: Overdue first (longest late at the top), then Partial, then Pending (soonest due first), then Paid (most recent first), then Waived.
