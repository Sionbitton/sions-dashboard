# Sion's Dashboard — CLAUDE.md

**Purpose:** This file is the living memory document for Claude (and Sion). At the start of every new conversation in this project, Claude reads this file FIRST so it understands what's been built, what conventions to follow, what to record, and what's next. After meaningful work, Claude updates the relevant sections at the bottom so the next session picks up where this one left off.

Last updated: 2026-05-10

---

## How to use this file (instructions for Claude)

1. **Read this file first.** Before answering questions, editing code, or making changes, open `CLAUDE.md` and read it end-to-end.
2. **Then read the actual source files** (`index.html`, `style.css`, `script.js`) when the user is asking for changes. Don't trust this summary as a substitute for the real code — it's a map, not the territory.
3. **Confirm before destructive work.** Renaming categories, deleting items, replacing the items array, rewriting whole files — always state the plan and get a "yes" before executing.
4. **MANDATORY: update this file after every code change.** See the "Auto-update protocol" section below — this is non-negotiable.
5. **Don't update for trivial things** — typos, single-character tweaks, or asking-and-answering questions don't need a log entry.

---

## ⚠️ Auto-update protocol (READ THIS — non-negotiable)

**Every time you (Claude, or any AI assistant) edit `index.html`, `style.css`, `script.js`, or any other source file in this project, you MUST also update this `CLAUDE.md` file before reporting the task as done.** This is not optional. The user wants this file to stay in sync with the code automatically — they should never have to remind you.

The required steps after ANY non-trivial code change:

1. **Bump the `Last updated:` date** at the top of this file to today's date.
2. **Append a new entry to the Recent changes log** (newest first), with: today's date, a one-sentence summary of what changed, and which files were touched.
3. **Update the architecture sections** if the change affects them — e.g. a new feature → "Dashboard features"; a new field → "Data model"; a new function → "Key functions"; a new file → "Files in this folder"; a new convention → "Conventions / things to preserve."
4. **Update Current focus / Next up** if the change finished something on that list, or if a new follow-up was created.
5. **Move resolved ideas out of "Open questions / ideas to revisit"** when they get acted on.

What counts as "non-trivial" (= must update this file): adding/removing/renaming a feature, function, field, file, category, or convention; changing the data model; changing the UI in a user-visible way; changing how data is migrated, validated, or persisted; changing default values; theme changes that affect more than one CSS variable.

What does NOT trigger an update: fixing a typo in a comment, adjusting whitespace, renaming a single internal variable with no behavior change, replying to a question without changing any file.

If the user asks you to make a code change and you finish without updating CLAUDE.md, you have not finished the task. Update this file as part of the same response that delivers the code change.

---

## Vision & Goals

**The feel.** The dashboard should feel **cozy, calm, and quiet** — not a productivity tool that nags, but a soft place Sion can come back to. Dark theme, rounded corners, gentle gradients, "Hello Sion. Take a breath." The opposite of a corporate Kanban board.

**The philosophy: do nothing, let the site do the work.** Sion should be as lazy as possible. The user types the bare minimum and the site fills in the rest. Every interaction the site can take off the user's hands, it should. Concretely, this is already realized as:

- **Auto-capitalize** the first letter of titles and descriptions as you type — no shift key needed.
- **Smart category suggestion** based on keywords in the title/description — Sion doesn't have to think about which bucket something goes in; the site asks.
- **Auto-jump to the right category** after saving so the new item is immediately visible.
- **"Save as draft / Needs Details"** so the user can dump a half-formed thought now and finish it later — no required-field friction.
- **Auto-derived status** (`detailStatus` = Complete vs. Needs Details) — the user never sets this; it's computed.
- **Silent migrations** of old saved data so the user never has to "upgrade" anything.
- **Tab counts, summary stats, and the active-tab dropdown sync** all happen automatically as items change.

**Future features should follow the same rule:** if a feature requires the user to do work the site could have done, redesign it. Smart defaults, auto-suggestions, and auto-cleanups beat forms and required fields. When in doubt: how can we make Sion do less?

**Non-goals.** This dashboard is intentionally NOT trying to be:

- A multi-user app or anything with accounts (the login is fake by design).
- A cloud-synced app — data lives in `localStorage`, backups are manual JSON files, and that's the point.
- A real project management tool (Asana / Jira / Linear) — no dependencies, no assignees, no comments, no notifications.
- A note-taking app like Notion — items are short, single-purpose, not long-form documents.
- A "build step" project — no bundler, no npm, no compilation. It opens by double-clicking `index.html`.

