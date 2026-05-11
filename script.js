/* =========================================================
   Sion's Dashboard — JavaScript
   Handles login, tab switching, adding/deleting items,
   and saving everything in localStorage.
   ========================================================= */


/* ----------------------------------------------------------
   1) GRAB ELEMENTS FROM THE PAGE
   ---------------------------------------------------------- */
const loginScreen   = document.getElementById('login-screen');
const dashboard     = document.getElementById('dashboard');
const loginForm     = document.getElementById('login-form');
const logoutBtn     = document.getElementById('logout-btn');

// Welcome / check-in screen elements (shown between login and dashboard)
const welcomeScreen    = document.getElementById('welcome-screen');
const welcomeForm      = document.getElementById('welcome-form');
const welcomeFeedback  = document.getElementById('welcome-feedback');
const gotoDashboardBtn = document.getElementById('goto-dashboard-btn');

// Manage Categories elements (the panel + its controls)
const manageCategoriesBtn   = document.getElementById('manage-categories-btn');
const categoriesPanel       = document.getElementById('categories-panel');
const addCategoryForm       = document.getElementById('add-category-form');
const newCategoryInput      = document.getElementById('new-category-input');
const categoryList          = document.getElementById('category-list');
const restoreCategoriesBtn  = document.getElementById('restore-categories-btn');

// Sidebar nav (Phase 2 — replaces the old top tab `.categories` nav).
// The container holds two <ul>s: "Main" + a collapsible "More".
const sidebar            = document.getElementById('sidebar');
const sidebarMainList    = document.getElementById('sidebar-main');
const sidebarMoreList    = document.getElementById('sidebar-more');
const sidebarMoreToggle  = document.getElementById('sidebar-more-toggle');

const itemForm      = document.getElementById('item-form');
const itemsList     = document.getElementById('items-list');
const emptyState    = document.getElementById('empty-state');
const categoryLabel = document.getElementById('current-category-label');
// `sidebarItems` is rebuilt on every category change, so it's `let`, not `const`.
let sidebarItems    = document.querySelectorAll('.sidebar-item');

// Edit feature elements
const formTitle      = document.getElementById('form-title');
const submitBtn      = document.getElementById('submit-btn');
const cancelEditBtn  = document.getElementById('cancel-edit-btn');
const editingMessage = document.getElementById('editing-message');

// Inline "Saved!"-style feedback under the dashboard form
// (mirrors welcomeFeedback so add/edit confirmations feel consistent).
const dashboardFeedback = document.getElementById('dashboard-feedback');

// Re-entry hint on the welcome screen ("X items waiting...")
const welcomeSummaryHint = document.getElementById('welcome-summary-hint');

// Status filter container — clicks are handled via event delegation
// because the chips inside are rendered statically but we want one
// listener regardless of how many chips exist.
const statFiltersContainer = document.getElementById('stat-filters');

// Search input
const searchInput   = document.getElementById('search-input');

// Sort dropdown
const sortSelect    = document.getElementById('sort-select');

// Backup buttons + hidden file input
const exportBtn     = document.getElementById('export-btn');
const importBtn     = document.getElementById('import-btn');
const importInput   = document.getElementById('import-input');

// Summary elements
const statTotal       = document.getElementById('stat-total');
const statNotStarted  = document.getElementById('stat-not-started');
const statInProgress  = document.getElementById('stat-in-progress');
const statCompleted   = document.getElementById('stat-completed');


/* ----------------------------------------------------------
   2) APP STATE
   - items: array of all saved items
   - currentCategory: which tab is selected right now
   - currentStatusFilter: which status filter is active ("All" by default)
   - currentSearchQuery: text typed in the search box (lowercased)
   - currentSort: which sort option is selected (default "newest")
   - editingId: id of item being edited (null when adding new)
   ---------------------------------------------------------- */
let currentCategory = 'Dashboard';
let currentStatusFilter = 'All';
let currentSearchQuery = '';
let currentSort = 'newest';
let editingId = null;

// Default category list — used as the fallback in loadCategories() and
// as the target of the "Restore Defaults" button.
const DEFAULT_CATEGORIES = [
  'Dashboard',
  'Calendar',
  'Learning',
  'Schedule',
  'Goals',
  'Health/Gym',
  'Addiction Tracker',
  'eBay Tracker / Selling',
  'Notes',
];

// One-way migrations applied to old category names found in localStorage.
// Used by both loadItems() (to rename old item categories) and
// loadCategories() (to rename the saved categories array).
const CATEGORY_RENAMES = {
  'eBay Tracker': 'eBay Tracker / Selling',
  'Selling':      'eBay Tracker / Selling',
  'eBay':         'eBay Tracker / Selling',
};

// Whitelist of valid itemTypes. Anything else gets stripped out by
// sanitizeItemTypes() during load/import.
const VALID_ITEM_TYPES = ['Task', 'Reminder', 'Calendar'];

// IMPORTANT — these two loads must come AFTER the const declarations
// above. loadItems()/loadCategories() are hoisted (function decls), but
// the consts they reference are in their TDZ until this point.
let items      = loadItems();
let categories = loadCategories();


/* ----------------------------------------------------------
   3) LOGIN / LOGOUT
   - Fake auth: any username/password works.
   - "isLoggedIn" flag is stored so a refresh keeps you logged in.
   ---------------------------------------------------------- */

// If user was already "logged in" before refresh, jump straight to the
// welcome / check-in screen (NOT the dashboard). The user can still
// reach the dashboard via the "Go to Dashboard" button.
if (localStorage.getItem('isLoggedIn') === 'true') {
  showWelcome();
}

// Handle login form submit — fake auth, then show welcome screen
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();             // Stop page from reloading
  localStorage.setItem('isLoggedIn', 'true');
  showWelcome();
});

// Handle logout — hide every authenticated screen, return to login
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('isLoggedIn');
  dashboard.classList.add('hidden');
  welcomeScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginForm.reset();
});


/* ----------------------------------------------------------
   3a) WELCOME / CHECK-IN SCREEN
   - showWelcome() is the new "post-login landing":
       hides login + dashboard, reveals the welcome card,
       and resets the quick-add form so it's blank each time.
   - showDashboard() is unchanged in spirit — it just also
     hides the welcome screen now that it exists.
   - The welcome form mirrors the main item form: same fields,
     same validation, same auto-capitalize on save.
   - "Go to Dashboard" simply calls showDashboard().
   ---------------------------------------------------------- */

// Helper: show the welcome screen, hide everything else
function showWelcome() {
  loginScreen.classList.add('hidden');
  dashboard.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');

  // Start with a fresh form every time we land here
  welcomeForm.reset();
  welcomeFeedback.classList.add('hidden');
  welcomeFeedback.textContent = '';

  // Refresh the "X items waiting..." hint and submit-button label so
  // the welcome card always reflects the current state of the data.
  updateWelcomeSummaryHint();
  updateWelcomeSubmitText();
}

// Helper: hide login + welcome, show dashboard, render items
function showDashboard() {
  loginScreen.classList.add('hidden');
  welcomeScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  renderItems();
}

// Welcome quick-add form: builds an item exactly like the main
// form does (same shape, same auto-capitalize, same id/createdAt
// timestamp), saves to localStorage, then shows brief feedback.
// We do NOT auto-jump to the dashboard — the user clicks
// "Go to Dashboard" when they're ready.
welcomeForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Same WYSIWYG rule as the dashboard form: title/description are
  // already capitalized live, so we just read what's there.
  const formData = {
    title:       document.getElementById('welcome-item-title').value.trim(),
    category:    document.getElementById('welcome-item-category').value,
    description: document.getElementById('welcome-item-description').value.trim(),
    date:        document.getElementById('welcome-item-date').value,
    status:      document.getElementById('welcome-item-status').value,
    itemTypes:   readItemTypes(welcomeForm),
  };

  // Same draft override as the dashboard form. We store isDraft as a real
  // field on the item so the choice survives reload, export/import, and
  // any future re-normalization (see normalizeItem). detailStatus is then
  // derived: drafts always read "Needs Details", non-drafts use the auto rule.
  const welcomeDraftCheckbox = document.getElementById('welcome-item-draft');
  const saveAsDraft = !!(welcomeDraftCheckbox && welcomeDraftCheckbox.checked);
  formData.isDraft = saveAsDraft;
  formData.detailStatus = saveAsDraft
    ? 'Needs Details'
    : computeDetailStatus(formData);

  // Same id/createdAt convention as the main form
  const now = Date.now();
  const newItem = { id: now, createdAt: now, ...formData };
  items.push(newItem);
  saveItems();

  // Reset the form so the user can quickly add another item
  welcomeForm.reset();

  // Refresh the items-waiting hint + submit text now that totals changed
  updateWelcomeSummaryHint();
  updateWelcomeSubmitText();

  // Show a small inline confirmation, then hide it after a moment.
  welcomeFeedback.textContent =
    `Added "${newItem.title}" to ${newItem.category}.`;
  welcomeFeedback.classList.remove('hidden');
  setTimeout(() => {
    welcomeFeedback.classList.add('hidden');
  }, 2500);
});

