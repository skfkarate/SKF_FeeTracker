# SKF FeeTrack — Master Status Document

**Last updated:** 20 Nov 2026  
**Repo:** `SKF-FeeTrack` (branch `main`)  
**Purpose:** One place that records what you asked for, what we verified, what we planned, what is finished, and what remains.

---

## 0. Short version

- We verified a condensed restructuring plan against the real code in **FeeTrack** and **SKF-Karate**. No app behaviour was changed during the audit.
- The plan is: **same data, same money rules, 22 old screens → 10 destinations**, with one shared design system.
- The final design direction is **Dojo Ledger HUD** — a dark ledger with game-HUD chrome and pixel type used only for money and status words.
- **13 implementation commits are on `main`.** They create the design foundation, add the shared shell/navigation, mock up the three hero screens, adopt the shell on the four primary destinations, and partially adopt the system on `/custom`. Documentation commits for this status file are separate and are not implementation work.
- Nothing is pushed. No database, backend logic, navigation, Black Belt cleanup, or proration work has been changed yet.
- Working tree is **clean**.

---

## 1. What you originally needed

### 1.1 The request

1. Verify a condensed FeeTrack restructuring plan against the actual code in both repos.
2. Check counts mechanically — especially "of 86 backend actions, how many have a screen today?"
3. Decide whether the plan is the **best possible** structure and layout approach.
4. Make the frontend **extremely good**, with creative pixel/arcade-style money typography — "too good to be true" — while still being a fast daily staff tool.
5. Implement the foundation, then continue step by step, committing work.

### 1.2 Constraints that were followed

- Read-only audit: no repo edits, installs, migrations, DB writes, production URLs, or git writes during the audit phase.
- Never print secrets; `.env*` and config values were masked.
- Cite file paths and line numbers.
- Distinguish **verified code reading** from **inference**.
- Use `UNKNOWN` plus exact human SQL when something could not be verified without the database.
- Outputs allowed during the audit: the report in `/home/krish/.opencode/plan/`, optional Desktop screenshots, and `/tmp` scratch.

---

## 2. What the audit found

### 2.1 Report location

Full report: `/home/krish/.opencode/plan/SKF-plan-verification.md`  
(Plan mode blocked writing to Desktop; copy with: `cp /home/krish/.opencode/plan/SKF-plan-verification.md /home/krish/Desktop/SKF-plan-verification.md`)

### 2.2 Audit score

| Section | Pass | Differs | Unknown |
|---|---:|---:|---:|
| Part 1 — claims checked | 6 | 9 | 0 |
| Part 2 — checks | 3 | 7 | 1 |
| Baselines | 4 | 0 | 0 |
| **Total** | **13** | **16** | **1** |

The "15 PASS" figure quoted earlier was the number of **claims in Part 1**, not passes. The correct total is **13 PASS / 16 DIFFERS / 1 UNKNOWN across 30 checks**.

### 2.3 Baselines (all passed)

| Repo | Command | Result |
|---|---|---|
| FeeTrack | `npx tsc --noEmit` | exit 0 |
| FeeTrack | `npm run lint` | exit 0 |
| SKF-Karate | `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` | exit 0 |
| SKF-Karate | `npx vitest run` | 30 files / 140 tests pass |

### 2.4 The 86-action mechanical check

Source of truth: `SKF-Karate/app/api/integrations/feetrack/route.ts` — 86 `case '<action>'` labels.

Method: map each action literal → every `@/lib/api` wrapper that sends it → every import in `src/app/**/page.tsx` and `src/components/**`. Server routes under `src/app/api/` were **not** counted as screens.

**Final settled count:**

| Bucket | Count |
|---|---:|
| Total backend actions | 86 |
| Actions with a client screen | 71 |
| Of those, Black Belt only | 2 |
| Survive after BB removal | 69 |
| Actions with no screen | 15 |

**The 2 BB-only actions:** `get_bb_candidates`, `update_bb_candidate`.

**The 15 with no screen:**

| Action | Why |
|---|---|
| `add_student` | Wrapper exists; backend deliberately throws (`route.ts:3144-3147`). |
| `allocate_exam_fee` | Dead wrapper, no caller. |
| `delete_extra_income` | Dead wrapper; `/finances` has add only. |
| `get_branch_counts` | Dead wrapper; literal only in `backend.ts` heavy-action list. |
| `get_exam_months` | Dead wrapper. |
| `get_financial_summary` | Dead wrapper; literal only in `backend.ts`; `/finances` uses command center. |
| `set_exam_month` | Dead wrapper. |
| `get_admission_application` | **Server-only, not dead** — backs `src/app/api/feetrack/admissions/[id]/profile-photo/route.ts`. |
| `finalize_event_results` | No client function anywhere. |
| `finalize_event_workflow` | No client function anywhere. |
| `generate_event_certificate_qrs` | No client function anywhere. |
| `prepare_event_certificate_qrs` | No client function anywhere. |
| `preview_whatsapp_reminder` | No client function anywhere. |
| `publish_event_workflow` | No client function anywhere. |
| `send_whatsapp_reminder` | No client function anywhere. |

