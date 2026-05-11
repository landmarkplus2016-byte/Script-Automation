# Build Guide — Ericsson Equipment Configurator
> Your step-by-step manual for building the app from zero to live.
> Work through this top to bottom. Check off each item as you go.

---

## Before You Write a Single Line of Code

### One-time setup checklist
- [ ] Create your project folder on your computer — name it `ericsson-equipment-configurator`
- [ ] Drop `CLAUDE.md` into the root of that folder
- [ ] Open the folder in VS Code
- [ ] Open Claude Code (spark icon or `Ctrl+Shift+P` → Claude Code)
- [ ] Create a GitHub repository (public) and connect your local folder to it
- [ ] Enable GitHub Pages on the repo (Settings → Pages → Deploy from branch → main)

### First message to Claude Code — copy and paste this exactly:
```
Read CLAUDE.md first and confirm you understand the project.
Then create the full folder and file structure as defined in
the File Map section — empty files only, no code yet.
Do not write any logic until I confirm the structure looks correct.
```

### After structure is created — verify before moving on:
- [ ] All folders exist: `css/`, `js/`, `assets/`
- [ ] All files exist and are empty: `index.html`, `manifest.json`, `sw.js`
- [ ] All CSS files exist empty: `styles.css`, `form.css`, `preview.css`, `components.css`
- [ ] All JS files exist empty: `app.js`, `config.js`, `generator.js`, `ui.js`, `download.js`
- [ ] `CLAUDE.md` is in the root
- [ ] No code has been written yet

---

## Stage 1 — Foundation

**Goal:** PWA shell loads in browser with no errors. Layout panels visible. All files linked correctly. Service worker registered.

---

### Step 1.1 — App Shell (`index.html` + `manifest.json`)

**Prompt:**
```
Read CLAUDE.md. We are on Stage 1, Step 1.
Build index.html — the app shell only.
It must:
- Load all 4 CSS files in correct order (styles, form, preview, components)
- Load all 5 JS files as ES6 modules in correct order
- Register sw.js as a service worker on DOMContentLoaded
- Link manifest.json correctly
- Show a two-panel layout: left panel (id="form-panel") and right panel (id="preview-panel")
- Left panel contains: a header bar, a scrollable form area (id="form-content"), and a footer actions bar
- Right panel contains: a header bar with filename + line count, and a scrollable pre element (id="xml-output")
- No content inside the panels yet — structure and IDs only
- Mobile: both panels stacked, tab switcher at the top (id="tab-switcher") with two buttons: "Configure" and "Preview"

Also build manifest.json:
- name: "Ericsson Equipment Configurator"
- short_name: "EEC"
- start_url: "./index.html"
- display: "standalone"
- background_color: "#0f172a"
- theme_color: "#1d4ed8"
- icons: 192x192 and 512x512 pointing to assets/icon-192.png and assets/icon-512.png

Apply the frontend-design skill for layout structure.
```

**Tests for Step 1.1:**
- [ ] Open `index.html` in Chrome — no console errors about missing files
- [ ] Two-panel layout is visible (even if empty)
- [ ] Resize to mobile width (< 768px) — tab switcher appears, panels stack
- [ ] Manifest linked — Chrome DevTools → Application → Manifest shows no errors
- [ ] No inline styles anywhere in index.html

---

### Step 1.2 — Base Styles (`css/styles.css`)

**Prompt:**
```
Read CLAUDE.md. Stage 1, Step 2.
Build css/styles.css — CSS variables, reset, and base split-panel layout only.
It must define these CSS variables in :root:
  --bg-base: #0f172a
  --bg-panel: #1e293b
  --bg-card: #0f172a
  --border: #334155
  --text-primary: #f1f5f9
  --text-muted: #94a3b8
  --text-dim: #64748b
  --accent: #3b82f6
  --accent-dark: #1d4ed8
  --green: #22c55e
  --green-dark: #065f46
  --amber: #f59e0b
  --red: #ef4444
  --font-mono: 'Fira Code', 'Consolas', monospace
  --panel-width: 380px
  --radius: 8px
  --radius-sm: 4px

It must implement:
- CSS reset (box-sizing border-box, margin 0, padding 0)
- Full-height split panel: left panel fixed at --panel-width, right panel fills remaining width
- Both panels full viewport height, overflow hidden (inner scroll handled per panel)
- Mobile breakpoint at 768px: single column, tab switcher shows, both panels full width
- Tab switcher: hidden on desktop, visible on mobile — shows one panel at a time
- Scrollbar styling (thin, dark)

No component styles yet — layout only.
```

