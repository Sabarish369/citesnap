const feedEl = document.getElementById("feed");
const searchInput = document.getElementById("searchInput");
const copyAllBtn = document.getElementById("copyAllBtn");
const clipCountEl = document.getElementById("clipCount");
const toastEl = document.getElementById("toast");
const collectionDropdown = document.getElementById("collectionDropdown");
const dropdownTrigger = document.getElementById("dropdownTrigger");
const dropdownLabel = document.getElementById("dropdownLabel");
const dropdownMenu = document.getElementById("dropdownMenu");

const DEFAULT_COLLECTION = "General";
let collections = [DEFAULT_COLLECTION];
let activeCollection = DEFAULT_COLLECTION;

let clips = [];
let searchQuery = "";
let toastTimer = null;
let isAddingCollection = false;

function getClipCollection(clip) {
  return (clip.collection || DEFAULT_COLLECTION).trim() || DEFAULT_COLLECTION;
}

async function persistState() {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({
      clips,
      collections,
      activeCollection
    });
  }
}

/* ---------------- Minimalist Project Dropdown ---------------- */

function updateDropdownLabel() {
  if (dropdownLabel) dropdownLabel.textContent = activeCollection;
}

function closeDropdown() {
  if (!collectionDropdown) return;
  collectionDropdown.classList.remove("is-open");
  dropdownTrigger.setAttribute("aria-expanded", "false");
  isAddingCollection = false;
}