**The 71 with a screen, grouped (shared actions listed once):**

- **Today (10):** `approve_payment_verification`, `get_admission_applications`*, `get_event_collections`*, `get_payment_verifications`, `get_push_config`, `get_shop_orders`*, `get_website_notifications`, `mark_website_notification_contacted`, `reject_payment_verification`, `save_push_subscription`
- **Fees (12):** `add_referral_credit`, `delete_referral_credit`, `get_referral_credits`, `get_student_credits`, `get_students`*, `mark_break`, `mark_discontinued`, `mark_non_recurring_paid`, `mark_paid`, `mark_paid_with_credit`, `resume_student`, `update_referral_credit`
- **People (4):** `get_admission_dashboard`, `reject_admission_application`, `update_admission_branch_settings`, `upsert_admission_promo_code`
- **Money (10):** `add_dev_expense`, `add_extra_income`, `add_removal`, `create_manual_student_fee`, `delete_dev_expense`, `delete_removal`, `get_custom_operations`, `get_dev_fund`, `get_finance_command_center`, `get_website_analytics`
- **Events (18):** `add_event_deposit`, `add_event_expense`, `assign_event_student`, `create_event`, `delete_event`, `generate_event_fees`, `get_event_certificates`, `get_event_gallery_photos`, `prepare_event_certificates`, `preview_event_fees`, `publish_event_certificates`, `publish_event_results`, `remove_event_student`, `save_event_results`, `search_event_athletes`, `sync_belt_exam_participants`, `update_event`, `upsert_event_fee_config`
- **Media (10):** `delete_gallery_photo`*, `delete_portal_video`, `delete_practice_folder`, `delete_practice_photo`, `get_gallery_photos`, `get_portal_videos`, `reorder_practice_content`, `upsert_gallery_photo`*, `upsert_portal_video`, `upsert_practice_folder`
- **Shop (3):** `get_shop_products`, `update_shop_order_status`, `upsert_shop_product`
- **Insights (1):** `get_home_practice_analytics`*
- **Settings (1):** `get_branch_timetables`
- **BB (2, removed):** `get_bb_candidates`, `update_bb_candidate`

`*` = also used by another destination.

### 2.5 Important discoveries

1. **`get_admission_application` must not be deleted** as "dead" — it powers the admissions photo download route. Put it in People.
2. **`sync_belt_exam_participants` must stay** — it is belt-exam related, but it is an Events screen action and Events belt-exam logic is protected.
3. **`get_portal_videos` the backend action has a screen** via `getPracticeLibraryAdmin`; only the `getPortalVideos` client wrapper is dead. Keep the action, drop the wrapper.
4. Seven backend actions have **no FeeTrack client caller at all**: `finalize_event_results`, `finalize_event_workflow`, `generate_event_certificate_qrs`, `prepare_event_certificate_qrs`, `preview_whatsapp_reminder`, `publish_event_workflow`, `send_whatsapp_reminder`.
5. BB override changed **stored money**, not just display: `fee-records.ts:229-243`, migration `038_black_belt_installment_fee_rows.sql`, migration `039_black_belt_partial_balance_rows.sql`.
6. Three finance formulas disagree: `/finances` uses `get_finance_command_center`; `/development` and `/analytics` use `get_dev_fund`; `/custom` uses `get_custom_operations`.
7. No `branch_training_schedules`, `branch_class_exceptions`, or attendance data exist. `batch` is free text. Branches are `M P Sports Club` and `Herohalli`.
8. `feetrack/data` proxy forwards any action with **no allowlist**; backend role enforcement is event-write-only.
9. PWA manifest has no `shortcuts`; service worker has no `fetch`/cache handler.
10. FeeTrack PDF recomputes receipt amounts at `src/lib/receipts/monthly.ts:140-142`, while the backend already stores the charged amount snapshot (`src/server/services/fee-receipts.service.ts:214-236`).
11. `src/app/verifications/page.tsx` already redirects to `/pending-fees`.
12. Notification bell has 9 sources, badge, 2-minute poll, localStorage keys.
13. `src/lib/navigation.ts` has duplicated tile groups and `/analytics`, `/blackbelt` links.

### 2.6 Owner decisions still open

These are DB- or owner-dependent and remain `UNKNOWN` until answered. These are the **exact five owner questions** from the audit report:

1. For the five BB candidates, should unsettled Jun–Oct 2026 ₹2000 rows be **cancelled**, **restored** to their pre-override monthly fee, or **left as-is** with the program archived?
2. Should `039` balance rows (`fee_type='other'`) be **cancelled** or **kept** as collectible dues after the program ends?
3. Which finance number is authoritative for "money in the bank": `/finances` command center, `/development` dev fund, or `/custom` actual balance?
4. Is attendance ever going to be recorded, or should proration use only the billing start date and a manually maintained branch schedule?
5. Should student creation remain **admissions-only** (recommended, since `add_student` is deliberately blocked), or is a staff-side create flow required in this release?

Additionally needed for scheduling: **training weekdays for MPSC and Herohalli**, and whether batches differ.

BB SQL must be run read-only by the owner; no DB changes were made. The exact SQL is in Appendix A.6 below.

---

## 3. The restructuring plan

### 3.1 Destination map

22 pages → 10 destinations:

```
Bottom bar (phone):  Today · Fees · People · Money · More
More opens:          Events · Media · Shop · Insights · Settings
Desktop:             left rail instead of bottom bar
```

- **Today** = what needs action now
- **Fees** = students, dues, reminders, credits
- **People** = admissions, photos, directory
- **Money** = balances, activity, fund
- **More** = everything else

### 3.2 KEEP — do not touch

- All paid rows, receipts, proofs, audit logs
- All belt/grading assets: `/grading`, `/honours`, belt constants, shop belt locks, certificates, athlete ranks, event belt-exam exclusion
- 69 surviving backend actions with screens; 15 no-screen actions stay untouched too — just no screens built
- All 16 API handlers
- Access rules and read-only banners
- Bell's 9 data sources, 2-minute refresh, localStorage keys — move into Today unchanged
- Per-device reminder template
- Import parity check, "Try new layout" toggle, toasts, loading skeletons

### 3.3 REMOVE

- Old pages/URLs, but only after **one release of redirects**
- Black Belt 2026 in both apps — only after DB check; tables renamed `bb_*` → `archived_bb_*`, dropped 30+ days later
- Drawer as main navigation
- Per-page Navbar and duplicate dashboard tiles
- Centered modals → bottom sheets (now done)
- 5-second retry and bell popover
- 8 dead client functions in `api.ts` — **backend actions stay**

### 3.4 ADD

- `DESIGN.md` (done)
- 4 new backend actions: branch schedule get/save, proration preview, practice insights
- 2 new tables: branch training schedules + class exceptions
- Shared UI kit: page shell, header, stat strip, tabs, feed, sheets, amount input, empty/loading states
- Bottom nav and one tile list instead of seven
- Redirects in `next.config.ts`

### 3.5 CHANGE

| Old | New |
|---|---|
| Per-page Navbar and auth | One page shell handles it |
| Centered pop-up modals | Bottom sheets |
| Drawer menu as main navigation | Tabs + More |
| Bell popover | Bell badge plus Today queue |
| FeeTrack recalculates receipt amounts | Stored charged amount wins |
| Three finance formulas | One named balance (owner still confirms it) |
| Random spacing/fonts/radii | One design scale |
| "No items found" empty states | Hand-written empty states |

### 3.6 Backend workstreams (not started)

- **Proration:** two new schedule tables, pure integer half-up IST date-only function, `fee_records.metadata.proration`, `fee_audit_logs`, 409 `PRORATION_CHANGED`, amount remains the charged figure, no schedule = current behaviour.
- **Admission approval** becomes the one place that creates the joining fee row. No manual add-student form; `add_student` rejects creation.
- **Receipts:** stored charged amount wins; FeeTrack stops recomputing.
- **Money:** no new formula; wait for owner to name the true bank balance.
- **BB removal order:** FeeTrack first → SKF-Karate code → DB rename → drop 30+ days later. Protected rank/certificate/grading/honours/event-guard assets stay.
- **Access:** stays as today; no role-based tab hiding; security fix not included unless requested.
- **Rollout:** Fees behind a toggle; everything else direct.

### 3.7 Original build order

Navigation → shared kit → BB cleanup → proration → Fees → Today → People → Money → Events/Media/Shop/Settings → Insights → final cleanup.

**Actual order so far:** shared kit first, then `/custom` adoption. Navigation remains untouched.

---

## 4. Design decision — how we got here

### 4.1 Initial design review

The structure plan scored **5/10** as a design plan: strong IA (8/10), but weak visual hierarchy, states, accessibility, and system specificity. The conclusion: keep the structure, add one named visual direction.

### 4.2 Directions considered

| Direction | Verdict |
|---|---|
| Generic SaaS dashboard | Rejected — looks like every admin tool. |
| Gamified, playful, heavy color | Rejected — wrong for thousands of money rows. |
| Marketing-style hero pages | Rejected — beautiful first, slow forever. |
| Ledger Flow | Good base, but not creative enough for your ask. |
| **Dojo Ledger HUD** | **Chosen.** Ledger with game-HUD chrome; pixel type for money and status only. |

### 4.3 Final theme: Dojo Ledger HUD

