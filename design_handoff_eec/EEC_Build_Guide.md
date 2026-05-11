# Ericsson Equipment Configurator — Build Guide
**Developer:** Khaled — Telecom Dept, Landmark Plus (LMP)  
**Stack:** Vanilla JS (ES6+) · Pure Frontend · PWA · GitHub Pages  
**Version:** 1.0 Planning

---

## 1. What the App Does

A browser-based PWA that generates Ericsson NETCONF XML equipment configuration
scripts for base station sites. The engineer fills in a form (bands, sectors, RF
type, admin states) and the app instantly produces a ready-to-use XML script,
previewed with syntax highlighting and downloadable as a `.xml` file.

---

## 2. File Structure

```
/ericsson-equipment-configurator
│
├── index.html            ← Single entry point, all panels live here
├── manifest.json         ← PWA manifest (icons, theme, name)
├── sw.js                 ← Service worker — cache-first strategy
├── CLAUDE.md             ← Session context file (keep updated)
│
├── /css
│   ├── styles.css        ← CSS variables, reset, base layout (split panel)
│   ├── form.css          ← Left panel: node settings, band cards
│   ├── preview.css       ← Right panel: XML preview, line numbers
│   └── components.css    ← Reusable: buttons, toggles, sliders, badges
│
├── /js
│   ├── app.js            ← App state, init, event wiring (controller)
│   ├── config.js         ← Band presets, PORT_SEQUENCE, RF_PORTS constants
│   ├── generator.js      ← Core XML generation engine (pure functions)
│   ├── ui.js             ← DOM rendering: band cards, preview, feedback
│   └── download.js       ← Copy to clipboard + file download helpers
│
└── /assets
    ├── icon-192.png
    └── icon-512.png
```

---

## 3. App State Shape

Managed in `app.js`. Single source of truth — all UI reads from this.

```js
const state = {
  nodeId: '1',                    // ManagedElement ID + Equipment ID
  supportSystemControl: false,    // EquipmentSupportFunction flag
  bands: [
    {
      id: 1,                      // Internal unique ID (auto-increment)
      prefix: '44XX',             // Band identifier (44XX / 0900 / 1800 / 2100 / custom)
      customPrefix: null,         // Used only when prefix === 'CUSTOM'
      numSectors: 3,              // 1–8
      rfTypeOverride: null,       // null = use preset default | '2T2R' | '4T4R'
      adminStateOverride: null,   // null = use preset default | 'UNLOCKED' | 'LOCKED'
      mixedModeOverride: null,    // null = use preset default | true | false
      mechanicalTilt: 0,          // Integer degrees (only relevant for 4T4R bands)
    }
  ]
};
```

---

## 4. Band Presets (`config.js`)

| Band   | RF Type | Sector Admin | RF Port Admin | mixedModeRadio | Tilt |
|--------|---------|-------------|---------------|----------------|------|
| 44XX   | 4T4R    | UNLOCKED    | LOCKED        | false          | yes  |
| 0900   | 2T2R    | LOCKED      | UNLOCKED      | true           | no   |
| 1800   | 2T2R    | LOCKED      | UNLOCKED      | true           | no   |
| 2100   | 2T2R    | LOCKED      | UNLOCKED      | true           | no   |
| CUSTOM | user    | user        | auto          | user           | auto |

**Port sequence** (skips I to avoid confusion with 1):
```
A B C D E F G H J K L M N P Q R S T U V W X Y Z
```
Allocated sequentially across all bands in order — first all sectors of band 1,
then all sectors of band 2, etc.

**RF Ports per type:**
- 4T4R → ports A, B, C, D (4 branches per sector)
- 2T2R → ports A, B (2 branches per sector)

---

## 5. XML Generation Logic (`generator.js`)

### Function Map