// "Go to Dashboard" button: leave the welcome screen behind
gotoDashboardBtn.addEventListener('click', () => {
  showDashboard();
});


/* ----------------------------------------------------------
   3b) BACKUP — EXPORT items as a JSON file
   - Builds a JSON string of the entire items array.
   - Wraps it in a Blob, creates a temporary download link,
     clicks it, and cleans up.
   - Filename uses today's date so backups don't overwrite
     each other: sion-dashboard-backup-YYYY-MM-DD.json
   ---------------------------------------------------------- */
exportBtn.addEventListener('click', () => {
  // Pretty-print with 2 spaces so the file is human-readable
  const dataStr = JSON.stringify(items, null, 2);
  const blob    = new Blob([dataStr], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);

  // Build today's date in YYYY-MM-DD format (e.g. 2026-05-04)
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  const filename = `sion-dashboard-backup-${yyyy}-${mm}-${dd}.json`;

  // Create a hidden link, click it, then remove it
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Free the temporary URL we created above
  URL.revokeObjectURL(url);
});


/* ----------------------------------------------------------
   3c) BACKUP — IMPORT items from a JSON file
   - The visible "Import Backup" button just opens the
     hidden <input type="file"> element.
   - When the user picks a file, we read it, parse it,
     validate it, ask for confirmation, then replace items.
   - On any error (bad JSON, wrong shape, missing fields)
     we show an alert and DO NOT touch the existing data.
   ---------------------------------------------------------- */

// Clicking the visible button opens the OS file picker
importBtn.addEventListener('click', () => {
  importInput.click();
});

// When a file is chosen, read and process it
importInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      validateImportedItems(parsed);          // throws on invalid data

      // Ask the user before overwriting their current items
      const confirmed = confirm(
        `Import ${parsed.length} item(s)?\n\n` +
        `This will REPLACE all your current items. ` +
        `Consider exporting a backup first if you haven't.`
      );
      if (!confirmed) return;

      // Audit BEFORE normalizing so we can tell the user how many
      // legacy items got upgraded as part of the import.
      const audit = auditMigration(parsed);

      // Run every imported item through normalizeItem() so:
      //   - createdAt is guaranteed
      //   - old categories are renamed (eBay Tracker -> eBay Tracker / Selling)
      //   - itemTypes is sanitized (invalid values dropped, deduped)
      //   - isDraft / detailStatus are filled in (computed from fields)
      const normalized = parsed.map(normalizeItem);

      items = normalized;
      saveItems();

      // If we were mid-edit, the item being edited may no longer exist.
      // Reset the form so we don't try to "update" a missing item.
      if (editingId !== null) {
        exitEditMode();
        itemForm.reset();
        syncCategoryDropdownToTab();
      }

      renderItems();

      // Tailor the success message so the user can SEE that older items
      // were upgraded — addresses the "is migration actually working?"
      // question without needing DevTools.
      if (audit) {
        const upgraded = Math.max(
          audit.missingItemTypes,
          audit.missingIsDraft,
          audit.missingDetailStatus
        );
        console.info(
          `[Sion's Dashboard] Migrated imported items to current shape.`,
          audit
        );
        alert(
          `Successfully imported ${items.length} item(s). ` +
          `${upgraded} older item(s) were upgraded to the current shape ` +
          `(itemTypes, isDraft, detailStatus).`
        );
      } else {
        alert(`Successfully imported ${items.length} item(s).`);
      }
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      // Clear the input so the same file can be selected again later
      importInput.value = '';
    }
  };

  reader.onerror = () => {
    alert('Could not read the file.');
    importInput.value = '';
  };

  reader.readAsText(file);
});


/* Throws a helpful error if `data` isn't a valid items array. */
function validateImportedItems(data) {
  if (!Array.isArray(data)) {
    throw new Error('File must contain a JSON array of items.');
  }
  const required = ['id', 'title', 'category', 'description', 'date', 'status'];
  data.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Item at position ${index} is not an object.`);
    }
    for (const field of required) {
      if (!(field in item)) {
        throw new Error(`Item at position ${index} is missing the "${field}" field.`);
      }
    }
  });
}


/* ----------------------------------------------------------
   4) SIDEBAR NAV (Phase 2)
   - Clicking a sidebar item changes "currentCategory" and re-renders.
   - Event delegation on the #sidebar container so we don't re-attach
     listeners every time renderSidebar() rebuilds the items.
   ---------------------------------------------------------- */
sidebar.addEventListener('click', (e) => {
  const item = e.target.closest('.sidebar-item');
  if (!item || !sidebar.contains(item)) return;

  // Visual: remove "active" from every sidebar item, add to clicked one
  sidebarItems.forEach(it => it.classList.remove('active'));
  item.classList.add('active');

  // Update state and re-render
  currentCategory = item.dataset.category;
  categoryLabel.textContent = currentCategory;
  renderItems();

  // Pre-select the active category in the form so adding a new item
  // under this sidebar item doesn't require touching the dropdown.
  syncCategoryDropdownToTab();
});


/* ----------------------------------------------------------
   4b) STATUS STAT-FILTERS (Phase 2)
   - Replaces the old filter-pill row + the big summary cards.
   - Clicking a chip changes "currentStatusFilter" and re-renders.
   - data-filter="All" means no filtering by status (the "Total" chip).
   - Event delegation on #stat-filters so adding/removing chips later
     doesn't require re-wiring listeners.
   ---------------------------------------------------------- */
statFiltersContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('.stat-filter');
  if (!btn || !statFiltersContainer.contains(btn)) return;

  statFiltersContainer.querySelectorAll('.stat-filter').forEach(b =>
    b.classList.remove('active')
  );
  btn.classList.add('active');

  currentStatusFilter = btn.dataset.filter;
  renderItems();
});


/* ----------------------------------------------------------
   4c) SEARCH BAR (live, case-insensitive)
   - Each keystroke updates "currentSearchQuery" and re-renders.
   - We lowercase here so the renderItems() filter doesn't have
     to lowercase the query on every comparison.
   ---------------------------------------------------------- */
searchInput.addEventListener('input', () => {
  currentSearchQuery = searchInput.value.trim().toLowerCase();
  renderItems();
});


/* ----------------------------------------------------------
   4d) SORT DROPDOWN
   - Changing the dropdown updates "currentSort" and re-renders.
   - Sort is purely visual — it does NOT change the items array,
     so localStorage, summary, and tab counts are unaffected.
   ---------------------------------------------------------- */
sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  renderItems();
});


/* ----------------------------------------------------------
   5) ADD or UPDATE ITEM
   - The same form handles both. If "editingId" is set, we
     update the matching item. Otherwise we create a new one.
   - If the user changed the category while editing, the item
     simply gets the new category (so it "moves" automatically).
   ---------------------------------------------------------- */
itemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Read the form values. Title and description are NOT secretly capitalized
  // here — they were already capitalized live as the user typed (see
  // attachLiveCapitalize). What you see in the input is what gets saved.
  const formData = {
    title:       document.getElementById('item-title').value.trim(),
    category:    document.getElementById('item-category').value,
    description: document.getElementById('item-description').value.trim(),
    date:        document.getElementById('item-date').value,
    status:      document.getElementById('item-status').value,
    itemTypes:   readItemTypes(itemForm),
  };

  // detailStatus: if the user explicitly checked "Save as draft", honor that.
  // Otherwise fall back to the auto rule (title + at least one extra detail).
  // isDraft is the source of truth and is stored on the item so the choice
  // is sticky across reload / export / import (normalizeItem reads it back).
  const draftCheckbox = document.getElementById('item-draft');
  const saveAsDraft   = !!(draftCheckbox && draftCheckbox.checked);
  formData.isDraft = saveAsDraft;
  formData.detailStatus = saveAsDraft
    ? 'Needs Details'
    : computeDetailStatus(formData);

  // Remember which category we should jump to after saving
  let targetCategory = formData.category;

  // Capture whether this submit is an edit BEFORE exitEditMode() runs,
  // so we can pick the right "Saved!" wording for the inline feedback.
  const wasEditing = editingId !== null;

  if (editingId !== null) {
    // ----- UPDATE existing item -----
    // Spread `item` first so we keep id, createdAt, and any other
    // existing fields. formData then overwrites only the form fields.
    items = items.map(item => {
      if (item.id === editingId) {
        return { ...item, ...formData };
      }
      return item;
    });
    exitEditMode();          // Reset form button text + hide cancel
  } else {
    // ----- CREATE new item -----
    // createdAt is used by the "Newest First" / "Oldest First" sorts.
    const now = Date.now();
    const newItem = { id: now, createdAt: now, ...formData };
    items.push(newItem);
  }

  saveItems();
  itemForm.reset();

  // Inline confirmation under the form (mirrors the welcome screen).
  // Suffix marks the item as Needs Details so the user can tell at a
  // glance whether their save was a "finish later" or a complete save.
  const needsDetailsSuffix = formData.isDraft ? ' (Needs Details)' : '';
  showDashboardFeedback(
    wasEditing
      ? `Updated "${formData.title}"${needsDetailsSuffix}.`
      : `Added "${formData.title}" to ${formData.category}${needsDetailsSuffix}.`
  );

  // Jump to the relevant category so the user sees the saved item.
  // Two special cases keep the user where they are:
  //   - Dashboard tab shows ALL items, so a save is always visible.
  //   - Drafts tab shows Needs-Details items (excluding Completed), so
  //     we stay only if the saved item would actually appear here.
  // (switchToCategory triggers the tab click handler, which itself
  // calls syncCategoryDropdownToTab — so we only sync explicitly in
  // the "no tab change" branch.)
  const stayOnDashboard = currentCategory === 'Dashboard';
  const stayOnDrafts    = currentCategory === 'Drafts' && isDraftLike(formData);

  if (stayOnDashboard || stayOnDrafts) {
    renderItems();
    syncCategoryDropdownToTab();
  } else if (targetCategory !== currentCategory) {
    switchToCategory(targetCategory);
  } else {
    renderItems();
    syncCategoryDropdownToTab();
  }
});


/* ----------------------------------------------------------
   6) DELETE ITEM
   - Items are deleted by their id.
   - We confirm first so a stray click doesn't quietly delete a thought.
     (Native confirm() — replaced by a custom dark modal in a future pass.)
   - If we were editing the deleted item, exit edit mode.
   ---------------------------------------------------------- */
function deleteItem(id) {
  const target = items.find(item => item.id === id);
  if (!target) return;

  const confirmed = confirm(
    `Delete "${target.title}"?\n\nThis can't be undone.`
  );
  if (!confirmed) return;

  items = items.filter(item => item.id !== id);
  if (editingId === id) {
    exitEditMode();
    itemForm.reset();
    syncCategoryDropdownToTab();   // form was cleared, re-sync to active tab
  }
  saveItems();
  renderItems();
}