**Vibe:** black dojo console. Hairline panels. Tabular money. Progress rings. Streak chips. Belt rank chips. Receipts feel like a stamp.

**Five rules:**

1. Density over cards. Rows with a left status spine, not boxes. Cards only for real objects.
2. Numbers are the hero. Money right-aligned, biggest text on screen.
3. Three state colors only: amber = needs action, teal = settled, red = overdue.
4. One accent: SKF red `#ff3333`, used only for primary action, brand mark, active tab.
5. Sheets, not dialogs. Game chrome never hides or delays a money action.

### 4.4 Locked tokens

| Token | Value |
|---|---|
| Base | `#000000` |
| Panel | `#0a0a0a` |
| Raised | `#121214` |
| Hairline | `#1f1f22` |
| Text | `#ffffff` / `#a1a1aa` / `#71717a` |
| Action | `#f5b841` |
| Settled | `#2dd4bf` |
| Overdue | `#ef4444` |
| Brand | `#ff3333` |
| Focus | white 2px, offset 3px |
| Spacing | 4, 8, 12, 16, 24 |
| Radius | rows 10, cards 14, pills 999 |
| Motion | sheets 180ms, row stagger 20ms, count-up 320ms, status flash 240ms |
| Touch | 44px minimum |
| Contrast | 4.5:1, visible focus, screen reader labels, 200% zoom |

### 4.5 Typography decision (important correction)

| Job | Font | Class |
|---|---|---|
| UI | Manrope | default body |
| Pixel labels and money | **Silkscreen** | `.font-pixel-label`, `.font-pixel` |
| Dates, IDs, dense numbers | JetBrains Mono | `.font-mono` |

- Type scale: 11 pixel caps, 13 body, 15 subtitle, 17 title, 20 stat, 24 panel number, 40 hero money.
- **Pixelify Sans was tried and rejected** — in a screenshot `2,000` read like `8,000`.
- **Press Start 2P was tried and rejected** — too heavy for dense numbers.
- **Silkscreen won.** Never use pixel font for dates or IDs where `O`/`0` or `I`/`1` can be misread.

### 4.6 Screen feel

| Screen | Feel |
|---|---|
| Today | Run list with left urgency spine: proofs, admissions, orders, callbacks |
| Fees | Ledger rows: name, mono amount, status; month groups split by hairlines |
| People | Directory cards only where people are real objects |
| Money | Huge tabular amount, small balance change underneath, one named reserve rule |
| More | Quiet, dense settings lists, not marketing cards |

### 4.7 Do not build

Card grid as main layout, carousels, fancy shadows/3D, XP/leaderboards/fake scores, pixel font for long text, multi-step game animation, sounds that cannot be turned off.

---

## 5. What is finished

### 5.1 Commits on `main`

| Commit | Message | What it did |
|---|---|---|
| `161a179` | `feat(feetrack): add Dojo Ledger HUD design foundation` | `DESIGN.md`, tokens, type utilities, font loading, `cx`, 8 UI primitives, preview route |
| `b44e0f4` | `refactor(feetrack): use shared Sheet for custom operations` | `/custom` due + money-out forms use shared `Sheet` |
| `5457315` | `refactor(feetrack): move confirm dialogs to the shared Sheet` | `ConfirmModal` converted to bottom sheet |
| `20d2a79` | `refactor(feetrack): use SegmentedTabs for custom activity filter` | Inline filter buttons replaced with shared `SegmentedTabs`; local `Sheet` type renamed `CustomSheet` |
| `71e8d4f` | `feat(feetrack): add StatTile and use it for custom stats` | New `StatTile`; four `/custom` summary cards adopt it |
| `e35b12a` | `refactor(feetrack): use LedgerRow for custom activity rows` | `rejected`/`verifying` states added; `/custom` rows use `LedgerRow`; 44px delete targets |
| `1f342bf` | `refactor(feetrack): adopt HudBar on custom operations` | Per-page Navbar replaced with `HudBar`; back link, search, bell, menu, year, and refresh moved into the HUD |
| `080f8d8` | `feat(feetrack): add PageShell and BottomNav` | Shared `PageShell`, responsive `BottomNav` with More sheet, adopted on `/custom` and preview |
| `9bf5e05` | `feat(feetrack): add hero screen design mockups` | Today, Fees, and Money mockups at 375 and 1280 using the shared HUD primitives |
| `b6f5136` | `refactor(feetrack): adopt PageShell on dashboard` | Today destination gets the shared HUD, navigation, search, bell, and account menu |
| `c1fa9fd` | `refactor(feetrack): adopt PageShell on pending fees` | Fees destination gets the shared HUD, branch/month context, search, bell, and account menu |
| `7899349` | `refactor(feetrack): adopt PageShell on admissions` | People destination gets the shared HUD, segmented tabs, stat tiles, and navigation |
| `948bf19` | `refactor(feetrack): adopt PageShell on finance command center` | Money destination gets the shared HUD, month/branch context, refresh, and navigation |