```
generateXML(state)
  ├── buildNetconfHeader(nodeId)
  ├── buildEquipmentOpen(nodeId)
  │
  ├── FOR each band → FOR each sector:
  │     ├── buildAntennaUnitGroup(groupId, rfType, tilt)
  │     └── FOR each RF port:
  │           ├── buildFRU_RfPort(fruId, port, rfPortAdminState, isFirst)
  │           └── buildRfBranch(groupId, branchId, fruId, port, baseRef)
  │
  ├── buildCabinet()
  ├── buildBBU_FRU(allocatedPorts)
  ├── FOR each band → FOR each sector:
  │     └── buildRRU_FRU_RiPorts(fruId)
  ├── FOR each band → FOR each sector:
  │     └── buildRiLink(linkId, bbuPort, fruId, baseRef)
  │
  ├── buildEquipmentClose()
  ├── buildEquipmentSupportFunction(supportSystemControl)
  │
  └── buildNodeSupport(nodeId)
        ├── buildMpClusterHandling(baseRef)
        └── FOR each band → FOR each sector:
              └── buildSectorEquipmentFunction(groupId, adminState, mixedMode, rfBranchRefs)
```

### Key Rules Encoded in Generator

1. First FRU entry per sector always includes `<administrativeState>UNLOCKED</administrativeState>` on the FRU itself
2. 44XX RF ports are `LOCKED`; 0900/1800/2100 RF ports are `UNLOCKED`
3. `<mechanicalAntennaTilt>` only written for 4T4R bands
4. `<mixedModeRadio>true</mixedModeRadio>` only written when flag is true
5. BBU RiPort sequence skips the letter I
6. RiLink ID format: `{BAND}_S{N}_1st` (e.g. `44XX_S1_1st`, `0900_S2_1st`)
7. FRU IDs: `{BAND}-{N}-RRUW-1` (e.g. `44XX-1-RRUW-1`, `0900-3-RRUW-1`)
8. AntennaUnitGroup IDs: `{BAND}_S{N}` (e.g. `44XX_S1`, `0900_S3`)

---

## 6. UI Layout

### Desktop (≥ 768px) — Split Panel
```
┌─────────────────────────────────────────────────────────────────┐
│  🟦 Ericsson Equipment Configurator                    [EN]     │
├─────────────────────────┬───────────────────────────────────────┤
│  CONFIGURATION          │  PREVIEW                              │
│                         │                                       │
│  Node ID  [_________]   │  <?xml version="1.0"...              │
│  Support Ctrl  [☐]      │  <hello xmlns=...                    │
│                         │  ...                                  │
│  ── BANDS (6 sectors) ─ │                                       │
│                         │                                       │
│  ┌─ 44XX ● UNLOCKED ──┐ │                                       │
│  │ Sectors  ━━●━━  3  │ │                                       │
│  │ RF Type  [4T4R]    │ │                                       │
│  │ State [UNLOCKED]   │ │                                       │
│  │ Mixed Mode  [ ]    │ │                                       │
│  │ Tilt  [0]°         │ │                                       │
│  └──────────── [✕] ───┘ │                                       │
│                         │                                       │
│  ┌─ 0900 ● LOCKED ────┐ │                                       │
│  │ Sectors  ━━●━━  3  │ │                                       │
│  │ RF Type  [2T2R]    │ │                                       │
│  │ State   [LOCKED]   │ │                                       │
│  │ Mixed Mode  [✓]    │ │                                       │
│  └──────────── [✕] ───┘ │                                       │
│                         │                                       │
│  + 44XX  + 0900         │                                       │
│  + 1800  + 2100         │                                       │
│  + Custom               │  [⎘ Copy XML]    [↓ Download .xml]   │
└─────────────────────────┴───────────────────────────────────────┘
```

### Mobile — Tab Layout
```
[ FORM ]  [ PREVIEW ]   ← tab switcher at top
```

---

## 7. Data Flow

```
User input (form change)
        │
        ▼
   updateState()          ← in app.js
        │
        ▼
   generateXML(state)     ← in generator.js (pure function, no DOM)
        │
        ▼
   updatePreview(xml)     ← in ui.js (writes to preview panel)
        │
        ▼
   User clicks Download
        │
        ▼
   downloadXML(xml, nodeId) ← in download.js
```

