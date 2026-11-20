# SKF FeeTrack — Master Status Document

**Last updated:** 20 Nov 2026  
**Repo:** `SKF-FeeTrack` (branch `main`)  
**Purpose:** One place that records what you asked for, what we verified, what we planned, what is finished, and what remains.

---

## 0. Short version

- We verified a condensed restructuring plan against the real code in **FeeTrack** and **SKF-Karate**. No app behaviour was changed during the audit.
- The plan is: **same data, same money rules, 22 old screens → 10 destinations**, with one shared design system.
- The final design direction is **Dojo Ledger HUD** — a dark ledger with game-HUD chrome and pixel type used only for money and status words.
- **6 commits are done and committed on `main`.** They create the design foundation and partially adopt it on `/custom`.
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

These are DB- or owner-dependent and remain `UNKNOWN` until answered:

1. Training weekdays for **MPSC** and **Herohalli**, and whether batches differ.
2. Which balance matches the **real bank today** (Money waits for this; no new formula variants).
3. Are **walk-ins** acceptable through the admission form?
4. **Black Belt SQL results** before any BB code deletion.
5. BB SQL must be run read-only by the owner; no DB changes were made.

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

**Nothing has been pushed.**

### 5.2 Files created

- `DESIGN.md`
- `src/lib/cx.ts`
- `src/components/ui/AmountInput.tsx`
- `src/components/ui/HudBar.tsx`
- `src/components/ui/LedgerRow.tsx`
- `src/components/ui/MeterRing.tsx` (also exports `MeterBar`)
- `src/components/ui/SegmentedTabs.tsx`
- `src/components/ui/Sheet.tsx`
- `src/components/ui/StatTile.tsx`
- `src/components/ui/StatusPill.tsx`
- `src/components/ui/index.ts`
- `src/app/design-preview/page.tsx` (temporary preview, not linked from product navigation)
- `AGENTS.md`, `CLAUDE.md` (Next.js-generated agent rules; committed to keep tree clean)

### 5.3 Files modified

- `src/app/globals.css` — HUD tokens, pixel/mono utilities, hairlines, safe-area helpers, tap targets
- `src/app/layout.tsx` — loads Silkscreen and JetBrains Mono
- `src/components/common/ConfirmModal.tsx` — now wraps shared `Sheet`
- `src/app/custom/CustomPageClient.tsx` — uses `Sheet`, `SegmentedTabs`, `StatTile`, `LedgerRow`, `StatusPill`

### 5.4 Verification

Passed after every commit:

```
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--max-old-space-size=4096 npx next build
```

Visual check: dev server `PORT=3100 npm run dev`, preview at `http://127.0.0.1:3100/design-preview`.  
Screenshot checked at `/tmp/skf-design-preview3.png`; it caught and fixed the Pixelify `2,000` → `8,000` problem.

### 5.5 Current git state

```
branch: main
status: clean
HEAD:   e35b12a refactor(feetrack): use LedgerRow for custom activity rows
```

---

## 6. What is NOT done

- No real page has been fully rebuilt. `/custom` is only partially adopted.
- `/custom` still has old page header, description, action buttons, balance-math card, month group header, and empty state styling.
- No `PageShell` or `BottomNav` component exists yet.
- No navigation changes: no 10 destinations, no tabs, no More menu, no redirects.
- No BB cleanup in either app.
- No proration work, no new tables, no schedule actions.
- No receipt recomputation removal.
- No finance definition choice applied.
- No `api.ts` dead-wrapper cleanup.
- No mockups for the three hero screens (Today, Fees Month, Money Overview) at 375 and 1280.
- No push to remote.
- No DB reads or writes by this agent.

---

## 7. Next steps (ordered)

1. Rebuild `/custom` header and action buttons with `HudBar`/`PageShell` style.
2. Create `PageShell` + `BottomNav` so Today/Fees/Money reuse one shell.
3. Generate mockups for **Today**, **Fees Month**, **Money Overview** at 375 and 1280.
4. Rebuild Today, Fees, People, Money in that order.
5. Rebuild Events, Media, Shop, Settings, Insights.
6. Add redirects in `next.config.ts`, then remove old URLs one release later.
7. Only after owner answers: BB cleanup, proration, receipts fix, finance definition.
8. Final cleanup: dead wrappers, navigation tiles, audit parity.
9. Push / ship when you approve.

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
Use `git log --oneline -6` to confirm the six foundation commits are present before continuing.