**Nothing has been pushed.** The 13 commits above are the only code changes. Documentation commits for this status file are separate and not listed here.

### 5.2 Files created

- `DESIGN.md`
- `src/lib/cx.ts`
- `src/components/ui/AmountInput.tsx`
- `src/components/ui/BottomNav.tsx`
- `src/components/ui/HudBar.tsx`
- `src/components/ui/LedgerRow.tsx`
- `src/components/ui/MeterRing.tsx` (also exports `MeterBar`)
- `src/components/ui/PageShell.tsx`
- `src/components/ui/SegmentedTabs.tsx`
- `src/components/ui/Sheet.tsx`
- `src/components/ui/StatTile.tsx`
- `src/components/ui/StatusPill.tsx`
- `src/components/ui/index.ts`
- `src/app/design-preview/page.tsx` (temporary preview, not linked from product navigation)
- `src/app/design-preview/today/page.tsx` (Today mockup)
- `src/app/design-preview/fees/page.tsx` (Fees mockup)
- `src/app/design-preview/money/page.tsx` (Money mockup)
- `AGENTS.md`, `CLAUDE.md` (Next.js-generated agent rules; committed to keep tree clean)

### 5.3 Files modified

- `src/app/globals.css` — HUD tokens, pixel/mono utilities, hairlines, safe-area helpers, tap targets
- `src/app/layout.tsx` — loads Silkscreen and JetBrains Mono
- `src/components/common/ConfirmModal.tsx` — now wraps shared `Sheet`
- `src/components/ui/HudBar.tsx` — optional `backHref`
- `src/app/custom/CustomPageClient.tsx` — uses `PageShell`, `Sheet`, `SegmentedTabs`, `StatTile`, `LedgerRow`, `StatusPill`
- `src/app/dashboard/page.tsx` — now uses `PageShell` and shared HUD controls
- `src/app/pending-fees/page.tsx` — now uses `PageShell` and shared HUD controls
- `src/app/admissions/page.tsx` — now uses `PageShell`, `SegmentedTabs`, and `StatTile`
- `src/app/finances/page.tsx` — now uses `PageShell` and shared HUD controls
- `src/app/design-preview/page.tsx` — now exercises `PageShell` and `BottomNav`

### 5.4 Verification

Passed after every commit:

```
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--max-old-space-size=4096 npx next build
```

Visual check: dev server `PORT=3100 npm run dev`, preview at `http://127.0.0.1:3100/design-preview`.  
Screenshot checked at `/tmp/skf-design-preview3.png`; it caught and fixed the Pixelify `2,000` → `8,000` problem.  
Shell screenshots: `/tmp/skf-shell-375.png` and `/tmp/skf-shell-1280.png`.  
Hero mockups: `/tmp/skf-today-{375,1280}.png`, `/tmp/skf-fees-{375,1280}.png`, `/tmp/skf-money-{375,1280}.png`.

### 5.5 Current git state

```
branch: main
status: clean
```

---

## 6. What is NOT done

- No real page has been fully rebuilt from the mockups. `/custom` is only partially adopted.
- `/custom` still has old description, action buttons, balance-math card, month group header, and empty state styling.
- `PageShell` and `BottomNav` are used by `/custom`, `/dashboard`, `/pending-fees`, `/admissions`, `/finances`, and preview routes.
- The remaining old routes still use their per-page navigation.
- Navigation is not rolled out globally: no 10-destination migration, no redirects. The tab bar and More sheet exist in the shared component and are visible on the four primary destinations only.
- No BB cleanup in either app.
- No proration work, no new tables, no schedule actions.
- No receipt recomputation removal.
- No finance definition choice applied.
- No `api.ts` dead-wrapper cleanup.
- Hero mockups exist as preview routes and screenshots, but no real page has been rebuilt from them yet.
- No push to remote.
- No DB reads or writes by this agent.

---

## 7. Next steps (ordered)

1. Rebuild Today, Fees, People, Money in that order from the approved mockups.
2. Roll `PageShell` + `BottomNav` out to Events, Media, Shop, Insights, and Settings.
3. Rebuild Events, Media, Shop, Settings, Insights.
4. Add redirects in `next.config.ts`, then remove old URLs one release later.
5. Only after owner answers: BB cleanup, proration, receipts fix, finance definition.
6. Final cleanup: dead wrappers, navigation tiles, audit parity.
7. Push / ship when you approve.

---

## 8. Gotchas / do not break

- Do **not** delete `get_admission_application` — admissions photo download depends on it.
- Do **not** remove `sync_belt_exam_participants` — it is an Events action, not BB.
- Keep the backend `get_portal_videos` action; only its client wrapper is dead.
- Money rows must show the **stored charged amount**, never a recomputed figure.
- No novelty in navigation — novelty lives in number treatment, rows, and motion.
- Game chrome must never slow a daily money task.
- `prefers-reduced-motion` must disable all authored motion.
- Branch names are `MPSC` and `Herohalli`; batch is free text, no attendance data.
- The `feetrack/data` proxy has no allowlist; do not assume action-level security.