No framework, no virtual DOM — direct DOM updates only on state change.

---

## 8. CSS Architecture

### `styles.css` — Variables + Layout
```css
:root {
  --bg-base:        #0f172a;
  --bg-panel:       #1e293b;
  --bg-card:        #0f172a;
  --border:         #334155;
  --text-primary:   #f1f5f9;
  --text-muted:     #94a3b8;
  --accent:         #3b82f6;
  --accent-green:   #22c55e;
  --accent-amber:   #f59e0b;
  --accent-red:     #ef4444;
  --font-mono:      'Fira Code', 'Consolas', monospace;
  --panel-width:    380px;
}
```

### XML Syntax Highlight Colors (in `preview.css`)
| Token          | Color     |
|----------------|-----------|
| Opening tags   | `#60a5fa` (blue) |
| Closing tags   | `#f87171` (red)  |
| Attributes     | `#a78bfa` (purple) |
| Values (text)  | `#86efac` (green) |
| `]]>]]>`       | `#f59e0b` (amber) |
| Comments       | `#6b7280` (gray)  |

---

## 9. PWA Configuration

### `manifest.json`
```json
{
  "name": "Ericsson Equipment Configurator",
  "short_name": "EEC",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#1d4ed8",
  "icons": [
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### `sw.js` — Cache-First Strategy
Caches: `index.html`, all CSS files, all JS files, assets.  
On fetch: serve from cache first, fall back to network.

---

## 10. CLAUDE.md Template

Copy this into your `CLAUDE.md` at project start and update after major changes:

```markdown
# CLAUDE.md — Ericsson Equipment Configurator

## Project
PWA — Vanilla JS, no build tools, hosted on GitHub Pages.
Generates Ericsson NETCONF XML equipment configuration scripts.

## Current State
- [ ] index.html skeleton
- [ ] manifest.json + sw.js
- [ ] styles.css + layout
- [ ] config.js (presets + constants)
- [ ] generator.js (XML engine)
- [ ] ui.js (rendering)
- [ ] download.js
- [ ] form.css + components.css
- [ ] preview.css + syntax highlight
- [ ] PWA tested + installable

## Key Decisions
- State lives in app.js as plain JS object
- generateXML() is a pure function — no DOM side effects
- PORT_SEQUENCE skips letter I (A B C D E F G H J K...)
- FRU ID format: {BAND}-{N}-RRUW-1
- AntennaUnitGroup ID format: {BAND}_S{N}
- 44XX = 4T4R (4 branches, RF ports LOCKED, has mechanicalAntennaTilt)
- 0900/1800/2100 = 2T2R (2 branches, RF ports UNLOCKED, mixedModeRadio=true)
- supportSystemControl is a top-level toggle (true/false)

## Band Presets
| Band | rfType | sectorAdmin | rfPortAdmin | mixedMode | tilt |
|------|--------|-------------|-------------|-----------|------|
| 44XX | 4T4R   | UNLOCKED    | LOCKED      | false     | yes  |
| 0900 | 2T2R   | LOCKED      | UNLOCKED    | true      | no   |
| 1800 | 2T2R   | LOCKED      | UNLOCKED    | true      | no   |
| 2100 | 2T2R   | LOCKED      | UNLOCKED    | true      | no   |

## Files Changed Last Session
[Update this after each session]
```

---

## 11. Step-by-Step Build Guide for Claude Code in VS Code

Use these prompts **in order** in a new Claude Code session.  
Start each session by saying: *"Read CLAUDE.md for full context."*

---

### Step 1 — Project Bootstrap

```
Read CLAUDE.md. 