/* ----------------------------------------------------------
   6b) EDIT ITEM
   - startEdit(id): pre-fill the form with that item's data
     and switch the form into "update" mode.
   - exitEditMode(): switch the form back to "add" mode.
   ---------------------------------------------------------- */
function startEdit(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  // Fill the form with this item's values
  document.getElementById('item-title').value       = item.title;
  document.getElementById('item-category').value    = item.category;
  document.getElementById('item-description').value = item.description;
  document.getElementById('item-date').value        = item.date;
  document.getElementById('item-status').value      = item.status;

  // Pre-check the itemTypes checkboxes that match this item's saved types
  setItemTypes(itemForm, item.itemTypes || []);

  // Pre-check the "Save as draft" box from the item's stored isDraft flag,
  // so unchecking it during edit is the explicit way to mark it Complete.
  // Backwards-compat: legacy items without isDraft fall back to detailStatus,
  // matching what normalizeItem inferred for them on load.
  const draftCheckbox = document.getElementById('item-draft');
  if (draftCheckbox) {
    if (typeof item.isDraft === 'boolean') {
      draftCheckbox.checked = item.isDraft;
    } else {
      draftCheckbox.checked = item.detailStatus === 'Needs Details';
    }
  }

  // Flip the form into edit mode
  editingId = id;
  formTitle.textContent  = 'Edit Item';
  // Submit button label respects the Needs Details checkbox state we
  // just restored above ("Save Changes (Needs Details)" vs "Save Changes").
  updateSubmitButtonText();
  cancelEditBtn.classList.remove('hidden');

  // Show the "Editing: ..." banner so it's obvious which item is being edited
  editingMessage.textContent = `Editing: ${item.title}`;
  editingMessage.classList.remove('hidden');

  // Scroll the form into view (helpful on phones)
  itemForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function exitEditMode() {
  editingId = null;
  formTitle.textContent  = 'Add New Item';
  // Submit button reverts to "Add Item" / "Save (Needs Details)" depending
  // on whether the Mark-as-Needs-Details checkbox is currently ticked.
  updateSubmitButtonText();
  cancelEditBtn.classList.add('hidden');
  // Hide the "Editing: ..." banner
  editingMessage.classList.add('hidden');
  editingMessage.textContent = '';
}

// Cancel button: drop edit, clear form, then re-sync the category
// dropdown to match the active tab (form.reset() puts it on the
// first option, which would lose the user's tab context).
cancelEditBtn.addEventListener('click', () => {
  exitEditMode();
  itemForm.reset();
  syncCategoryDropdownToTab();
});


/* ----------------------------------------------------------
   7) RENDER ITEMS
   - Pipeline (in order):
       1. Category (which tab is active)
       2. Status   (which filter pill is active)
       3. Search   (text typed in the search box)
       4. Sort    (chosen in the sort dropdown)
   - Then: refresh summary numbers and tab count badges.
     (Both read raw `items`, so they ignore filters/search/sort.)
   ---------------------------------------------------------- */
// Predicate used by the Drafts view filter, the Drafts count badge,
// AND the scoped stat-filter counts when viewing Drafts. Single source
// of truth so list, badges, and counts always agree.
//
// Rule: an item is "Needs Details" in the user-facing sense if its
// detailStatus is "Needs Details" AND it's not Completed. We exclude
// Completed because a finished item shouldn't sit in the Drafts queue
// regardless of how sparse its fields are — once it's done, it's done.
// (`isDraft` is preserved as an internal field for backward compat,
// but it's no longer surfaced as a separate "Draft" concept in the UI.)
function isDraftLike(item) {
  if (item.status === 'Completed') return false;
  return item.detailStatus === 'Needs Details';
}

function renderItems() {
  itemsList.innerHTML = '';

  // Step 1: filter by category — with two special "view" tabs.
  //   - "Dashboard"  -> show ALL items (home / everything view)
  //   - "Drafts"     -> show items that are drafts or auto-flagged Needs Details
  //   - anything else -> normal category filter
  let filtered;
  if (currentCategory === 'Dashboard') {
    filtered = [...items];
  } else if (currentCategory === 'Drafts') {
    filtered = items.filter(isDraftLike);
  } else {
    filtered = items.filter(item => item.category === currentCategory);
  }

  // Step 2: also filter by status (skip if "All" is selected)
  if (currentStatusFilter !== 'All') {
    filtered = filtered.filter(item => item.status === currentStatusFilter);
  }

  // Step 3: also filter by search query (title OR description, case-insensitive)
  // currentSearchQuery is already lowercased by the input listener.
  if (currentSearchQuery !== '') {
    filtered = filtered.filter(item => {
      const titleMatch       = item.title.toLowerCase().includes(currentSearchQuery);
      const descriptionMatch = item.description.toLowerCase().includes(currentSearchQuery);
      return titleMatch || descriptionMatch;
    });
  }

  // Step 4: sort the filtered list (visual only — doesn't touch `items`)
  filtered = sortItems(filtered, currentSort);

  // Show the empty-state message if there's nothing to display.
  // We tailor the message to which filters are active so the user can
  // tell WHY the list is empty (search? status filter? truly empty?).
  if (filtered.length === 0) {
    const hasSearch = currentSearchQuery !== '';
    const hasStatus = currentStatusFilter !== 'All';

    let msg;
    if (hasSearch && hasStatus) {
      msg = `No ${currentStatusFilter} items match "${currentSearchQuery}".`;
    } else if (hasSearch) {
      msg = `No items match "${currentSearchQuery}".`;
    } else if (hasStatus) {
      msg = `No ${currentStatusFilter} items in ${currentCategory}.`;
    } else if (currentCategory === 'Drafts') {
      msg = 'No drafts right now. Everything has its details — nice.';
    } else {
      msg = 'No items here yet. Add your first one!';
    }
    emptyState.textContent = msg;
    emptyState.classList.remove('hidden');
    // (Note: we don't return early — we still want updateSummary() to run.)
  } else {
    emptyState.classList.add('hidden');

    // Build a card for each item
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item';

      // Convert "In Progress" -> "in-progress" for the CSS class
      const statusClass = 'status-' + item.status.toLowerCase().replace(' ', '-');

      // Build extra badges:
      //   - one .type-badge per saved itemType (Task / Reminder / Calendar)
      //   - .detail-status pill if the item is a draft or flagged Needs Details
      //   - .needs-details-row under the meta with a friendlier hint
      //     plus an "Add Details" shortcut button that opens edit mode.
      const safeTypes = sanitizeItemTypes(item.itemTypes);
      const typeBadgesHtml = safeTypes
        .map(t => `<span class="type-badge">${escapeHtml(t)}</span>`)
        .join('');

      // Single user-facing concept: "Needs Details" (no separate "Draft"
      // label in the UI — see isDraftLike() above for the rationale).
      // Reusing the predicate keeps the card badge, the Drafts view
      // filter, the Drafts count, and the scoped stat-filter counts
      // all driven by the same rule — completed items NEVER carry the
      // Needs Details treatment, even if isDraft === true.
      const needsDetails = isDraftLike(item);
      const detailBadgeHtml = needsDetails
        ? `<span class="detail-status">Needs Details</span>`
        : '';
      const needsDetailsRowHtml = needsDetails
        ? `<div class="needs-details-row">
             <span class="needs-details-hint">Needs Details — add description, date, or type.</span>
             <button class="btn btn-add-details" data-id="${item.id}">Add Details</button>
           </div>`
        : '';

      // Visual accent on the whole card so Needs Details items pop without
      // having to scan the badges row.
      if (needsDetails) card.classList.add('needs-details');

      card.innerHTML = `
        <div class="item-header">
          <div class="item-title">${escapeHtml(item.title)}</div>
          <div class="item-actions">
            <button class="btn btn-edit"   data-id="${item.id}">Edit</button>
            <button class="btn btn-danger" data-id="${item.id}">Delete</button>
          </div>
        </div>
        ${item.description
          ? `<div class="item-description">${escapeHtml(item.description)}</div>`
          : ''}
        <div class="item-meta">
          ${item.date ? `<span class="item-date">📅 ${item.date}</span>` : ''}
          <span class="status ${statusClass}">${item.status}</span>
          ${typeBadgesHtml}
          ${detailBadgeHtml}
        </div>
        ${needsDetailsRowHtml}
      `;

      // Hook up the buttons
      card.querySelector('.btn-edit').addEventListener('click', () => {
        startEdit(item.id);
      });
      card.querySelector('.btn-danger').addEventListener('click', () => {
        deleteItem(item.id);
      });
      // Only present on Needs Details cards; opens the same edit flow.
      const addDetailsBtn = card.querySelector('.btn-add-details');
      if (addDetailsBtn) {
        addDetailsBtn.addEventListener('click', () => startEdit(item.id));
      }

      itemsList.appendChild(card);
    });
  }

  // Side-effects: refresh the summary numbers AND the tab count badges.
  // Both use the raw `items` array, so search/filter/sort never affect them.
  updateSummary();
  updateTabCounts();
}


