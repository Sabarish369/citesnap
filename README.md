CiteSnap
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4.svg)](manifest.json)
[![Privacy](https://img.shields.io/badge/Storage-100%25%20Local--First-10B981.svg)](#privacy--data-handling)
[![Citation Style](https://img.shields.io/badge/Format-MLA%209th%20Edition-111827.svg)](#features)

A local-first Chrome extension that captures highlighted webpage quotes via Alt + X and automatically formats MLA 9th Edition in-text citations and Works Cited bibliographies.

![CiteSnap popup interface showing captured quote and formatted MLA 9th Edition citation](docs/preview.png)

Why CiteSnap

Academic research in the browser typically requires switching between source tabs, manually extracting author and publication metadata, and formatting bibliographies in external tools—often behind accounts, ads, or paywalls.

CiteSnap keeps the workflow inside the active tab: highlight a passage, press Alt + X, and copy a formatted MLA 9th Edition citation or export a compiled Works Cited list without sending browsing data to external servers.

Features

One-Keystroke Capture (Alt + X): Captures the active text selection alongside page title, canonical URL, site name, author, and publication date metadata.
MLA 9th Edition Formatting: Generates both parenthetical in-text citations and hanging-indent Works Cited entries, handling missing authors or dates according to MLA conventions.
Local-First Persistence: Stores all captured quotes and bibliography entries locally in chrome.storage.local with zero accounts, tracking, or cloud sync.
Containerless Minimalist UI: Built on a clean #fbfbfd canvas with hairline dividers for low-friction review, inline editing, and one-click clipboard copy.
Current Scope & Limitations: CiteSnap captures and stores the exact quote text and source URL, but does not yet automatically scroll to or highlight the captured passage when reopening a saved source link.

Architecture

flowchart LR
    A[User Highlights Text + Alt+X] --> B[Background Service Worker]
    B --> C[Content Script Metadata Scraper]
    C -->|Quote + OpenGraph / Meta Tags| D[MLA 9th Formatter]
    D --> E[(chrome.storage.local)]
    E --> F[Extension Popup UI]

Installation (Developer Mode)

Clone this repository:
git clone https://github.com/Sabarish369/citesnap.git
cd citesnap
Open Google Chrome and navigate to chrome://extensions.
Enable Developer mode using the toggle in the top-right corner.
Click Load unpacked and select the root citesnap directory.
 (Optional) Pin CiteSnap to your Chrome toolbar for quick access to your Works Cited list.

Usage

Navigate to any article, journal page, or web source.
Highlight the text passage you want to cite.
Press Alt + X (or click the CiteSnap toolbar icon) to capture the quote and extract page metadata.
Open the CiteSnap popup to review the generated MLA 9th Edition entry, edit any missing fields, or copy the formatted Works Cited entry to your clipboard.

Customizing the Keyboard Shortcut

If Alt + X conflicts with another extension or OS shortcut:

Open chrome://extensions/shortcuts.
Locate CiteSnap in the list.
Click the pencil icon next to Capture highlighted quote and assign your preferred key combination.

Repository Structure

citesnap/
├── manifest.json          # Manifest V3 configuration & minimal permissions
├── background.js          # Keyboard shortcut listener & storage coordination
├── content.js             # Selection capture & DOM/OpenGraph metadata extraction
├── popup/
│   ├── popup.html         # Extension popup layout
│   ├── popup.css          # Containerless #fbfbfd UI styling
│   └── popup.js           # Bibliography rendering, editing & clipboard export
├── utils/
│   └── mla-formatter.js   # Pure functions for MLA 9th Edition citation rules
└── assets/
    └── icons/             # Extension icons (16x16, 48x48, 128x128)

Privacy & Data Handling

Permissions: Requests only activeTab, storage, and scripting to read the user-triggered selection on the current tab and save entries locally.
Zero Telemetry: No analytics scripts, external API calls, or remote databases are used. Clearing extension storage permanently removes all saved citations.

Contributing

Contributions, bug reports, and edge-case test URLs (such as non-standard <meta> tags or academic journal layouts) are welcome:

Fork the repository and create a feature branch (git checkout -b fix/metadata-parser).
Keep changes modular and dependency-free.
Test your changes in an unpacked Chrome build across multiple article layouts.
Open a Pull Request describing the behavior change and sample test URLs.

License

Distributed under the MIT License. See LICENSE for details.