Create the full project folder structure for the Ericsson Equipment Configurator PWA:
- index.html (skeleton only — html/head/body, link all CSS, load all JS as modules)
- manifest.json (name: "Ericsson Equipment Configurator", short_name: "EEC", 
  theme_color: #1d4ed8, background_color: #0f172a, display: standalone)
- sw.js (cache-first service worker, cache all CSS + JS + assets)
- /css: styles.css, form.css, preview.css, components.css (empty with section comments)
- /js: app.js, config.js, generator.js, ui.js, download.js (empty with section comments)
- /assets: placeholder for icon-192.png and icon-512.png
- CLAUDE.md (use the template from the build guide)

No content yet — just structure, correct linking, and PWA registration in index.html.
```

---

### Step 2 — Config & Constants

```
In config.js, implement:

1. PORT_SEQUENCE array: ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z']
   (skips I to avoid confusion with digit 1)

2. RF_PORTS object: { '4T4R': ['A','B','C','D'], '2T2R': ['A','B'] }

3. BAND_PRESETS object with entries for 44XX, 0900, 1800, 2100:
   Each entry has: rfType, sectorAdminState, rfPortAdminState, mixedModeRadio, hasMechanicalTilt

   44XX → rfType:'4T4R', sectorAdminState:'UNLOCKED', rfPortAdminState:'LOCKED',  mixedModeRadio:false, hasMechanicalTilt:true
   0900 → rfType:'2T2R', sectorAdminState:'LOCKED',   rfPortAdminState:'UNLOCKED', mixedModeRadio:true,  hasMechanicalTilt:false
   1800 → rfType:'2T2R', sectorAdminState:'LOCKED',   rfPortAdminState:'UNLOCKED', mixedModeRadio:true,  hasMechanicalTilt:false
   2100 → rfType:'2T2R', sectorAdminState:'LOCKED',   rfPortAdminState:'UNLOCKED', mixedModeRadio:true,  hasMechanicalTilt:false

4. getEffectivePreset(band) function: merges band overrides onto the preset defaults.
   Returns: { rfType, sectorAdminState, rfPortAdminState, mixedModeRadio, hasMechanicalTilt }

5. allocatePorts(bands) function: 
   - Takes the bands array from state
   - Returns an array of { bandPrefix, sectorNum, bbuPort } objects
   - Allocates ports from PORT_SEQUENCE sequentially across all bands

Export all as ES6 exports.
```

---

### Step 3 — XML Generator Engine

```
In generator.js, implement generateXML(state) that produces the full NETCONF XML string.

The function must follow this exact structure:

PART 1 — NETCONF envelope + Equipment open:
  <?xml version="1.0" encoding="UTF-8"?>
  <hello ...> capabilities </hello>
  ]]>]]>
  <rpc message-id="1" ...>
    <edit-config><target><running/></target>
    <config ...>
      <ManagedElement ...>
        <managedElementId>{nodeId}</managedElementId>
        <Equipment ...>
          <equipmentId>1</equipmentId>

PART 2 — For each band, for each sector (interleaved pattern):
  a) <AntennaUnitGroup> with AntennaUnit → AntennaSubunit → N AuPorts
     - Include <mechanicalAntennaTilt>0</mechanicalAntennaTilt> only for 4T4R bands
  b) For each RF port (A/B/C/D for 4T4R, A/B for 2T2R):
     - <FieldReplaceableUnit> with the RfPort
       * First RF port entry also includes <administrativeState>UNLOCKED</administrativeState> on the FRU
       * rfPortAdminState: LOCKED for 44XX, UNLOCKED for 0900/1800/2100
     - <AntennaUnitGroup> with the RfBranch linking auPortRef → rfPortRef

PART 3 — <Cabinet> cabinetId=1

PART 4 — BBU FRU (fieldReplaceableUnitId=1):
  - administrativeState: UNLOCKED
  - One <RiPort> per allocated BBU port (from allocatePorts)
  - One <SyncPort syncPortId=1>

PART 5 — For each band, for each sector: RRU FRU with DATA_1 and DATA_2 RiPorts

PART 6 — For each band, for each sector: <RiLink>
  - riLinkId: {BAND}_S{N}_1st (e.g. 44XX_S1_1st)
  - riPortRef1: BBU port (allocated in order)
  - riPortRef2: RRU DATA_2