/* ----------------------------------------------------------
   7b) UPDATE SUMMARY  (now: stat-filter counts)
   - Counts items by status WITHIN the current view, so the numbers
     on the stat-filter chips reflect exactly what could appear in
     the items list right now. Uses the same scoping rule as the
     category filter in renderItems().
   - The status filter pill itself is NOT applied here — otherwise
     "Not Started" would always show its own count and zero for the
     others, defeating the purpose of clickable filters.
   ---------------------------------------------------------- */
function updateSummary() {
  // Scope = items in the current view (Dashboard = all, Drafts =
  // draft-like, otherwise = items in that category).
  let scope;
  if (currentCategory === 'Dashboard') {
    scope = items;
  } else if (currentCategory === 'Drafts') {
    scope = items.filter(isDraftLike);
  } else {
    scope = items.filter(i => i.category === currentCategory);
  }

  const total       = scope.length;
  const notStarted  = scope.filter(i => i.status === 'Not Started').length;
  const inProgress  = scope.filter(i => i.status === 'In Progress').length;
  const completed   = scope.filter(i => i.status === 'Completed').length;

  statTotal.textContent       = total;
  statNotStarted.textContent  = notStarted;
  statInProgress.textContent  = inProgress;
  statCompleted.textContent   = completed;
}


/* ----------------------------------------------------------
   7c) UPDATE SIDEBAR COUNT BADGES
   - For each sidebar item, count how many items belong to that view
     and write the number into its .tab-count badge.
   - "Dashboard" is special: shows the TOTAL items across every category.
   - "Drafts" is special: shows items where isDraft || Needs Details.
   - Reads the raw `items` array — does NOT consider search or the
     active status filter, so badges always show true totals.
   ---------------------------------------------------------- */
function updateTabCounts() {
  sidebarItems.forEach(item => {
    const category  = item.dataset.category;
    const countSpan = item.querySelector('.tab-count');
    if (!countSpan) return;          // safety check

    if (category === 'Dashboard') {
      countSpan.textContent = items.length;
    } else if (category === 'Drafts') {
      // Same predicate as renderItems uses, so the badge and the list
      // are always consistent.
      countSpan.textContent = items.filter(isDraftLike).length;
    } else {
      countSpan.textContent = items.filter(i => i.category === category).length;
    }
  });
}


/* ----------------------------------------------------------
   7d) SORT ITEMS (pure helper — returns a new sorted array)
   - Takes the already-filtered list + the current sort key.
   - Uses [...list].sort(...) so the original array is untouched.
   - For "Newest"/"Oldest": uses createdAt; falls back to id for
     older items that were saved before createdAt existed.
     (id is also a Date.now() value, so the fallback is reliable.)
   - For date sorts: items WITHOUT a date are pushed to the end.
   - For Status: uses a workflow order Not Started → In Progress → Completed.
   ---------------------------------------------------------- */
function sortItems(list, sortKey) {
  // Make a copy so we don't mutate the input array
  const copy = [...list];

  // Helper: get a sortable timestamp, falling back to id for old items
  const ts = item => item.createdAt ?? item.id ?? 0;

  // Helper: items without a date should sort AFTER items with a date.
  // Returning Infinity for missing dates keeps them at the bottom for
  // ascending sorts; for descending we use -Infinity instead.
  const dateAsc  = item => item.date ? new Date(item.date).getTime() :  Infinity;
  const dateDesc = item => item.date ? new Date(item.date).getTime() : -Infinity;

  // Status priority for the "Status" sort
  const statusOrder = {
    'Not Started': 0,
    'In Progress': 1,
    'Completed':   2,
  };

  switch (sortKey) {
    case 'newest':
      return copy.sort((a, b) => ts(b) - ts(a));      // biggest timestamp first

    case 'oldest':
      return copy.sort((a, b) => ts(a) - ts(b));      // smallest timestamp first

    case 'date-soonest':
      return copy.sort((a, b) => dateAsc(a) - dateAsc(b));

    case 'date-latest':
      return copy.sort((a, b) => dateDesc(b) - dateDesc(a));

    case 'title-asc':
      return copy.sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );

    case 'title-desc':
      return copy.sort((a, b) =>
        b.title.toLowerCase().localeCompare(a.title.toLowerCase())
      );

    case 'status':
      return copy.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    default:
      return copy;
  }
}


/* ----------------------------------------------------------
   8) HELPERS
   ---------------------------------------------------------- */

// Save the items array to localStorage as a JSON string
function saveItems() {
  localStorage.setItem('dashboardItems', JSON.stringify(items));
}