**Tests for Step 1.2:**
- [ ] Desktop: left panel is exactly 380px, right panel fills the rest
- [ ] Mobile: panels stack vertically, tab switcher visible
- [ ] No horizontal scroll at any screen width
- [ ] No styles bleeding in from any other file

---

### Step 1.3 — Config Constants (`js/config.js`)

**Prompt:**
```
Read CLAUDE.md. Stage 1, Step 3.
Build js/config.js — all constants and preset logic. No DOM, no state.
It must export:

1. PORT_SEQUENCE — array of 24 port letters:
   ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z']
   Comment clearly: "Skips I to avoid confusion with digit 1"

2. RF_PORTS — object mapping RF type to port array:
   { '4T4R': ['A','B','C','D'], '2T2R': ['A','B'] }

3. BAND_PRESETS — object with entries for '44XX', '0900', '1800', '2100':
   Each entry has exactly these fields:
   - rfType: '4T4R' or '2T2R'
   - sectorAdminState: 'UNLOCKED' or 'LOCKED'
   - rfPortAdminState: 'LOCKED' or 'UNLOCKED'
   - mixedModeRadio: true or false
   - hasMechanicalTilt: true or false
   Values per band are in the Band Presets table in CLAUDE.md.

4. getEffectivePreset(band) — merges band overrides onto preset defaults.
   Priority: band.rfTypeOverride > preset.rfType (same for adminState and mixedMode).
   Always returns a complete preset object — never undefined fields.

5. allocatePorts(bands) — takes the bands array from state.
   Returns a flat array of objects: [{ prefix, sectorNum, bbuPort }, ...]
   Allocates from PORT_SEQUENCE in order: all sectors of band[0], then band[1], etc.
   If total sectors would exceed 24, throw a descriptive error.

Export all with named ES6 exports.
```

**Tests for Step 1.3:**
- [ ] `allocatePorts([{prefix:'44XX', numSectors:4}, {prefix:'0900', numSectors:4}])` returns ports A–H, skipping I
- [ ] `allocatePorts` with 5+5 sectors returns: A B C D E for first band, F G H **J** K for second (not I)
- [ ] `getEffectivePreset({prefix:'44XX'})` returns rfType '4T4R', sectorAdminState 'UNLOCKED'
- [ ] `getEffectivePreset({prefix:'0900', adminStateOverride:'UNLOCKED'})` returns sectorAdminState 'UNLOCKED' (override wins)
- [ ] `getEffectivePreset({prefix:'CUSTOM', rfTypeOverride:'4T4R'})` returns rfType '4T4R'

### ✅ Stage 1 Complete — Full check before moving on:
- [ ] `index.html` opens in Chrome with no console errors
- [ ] Two-panel layout renders correctly on desktop and mobile
- [ ] All 5 JS files and 4 CSS files load with no 404s (check Network tab)
- [ ] manifest.json shows correctly in Chrome DevTools → Application
- [ ] `config.js` port allocation skips I correctly — confirm in console
- [ ] Push to GitHub → loads correctly from GitHub Pages URL

---

## Stage 2 — XML Generator Engine

**Goal:** `generator.js` produces valid NETCONF XML that exactly matches the two sample files when given the same inputs. No UI yet — validate in the browser console.

---

### Step 2.1 — Generator Core (`js/generator.js`)