PART 7 — </Equipment>
  <EquipmentSupportFunction>
    <supportSystemControl>{state.supportSystemControl}</supportSystemControl>

PART 8 — <NodeSupport>
  <MpClusterHandling> → primaryCoreRef = BBU FRU
  For each band, for each sector: <SectorEquipmentFunction>
    - administrativeState from effective preset (or override)
    - <mixedModeRadio>true</mixedModeRadio> only if mixedModeRadio is true
    - rfBranchRef entries for each branch

PART 9 — Closing tags + ]]>]]> + close-session rpc

Use a string array + join('\n') approach. Pure function, no DOM access.
All refs use format: ManagedElement={nodeId},Equipment=1,...
```

---

### Step 4 — App State & Controller

```
In app.js, implement:

1. Initial state object (as described in the build guide state shape)
   Default bands: one 44XX (3 sectors) and one 0900 (3 sectors)

2. nextBandId counter for unique band IDs

3. createBand(prefix) function: returns a fresh band object with defaults

4. State mutation functions:
   - setNodeId(value)
   - setSupportSystemControl(value)
   - addBand(prefix)
   - removeBand(id)
   - updateBand(id, changes)  ← merges partial changes into the band

5. refreshXML() function:
   - Calls generateXML(state)
   - Calls updatePreview(xml) from ui.js
   - Called after every state mutation

6. init() function:
   - Wires up the Node ID input event listener
   - Wires up the Support System Control checkbox
   - Wires up all "Add Band" buttons (one per preset + custom)
   - Calls renderBandCards(state.bands) from ui.js
   - Calls refreshXML() to show initial output
   - Registers service worker

7. Call init() on DOMContentLoaded
```

---

### Step 5 — UI Rendering

```
In ui.js, implement:

1. renderBandCards(bands):
   - Clears the band list container
   - Calls renderBandCard(band) for each band and appends to container

2. renderBandCard(band):
   - Returns an HTML element (not a string) for one band card
   - Shows: band prefix (or custom input if prefix=CUSTOM), sector slider with value display,
     RF type toggle (2T2R / 4T4R), sector admin state toggle (UNLOCKED / LOCKED),
     mixed mode radio checkbox, mechanical tilt input (only if hasMechanicalTilt),
     a remove button (✕)
   - All controls dispatch to updateBand() in app.js on change
   - Remove button calls removeBand(id) then re-renders + refreshes

3. updatePreview(xml):
   - Takes the raw XML string
   - Calls highlightXML(xml) for colored output
   - Updates the preview panel DOM
   - Updates line count display

4. highlightXML(xml):
   - Escapes HTML entities first
   - Applies color spans using regex for:
     * Opening tags → blue
     * Closing tags → red  
     * xmlns attributes → purple
     * Quoted string values → green
     * ]]>]]> sequences → amber
   - Returns safe HTML string

5. showCopyFeedback():
   - Temporarily changes copy button text to "✓ Copied!"
   - Reverts after 2 seconds
```

---

### Step 6 — Download & Copy

```
In download.js, implement:

1. copyXMLToClipboard(xml):
   - Uses navigator.clipboard.writeText(xml)
   - Calls showCopyFeedback() from ui.js on success
   - Falls back to execCommand for older browsers

2. downloadXMLFile(xml, nodeId):
   - Creates a Blob with type 'application/xml'
   - Generates filename: SiteEquipment_{nodeId}.xml
   - Creates temporary <a> element, triggers click, revokes URL

Wire both functions to their buttons in app.js init().
```

---

### Step 7 — Styling

```
Implement the full CSS across the four files using the dark theme variables defined in styles.css.

styles.css:
- CSS custom properties (all color, spacing, font variables)
- CSS reset (box-sizing, margin, padding)
- Base layout: full-height split panel (left 380px fixed / right flex-grow)
- Mobile breakpoint at 768px: stack panels, add tab switcher