---

## 9. How to resume

Read this file first, then `DESIGN.md` for the visual contract.  
Current working directory: `/home/krish/SKF Karate/website/SKF-FeeTrack`.  
Use `git log --oneline -13` to confirm the foundation and four-destination shell commits are present before continuing.

---
---

# Appendix A — Full audit detail

This appendix exists so this document stands alone. The original machine-readable report is still at `/home/krish/.opencode/plan/SKF-plan-verification.md`.

## A.1 Part 1 — all 15 plan claims checked

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1 | Exactly 22 page routes | **PASS** | `find src/app -name page.tsx` returns 22; `src/app/page.tsx` is login. |
| 2 | Exactly 16 API route handlers | **PASS** | `find src/app/api -name route.ts` returns 16; only `feetrack/data` is generic. |
| 3 | Analysis file line counts accurate | **PASS** | 9 files spot-checked exactly: `api.ts` 3028, `events/page.tsx` 2537, `NotificationBell.tsx` 1895, `StudentList.tsx` 1608, `CustomPageClient.tsx` 1226, integration `route.ts` 3369, `fee-operations.service.ts` 4751. |
| 4 | Shell files are small | **PASS** | `layout.tsx` 57, `error.tsx` 32, `global-error.tsx` 36, `not-found.tsx` 18. |
| 5 | Every page renders own Navbar + auth | **PASS** | 20 files render `<Navbar>` and 20 call `useFeeTrackAuth`; exceptions `/` and `/custom/page.tsx`. |
| 6 | All modals centered `fixed inset-0` | **DIFFERS** | Three shared components already portal: `CustomPageClient.tsx:876`, `NavMenu.tsx:311`, `ConfirmModal.tsx:55`. |
| 7 | Bell polls every 5s | **DIFFERS** | Bell refresh is 2 min (`NotificationBell.tsx:48`, `:874-877`); 5s is dashboard error retry (`dashboard/page.tsx:69`, `:132`). |
| 8 | `/custom?tab=dues` opens dues tab | **DIFFERS** | Dashboard links there (`dashboard/page.tsx:62`) but no `useSearchParams` in `CustomPageClient`; link is a no-op. |
| 9 | `/verifications` is live to retire | **DIFFERS** | Already a redirect at `verifications/page.tsx:1-5` → `/pending-fees`. |
| 10 | `?v=` segments exist today | **DIFFERS** | No `?v=` anywhere; only `students/[branch]` reads `?month`/`?year`. |
| 11 | `add_student` needs only a UI sheet | **DIFFERS** | Backend throws at `route.ts:3144-3147`; wrapper has zero callers. |
| 12 | BB override is display-only | **DIFFERS** | Writes stored money: `fee-records.ts:229-243`, migrations `038`, `039`. |
| 13 | Three finance screens should agree | **DIFFERS** | `/finances` command center; `/development` + `/analytics` dev fund; `/custom` custom operations. |
| 14 | Proration can key off existing branch/batch data | **DIFFERS** | No schedule/exception/attendance tables; `batch` is free text; branches only `M P Sports Club` / `Herohalli`. |
| 15 | PWA work is "bump cache + shortcuts" | **DIFFERS** | `public/manifest.json` has no `shortcuts`; `public/feetrack-sw.js` has no `fetch`/cache handler. |

## A.2 Part 2 — all 11 feasibility checks