**Prompt:**
```
Read CLAUDE.md. We are on Stage 2, Step 1.
Build js/generator.js — the full XML generation engine.
This must be a pure function module — no DOM access, no state mutations, ever.

Export one main function: generateXML(state)
It takes the state object (nodeId, supportSystemControl, bands array) and returns a complete
NETCONF XML string.

Build it using these internal helper functions (not exported):

buildNetconfHeader() — returns the <?xml ...?> + <hello> + ]]>]]> + <rpc> opening lines

buildAntennaSection(bands, baseRef) — returns the full interleaved AntennaUnitGroup/FRU/RfBranch block.
  For each band, for each sector:
    1. One <AntennaUnitGroup> with AntennaUnit → AntennaSubunit → N AuPorts
       - Include <mechanicalAntennaTilt> only if hasMechanicalTilt is true
    2. For each RF port (A/B/C/D for 4T4R, A/B for 2T2R):
       a. <FieldReplaceableUnit> entry — first port also includes FRU-level <administrativeState>UNLOCKED</administrativeState>
       b. <AntennaUnitGroup> entry with <RfBranch> linking AuPort ref → RfPort ref

buildCabinet() — returns <Cabinet><cabinetId>1</cabinetId></Cabinet>

buildBBUFru(bbuPorts, baseRef) — returns the BBU FieldReplaceableUnit (id=1)
  with administrativeState UNLOCKED + one <RiPort> per port + one <SyncPort id=1>

buildRRUFrus(bands) — returns one FRU block per sector per band
  each with <RiPort>DATA_1</RiPort> and <RiPort>DATA_2</RiPort> only

buildRiLinks(bands, portMap, baseRef) — returns one <RiLink> per sector
  riLinkId format: {BAND}_S{N}_1st
  riPortRef1: BBU FRU, RiPort = allocated port
  riPortRef2: RRU FRU, RiPort = DATA_2

buildEquipmentSupportFunction(supportSystemControl) — lowercase true or false in XML

buildNodeSupport(bands, baseRef) — MpClusterHandling + all SectorEquipmentFunctions
  mixedModeRadio line written only when true — never write <mixedModeRadio>false</mixedModeRadio>

buildNetconfFooter() — </Equipment> close + closing rpc + ]]>]]> + close-session rpc

Use an array of strings + join('\n') internally — never string concatenation in a loop.
All indentation: 2 spaces per level, matching the sample files exactly.
```

**Tests for Step 2.1:**
- [ ] `generateXML` is callable from browser console with no errors
- [ ] Output is a non-empty string for any valid state input
- [ ] Output begins with `<?xml version="1.0" encoding="UTF-8"?>`
- [ ] Output ends with `]]>]]>` on the last line
- [ ] No DOM-related code anywhere in the file

---

### Step 2.2 — Validate Against Sample Files

**Prompt:**
```
Read CLAUDE.md. Stage 2, Step 2.
Validate generator.js against the two real sample files.

Run Test Case 1 in the browser console:
const result1 = generateXML({
  nodeId: '1',
  supportSystemControl: true,
  bands: [
    { id:1, prefix:'44XX', numSectors:4, rfTypeOverride:null, adminStateOverride:null, mixedModeOverride:null, mechanicalTilt:0, customPrefix:null },
    { id:2, prefix:'0900', numSectors:4, rfTypeOverride:null, adminStateOverride:null, mixedModeOverride:null, mechanicalTilt:0, customPrefix:null }
  ]
});

Check against 4480_4SEC_SiteEquipment.xml:
- AntennaUnitGroups: 44XX_S1 through 44XX_S4, then 0900_S1 through 0900_S4
- FRU IDs: 44XX-1-RRUW-1 through 44XX-4-RRUW-1, 0900-1-RRUW-1 through 0900-4-RRUW-1
- BBU RiPorts: A B C D E F G H
- 44XX SectorEquipmentFunctions: UNLOCKED, no mixedModeRadio line
- 0900 SectorEquipmentFunctions: LOCKED, mixedModeRadio=true
- supportSystemControl: true

Run Test Case 2 — same structure but numSectors:5 for both bands, supportSystemControl:false.
Check against L.xml:
- BBU RiPorts: A B C D E F G H J K (J not I — verify)
- RiLink IDs: 44XX_S1_1st through 44XX_S5_1st, 0900_S1_1st through 0900_S5_1st
- supportSystemControl: false

Report every structural difference found and fix them one by one.
```

**Tests for Step 2.2:**
- [ ] Test Case 1 BBU ports are exactly A B C D E F G H (8 ports)
- [ ] Test Case 2 BBU ports are exactly A B C D E F G H J K — J not I
- [ ] All FRU IDs follow the correct format in both test cases
- [ ] 44XX sectors have NO mixedModeRadio line in output
- [ ] 0900 sectors have mixedModeRadio=true line in output
- [ ] supportSystemControl writes as lowercase in XML (true / false)
- [ ] First RF port FRU entry includes FRU-level administrativeState UNLOCKED
- [ ] mechanicalAntennaTilt present for 44XX sectors, absent for 0900 sectors