form.css:
- Left panel scroll container
- Section labels (uppercase, tracked, muted)
- Node ID input + Support Control checkbox row
- Band list container spacing
- "Add Band" button group layout

components.css:
- Band card (dark card, border, rounded, overflow hidden)
- Card header (band name + status dot + remove button)
- Sector range slider (custom styled, accent color)
- RF type toggle (pill-style, two-button group)
- Admin state toggle (green for UNLOCKED, amber for LOCKED)
- Mixed mode checkbox row
- Mechanical tilt number input
- Primary action buttons (copy + download) in footer

preview.css:
- Right panel: dark background, monospace font, overflow scroll
- Preview header bar with filename + line count
- XML color classes: .xml-tag-open, .xml-tag-close, .xml-attr, .xml-value, .xml-delim
- Line number gutter (optional, nice to have)
- Mobile: full height when tab active
```

---

### Step 8 — PWA Polish & Testing

```
1. Complete the service worker in sw.js:
   - Define CACHE_NAME = 'eec-v1'
   - On install: cache index.html + all CSS + all JS files
   - On fetch: cache-first, fall back to network
   - On activate: delete old cache versions

2. Generate simple SVG-based icons and save as icon-192.png and icon-512.png
   (Blue background #1d4ed8, white letter "E" or antenna icon)

3. Add a <link rel="apple-touch-icon"> in index.html for iOS install

4. Test checklist:
   □ Generates correct XML for 44XX only (1–8 sectors)
   □ Generates correct XML for 0900 only (1–8 sectors)
   □ Generates correct XML for mixed bands (matches sample files)
   □ BBU ports allocate correctly (A→S1, B→S2... skips I)
   □ Download produces valid .xml file
   □ Copy to clipboard works
   □ Works offline (service worker active)
   □ Installable as PWA on Android
   □ Responsive on mobile screen
```

---

### Step 9 — Validation Against Sample Files

```
Using the two sample XML files as reference, verify the generator output:

Test Case 1 — Match 4480_4SEC_SiteEquipment.xml:
  Configure: 44XX (4 sectors) + 0900 (4 sectors)
  supportSystemControl: true
  Expected BBU ports: A B C D (44XX) + E F G H (0900)
  Expected FRU IDs: 44XX-1-RRUW-1 through 44XX-4-RRUW-1, 0900-1-RRUW-1 through 0900-4-RRUW-1
  Expected SectorEquipmentFunctions: 44XX UNLOCKED (no mixedMode), 0900 LOCKED (mixedMode=true)

Test Case 2 — Match L.xml:
  Configure: 44XX (5 sectors) + 0900 (5 sectors)
  supportSystemControl: false  
  Expected BBU ports: A B C D E (44XX) + F G H J K (0900) ← J not I
  Expected RiLink IDs: 44XX_S1_1st ... 44XX_S5_1st, 0900_S1_1st ... 0900_S5_1st

Report any structural differences found and fix them.
```

---

### Step 10 — Final Deploy

```
Prepare the project for GitHub Pages:

1. Verify all file paths are relative (no absolute paths)
2. Confirm manifest.json start_url is './index.html'
3. Confirm sw.js registration uses correct scope
4. Create a simple README.md for the GitHub repo:
   - App name + description
   - How to use (3 steps)
   - GitHub Pages URL once deployed
5. Confirm all files are committed and the gh-pages branch (or /docs folder) is set up
```

---

## 12. Notes & Edge Cases to Handle

| Scenario | Handling |
|----------|----------|
| Custom band prefix | Text input appears when "Custom" is selected; used as-is in FRU/group IDs |
| More than 24 sectors total | PORT_SEQUENCE only has 24 entries — show a warning in UI |
| Single sector site | Should still generate all required elements correctly |
| User removes all bands | Preview shows empty Equipment block — no crash |
| Band with 0 sectors | Prevent with min=1 on the sector slider |
| `supportSystemControl` | Checkbox in node settings — true/false as lowercase string in XML |

---

*End of Build Guide — v1.0*
