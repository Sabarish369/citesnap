(() => {
  let pillEl = null;
  const MLA_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
  const MINOR_WORDS = new Set(["a", "an", "the", "and", "but", "for", "nor", "or", "so", "yet", "at", "by", "in", "of", "on", "to", "up", "as", "via", "per"]);

  function removePill() {
    if (!pillEl) return;
    const el = pillEl;
    pillEl = null;
    el.style.opacity = "0";
    el.style.transform = "translate(-50%, 4px) scale(0.95)";
    setTimeout(() => el.remove(), 160);
  }

  function showToast(text) {
    const toast = document.createElement("div");
    toast.textContent = text;
    Object.assign(toast.style, {
      position: "fixed", bottom: "24px", left: "50%",
      transform: "translate(-50%, 12px) scale(0.96)", opacity: "0",
      background: "rgba(24, 24, 27, 0.92)", backdropFilter: "blur(16px)",
      webkitBackdropFilter: "blur(16px)", color: "#fafafa", padding: "9px 16px",
      borderRadius: "999px", fontSize: "12.5px", fontWeight: "500",
      letterSpacing: "-0.01em", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      zIndex: "2147483647", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
      transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out", pointerEvents: "none"
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = "translate(-50%, 0) scale(1)";
      toast.style.opacity = "1";
    });
    setTimeout(() => {
      toast.style.transform = "translate(-50%, 6px) scale(0.98)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 220);
    }, 1900);
  }

  function toMlaTitleCase(str) {
    if (!str) return "";
    const words = str.trim().split(/\s+/);
    return words.map((word, idx) => {
      const lower = word.toLowerCase();
      const isFirstOrLast = idx === 0 || idx === words.length - 1;
      const afterColon = idx > 0 && /[:—–-]$/.test(words[idx - 1]);
      if (!isFirstOrLast && !afterColon && MINOR_WORDS.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");
  }

  function formatMlaDate(rawDate) {
    if (!rawDate) return "";
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getUTCDate()} ${MLA_MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
    }
    return rawDate.match(/\d{4}/)?.[0] || "";
  }

  function getTodayMlaAccessed() {
    const now = new Date();
    return `${now.getDate()} ${MLA_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }

  function parseAuthorName(rawAuthor) {
    if (!rawAuthor) return "";
    const cleaned = rawAuthor.replace(/^by\s+/i, "").replace(/https?:\/\/\S+/gi, "").replace(/\S+@\S+/g, "").trim();
    if (!cleaned || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) return "";
    return cleaned;
  }

  function extractJsonLdMetadata() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const authorRaw = Array.isArray(item.author) ? item.author[0] : item.author;
          const authorName = typeof authorRaw === "string" ? authorRaw : authorRaw?.name || "";
          const pubRaw = Array.isArray(item.publisher) ? item.publisher[0] : item.publisher;
          const publisherName = typeof pubRaw === "string" ? pubRaw : pubRaw?.name || "";
          const datePublished = item.datePublished || item.dateCreated || "";
          if (authorName || publisherName || datePublished) return { authorName, publisherName, datePublished };
        }
      } catch {}
    }
    return { authorName: "", publisherName: "", datePublished: "" };
  }

  function formatMlaInTextSentence(clip) {
    const cleanQuote = clip.quote.replace(/[.,;:\s]+$/, "");
    let parenthetical = "";
    if (clip.corporateAuthor) {
      parenthetical = `(${clip.corporateAuthor})`;
    } else if (clip.author) {
      const author = clip.author.trim();
      const last = author.includes(",") ? author.split(",")[0].trim() : author.split(/\s+/).pop();
      parenthetical = `(${last})`;
    } else {
      const shortTitle = (clip.title || "Untitled").split(/[:|—–-]/)[0].trim().split(/\s+/).slice(0, 4).join(" ");
      parenthetical = `("${shortTitle}")`;
    }
    return `"${cleanQuote}" ${parenthetical}.`;
  }

  async function clipSelection() {
    const selection = window.getSelection();
    const rawText = selection ? selection.toString().trim().replace(/\s+/g, " ") : "";
    if (!rawText) {
      showToast("Highlight text first to clip");
      return;
    }

    const words = rawText.split(" ");
    const fragment = words.length <= 8
      ? encodeURIComponent(rawText)
      : `${encodeURIComponent(words.slice(0, 4).join(" "))},${encodeURIComponent(words.slice(-4).join(" "))}`;

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const baseUrl = (canonicalEl?.href || window.location.href).split("#")[0];
    const deepLink = `${window.location.href.split("#")[0]}#:~:text=${fragment}`;

    const getMeta = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        const val = el?.getAttribute("content") || el?.textContent;
        if (val && val.trim()) return val.trim();
      }
      return "";
    };

    const jsonLd = extractJsonLdMetadata();
    const hostname = window.location.hostname.replace(/^www\./, "").toLowerCase();

    let rawTitle = getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]']) || document.title || "Untitled Source";
    rawTitle = rawTitle.replace(/\s+[-|—–]\s+[^-|—–]+$/, "").trim() || rawTitle;
    const title = toMlaTitleCase(rawTitle);

    let siteName = getMeta(['meta[property="og:site_name"]']) || jsonLd.publisherName || hostname;
    let publisher = getMeta(['meta[name="publisher"]', 'meta[property="article:publisher"]']) || jsonLd.publisherName || "";

    const rawAuthor = getMeta(['meta[name="author"]', 'meta[property="article:author"]', 'meta[name="byl"]', '[rel="author"]', '.author-name', '.byline']) || jsonLd.authorName;
    let author = parseAuthorName(rawAuthor);
    let corporateAuthor = "";

    const rawDate = getMeta(['meta[property="article:published_time"]', 'meta[name="date"]', 'meta[name="pubdate"]', "time[datetime]"]) || jsonLd.datePublished;
    let mlaDate = formatMlaDate(rawDate);

    if (hostname.endsWith("wikipedia.org")) {
      corporateAuthor = "Wikipedia";
      siteName = "Wikipedia";
      publisher = "Wikimedia Foundation";
      author = "";
      mlaDate = mlaDate || "15 Jan. 2001";
    } else if (!author && siteName && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(siteName)) {
      corporateAuthor = siteName;
    }

    if (publisher && siteName && publisher.toLowerCase() === siteName.toLowerCase()) publisher = "";

    const { clips = [], activeCollection = "General" } = await chrome.storage.local.get([
      "clips",
      "activeCollection"
    ]);

    const clip = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      quote: rawText,
      title,
      author,
      corporateAuthor,
      siteName,
      publisher,
      mlaDate,
      accessedDate: getTodayMlaAccessed(),
      cleanUrl: baseUrl,
      deepLink,
      collection: activeCollection || "General",
      createdAt: Date.now(),
      savedAt: Date.now()
    };

    clips.unshift(clip);
    await chrome.storage.local.set({ clips: clips.slice(0, 150) });

    try {
      await navigator.clipboard.writeText(formatMlaInTextSentence(clip));
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = formatMlaInTextSentence(clip);
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    removePill();
    showToast(`Clipped to ${activeCollection} — MLA citation copied`);
  }

  function showFloatingPill(rect) {
    removePill();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Clip";
    Object.assign(btn.style, {
      position: "fixed", left: `${Math.min(Math.max(rect.left + rect.width / 2, 48), window.innerWidth - 48)}px`,
      top: `${Math.max(rect.top - 38, 10)}px`, transform: "translate(-50%, 6px) scale(0.94)", opacity: "0",
      background: "rgba(24, 24, 27, 0.9)", backdropFilter: "blur(14px)", webkitBackdropFilter: "blur(14px)",
      color: "#ffffff", border: "0.5px solid rgba(255, 255, 255, 0.16)", borderRadius: "999px",
      padding: "5px 12px", fontSize: "12px", fontWeight: "500", letterSpacing: "-0.01em",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      cursor: "pointer", zIndex: "2147483647", boxShadow: "0 6px 20px rgba(0, 0, 0, 0.18)",
      transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease-out"
    });
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clipSelection();
    });
    document.body.appendChild(btn);
    pillEl = btn;
    requestAnimationFrame(() => {
      btn.style.transform = "translate(-50%, 0) scale(1)";
      btn.style.opacity = "1";
    });
  }

  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (!text || sel.rangeCount === 0) {
        removePill();
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) showFloatingPill(rect);
    }, 10);
  });

  document.addEventListener("mousedown", (e) => {
    if (pillEl && e.target !== pillEl) removePill();
  });
  document.addEventListener("scroll", removePill, { passive: true });

  document.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "x") {
      e.preventDefault();
      clipSelection();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "CITESNAP_CLIP") clipSelection();
  });
})();