// Count how many raw items lack each current-shape field. Used by both
// loadItems() and the import handler so we can SHOW the user that old
// data was upgraded — both via console.info on load and via a small
// note appended to the import success alert.
//
// Returns null if nothing needed migrating, otherwise an object with
// counts per field.
function auditMigration(rawItems) {
  if (!Array.isArray(rawItems)) return null;

  let missingItemTypes    = 0;
  let missingIsDraft      = 0;
  let missingDetailStatus = 0;
  let missingCreatedAt    = 0;
  let renamedCategories   = 0;

  rawItems.forEach(r => {
    if (!r || typeof r !== 'object') return;
    if (!Array.isArray(r.itemTypes))        missingItemTypes++;
    if (typeof r.isDraft !== 'boolean')     missingIsDraft++;
    if (typeof r.detailStatus !== 'string') missingDetailStatus++;
    if (r.createdAt == null)                missingCreatedAt++;
    if (CATEGORY_RENAMES[r.category])       renamedCategories++;
  });

  const anyMigrated =
    missingItemTypes ||
    missingIsDraft ||
    missingDetailStatus ||
    missingCreatedAt ||
    renamedCategories;

  if (!anyMigrated) return null;

  return {
    total: rawItems.length,
    missingItemTypes,
    missingIsDraft,
    missingDetailStatus,
    missingCreatedAt,
    renamedCategories,
  };
}

// Bring an arbitrary item object into the current shape:
//   - rename old categories via CATEGORY_RENAMES (e.g. "eBay Tracker"
//     -> "eBay Tracker / Selling")
//   - guarantee createdAt (fall back to id, then to now)
//   - sanitize itemTypes (array of valid values, no duplicates)
//   - coerce isDraft to a boolean. Backwards-compat: items saved before
//     v2.4 don't have isDraft, so if the old detailStatus was already
//     "Needs Details" we treat that as a draft so the user's intent
//     isn't silently flipped to Complete.
//   - derive detailStatus from isDraft: drafts always read
//     "Needs Details", non-drafts use the auto rule.
// Used by both loadItems() and the JSON import handler.
function normalizeItem(item) {
  const renamedCategory = CATEGORY_RENAMES[item.category] || item.category;

  // Resolve isDraft. New items have it set explicitly. Legacy items don't,
  // so we infer from the old detailStatus to avoid losing draft intent
  // on the first reload after upgrading.
  let isDraft;
  if (typeof item.isDraft === 'boolean') {
    isDraft = item.isDraft;
  } else {
    isDraft = item.detailStatus === 'Needs Details';
  }

  const out = {
    ...item,
    category:  renamedCategory,
    createdAt: item.createdAt ?? item.id ?? Date.now(),
    itemTypes: sanitizeItemTypes(item.itemTypes),
    isDraft,
  };

  // detailStatus is derived from isDraft. If the user marked it a draft,
  // it stays "Needs Details" no matter what fields are filled in. Otherwise
  // we use the auto rule.
  out.detailStatus = isDraft ? 'Needs Details' : computeDetailStatus(out);
  return out;
}

// Load items from localStorage (returns [] if there are none yet).
// Also PERMANENTLY normalizes older items by writing the cleaned
// version straight back to localStorage — so we only have to migrate
// each old field once.
function loadItems() {
  const stored = localStorage.getItem('dashboardItems');
  if (!stored) return [];
  let raw;
  try {
    raw = JSON.parse(stored);
  } catch (e) {
    // Corrupted JSON — start fresh rather than crash the app
    return [];
  }
  if (!Array.isArray(raw)) return [];

  // Audit BEFORE normalizing so we know what was actually upgraded.
  // Result is logged to the console so the user can verify migration
  // in DevTools without us needing a visible toast on every load.
  const audit = auditMigration(raw);
  const normalized = raw.map(normalizeItem);
  if (audit) {
    console.info(
      `[Sion's Dashboard] Migrated localStorage items to current shape.`,
      audit
    );
  }

  // Persist the migrated form so we never have to redo this work
  try {
    localStorage.setItem('dashboardItems', JSON.stringify(normalized));
  } catch (e) {
    // Quota or serialization error — leave localStorage alone, keep the
    // in-memory normalized copy so rendering still works correctly.
  }

  return normalized;
}

// Programmatically switch to a different sidebar item / view.
// If the target lives in the (possibly collapsed) "More" section,
// expand More first so the active highlight is visible to the user.
function switchToCategory(categoryName) {
  const inMore =
    categoryName !== 'Drafts' &&
    !SIDEBAR_MAIN_ORDER.includes(categoryName) &&
    categories.includes(categoryName);
  if (inMore && typeof setSidebarMoreExpanded === 'function') {
    setSidebarMoreExpanded(true);
  }

  sidebarItems.forEach(item => {
    if (item.dataset.category === categoryName) {
      item.click();           // triggers the sidebar click handler above
    }
  });
}

// Prevent any HTML in user input from breaking the page
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ----------------------------------------------------------
   8b) UI POLISH HELPERS
   - showDashboardFeedback(): brief inline "Saved!" line under the
     main form. Mirrors the welcome form's feedback pattern so the
     two forms feel like siblings.
   - updateSubmitButtonText(): keeps the dashboard form's submit
     button label honest. Reflects edit mode + draft toggle so the
     user always knows what action will fire on click.
   - updateWelcomeSubmitText(): same idea on the welcome quick-add.
   - updateWelcomeSummaryHint(): "X items waiting in your dashboard."
     gives the welcome screen a sense of being a real entry point
     instead of just another form.
   ---------------------------------------------------------- */

function showDashboardFeedback(message) {
  if (!dashboardFeedback) return;
  dashboardFeedback.textContent = message;
  dashboardFeedback.classList.remove('hidden');

  // Replace any pending hide so back-to-back saves restart the timer
  // cleanly instead of disappearing mid-fade.
  if (showDashboardFeedback._timer) clearTimeout(showDashboardFeedback._timer);
  showDashboardFeedback._timer = setTimeout(() => {
    dashboardFeedback.classList.add('hidden');
  }, 2500);
}

function updateSubmitButtonText() {
  const draftCheckbox = document.getElementById('item-draft');
  // `isDraft` is the internal field name; the UI says "Needs Details".
  const markNeedsDetails = !!(draftCheckbox && draftCheckbox.checked);
  if (editingId !== null) {
    submitBtn.textContent = markNeedsDetails
      ? 'Save Changes (Needs Details)'
      : 'Save Changes';
  } else {
    submitBtn.textContent = markNeedsDetails
      ? 'Save (Needs Details)'
      : 'Add Item';
  }
}

function updateWelcomeSubmitText() {
  const draftCheckbox = document.getElementById('welcome-item-draft');
  const markNeedsDetails = !!(draftCheckbox && draftCheckbox.checked);
  const welcomeSubmitBtn = welcomeForm.querySelector('button[type="submit"]');
  if (welcomeSubmitBtn) {
    welcomeSubmitBtn.textContent = markNeedsDetails
      ? 'Save (Needs Details)'
      : 'Add Item';
  }
}

function updateWelcomeSummaryHint() {
  if (!welcomeSummaryHint) return;
  const total = items.length;
  if (total === 0) {
    welcomeSummaryHint.textContent =
      'Your dashboard is empty — add your first thought.';
  } else if (total === 1) {
    welcomeSummaryHint.textContent = '1 item waiting in your dashboard.';
  } else {
    welcomeSummaryHint.textContent =
      `${total} items waiting in your dashboard.`;
  }
  welcomeSummaryHint.classList.remove('hidden');
}

/* ----------------------------------------------------------
   8c) LIVE CAPITALIZATION (simple)
   - Capitalizes ONLY the first non-whitespace letter of the
     input, leaving the rest of what the user typed untouched.
   - Runs after a small 150ms debounce so the user briefly sees
     the lowercase letter they typed before it gets uppercased.
   - The visible input value IS what gets saved — we never
     re-case anything on submit.
   - No special-word/acronym handling at this stage. Words like
     "iphone", "ebay", and "sql" are NOT auto-cased.
   ---------------------------------------------------------- */

// Pure helper: only touches the first non-whitespace letter.
//   "i want to sell my phone"  -> "I want to sell my phone"
//   "I want to sell my phone"  -> unchanged
//   "study SQL tomorrow"       -> "Study SQL tomorrow"
//   "  hello"                  -> "  Hello"
function capitalizeFirstLetterOnly(text) {
  return text.replace(/^(\s*)([a-z])/, (_match, spaces, firstLetter) => {
    return spaces + firstLetter.toUpperCase();
  });
}