### ✅ Stage 2 Complete — Full check before moving on:
- [ ] Both test cases produce output that matches the sample files structurally
- [ ] No DOM calls anywhere in generator.js
- [ ] No string concatenation inside loops — array + join only
- [ ] All edge cases from CLAUDE.md handled (custom band, single sector, empty bands)

---

## Stage 3 — App State & UI

**Goal:** Form is interactive. Add/remove bands. Change any setting. XML preview updates instantly on every change.

---

### Step 3.1 — App Controller (`js/app.js`)

**Prompt:**
```
Read CLAUDE.md. Stage 3, Step 1.
Build js/app.js — the state controller. This is the only file that owns and mutates state.

Implement:

1. The state object exactly as defined in the App State Shape section of CLAUDE.md.
   Default bands: one 44XX (3 sectors) and one 0900 (3 sectors).

2. A nextBandId counter — starts at 1, increments on every createBand() call, never resets.

3. createBand(prefix) — returns a fresh band object with all default values.

4. State mutation functions — each one mutates state then calls refreshXML():
   - setNodeId(value)
   - setSupportSystemControl(value)
   - addBand(prefix)       ← uses createBand(), pushes to state.bands
   - removeBand(id)        ← filters state.bands, re-renders cards
   - updateBand(id, changes)  ← Object.assign merge on the matching band

5. refreshXML() — calls generateXML(state) from generator.js, then calls updatePreview(xml) from ui.js.
   Also updates the filename display: SiteEquipment_{nodeId}.xml

6. init() — runs on DOMContentLoaded:
   - Reads Node ID input and wires change → setNodeId()
   - Reads Support System Control checkbox and wires change → setSupportSystemControl()
   - Wires all "Add Band" buttons (one per band type: 44XX, 0900, 1800, 2100, Custom)
   - Calls renderBandCards(state.bands) from ui.js
   - Calls refreshXML() to generate the initial output
   - Wires Copy button → copyXMLToClipboard() from download.js
   - Wires Download button → downloadXMLFile() from download.js
   - Registers service worker
   - Wires mobile tab switcher buttons

7. Export getXML() — returns the last generated XML string (for download.js to use).

Call init() on DOMContentLoaded.
```

**Tests for Step 3.1:**
- [ ] Page loads — default state generates XML immediately, preview panel is not empty
- [ ] Changing Node ID input → filename in preview header updates + XML regenerates
- [ ] Support System Control checkbox → XML regenerates with correct true/false value
- [ ] Add band buttons call addBand() — verify in console
- [ ] No direct DOM manipulation inside app.js — all rendering delegated to ui.js

---

### Step 3.2 — UI Rendering (`js/ui.js`)

**Prompt:**
```
Read CLAUDE.md. Stage 3, Step 2.
Build js/ui.js — all DOM rendering. This file never owns state.

Implement:

1. renderBandCards(bands) — clears the band list container (id="band-list"),
   calls renderBandCard(band) for each band, appends results to container.

2. renderBandCard(band) — creates and returns a DOM element (not a string) for one band card.
   The card must contain:
   - Header row: status dot (green=UNLOCKED, amber=LOCKED), band prefix label,
     RF type badge, remove button (×)
   - Custom prefix text input — visible only when band.prefix === 'CUSTOM'
   - Sectors slider (range input, min 1 max 8) with live numeric display
   - RF type toggle — pill with two buttons: 2T2R / 4T4R
   - Sector admin state toggle — pill with two buttons: UNLOCKED / LOCKED
   - Mixed mode radio checkbox with label
   - Mechanical tilt number input — visible only when effective rfType is 4T4R
   All controls call the correct app.js mutation on change (updateBand, removeBand).
   Use data-band-id attributes to identify which band each control belongs to.

3. updatePreview(xml) — updates the content of id="xml-output" with highlighted XML.
   Updates the line count display with xml.split('\n').length + ' lines'.

4. highlightXML(xml) — takes raw XML string, returns safe HTML string with color spans.
   Must escape &, <, > before applying colors.
   Apply these color classes:
   - Opening tags (<TagName) → class="xt-open"
   - Closing tags (</TagName>) → class="xt-close"
   - xmlns attributes → class="xt-attr"
   - Quoted string values → class="xt-val"
   - ]]>]]> sequences → class="xt-delim"

5. showCopyFeedback() — changes copy button text to "✓ Copied!" for 2 seconds then reverts.

Export all functions as named ES6 exports.
```