If a feature request would push the app toward any of these, flag it and discuss before building.

---

## What this project is

A personal productivity dashboard for Sion. Pure front-end: HTML + CSS + vanilla JavaScript, no build step, no backend. All data lives in `localStorage`. The user can export/import JSON backups to move data between browsers/devices. The site is opened directly by double-clicking `index.html` (or via a local server) — there's nothing to "deploy."

## Files in this folder

- **`index.html`** — Page structure for all three screens (login, welcome, dashboard). Contains the static category list as `<option>` defaults; JS rebuilds the real list on load.
- **`style.css`** — Dark theme. All colors come from CSS variables in `:root` (`--bg`, `--card`, `--accent`, etc.). Rounded card UI, mobile-friendly via a single `@media (max-width: 800px)` block at the bottom.
- **`script.js`** — All app logic: login/logout, screen routing, items CRUD, categories CRUD, search, filters, sort, export/import, live-capitalize, category guessing, normalization/migration of older saved data.
- **`sion-dashboard-backup-2026-05-04.json`** — A sample/test backup. Older shape (no `itemTypes`, `isDraft`, `detailStatus`) — `normalizeItem()` upgrades it on import.
- **`CLAUDE.md`** — This file. Living memory for the project.
- **`.gitignore`** — Ignores `*.json` and `.DS_Store`. (Note: this also ignores the sample backup above; that's intentional — backups are user data, not source.)
- **`.git/`** — Git repository (origin remote points to `main`). Don't touch internals.

## Three screens (in display order)

1. **Login screen** (`#login-screen`) — demo only, any username/password works. After submit, hidden and welcome screen shown. `localStorage.isLoggedIn = "true"` keeps the user signed in across reloads.
2. **Welcome / check-in screen** (`#welcome-screen`) — "Hello Sion. Take a breath." Quick-add form with the same field shape as the main form. Two actions: **Add Item** (saves and stays) and **Go to Dashboard** (jumps to main view).
3. **Dashboard** (`#dashboard`) — the main app.

## Dashboard features

- **Summary stats**: Total / Not Started / In Progress / Completed (computed across ALL items, ignores filters/search).
- **Category tabs** — clicking one filters the items list. Each tab shows a count badge (Dashboard tab shows total of everything).
- **Manage Categories panel** — add, rename, delete, restore defaults. **"Dashboard" is locked** (cannot be renamed or deleted — it's the home tab).
- **Add/Edit item form** — same form is reused for both modes. Fields: Title, Category, Description, item-type checkboxes (Task / Reminder / Calendar — multi-select), Date, Status, "Save as draft (Needs Details)" override.
- **Smart category suggestion** — keyword matching on title + description suggests a different (or new) category. Shown on both the welcome form and main form. Never silent — always asks "Use it?"
- **Items list** — live search (title + description), status filter pills (All / Not Started / In Progress / Completed), sort dropdown (newest, oldest, date soonest, date latest, A-Z, Z-A, by status).
- **Backup tools** — Export (downloads JSON of all items, filename uses today's date) and Import (replaces all items after confirmation, runs every imported item through `normalizeItem()` for backward-compat).
- **Live capitalization** — title and description auto-capitalize the first letter after a 150ms pause; what you see is what gets saved.

## Data model — item shape

```json
{
  "id": 1777945303169,
  "createdAt": 1777945303169,
  "title": "string",
  "category": "string",
  "description": "string",
  "itemTypes": ["Task", "Reminder", "Calendar"],
  "date": "YYYY-MM-DD or empty",
  "status": "Not Started | In Progress | Completed",
  "isDraft": false,
  "detailStatus": "Complete | Needs Details"
}
```

- `id` and `createdAt` are `Date.now()` timestamps. Older items missing `createdAt` fall back to `id` (also a `Date.now()` value).
- `itemTypes` is an array; multiple types can be selected. Sanitized via `sanitizeItemTypes()` — anything not in `VALID_ITEM_TYPES` is dropped.
- `isDraft` is the user's explicit override. `detailStatus` is derived: `"Needs Details"` if `isDraft` is true, otherwise computed by `computeDetailStatus()` based on whether title + at least one extra detail (description / date / itemType) are filled.
- Older items missing these fields are auto-upgraded by `normalizeItem()` on load and on import. The migrated form is written back to localStorage so each migration runs at most once per browser.

## Categories

Default list (in order):
Dashboard, Calendar, Learning, Schedule, Goals, Health/Gym, Addiction Tracker, eBay Tracker / Selling, Notes.

`CATEGORY_RENAMES` migrates older saved names (e.g. `eBay Tracker` → `eBay Tracker / Selling`).

## App state (top of script.js)

- `currentCategory` — selected tab (default `"Dashboard"`)
- `currentStatusFilter` — `"All"` by default
- `currentSearchQuery` — lowercased
- `currentSort` — default `"newest"`
- `editingId` — id of item being edited, or `null`
- `items` / `categories` — the persisted arrays loaded from localStorage at startup

## Key functions in script.js

When making changes, scan for these:

- **Screen routing**: `showWelcome()`, `showDashboard()`
- **Persistence**: `loadItems()`, `saveItems()`, `loadCategories()`, `saveCategories()` (load functions also do migration)
- **Backwards compat**: `normalizeItem()`, `sanitizeItemTypes()`, `validateImportedItems()`
- **Derived state**: `computeDetailStatus()`
- **Render layer**: `renderItems()`, `updateSummary()`, `updateTabCounts()`, `sortItems()`
- **Item CRUD**: `startEdit()`, `exitEditMode()`, `deleteItem()` (the form's `submit` handler does both add and update)
- **Category UI/CRUD**: `renderCategoryTabs()`, `renderCategoryDropdowns()`, `renderCategoryList()`, `renderCategoriesEverywhere()`, `handleRenameCategory()`, `handleDeleteCategory()`
- **Smart suggestions**: `guessCategory()`, `attachCategorySuggestion()`, `CATEGORY_KEYWORDS`
- **UI polish helpers**: `showDashboardFeedback()` (inline save confirmation under the main form), `updateSubmitButtonText()` (relabels the dashboard submit button based on edit + draft state), `updateWelcomeSubmitText()` (same idea for the welcome quick-add), `updateWelcomeSummaryHint()` ("X items waiting..." line on the welcome screen)
- **Misc**: `attachLiveCapitalize()`, `capitalizeFirstLetterOnly()`, `escapeHtml()`, `syncCategoryDropdownToTab()`, `switchToCategory()`

## Conventions / things to preserve

- **Vanilla JS only** — no frameworks, no bundler, no npm. Everything runs from a static file open.
- **Same form shape on welcome screen and main form** — if you add a field to one, add it to the other.
- **Dashboard category is locked** — never let it be deleted or renamed.
- **All theme colors come from CSS variables in `:root`** — change colors there, never inline.
- **Comments are descriptive and friendly** — match that voice when adding new code.
- **Every new field on items needs a path through `normalizeItem()`** so old saves don't break.
- **HTML in user input must go through `escapeHtml()`** before being injected into innerHTML.
- **Filters/search/sort never touch the items array** — they're applied inside `renderItems()` as a copy, so summary + tab counts always reflect raw totals.

---

## What to record in this file (and what not to)

These rules tell future Claude sessions what data to capture automatically and what to leave out. Follow them whenever you update this file.

### Always record (write to this file when it happens)

- **New files added to the folder** — name + one-line purpose under "Files in this folder."
- **New top-level features** — describe under the relevant section (Dashboard features, Three screens, etc.).
- **Schema changes to items or categories** — update the data model block AND add a `normalizeItem()` migration note.
- **New conventions Sion wants enforced** — add to "Conventions / things to preserve."
- **Renames and removals** — if a function/file/category is renamed or deleted, update every reference in this file and add a Recent changes log entry.
- **Decisions Sion makes about how the app should behave** — even if no code changed yet (record under "Open questions / ideas to revisit" until acted on, then promote).
- **Each meaningful coding session** — append one Recent changes log entry: date, one-sentence summary, and which files were touched.

### Never record

- **Sion's personal data inside the app** — actual item titles, descriptions, dates, passwords, real backup contents. The dashboard is for *his* life; this file is for the *code*.
- **Credentials or secrets** of any kind.
- **Long verbatim copies of source code** — link to function names instead. The source files are next to this one.
- **Conversation transcripts** or chit-chat. Outcomes only.
- **Speculation about features Sion didn't ask for.** If Claude has an idea, it goes in "Open questions / ideas to revisit" — never in the architecture sections as if it's real.
- **Trivial changes** — reformatting one line, fixing a comma, adjusting a comment by a word. Save the log for changes a future session would want to know about.

### How to update

- Keep the architecture sections (What this project is, Data model, Key functions, Conventions) **stable and accurate**. Edit them in place when the code changes.
- Append to **Recent changes log** at the top of the list (newest first).
- Edit **Current focus / Next up** to reflect the live state — delete done items, add new ones.
- Bump the `Last updated:` date at the top of this file.

---

## How to extend this site (quick recipes)

- **Add a new field to items**: add input(s) to BOTH the welcome form and the main form in `index.html` → read it in BOTH form `submit` handlers in `script.js` → add a default + sanitization step in `normalizeItem()` → restore the field in `startEdit()` → render it in `renderItems()` → if it's user-entered HTML, run it through `escapeHtml()`.
- **Add a new sort option**: add an `<option>` to `#sort-select` in `index.html` → add a `case` to `sortItems()` in `script.js`.
- **Add a new status**: add it to `#item-status` and `#welcome-item-status` in `index.html` → add a filter pill in `#filters` → add a CSS class `.status-<lower-kebab>` in `style.css` → add a key to `statusOrder` in `sortItems()`.
- **Retheme**: change CSS variables in `:root` in `style.css`. Don't add inline colors elsewhere.
- **Add a default category**: append to `DEFAULT_CATEGORIES` in `script.js`. Existing users won't see it until they hit "Restore Defaults" (by design — we don't auto-mutate their saved category list).
- **Migrate an old field**: add to `CATEGORY_RENAMES` (for category renames) or extend `normalizeItem()` (for item-shape changes). The first load after the change writes the migrated form back to localStorage so it only runs once per browser.

---

## Recent changes log

(append entries at the top — newest first)

- 2026-05-10 — Polish pass on the existing app (no architecture changes, no new features). Added confirm-before-delete for items; inline "Saved!" feedback under the dashboard form; submit-button labels now reflect Draft state ("Save Draft" / "Save Draft Changes"); welcome screen now shows "X items waiting in your dashboard"; empty-state messages are now contextual (search vs status filter vs truly empty); focus-visible rings on buttons/pills/tabs; small action buttons (edit / delete / add-details) share consistent sizing; status / type / detail badges bumped from 11px → 11.5px with slightly more padding; mobile pass — primary/ghost buttons have 44px min tap target, category tabs/filter pills/sort dropdown got bigger tap padding, forms have more breathing room. Files: `index.html`, `style.css`, `script.js`.
- 2026-05-07 — Added the "Vision & Goals" section (cozy feel + "let the site do the work" philosophy + non-goals) and the "Auto-update protocol" section that requires this file to be updated after every non-trivial code change. No source code changes.
- 2026-05-07 — Renamed `PROJECT_NOTES.md` to `CLAUDE.md`. Expanded with a complete file inventory, "what to record / what not to record" rules for future sessions, and a "how to extend" recipe section. No code changes.
- 2026-05-07 — Created `PROJECT_NOTES.md`. Copied `index.html`, `style.css`, `script.js`, and the sample backup into the workspace folder so future sessions can read them. No code changes yet.

## Current focus / Next up

1. **Manual interactive testing in a real browser** — code review on 2026-05-10 traced through every flow (add/edit/delete, category switch, search, filters, sort, itemTypes, draft, suggestion, welcome add, export/import, normalizeItem migration) and didn't find behavioral bugs, but the actual click-through hasn't happened yet. Open `index.html` and walk through each: add, edit, delete (now confirms), category switch, search, filters, sort, draft toggle relabels submit button, suggestion banner accept/dismiss, welcome quick-add, export, import old `sion-dashboard-backup-2026-05-04.json` and watch it normalize.
2. **Confirm old localStorage items migrate correctly** through `normalizeItem()` — visually inspect after first load that older items get `itemTypes`, `isDraft`, `detailStatus`, and any renamed categories.
3. **Confirm imported older backups still work** (load `sion-dashboard-backup-2026-05-04.json`, watch normalization upgrade it in place).
4. **Polish the welcome / check-in flow** so it feels like the main entry point — partially done (added "X items waiting" hint on 2026-05-10). Could go further: maybe a subtle gradient title animation, today's date, or a "Recent" peek.
5. **Start building the messy brain-dump system** — the next big "let the site do the work" feature:
   - User types one casual thought.
   - App detects possible items inside it.
   - App suggests categories per item.
   - App asks whether to add details.
   - Skipped items are saved as Draft / Needs Details so nothing is lost.
6. **Later (parking lot — not next):**
   - Custom dark modals (replace `alert()` / `confirm()`).
   - Better mobile layout pass.
   - Real calendar view.
   - Dashboard homepage / "Today" view.

## Open questions / ideas to revisit

- (empty — drop ideas here as they come up)