1. **Ten destinations absorb 22 routes — PASS.** One trap: navigation is duplicated at `navigation.ts:163` (`OPERATION_GROUPS`) and `:194` (`DRAWER_GROUPS`), plus hardcoded dashboard tiles — three edits per destination change.
2. **Bottom tabs are greenfield — PASS.** No existing tab bar; requires moving 20 Navbar/auth call sites into one shell.
3. **Bell popover becomes badge-only — DIFFERS.** Badge already exists (`:1180-1231`); panel is 1,895 lines with nine sources at `:619-628`: payment proofs, admissions, shop orders, website leads, birthdays, poster reminders, event reminders, event updates, queue alerts. No push/queue backend beyond `push_subscriptions`.
4. **Remove per-page Navbars — DIFFERS (scope).** 20 files; real edit count is 18 pages plus 2 subcomponents. Removing before a shared layout exists drops the login guard.
5. **Old URLs redirect for one release — DIFFERS.** `next.config.*` has no `redirects()`. `/analytics` and `/blackbelt` still linked at `navigation.ts:79`, `:102`.
6. **Proration calendar has a data source — DIFFERS.** No schedule/exception/attendance. `student_billing_profiles.billing_start_date` exists (`admission.validator.ts:116`). `class_branches.class_days` is website copy, not enrolment.
7. **Proration write path is safe — PASS.** `fee_records.metadata JSONB NOT NULL DEFAULT '{}'` and `UNIQUE (skf_id, fee_type, month, year, source_key)` at `database/schema.sql:608-635`; `logAudit` at `fee-operations.service.ts:613`. Keep `amount` as charged figure.
8. **Receipts stay correct — DIFFERS.** Karate snapshots `row.amount` (`fee-receipts.service.ts:214-236`); FeeTrack recomputes `baseFee = originalFee || fee` and `amountReceived = baseFee - creditApplied` (`src/lib/receipts/monthly.ts:140-142`).
9. **BB removal safe — UNKNOWN (DB state), code verified.** Tables in `018`, six candidate IDs in `034`, ₹2000 in `038` for five candidates Jun–Oct 2026 (Roshan excluded), balance rows in `039`. Protected assets verified. Only SQL can reveal unpaid rows / labels / outstanding balances.
10. **Proxy can enforce roles — DIFFERS.** `src/app/api/feetrack/data/route.ts:11-27` forwards anything. Roles exist (`fee-operations.service.ts:46`), checks limited to event writes at `route.ts:390, 2837, 2972, 2978`.
11. **Design alignment is a token pass — DIFFERS.** Partial color tokens only; no radius/spacing/control tokens. Vertical rhythm drifts (`pt-24`, `pt-24 sm:pt-28`, `pt-24 sm:pt-32`); `finances`/`development` have no static `<h1>`; 5 currency helpers; a 28px control at `NavMenu.tsx:305`.

## A.3 Part 3 — inventories

**A. Routes (22):** `/` (login), `/dashboard`, `/pending-fees`, `/students/[branch]`, `/students/[branch]/[...id]`, `/finances`, `/development`, `/analytics`, `/custom`, `/events`, `/admissions`, `/messages`, `/notification-timeline`, `/shop`, `/gallery`, `/timetable`, `/portal-videos`, `/referrals`, `/profile-photos`, `/website-analytics`, `/blackbelt`, `/verifications` (redirect).

**B. API surface:** 16 route handlers; 86 backend actions; 87 exported client functions, 9 with zero callers: `invalidateCache`, `allocateExamFee`, `addStudent`, `getBranchCounts`, `getPortalVideos`, `getFinancialSummary`, `deleteExtraIncome`, `getExamMonths`, `setExamMonth`. 7 backend actions never named in FeeTrack (listed in §2.5).

**C. Dead/duplicated code:** `getFinancialSummary` unimported; `getDashboardStats` makes no API call, aggregates `getStudents` client-side (`api.ts:713-735`); `addStudent` dead wrapper; `getPortalLedger`/`getAdminLedger` exist but no `skfId` filter or `get_student_ledger` action; `navigation.ts` duplicates seven groups twice (`:163`, `:194`).

**D. Design measurements:** most containers `max-w-6xl`, `website-analytics` `max-w-7xl` (`:586`); inconsistent titles; page dialogs `fixed inset-0` + `glass-modal`; 5 currency helpers, 3 date helpers, no shared formatter; colors only, no radius/spacing/motion tokens, 272 radius utility occurrences.

**E. BB surface:** DELETE FeeTrack `src/app/blackbelt/page.tsx`, `temporary-black-belt-override.ts`, nav tile `:102`, Karate `app/portal/blackbelt/*` (4 files), `blackbelt-live.ts`, docs/scripts/tests. EDIT `StudentList.tsx:48,185-187,323-324,608,671,968,1193`, `events/page.tsx` BB mentions, `fee-records.ts:229-243`, `fee-operations.service.ts`, `fee-ledger.service.ts:441-453`, `event-fees.service.ts:537-598`. KEEP history in schema `018`/`034`/`038`/`039`; rename tables later.

**F. Protected assets:** `/grading`, `/honours`, belt constants, `requires_belt` gating (`app/shop/[productId]/page.tsx:75-79`, `:150`, `:284-286`), `black_belt_exam` certificate type, `currentBelt` reads, Events BB exclusion.

## A.4 Part 5 — ten plan-changing findings

1. Student creation is a backend gap, not a sheet — `add_student` hard-rejected.
2. `/verifications` is already retired — only stale links/tests need cleanup.
3. `/custom?tab=dues` is a no-op — fix link or implement tab params.
4. BB removal touches money — stored ₹2000 rows and `039` balance rows; decide restore vs cancel per row.
5. Finance screens cannot reconcile today — three formulas, three balances; name canonical number before redesign.
6. Proration has no calendar — two new tables plus admin UI are prerequisites.
7. `?v=` is greenfield — no segment support, no redirect layer.
8. Proxy is the only enforcement point — allowlist required before exposing new mutations.
9. Bell is already badged — panel is 1,895 lines / nine sources; relocating is a feature move.
10. Two receipt renderers — FeeTrack recomputes, Karate snapshots; choose one.