**Tests for Step 3.2:**
- [ ] Band cards render for the two default bands on page load
- [ ] Sector slider moves → card header updates live, XML regenerates
- [ ] RF type toggle switches → tilt input appears/disappears accordingly
- [ ] Admin state toggle switches → status dot color changes, XML regenerates
- [ ] Remove button on a band card → card disappears, XML regenerates
- [ ] Add a 4T4R band → tilt input is visible; add a 2T2R band → tilt input is hidden
- [ ] XML preview has colored syntax (not plain text)
- [ ] CUSTOM band shows text input for prefix

---

### Step 3.3 — Download & Copy (`js/download.js`)

**Prompt:**
```
Read CLAUDE.md. Stage 3, Step 3.
Build js/download.js — copy and download only. No state, no rendering.

Implement:

1. copyXMLToClipboard() — calls getXML() from app.js to get the current XML.
   Uses navigator.clipboard.writeText() — primary method.
   Falls back to document.execCommand('copy') with a temporary textarea for older browsers.
   On success: calls showCopyFeedback() from ui.js.
   On failure: logs the error, does not crash the app.

2. downloadXMLFile() — calls getXML() from app.js for the XML content.
   Gets the nodeId from the state (import from app.js or call getNodeId()).
   Creates a Blob with type 'application/xml'.
   Filename: SiteEquipment_{nodeId}.xml
   Creates a temporary <a> element, sets href to object URL, triggers click, revokes URL.

Export both as named ES6 exports.
```

**Tests for Step 3.3:**
- [ ] Click Copy button → browser clipboard contains the full XML
- [ ] "✓ Copied!" feedback appears for 2 seconds then reverts to "Copy XML"
- [ ] Click Download button → `.xml` file downloads with correct filename
- [ ] Downloaded file opens correctly in a text editor — valid XML content
- [ ] Works in Chrome, Edge, and Firefox

### ✅ Stage 3 Complete — Full check before moving on:
- [ ] Every form control updates the XML preview in real time
- [ ] Add and remove bands works without page refresh
- [ ] Copy and download both work correctly
- [ ] No console errors on any interaction
- [ ] XML output matches sample file structure for the two reference test cases
- [ ] Mobile tab switcher switches between form and preview correctly

---

## Stage 4 — Styling

**Goal:** App looks like a professional engineering tool. Dark theme, sharp layout, consistent components across all panels.

---

### Step 4.1 — Form & Components (`css/form.css` + `css/components.css`)

**Prompt:**
```
Read CLAUDE.md. Stage 4, Step 1.
Style the form panel and all components using CSS variables from styles.css.
Apply the frontend-design skill.

css/form.css must style:
- Left panel header bar: app title, subtitle, top border accent line in --accent color
- Scrollable form content area with correct padding and overflow
- Section label style: uppercase, letter-spacing, --text-dim color, small font size
- Node ID input: full width, dark background, border, rounded, focus ring in --accent
- Support System Control checkbox row: label + checkbox inline
- Band list container: vertical stack with gap
- "Add Band" button group: wrapping flex row, one button per band type
  Add Band buttons: outlined style for named bands (44XX etc.), ghost style for Custom
- Footer bar: copy + download buttons side by side, full width split equally

css/components.css must style:
- Band card: --bg-card background, --border border, --radius corners, no overflow
- Card header: flex row, status dot (8px circle, green or amber), band name bold,
  RF type badge (small, --bg-panel background), remove button (red on hover, no background)
- Custom prefix input: same style as Node ID input but smaller
- Sector slider: full width, custom track and thumb in --accent color, value badge beside it
- RF type toggle pill and Admin state toggle pill:
  two-button pill container, active button gets filled background (blue for RF, green/amber for state)
  inactive button is transparent with --text-dim color
- Mixed mode checkbox row: same style as Support Control row
- Tilt input: small number input with "°" suffix label inline
- All interactive controls: consistent focus rings, no default browser outlines

Design direction from CLAUDE.md UI Rules — dark, sharp, professional internal tool.
Never use Inter, Roboto, Arial, or system fonts. Use a distinctive monospace or technical font.
```