function attachLiveCapitalize(input) {
  if (!input) return;
  let timer = null;

  input.addEventListener('input', () => {
    // Reset the timer on every keystroke so we only fire after the
    // user pauses for ~150ms. This lets the lowercase letter flash
    // briefly before it's promoted to uppercase.
    clearTimeout(timer);
    timer = setTimeout(() => {
      const oldValue = input.value;
      const start    = input.selectionStart;
      const end      = input.selectionEnd;

      const newValue = capitalizeFirstLetterOnly(oldValue);
      if (oldValue === newValue) return;       // already capitalized — nothing to do

      input.value = newValue;
      try {
        // The transform is length-preserving (one char swapped for
        // its uppercase), so the old cursor indices still point at
        // the same logical chars and the cursor doesn't jump.
        input.setSelectionRange(start, end);
      } catch (e) {
        // Some input types (e.g. type="date") don't support selection — ignore.
      }
    }, 150);
  });
}


/* ----------------------------------------------------------
   8d) ITEM TYPES (Task / Reminder / Calendar checkboxes)
   - readItemTypes(form): returns an array like ["Task", "Reminder"]
     based on which checkboxes inside the given form are checked.
   - setItemTypes(form, types): pre-checks the boxes whose values
     are in `types` (used by startEdit to restore state).
   - sanitizeItemTypes(input): cleans an arbitrary value into a
     valid itemTypes array. Removes invalid values, removes
     duplicates, and returns [] for anything else.
   ---------------------------------------------------------- */
function readItemTypes(form) {
  const checked = form.querySelectorAll('input[type="checkbox"][data-item-type]:checked');
  // sanitize so even if the HTML is tampered with, we save clean data
  return sanitizeItemTypes(Array.from(checked).map(cb => cb.value));
}

function setItemTypes(form, types) {
  const safe = sanitizeItemTypes(types);
  const boxes = form.querySelectorAll('input[type="checkbox"][data-item-type]');
  boxes.forEach(cb => {
    cb.checked = safe.includes(cb.value);
  });
}

// Returns a clean array containing ONLY valid itemTypes, in the order
// they first appeared, with duplicates removed.
//   ["Task", "Random", "Calendar", "Task"]  ->  ["Task", "Calendar"]
//   "not an array"                          ->  []
//   undefined / null                        ->  []
function sanitizeItemTypes(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out  = [];
  for (const v of input) {
    if (VALID_ITEM_TYPES.includes(v) && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}


/* ----------------------------------------------------------
   8e) DETAIL STATUS (Complete vs. Needs Details)
   - An item is "Complete" if it has a non-empty title AND at least
     ONE extra detail (description, date, or itemType). This is more
     forgiving than v1.9's "needs both description AND date" rule.
   - Independent of `status` (Not Started / In Progress / Completed).
   - Recomputed on every save, so editing an item to add a date
     flips it from "Needs Details" → "Complete" automatically.
   ---------------------------------------------------------- */
function computeDetailStatus({ title, description, date, itemTypes }) {
  const hasTitle =
    typeof title === 'string' && title.trim() !== '';
  const hasExtraDetails =
    (typeof description === 'string' && description.trim() !== '') ||
    (typeof date === 'string' && date.trim() !== '') ||
    (Array.isArray(itemTypes) && itemTypes.length > 0);
  return (hasTitle && hasExtraDetails) ? 'Complete' : 'Needs Details';
}


/* ----------------------------------------------------------
   8f) CATEGORY GUESSING
   - As the user types in the title or description, scan for known
     keywords and suggest a likely category.
   - The suggestion banner asks the user to ACCEPT — we never change
     the category silently.
   - If the suggested category doesn't exist yet, the banner offers
     to create it; clicking accept adds it via saveCategories() +
     renderCategoriesEverywhere(), then selects it.
   ---------------------------------------------------------- */

// Keyword -> category map. First match wins, so order matters.
// Keep keywords lowercase; we match them as whole words.
const CATEGORY_KEYWORDS = {
  'Learning':     ['sql', 'study', 'studying', 'learn', 'learning', 'class', 'classes', 'homework', 'course', 'tutorial'],
  'Health/Gym':   ['gym', 'workout', 'workouts', 'calories', 'protein', 'weight', 'cardio', 'lift', 'lifting', 'exercise'],
  'eBay Tracker / Selling': ['sell', 'selling', 'sold', 'ebay', 'listing', 'buyer', 'shipped', 'shipping', 'phone'],
  'Goals':        ['goal', 'goals', 'accomplish', 'milestone', 'achieve', 'target'],
  'Projects':     ['game', 'app', 'website', 'project', 'projects'],
  'Business':     ['business', 'startup', 'company', 'venture'],
};

// Returns the BEST matching category name, or null if no keyword matched.
//
// Scoring: count how many distinct keywords from each category appear in
// the text (whole-word match). The category with the highest count wins.
// Ties are broken by CATEGORY_KEYWORDS insertion order — i.e. the FIRST
// category to reach the top score keeps it (we use strict ">" below).
//
// Example: "study business sql for startup"
//   Learning  matches study, sql      -> 2
//   Business  matches business, startup -> 2
//   Tied at 2 -> Learning wins (it appears earlier in CATEGORY_KEYWORDS).
function guessCategory(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  let bestCategory = null;
  let bestScore    = 0;

  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const word of words) {
      // Whole-word match so "phone" doesn't accidentally match "phonetic"
      const re = new RegExp(`\\b${word}\\b`, 'i');
      if (re.test(lower)) score++;
    }
    if (score > bestScore) {
      bestScore    = score;
      bestCategory = cat;
    }
  }

  return bestScore > 0 ? bestCategory : null;
}

// Wires up the category-suggestion banner for one form. Returns a
// small object exposing reset() so the form's "reset" event can clear
// any "dismissed" state when the form is cleared.
function attachCategorySuggestion(opts) {
  const { titleEl, descEl, categoryEl, bannerEl, textEl, acceptBtn, dismissBtn } = opts;

  let lastSuggestion = null;     // category name currently being suggested
  let dismissedFor   = null;     // category name the user dismissed (don't re-show)

  function update() {
    const combined = `${titleEl.value} ${descEl.value}`;
    const guess    = guessCategory(combined);

    if (!guess)                          { hide(); return; }
    if (guess === categoryEl.value)      { hide(); return; }
    if (guess === dismissedFor)          { hide(); return; }

    lastSuggestion = guess;
    const exists = categories.includes(guess);
    textEl.textContent = exists
      ? `This sounds like ${guess}. Use this category?`
      : `This sounds like ${guess}. Create this category?`;
    bannerEl.classList.remove('hidden');
  }

  function hide() {
    bannerEl.classList.add('hidden');
    lastSuggestion = null;
  }

  // User typed something new — re-evaluate the suggestion
  titleEl.addEventListener('input', update);
  descEl.addEventListener('input',  update);

  // User changed the category dropdown manually — clear the banner and
  // also clear "dismissedFor" so a future suggestion can show again
  categoryEl.addEventListener('change', () => {
    dismissedFor = null;
    hide();
  });

  // User clicked "Use it" — accept the suggestion
  acceptBtn.addEventListener('click', () => {
    if (!lastSuggestion) return;

    // If the suggested category doesn't exist yet, create it first
    if (!categories.includes(lastSuggestion)) {
      categories.push(lastSuggestion);
      saveCategories();
      renderCategoriesEverywhere();   // rebuilds tabs + dropdowns + list
    }

    // Select the category in this form's dropdown
    categoryEl.value = lastSuggestion;

    // Reset any previous "dismissed" memory now that the user has
    // moved on. Otherwise a previously dismissed category would
    // stay blocked even after they accepted a different one.
    dismissedFor = null;
    hide();
  });

  // User clicked "Dismiss" — remember which guess was rejected so we
  // don't keep nagging them while they keep typing the same word
  dismissBtn.addEventListener('click', () => {
    dismissedFor = lastSuggestion;
    hide();
  });

  return {
    reset() {
      dismissedFor = null;
      hide();
    },
  };
}


// Pre-fill the form's Category dropdown with whatever tab the user
// is currently on, so adding a new item under that tab is one step.
// Skipped while editing (the dropdown holds the item being edited)
// and skipped on the special view tabs (Dashboard, Drafts) — they're
// not real categories, so there's nothing meaningful to pre-fill.
function syncCategoryDropdownToTab() {
  if (editingId !== null) return;
  if (currentCategory === 'Dashboard' || currentCategory === 'Drafts') return;
  document.getElementById('item-category').value = currentCategory;
}