function renderDropdownMenu() {
  if (!dropdownMenu) return;
  dropdownMenu.innerHTML = "";

  collections.forEach((name) => {
    const isActive = name === activeCollection;
    const item = document.createElement("div");
    item.className = `dropdown-item${isActive ? " is-active" : ""}`;
    item.dataset.collection = name;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(isActive));

    item.innerHTML = `
      <div class="dropdown-item-left">
        <svg class="dropdown-check" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.4l3 3 6-6.4" />
        </svg>
        <span class="dropdown-item-name">${escapeHtml(name)}</span>
      </div>
      ${
        name !== DEFAULT_COLLECTION
          ? `<button type="button" class="dropdown-item-del" data-delete-collection="${escapeHtml(name)}" title="Delete ${escapeHtml(name)}">×</button>`
          : ""
      }
    `;

    dropdownMenu.appendChild(item);
  });

  const divider = document.createElement("div");
  divider.className = "dropdown-divider";
  dropdownMenu.appendChild(divider);

  if (isAddingCollection) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "dropdown-new-input";
    input.placeholder = "Project name (Enter)…";
    input.maxLength = 24;

    const commit = async () => {
      const val = input.value.trim();
      isAddingCollection = false;
      if (val) {
        const existing = collections.find((c) => c.toLowerCase() === val.toLowerCase());
        if (existing) {
          activeCollection = existing;
        } else {
          collections.push(val);
          activeCollection = val;
          showToast(`Created “${val}”`);
        }
        updateDropdownLabel();
        await persistState();
        render();
      }
      closeDropdown();
    };

    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeDropdown();
      }
    });

    dropdownMenu.appendChild(input);
    requestAnimationFrame(() => input.focus());
  } else {
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "dropdown-new-btn";
    addBtn.dataset.addCollection = "true";
    addBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M8 3v10M3 8h10" />
      </svg>
      <span>New Project</span>
    `;
    dropdownMenu.appendChild(addBtn);
  }
}

dropdownTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  const willOpen = !collectionDropdown.classList.contains("is-open");
  if (willOpen) {
    isAddingCollection = false;
    renderDropdownMenu();
    collectionDropdown.classList.add("is-open");
    dropdownTrigger.setAttribute("aria-expanded", "true");
  } else {
    closeDropdown();
  }
});

dropdownMenu.addEventListener("click", async (event) => {
  event.stopPropagation();

  const delTarget = event.target.closest("[data-delete-collection]");
  if (delTarget) {
    const targetName = delTarget.dataset.deleteCollection;
    collections = collections.filter((c) => c !== targetName);
    clips = clips.filter((c) => getClipCollection(c) !== targetName);
    if (activeCollection === targetName) {
      activeCollection = DEFAULT_COLLECTION;
    }
    updateDropdownLabel();
    await persistState();
    renderDropdownMenu();
    render();
    showToast(`Deleted “${targetName}”`);
    return;
  }

  const addTarget = event.target.closest("[data-add-collection]");
  if (addTarget) {
    isAddingCollection = true;
    renderDropdownMenu();
    return;
  }

  const item = event.target.closest("[data-collection]");
  if (item) {
    activeCollection = item.dataset.collection;
    updateDropdownLabel();
    await persistState();
    render();
    closeDropdown();
  }
});

document.addEventListener("click", (event) => {
  if (!collectionDropdown.contains(event.target)) {
    closeDropdown();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && collectionDropdown.classList.contains("is-open")) {
    closeDropdown();
  }
});

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1700);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function invertAuthorForMla(author) {
  const clean = (author || "").trim();
  if (!clean || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean)) return "";
  if (clean.includes(",")) return clean;
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return `${last}, ${parts.join(" ")}`;
}

function getMlaInTextTag(c) {
  if (c.corporateAuthor) return `(${c.corporateAuthor})`;
  const inverted = invertAuthorForMla(c.author);
  if (inverted) return `(${inverted.split(",")[0].trim()})`;

  const shortTitle = (c.title || "Untitled")
    .split(/[:|—–-]/)[0]
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(" ");
  return `("${shortTitle}")`;
}

function formatMlaInTextSentence(c) {
  const cleanQuote = c.quote.replace(/[.,;:\s]+$/, "");
  return `"${cleanQuote}" ${getMlaInTextTag(c)}.`;
}

function buildMlaWorksCitedParts(c) {
  const invertedPerson = invertAuthorForMla(c.author);
  const authorSlot = invertedPerson || (c.corporateAuthor || "").trim();
  const cleanTitle = (c.title || "Untitled Source").replace(/\.$/, "");
  const cleanSite = (c.siteName || "").replace(/\.$/, "");
  const cleanPublisher = (c.publisher || "").replace(/\.$/, "");
  const datePart = (c.mlaDate || c.year || "").trim();
  const rawUrl = c.cleanUrl || (c.deepLink || "").split("#")[0];
  const cleanUrl = rawUrl.replace(/^https?:\/\//i, "");
  const accessedPart = c.accessedDate ? `Accessed ${c.accessedDate}.` : "";
  const sortKey = (authorSlot || cleanTitle).replace(/^["“]+/, "").toLowerCase();

  const headPlain = [];
  const headHtml = [];

  if (authorSlot) {
    headPlain.push(`${authorSlot}.`);
    headHtml.push(`${escapeHtml(authorSlot)}.`);
  }

  headPlain.push(`"${cleanTitle}."`);
  headHtml.push(`"${escapeHtml(cleanTitle)}."`);

  const containerPlain = [];
  const containerHtml = [];
  const showContainer = cleanSite && (
    Boolean(cleanPublisher) ||
    Boolean(invertedPerson) ||
    cleanSite.toLowerCase() !== authorSlot.toLowerCase()
  );

  if (showContainer) {
    containerPlain.push(cleanSite);
    containerHtml.push(`<i>${escapeHtml(cleanSite)}</i>`);
  }

  if (cleanPublisher && cleanPublisher.toLowerCase() !== cleanSite.toLowerCase()) {
    containerPlain.push(cleanPublisher);
    containerHtml.push(escapeHtml(cleanPublisher));
  }

  if (datePart) {
    containerPlain.push(datePart);
    containerHtml.push(escapeHtml(datePart));
  }

  if (cleanUrl) {
    containerPlain.push(cleanUrl);
    containerHtml.push(
      `<a href="${escapeHtml(rawUrl)}" style="color:inherit;text-decoration:none;">${escapeHtml(cleanUrl)}</a>`
    );
  }

  const plainEntry = [
    headPlain.join(" "),
    containerPlain.length ? `${containerPlain.join(", ")}.` : "",
    accessedPart
  ].filter(Boolean).join(" ");

  const htmlEntry = [
    headHtml.join(" "),
    containerHtml.length ? `${containerHtml.join(", ")}.` : "",
    accessedPart ? escapeHtml(accessedPart) : ""
  ].filter(Boolean).join(" ");

  return { sortKey, plain: plainEntry, html: htmlEntry };
}

async function copyRichMla(entries) {
  const sorted = [...entries].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const plainText = sorted.map((entry) => entry.plain).join("\n\n");
  const htmlBody = sorted
    .map((entry) =>
      `<p style="margin:0 0 12pt 0;padding-left:0.5in;text-indent:-0.5in;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:2;">${entry.html}</p>`
    )
    .join("");

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([htmlBody], { type: "text/html" })
      })
    ]);
  } catch {
    await navigator.clipboard.writeText(plainText);
  }
}

function getProjectClips() {
  return clips.filter((c) => getClipCollection(c) === activeCollection);
}

function getFilteredClips() {
  const projectClips = getProjectClips();
  const query = searchQuery.trim().toLowerCase();
  if (!query) return projectClips;
  return projectClips.filter(
    (c) =>
      (c.quote || "").toLowerCase().includes(query) ||
      (c.title || "").toLowerCase().includes(query) ||
      (c.author || "").toLowerCase().includes(query) ||
      (c.corporateAuthor || "").toLowerCase().includes(query) ||
      (c.siteName || "").toLowerCase().includes(query)
  );
}

function updateCountBadge(visibleCount) {
  const total = getProjectClips().length;
  if (!total) {
    clipCountEl.textContent = "0 clips";
    return;
  }
  clipCountEl.textContent =
    visibleCount !== total
      ? `${visibleCount} of ${total}`
      : `${total} ${total === 1 ? "clip" : "clips"}`;
}

function updateCount(filteredLength) {
  updateCountBadge(filteredLength);
}

function getLocalDayKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveClipTimestamp(clip) {
  if (typeof clip.createdAt === "number" && !Number.isNaN(clip.createdAt)) {
    return clip.createdAt;
  }
  if (typeof clip.timestamp === "number" && !Number.isNaN(clip.timestamp)) {
    return clip.timestamp;
  }
  if (typeof clip.savedAt === "number" && !Number.isNaN(clip.savedAt)) {
    return clip.savedAt;
  }
  if (clip.accessedDate) {
    const parsed = Date.parse(clip.accessedDate.replace(/\./g, ""));
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function formatDayLabel(dayKey, timestamp) {
  const now = new Date();
  const todayKey = getLocalDayKey(now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getLocalDayKey(yesterday);

  if (dayKey === todayKey) return "Today";
  if (dayKey === yesterdayKey) return "Yesterday";

  const dateObj = new Date(timestamp);
  const sameYear = dateObj.getFullYear() === now.getFullYear();
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" })
  });
}

function groupClipsByDay(clipList) {
  const sorted = [...clipList].sort(
    (a, b) => resolveClipTimestamp(b) - resolveClipTimestamp(a)
  );
  const groups = new Map();

  for (const clip of sorted) {
    const ts = resolveClipTimestamp(clip);
    const key = getLocalDayKey(new Date(ts));
    if (!groups.has(key)) {
      groups.set(key, {
        dayKey: key,
        label: formatDayLabel(key, ts),
        items: []
      });
    }
    groups.get(key).items.push(clip);
  }

  return Array.from(groups.values());
}

function createClipRowElement(clip, index) {
  const row = document.createElement("article");
  row.className = "clip-row clip-item";
  row.style.setProperty("--delay", `${Math.min(index * 25, 175)}ms`);
  row.style.setProperty("--stagger", `${Math.min(index * 25, 175)}ms`);
  row.dataset.id = clip.id;

  const cleanQuote = (clip.quote || "").replace(/[.,;:\s]+$/, "");
  const inTextTag = getMlaInTextTag(clip);
  const authorDisplay = invertAuthorForMla(clip.author) || clip.corporateAuthor || "Untitled Source";
  const dateDisplay = clip.mlaDate || clip.year || (clip.accessedDate ? `Accessed ${clip.accessedDate}` : "");
  const caption = [authorDisplay, clip.siteName, dateDisplay].filter(Boolean).join(" · ");

  row.innerHTML = `
    <p class="quote-body clip-quote">“${escapeHtml(cleanQuote)}” <span class="mla-tag inline-citation">${escapeHtml(inTextTag)}.</span></p>
    <div class="source-caption clip-source">${escapeHtml(caption)}</div>
    <div class="inline-actions clip-actions">
      <button type="button" class="pill-action" data-action="copy-intext" data-id="${escapeHtml(clip.id)}">
        <span class="pill-icon-stack" aria-hidden="true">
          <svg class="pill-icon-default" viewBox="0 0 16 16">
            <rect x="5" y="5" width="7.5" height="8.5" rx="1.5" />
            <path d="M3.5 10.5V4a1.5 1.5 0 0 1 1.5-1.5h5" />
          </svg>
          <svg class="pill-icon-check" viewBox="0 0 16 16">
            <path d="M3.5 8.4l3 3 6-6.4" />
          </svg>
        </span>
        <span class="pill-label-stack">
          <span class="pill-label-default">In-Text</span>
          <span class="pill-label-copied" aria-hidden="true">Copied</span>
        </span>
      </button>
      <button type="button" class="pill-action" data-action="copy-works" data-id="${escapeHtml(clip.id)}">
        <span class="pill-icon-stack" aria-hidden="true">
          <svg class="pill-icon-default" viewBox="0 0 16 16">
            <path d="M4 3.5h8v9H4zM6.5 6.5h3M6.5 9.5h3" />
          </svg>
          <svg class="pill-icon-check" viewBox="0 0 16 16">
            <path d="M3.5 8.4l3 3 6-6.4" />
          </svg>
        </span>
        <span class="pill-label-stack">
          <span class="pill-label-default">Works Cited</span>
          <span class="pill-label-copied" aria-hidden="true">Copied</span>
        </span>
      </button>
      <button type="button" class="pill-action" data-action="jump" data-url="${escapeHtml(clip.deepLink || clip.cleanUrl || "")}">
        <span>Jump</span>
        <svg class="svg-icon" viewBox="0 0 16 16" aria-hidden="true" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round;">
          <path d="M5.5 10.5l5-5M6.5 5.5h4v4" />
        </svg>
      </button>
      <button type="button" class="pill-action is-danger del" data-action="delete" data-id="${escapeHtml(clip.id)}">
        <svg class="svg-icon" viewBox="0 0 16 16" aria-hidden="true" style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round;">
          <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
        </svg>
        <span>Remove</span>
      </button>
    </div>
  `;

  return row;
}

function render() {
  const visible = getFilteredClips();
  updateCountBadge(visible.length);

  if (!clips.length) {
    feedEl.innerHTML = `
      <div class="empty-view empty-state">
        <p class="empty-heading empty-title">No clips yet</p>
        <p class="empty-copy empty-sub">Select text on any page and press <span class="key-cap kbd">Alt+X</span> to capture a quote and MLA citation.</p>
      </div>
    `;
    return;
  }

  if (!visible.length) {
    feedEl.innerHTML = `
      <div class="empty-view empty-state">
        <p class="empty-heading empty-title">No matching clips</p>
        <p class="empty-copy empty-sub">No saved quotes match “${escapeHtml(searchQuery.trim())}”.</p>
      </div>
    `;
    return;
  }

  const dayGroups = groupClipsByDay(visible);
  feedEl.innerHTML = "";
  let runningIndex = 0;

  for (const group of dayGroups) {
    const header = document.createElement("div");
    header.className = "day-header";
    header.innerHTML = `
      <span class="day-label">${escapeHtml(group.label)} · ${group.items.length}</span>
      <button type="button" class="day-copy-btn" data-action="copy-day" data-day="${escapeHtml(group.dayKey)}">
        Copy Day
      </button>
    `;
    feedEl.appendChild(header);

    for (const clip of group.items) {
      feedEl.appendChild(createClipRowElement(clip, runningIndex));
      runningIndex += 1;
    }
  }
}

searchInput.addEventListener("input", (event) => {
  searchQuery = event.target.value;
  render();
});

feedEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;

  if (action === "copy-day") {
    const dayKey = button.dataset.day;
    const dayClips = getFilteredClips().filter(
      (item) => getLocalDayKey(new Date(resolveClipTimestamp(item))) === dayKey
    );
    if (!dayClips.length) return;
    await copyRichMla(dayClips.map(buildMlaWorksCitedParts));
    const label = formatDayLabel(dayKey, resolveClipTimestamp(dayClips[0]));
    showToast(`Copied ${label} Works Cited`);
    return;
  }

  if (action === "copy-intext") {
    const clip = clips.find((item) => item.id === button.dataset.id);
    if (!clip) return;
    await navigator.clipboard.writeText(formatMlaInTextSentence(clip));
    button.classList.remove("is-copied");
    void button.offsetWidth;
    button.classList.add("is-copied");
    showToast("Copied MLA in-text quote");
    clearTimeout(button._copyTimer);
    button._copyTimer = setTimeout(() => {
      button.classList.remove("is-copied");
    }, 1250);
  }

  if (action === "copy-works" || action === "copy-mla") {
    const clip = clips.find((item) => item.id === button.dataset.id);
    if (!clip) return;
    await copyRichMla([buildMlaWorksCitedParts(clip)]);
    button.classList.remove("is-copied");
    void button.offsetWidth;
    button.classList.add("is-copied");
    showToast("Copied MLA Works Cited");
    clearTimeout(button._copyTimer);
    button._copyTimer = setTimeout(() => {
      button.classList.remove("is-copied");
    }, 1250);
  }

  if (action === "jump") {
    chrome.tabs.create({ url: button.dataset.url });
  }

  if (action === "delete") {
    const id = button.dataset.id;
    const row = feedEl.querySelector(`[data-id="${CSS.escape(id)}"]`);

    if (row) row.classList.add("removing");

    setTimeout(async () => {
      clips = clips.filter((item) => item.id !== id);
      await persistState();
      render();
      showToast("Removed clip");
    }, 180);
  }
});

let copyAllTimer = null;

copyAllBtn.addEventListener("click", async () => {
  const visible = getFilteredClips();
  if (!visible.length) {
    showToast("Nothing to copy");
    return;
  }

  await copyRichMla(visible.map(buildMlaWorksCitedParts));

  copyAllBtn.classList.remove("is-copied");
  void copyAllBtn.offsetWidth;
  copyAllBtn.classList.add("is-copied");
  showToast("Copied MLA Works Cited");

  clearTimeout(copyAllTimer);
  copyAllTimer = setTimeout(() => {
    copyAllBtn.classList.remove("is-copied");
  }, 1350);
});

clearBtn.addEventListener("click", async () => {
  const projectClips = getProjectClips();
  if (!projectClips.length) {
    showToast("Already empty");
    return;
  }
  clips = clips.filter((c) => getClipCollection(c) !== activeCollection);
  await persistState();
  render();
  showToast(`Cleared ${activeCollection}`);
});

(async function init() {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const stored = await chrome.storage.local.get(["clips", "collections", "activeCollection"]);
    const rawClips = Array.isArray(stored.clips) ? stored.clips : [];

    collections = Array.isArray(stored.collections) && stored.collections.length
      ? stored.collections
      : [DEFAULT_COLLECTION];
    if (!collections.includes(DEFAULT_COLLECTION)) {
      collections.unshift(DEFAULT_COLLECTION);
    }

    activeCollection =
      stored.activeCollection && collections.includes(stored.activeCollection)
        ? stored.activeCollection
        : DEFAULT_COLLECTION;

    clips = rawClips
      .filter((item) => !String(item.id || "").startsWith("sample-"))
      .map((item) => ({
        ...item,
        collection: getClipCollection(item),
        createdAt: resolveClipTimestamp(item)
      }));

    await persistState();
  }
  updateDropdownLabel();
  render();
})();

// Sync live storage changes (activeCollection, collections, clips)
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.activeCollection) {
      activeCollection = changes.activeCollection.newValue || DEFAULT_COLLECTION;
      updateDropdownLabel();
    }
    if (changes.collections && Array.isArray(changes.collections.newValue)) {
      collections = changes.collections.newValue;
    }
    if (changes.clips && Array.isArray(changes.clips.newValue)) {
      clips = changes.clips.newValue.map((item) => ({
        ...item,
        collection: getClipCollection(item),
        createdAt: resolveClipTimestamp(item)
      }));
      render();
    }
  });
}