**Visual check after Step 4.1:**
- [ ] Band cards are clearly separated and readable
- [ ] Status dot color matches the current admin state (green=UNLOCKED, amber=LOCKED)
- [ ] Toggle pills look like proper pill selectors — not two separate buttons
- [ ] Sector slider is styled — not the default browser range input
- [ ] Add Band buttons are distinct from action buttons
- [ ] Form feels data-dense but not cluttered
- [ ] No default browser input styling visible anywhere

---

### Step 4.2 — Preview Panel (`css/preview.css`)

**Prompt:**
```
Read CLAUDE.md. Stage 4, Step 2.
Style the right panel XML preview using CSS variables from styles.css.

css/preview.css must style:
- Right panel header bar: filename (monospace, --text-muted), line count (right-aligned, --text-dim)
- Preview area: very dark background (#020617), monospace font (--font-mono),
  font-size 12px, line-height 1.6, horizontal and vertical scroll, full height
- XML color classes (applied by highlightXML in ui.js):
  .xt-open  → color #60a5fa  (opening tags — blue)
  .xt-close → color #f87171  (closing tags — red)
  .xt-attr  → color #a78bfa  (xmlns attributes — purple)
  .xt-val   → color #86efac  (quoted string values — green)
  .xt-delim → color #f59e0b  (]]>]]> sequences — amber)
- Scrollbar: thin, dark thumb, transparent track
- Copy and Download action buttons in the preview footer:
  Copy: secondary style (--bg-panel background, --border border)
  Download: primary style (--accent-dark background, white text)
  Both: same height, rounded, bold label, hover states
- Mobile: preview panel is full-height tab, same styling
```

**Visual check after Step 4.2:**
- [ ] XML code is clearly readable with syntax colors
- [ ] Opening tags are blue, closing tags are red
- [ ] ]]>]]> delimiters are amber — easy to identify NETCONF boundaries
- [ ] Scrollbars are styled and unobtrusive
- [ ] Download button is visually primary (most important action)
- [ ] App looks like a professional XML editor tool at this point

### ✅ Stage 4 Complete — Full check before moving on:
- [ ] App looks professional — not a prototype, not generic AI styling
- [ ] All interactive states have visual feedback (hover, focus, active)
- [ ] Dark theme is consistent across both panels
- [ ] Mobile layout looks correct — no broken elements at 375px width
- [ ] No inline styles anywhere — grep for `style="` in all files, must be zero results

---

## Stage 5 — PWA Polish & Deploy

**Goal:** App works offline, is installable on Android, updates silently, and is live on GitHub Pages.

---

### Step 5.1 — Service Worker (`sw.js`)

**Prompt:**
```
Read CLAUDE.md. Stage 5, Step 1.
Build sw.js — cache-first service worker with update banner support.
It must:
- Define CACHE_NAME = 'eec-v1'
- On install: cache all app files —
  index.html, manifest.json,
  css/styles.css, css/form.css, css/preview.css, css/components.css,
  js/app.js, js/config.js, js/generator.js, js/ui.js, js/download.js,
  assets/icon-192.png, assets/icon-512.png
  Call self.skipWaiting() to activate immediately
- On fetch: cache-first strategy — serve from cache, fall back to network
  Only cache GET requests — pass through everything else
- On activate: delete any cache with a name that is not CACHE_NAME
  Call clients.claim() to take control immediately
- Update detection: when a new service worker is waiting,
  post a message { type: 'UPDATE_AVAILABLE' } to all clients
  In index.html (app.js init), listen for this message and show
  an update banner: "A new version is available" with an [Update] button
  Clicking Update posts { type: 'SKIP_WAITING' } back to the service worker
  then reloads the page
```

**Tests for Step 5.1:**
- [ ] Open DevTools → Application → Service Workers — status shows "Activated and running"
- [ ] All cached files listed under Cache Storage
- [ ] Disconnect internet (DevTools → Network → Offline) → app still loads and generates XML
- [ ] Deploy a small visible change → update banner appears on next page open
- [ ] Click Update → page reloads with new version

---

### Step 5.2 — Icons (`assets/`)