/* ----------------------------------------------------------
   9) MANAGE CATEGORIES
   - Categories are stored in localStorage under 'dashboardCategories'.
   - "Dashboard" is a reserved category: it can't be renamed or deleted.
   - Adding / renaming / deleting a category triggers
     renderCategoriesEverywhere(), which rebuilds:
       a) the .categories tab nav,
       b) the dashboard form's <select>,
       c) the welcome form's <select>,
       d) the manage-categories <ul>,
     and then re-renders the items list so badges + summary stay correct.
   ---------------------------------------------------------- */

// Load the categories array from localStorage. Falls back to the defaults
// if nothing is saved or the saved value is invalid. Also:
//   - applies CATEGORY_RENAMES (e.g. "eBay Tracker" -> "eBay Tracker / Selling")
//   - drops duplicates after rename (case-insensitive, first wins)
//   - guarantees "Dashboard" is the first item
//   - persists the migrated list back to localStorage so we only do it once
function loadCategories() {
  const stored = localStorage.getItem('dashboardCategories');
  if (!stored) return [...DEFAULT_CATEGORIES];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...DEFAULT_CATEGORIES];

    // Step 1: keep strings, apply renames
    const renamed = parsed
      .filter(c => typeof c === 'string' && c.trim())
      .map(c => CATEGORY_RENAMES[c] || c);

    if (renamed.length === 0) return [...DEFAULT_CATEGORIES];

    // Step 2: dedupe (case-insensitive). Keep the FIRST occurrence so the
    // user's preferred casing wins.
    const seen = new Set();
    const deduped = [];
    for (const c of renamed) {
      const key = c.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(c);
      }
    }

    // Step 3: force "Dashboard" to the front (present and singular)
    const withoutDashboard = deduped.filter(c => c !== 'Dashboard');
    const final = ['Dashboard', ...withoutDashboard];

    // Step 4: persist the migrated list so the rename never has to happen again
    try {
      localStorage.setItem('dashboardCategories', JSON.stringify(final));
    } catch (e) { /* ignore quota/serialization errors */ }

    return final;
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}

// Save the current categories array to localStorage as JSON.
function saveCategories() {
  localStorage.setItem('dashboardCategories', JSON.stringify(categories));
}

// Rebuild every UI surface that shows categories, then re-render items.
function renderCategoriesEverywhere() {
  renderCategoryTabs();
  renderCategoryDropdowns();
  renderCategoryList();
  renderItems();    // refreshes summary + tab count badges
}

// Names that live in the sidebar's "Main" section (in display order).
// Anything in `categories[]` not in this set ends up in the "More"
// section. "Drafts" is appended at the end of Main as a special view
// — it's not in `categories[]` so it has to be hardcoded here.
const SIDEBAR_MAIN_ORDER = ['Dashboard', 'Calendar', 'Schedule', 'Goals'];

// Tiny factory for one sidebar item (<li><button>label + count badge</button></li>).
// Used for both real categories AND the special "Drafts" view tab,
// so they look and behave identically.
function buildSidebarItem(name) {
  const li = document.createElement('li');

  const btn = document.createElement('button');
  btn.className = 'sidebar-item';
  btn.dataset.category = name;
  btn.type = 'button';
  if (name === currentCategory) btn.classList.add('active');

  const label = document.createElement('span');
  label.className = 'sidebar-item-label';
  label.textContent = name;
  btn.appendChild(label);

  const count = document.createElement('span');
  count.className = 'tab-count';
  count.textContent = '0';
  btn.appendChild(count);

  li.appendChild(btn);
  return li;
}

// Rebuild the sidebar lists from the current categories array. Refreshes
// the cached `sidebarItems` NodeList used elsewhere. "Drafts" always
// sits at the end of Main; everything not in SIDEBAR_MAIN_ORDER goes
// into More (preserving the user's category-list order).
//
// Function name `renderCategoryTabs` is kept so existing callers
// (renderCategoriesEverywhere, etc.) don't need to change.
function renderCategoryTabs() {
  sidebarMainList.innerHTML = '';
  sidebarMoreList.innerHTML = '';

  // Main section — only render Main items that actually exist in
  // categories[] (e.g. user may have deleted "Goals" from their list).
  // Drafts is always present since it's a view, not a category.
  SIDEBAR_MAIN_ORDER.forEach(name => {
    if (categories.includes(name)) {
      sidebarMainList.appendChild(buildSidebarItem(name));
    }
  });
  sidebarMainList.appendChild(buildSidebarItem('Drafts'));

  // More section — every category not already in Main, in the order
  // they appear in categories[].
  const mainSet = new Set(SIDEBAR_MAIN_ORDER);
  categories.forEach(cat => {
    if (mainSet.has(cat)) return;
    sidebarMoreList.appendChild(buildSidebarItem(cat));
  });

  sidebarItems = document.querySelectorAll('.sidebar-item');
}

// Rebuild both <select> dropdowns (dashboard form + welcome form).
// We use defaultSelected on one option so form.reset() lands on a sensible
// default (Dashboard for the main form, Notes for the welcome form).
function renderCategoryDropdowns() {
  const dashSelect    = document.getElementById('item-category');
  const welcomeSelect = document.getElementById('welcome-item-category');

  const rebuild = (select, fallback) => {
    const prev = select.value;
    select.innerHTML = '';

    // Pick which option is the form-reset default
    const defaultCat = categories.includes(fallback) ? fallback : categories[0];

    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === defaultCat) opt.defaultSelected = true;
      select.appendChild(opt);
    });

    // Try to restore the user's previous live selection
    if (categories.includes(prev)) {
      select.value = prev;
    } else {
      select.value = defaultCat;
    }
  };

  rebuild(dashSelect,    'Dashboard');
  rebuild(welcomeSelect, 'Notes');
}

// Rebuild the <ul> inside the manage-categories panel.
// Each row shows the name + Rename / Delete buttons.
// Dashboard renders as "locked" (no buttons, " (locked)" hint).
function renderCategoryList() {
  categoryList.innerHTML = '';
  categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'category-list-item';
    if (cat === 'Dashboard') li.classList.add('locked');
    li.dataset.category = cat;

    const name = document.createElement('span');
    name.className = 'category-list-item-name';
    name.textContent = cat;
    li.appendChild(name);

    const actions = document.createElement('div');
    actions.className = 'category-list-item-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn btn-edit';
    renameBtn.textContent = 'Rename';
    renameBtn.dataset.action = 'rename';
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.action = 'delete';
    actions.appendChild(deleteBtn);

    li.appendChild(actions);
    categoryList.appendChild(li);
  });
}

// Toggle the Manage Categories panel visibility
manageCategoriesBtn.addEventListener('click', () => {
  categoriesPanel.classList.toggle('hidden');
});

// Add a new category from the panel's form
addCategoryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = newCategoryInput.value.trim();
  if (!raw) return;

  // Reserved view-tab name — Drafts is a special view, not a category.
  if (raw.toLowerCase() === 'drafts') {
    alert(
      `"Drafts" is a reserved view. Items flagged Needs Details already show up there automatically — choose another name.`
    );
    return;
  }

  // Reject duplicates (case-insensitive)
  const exists = categories.some(c => c.toLowerCase() === raw.toLowerCase());
  if (exists) {
    alert(`Category "${raw}" already exists.`);
    return;
  }

  categories.push(raw);
  saveCategories();
  newCategoryInput.value = '';
  renderCategoriesEverywhere();
});

// Rename / Delete buttons inside the list (event delegation)
categoryList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const li = btn.closest('.category-list-item');
  if (!li) return;
  const cat = li.dataset.category;
  const action = btn.dataset.action;

  if (action === 'rename')  handleRenameCategory(cat);
  if (action === 'delete')  handleDeleteCategory(cat);
});