## A.5 The 12 required plan amendments

1. Add backend work for student creation (action + billing profile + initial fee rows + audit), or delete "add student in Fees" from scope.
2. Remove `/verifications` from retirement list; add "delete stale `/verifications` references" only.
3. Implement or remove `?tab=` handling before keeping the dashboard link; otherwise change the CTA.
4. Add BB data remediation before code deletion: classify each `fee_records` row (paid installment, unpaid installment, restored partial, balance row), then restore/cancel/keep. Rename `bb_*` only after this.
5. Pick one canonical finance definition (recommend `get_finance_command_center` bank position); make `/development`, `/analytics`, `/custom` reuse it or label scope. No formula edits without owner sign-off.
6. Add `branch_training_schedules` + `branch_class_exceptions` + admin UI to proration; keep `batch` display-only; "no schedule = current behaviour".
7. Add redirects phase (`next.config.ts` `redirects()` or route handlers) before removing `/analytics`, `/blackbelt`, `/verifications`; keep one release.
8. Add proxy action allowlist + role matrix; include `branchScope` checks for student/fee reads; remove the seven dead actions at the same time.
9. Re-scope the bell: keep badge, move nine source renderers to one Notifications destination, delete 2-minute poll only after push/queue behaviour is defined.
10. Choose one receipt source of truth — recommended: Karate snapshot for official receipts; FeeTrack displays the same snapshot plus `metadata.proration`; never recompute in FeeTrack.
11. Replace the seven-group navigation duplication with one config; update dashboard hardcoded tiles in the same change.
12. Add design tokens for radius/spacing/control height and one formatter module; include sub-44px controls in acceptance criteria.

**Status of amendments:** 12 is largely done in the design foundation (tokens + 44px targets; formatter module not yet). The rest are carried into the plan but not implemented.

## A.6 Human SQL — read-only, run in Supabase SQL editor

```sql
-- 1. BB rows that are still unsettled (must be decided before removal)
select skf_id, fee_type, month, year, amount, status, source_key, source_label,
       metadata->>'temporaryOverride' as override,
       metadata->>'baseAmountBeforeOverride' as base_amount
from fee_records
where skf_id in ('SKF20HE001','SKF20HE002','SKF20HE003','SKF21HE001','SKF21HE003')
  and year = 2026
  and month in ('June','July','August','September','October')
order by skf_id, case month when 'June' then 6 when 'July' then 7 when 'August' then 8
          when 'September' then 9 when 'October' then 10 end;

-- 2. Balance rows created by migration 039
select skf_id, fee_type, month, year, amount, status, source_key, source_label, metadata
from fee_records
where source_key like 'black_belt_balance:%'
order by skf_id, year, month;

-- 3. Receipts/proofs attached to BB months (do not delete)
select r.receipt_id, r.skf_id, r.month, r.year, r.amount, r.voided_at,
       p.id as proof_id, p.status as proof_status, p.amount as proof_amount
from fee_receipts r
left join fee_payment_proofs p on p.fee_record_id = r.fee_record_id
where r.skf_id in ('SKF20HE001','SKF20HE002','SKF20HE003','SKF21HE001','SKF21HE003')
  and r.year = 2026
  and r.month in ('June','July','August','September','October')
order by r.skf_id, r.month;

-- 4. Duplicate-key sanity before adding proration upserts
select skf_id, fee_type, month, year, source_key, count(*)
from fee_records
group by 1,2,3,4,5
having count(*) > 1;

-- 5. Canonical finance cross-check (compare with the three screens)
select date_trunc('month', paid_date) as month,
       sum(amount) filter (where status = 'paid') as collected
from fee_records
where year = 2026
group by 1 order by 1;
```

Run as a read-only role and export results. Do not paste service-role keys into chat.

## A.7 Coverage checklist

| Item | In this document |
|---|---|
| Original request + constraints | §1 |
| Audit report location + scores | §2.1–2.2 |
| Baselines | §2.3 |
| 86-action screen map + full lists | §2.4 |
| Key discoveries | §2.5 |
| All 5 owner questions + scheduling question | §2.6 |
| 22 → 10 destinations | §3.1 |
| Keep / Remove / Add / Change | §3.2–3.4 |
| Backend workstreams + decisions | §3.5–3.6 |
| Build order | §3.7 |
| Design journey + final theme + tokens | §4 |
| Font corrections | §4.5 |
| Commits, files, verification | §5 |
| Not done + next steps + gotchas | §6–8 |
| Full 15 claims | A.1 |
| Full 11 feasibility checks | A.2 |
| Full inventories A–F | A.3 |
| Ten findings + 12 amendments | A.4–A.5 |
| Exact human SQL | A.6 |