**Prompt:**
```
Read CLAUDE.md. Stage 5, Step 2.
Create two PWA icons using an HTML canvas approach — generate them as PNG data URLs
and save them to assets/icon-192.png and assets/icon-512.png.

Icon design:
- Background: #1d4ed8 (blue)
- Centered white text or symbol representing the app
- Use the letters "EEC" in a clean monospace style, or a simple antenna/signal symbol
- Must look clean at 192×192 and 512×512

Generate them using a small standalone Node script or a browser canvas snippet
that saves the files — whichever approach works with the pure-frontend constraint.
If using a browser canvas, provide the snippet to run once in the browser console
to get the base64 data, then save manually.
```

**Tests for Step 5.2:**
- [ ] Both PNG files exist in assets/
- [ ] Chrome DevTools → Application → Manifest → Icons — both icons display correctly
- [ ] No manifest icon errors in DevTools

---

### Step 5.3 — Validate Generator Against Sample Files (Final)

**Prompt:**
```
Read CLAUDE.md. Stage 5, Step 3.
Run the full validation against both sample files one final time.

Open the deployed GitHub Pages URL (not localhost).
Open browser console and run:

Test 1 — 4SEC (4 sectors, supportSystemControl true):
Copy the output and compare manually against 4480_4SEC_SiteEquipment.xml.

Test 2 — L (5 sectors, supportSystemControl false):
Copy the output and compare manually against L.xml.
Pay special attention to: BBU port after H is J not I, RiLink IDs, FRU IDs.

If any differences are found: fix in generator.js, redeploy, re-test.
Only mark this step complete when both outputs match their sample files structurally.
```

**Tests for Step 5.3:**
- [ ] Test 1 output structure matches 4480_4SEC_SiteEquipment.xml
- [ ] Test 2 BBU ports: A B C D E F G H **J** K — J confirmed, not I
- [ ] Test 2 RiLink IDs all follow `{BAND}_S{N}_1st` format
- [ ] No extra or missing XML elements in either test case

---

### Step 5.4 — Deploy & Final Checklist

**Prompt:**
```
Read CLAUDE.md. Stage 5, Step 4.
Prepare the final deployment.
1. Verify all file paths in index.html are relative — no absolute paths
2. Confirm sw.js CACHE_NAME is 'eec-v1' and lists every app file
3. Confirm manifest.json start_url is './index.html'
4. Create README.md in the project root:
   - App name and one-line description
   - Three steps: how to open it, how to configure a site, how to download the XML
   - GitHub Pages URL
   - Note: works offline, installable as PWA on Android
5. Confirm all files are committed and pushed to main branch
6. Confirm GitHub Pages is building from main branch root
```

**Final deploy checklist:**
- [ ] GitHub Pages URL loads the app with no console errors
- [ ] PWA install prompt appears in Chrome (or available via browser menu)
- [ ] Install as PWA → app opens in standalone window, no browser chrome
- [ ] Go offline → app still loads and generates XML
- [ ] Download button produces a valid `.xml` file on the live URL
- [ ] README.md is clear and complete

### ✅ Stage 5 Complete — App is live:
- [ ] Both test cases produce correct XML on the live GitHub Pages URL
- [ ] App is installable as PWA on Android
- [ ] Works fully offline
- [ ] Update banner works when new version is deployed
- [ ] No console errors in production
- [ ] No inline styles anywhere — grep confirms zero results

---

## Go Live

### Hand it to your team:
1. [ ] Open the GitHub Pages URL on your phone
2. [ ] Tap the browser menu → "Add to Home Screen"
3. [ ] Open the installed app — confirm it runs in standalone mode
4. [ ] Configure a real site (e.g. 44XX 3 sectors + 0900 3 sectors)
5. [ ] Download the XML — confirm it matches a known good script
6. [ ] Share the GitHub Pages URL with any team members who need it

---

## Future Improvements (when ready)

When you want to add features, return to Claude Code with this guide and CLAUDE.md and start a new session:

- **Import from XML** — parse an existing NETCONF script and pre-fill the form
- **Site profiles** — save named configurations to localStorage for reuse
- **Multi-file export** — generate and download all sectors as separate files
- **Band 2600** — add as a preset if the RF type and port config is confirmed
- **Arabic UI** — add RTL layout and Arabic labels using the i18n pattern from PWA starter

---

*Keep this file open while building. Check off every item as you go.*
*If something fails a test, fix it before moving to the next step.*
*Never skip the end-of-stage full checks — they catch cross-file issues early.*