// Rename: prompt for a new name, then update the categories list
// AND every item that had the old category.
function handleRenameCategory(oldName) {
  if (oldName === 'Dashboard') {
    alert('The "Dashboard" category is reserved and cannot be renamed.');
    return;
  }

  const input = prompt(`Rename "${oldName}" to:`, oldName);
  if (input === null) return;             // user hit Cancel
  const newName = input.trim();
  if (!newName)            return;        // empty input — silently abort
  if (newName === oldName) return;        // unchanged — nothing to do

  // Reserved view-tab name — Drafts can't be a real category.
  if (newName.toLowerCase() === 'drafts') {
    alert(`"Drafts" is a reserved view name. Choose another.`);
    return;
  }

  // Reject duplicates (case-insensitive, but allow same string)
  const exists = categories.some(c => c.toLowerCase() === newName.toLowerCase());
  if (exists) {
    alert(`Category "${newName}" already exists.`);
    return;
  }

  // Update the categories list (preserve order)
  categories = categories.map(c => c === oldName ? newName : c);

  // Update every item that was in the old category
  items = items.map(item =>
    item.category === oldName ? { ...item, category: newName } : item
  );

  // If we were viewing the renamed tab, follow it
  if (currentCategory === oldName) {
    currentCategory = newName;
    categoryLabel.textContent = newName;
  }

  saveCategories();
  saveItems();
  renderCategoriesEverywhere();
}

// Delete: ask the user how to handle existing items, then remove the category.
// 3-way prompt: type "move" / "delete" / cancel-or-anything-else.
function handleDeleteCategory(name) {
  if (name === 'Dashboard') {
    alert('The "Dashboard" category is reserved and cannot be deleted.');
    return;
  }

  const itemCount = items.filter(i => i.category === name).length;

  const choice = prompt(
    `Delete category "${name}"?\n\n` +
    `It has ${itemCount} item(s).\n\n` +
    `Type one of:\n` +
    `  move    -> move its items to Notes\n` +
    `  delete  -> permanently delete its items\n\n` +
    `(Click Cancel or leave blank to abort.)`
  );

  if (choice === null) return;            // Cancel button
  const action = choice.trim().toLowerCase();

  if (action === 'move') {
    // If the user previously deleted "Notes", recreate it so we have somewhere to move to
    if (!categories.includes('Notes')) {
      categories.push('Notes');
    }
    items = items.map(item =>
      item.category === name ? { ...item, category: 'Notes' } : item
    );
  } else if (action === 'delete') {
    if (itemCount > 0) {
      const confirmed = confirm(
        `Permanently DELETE ${itemCount} item(s) in "${name}"?\n\nThis cannot be undone.`
      );
      if (!confirmed) return;
    }
    items = items.filter(item => item.category !== name);
  } else {
    // Anything else = abort
    return;
  }

  // Remove the category itself
  categories = categories.filter(c => c !== name);

  // If we were viewing the deleted tab, jump back to Dashboard
  if (currentCategory === name) {
    currentCategory = 'Dashboard';
    categoryLabel.textContent = 'Dashboard';
  }

  // If we were editing an item that was just deleted, exit edit mode cleanly
  if (editingId !== null && !items.some(i => i.id === editingId)) {
    exitEditMode();
    itemForm.reset();
  }

  saveCategories();
  saveItems();
  renderCategoriesEverywhere();
  syncCategoryDropdownToTab();
}

// Restore Defaults: reset to the original 9 categories. Any items in
// custom (non-default) categories get moved to Notes so they aren't orphaned.
restoreCategoriesBtn.addEventListener('click', () => {
  const confirmed = confirm(
    'Restore default categories?\n\n' +
    'This will:\n' +
    '- Reset the category list to the original 9 categories.\n' +
    '- Move any items in custom categories to Notes.'
  );
  if (!confirmed) return;

  // Move orphaned items to Notes BEFORE swapping the categories list
  items = items.map(item =>
    DEFAULT_CATEGORIES.includes(item.category)
      ? item
      : { ...item, category: 'Notes' }
  );

  categories = [...DEFAULT_CATEGORIES];

  // If currentCategory was a custom one, jump back to Dashboard
  if (!categories.includes(currentCategory)) {
    currentCategory = 'Dashboard';
    categoryLabel.textContent = 'Dashboard';
  }

  saveCategories();
  saveItems();
  renderCategoriesEverywhere();
});

/* ----------------------------------------------------------
   10) INITIALIZATION (live cap + category suggestions)
   - Wires up the live-capitalization listeners on title + description
     inputs in BOTH the welcome form and the dashboard form.
   - Wires up the category-suggestion banner on BOTH forms and stores
     the small reset() handles so the form's "reset" event can clear
     the dismissed-state when the form is cleared (after submit, etc.).
   ---------------------------------------------------------- */

// Live capitalize: title + description on both forms
attachLiveCapitalize(document.getElementById('item-title'));
attachLiveCapitalize(document.getElementById('item-description'));
attachLiveCapitalize(document.getElementById('welcome-item-title'));
attachLiveCapitalize(document.getElementById('welcome-item-description'));

// Category suggestion: dashboard form
const dashSuggestion = attachCategorySuggestion({
  titleEl:    document.getElementById('item-title'),
  descEl:     document.getElementById('item-description'),
  categoryEl: document.getElementById('item-category'),
  bannerEl:   document.getElementById('suggestion-banner'),
  textEl:     document.getElementById('suggestion-text'),
  acceptBtn:  document.getElementById('suggestion-accept'),
  dismissBtn: document.getElementById('suggestion-dismiss'),
});

// Category suggestion: welcome / check-in form
const welcomeSuggestion = attachCategorySuggestion({
  titleEl:    document.getElementById('welcome-item-title'),
  descEl:     document.getElementById('welcome-item-description'),
  categoryEl: document.getElementById('welcome-item-category'),
  bannerEl:   document.getElementById('welcome-suggestion-banner'),
  textEl:     document.getElementById('welcome-suggestion-text'),
  acceptBtn:  document.getElementById('welcome-suggestion-accept'),
  dismissBtn: document.getElementById('welcome-suggestion-dismiss'),
});

// Clear suggestion state whenever a form is reset (covers submit,
// cancel-edit, and import-backup paths — they all call form.reset()).
itemForm.addEventListener('reset',    () => dashSuggestion.reset());
welcomeForm.addEventListener('reset', () => welcomeSuggestion.reset());

// Keep submit-button labels honest. The draft checkbox is the source of
// truth: toggling it should immediately retitle the button so the user
// knows whether they're saving a Needs Details item or a normal one.
const itemDraftCheckbox    = document.getElementById('item-draft');
const welcomeDraftCheckbox = document.getElementById('welcome-item-draft');
if (itemDraftCheckbox)    itemDraftCheckbox.addEventListener('change',    updateSubmitButtonText);
if (welcomeDraftCheckbox) welcomeDraftCheckbox.addEventListener('change', updateWelcomeSubmitText);

// form.reset() doesn't fire 'change' on inputs, so we relabel buttons
// after a reset using a 0ms timeout (lets the reset finish first).
itemForm.addEventListener('reset',    () => setTimeout(updateSubmitButtonText, 0));
welcomeForm.addEventListener('reset', () => setTimeout(updateWelcomeSubmitText, 0));


/* ----------------------------------------------------------
   11) SIDEBAR "MORE" TOGGLE (Phase 2)
   - The More section is collapsed by default. Clicking the toggle
     expands/collapses it; the state persists across reloads via
     localStorage so the sidebar comes back the way you left it.
   - If `currentCategory` is itself a More-section item on load,
     auto-expand so the active item isn't hidden.
   ---------------------------------------------------------- */
const STORAGE_KEY_MORE_EXPANDED = 'sidebarMoreExpanded';

function setSidebarMoreExpanded(expanded) {
  sidebarMoreToggle.setAttribute('aria-expanded', String(expanded));
  sidebarMoreToggle.classList.toggle('expanded', expanded);
  sidebarMoreList.classList.toggle('collapsed', !expanded);
  try {
    localStorage.setItem(STORAGE_KEY_MORE_EXPANDED, expanded ? 'true' : 'false');
  } catch (e) { /* ignore quota errors */ }
}

sidebarMoreToggle.addEventListener('click', () => {
  const isExpanded = sidebarMoreToggle.getAttribute('aria-expanded') === 'true';
  setSidebarMoreExpanded(!isExpanded);
});

// Restore the user's last collapsed/expanded preference. If their
// currently selected view lives in the More section, force-expand so
// the active item is visible right away.
const savedMoreExpanded =
  localStorage.getItem(STORAGE_KEY_MORE_EXPANDED) === 'true';
const currentIsInMore =
  currentCategory !== 'Drafts' &&
  !SIDEBAR_MAIN_ORDER.includes(currentCategory);
setSidebarMoreExpanded(savedMoreExpanded || currentIsInMore);


// Initial render — replaces the hardcoded HTML with whatever is in the
// categories array (defaults on first run, custom list on later runs).
renderCategoriesEverywhere();
