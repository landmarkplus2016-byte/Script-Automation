# CLAUDE.md — Ericsson Equipment Configurator
> This file is Claude Code's persistent memory for this project.
> Read this at the start of every session before writing any code.

---

## What We Are Building

A PWA (Progressive Web App) that generates Ericsson NETCONF XML equipment
configuration scripts for base station sites.
- Engineer fills a form (bands, sectors, RF type, admin states)
- App instantly generates a ready-to-use NETCONF XML script
- Preview shown with syntax highlighting, downloadable as `.xml`
- Hosted on GitHub Pages — pure frontend, no backend, no server

---

## Non-Negotiable Rules

1. **Pure frontend only** — no Node.js, no npm, no build tools, no bundlers
2. **One file, one job** — never add logic to a file that belongs in another file
3. **`generateXML()` is a pure function** — no DOM access inside `generator.js`, ever
4. **All state lives in `app.js`** — no other file owns or mutates state directly
5. **PORT_SEQUENCE skips the letter I** — A B C D E F G H J K L M N P Q R S T U V W X Y Z
6. **FRU IDs always follow this format:** `{BAND}-{N}-RRUW-1` (e.g. `44XX-1-RRUW-1`)
7. **AntennaUnitGroup IDs always follow this format:** `{BAND}_S{N}` (e.g. `44XX_S1`)
8. **No inline styles** — everything in CSS files, never in HTML attributes or JS

---

## File Map — One Job Per File

```
ericsson-equipment-configurator/
├── CLAUDE.md               ← you are here
├── index.html              # App shell — loads all CSS and JS, no logic
├── manifest.json           # PWA manifest — name, icons, theme
├── sw.js                   # Service worker — cache-first + update banner
│
├── css/
│   ├── styles.css          # CSS variables, reset, base split-panel layout
│   ├── form.css            # Left panel: node settings, band list, add buttons
│   ├── preview.css         # Right panel: XML output, line count, header bar
│   └── components.css      # Band cards, toggles, sliders, buttons, badges
│
├── js/
│   ├── app.js              # State object, init(), event wiring, refreshXML()
│   ├── config.js           # BAND_PRESETS, PORT_SEQUENCE, RF_PORTS, getEffectivePreset(), allocatePorts()
│   ├── generator.js        # generateXML(state) — pure function, no DOM
│   ├── ui.js               # renderBandCards(), updatePreview(), highlightXML()
│   └── download.js         # copyXMLToClipboard(), downloadXMLFile()
│
└── assets/
    ├── icon-192.png
    └── icon-512.png
```

---

## App State Shape (`app.js`)

```javascript
const state = {
  nodeId: '1',                   // ManagedElement ID and Equipment ID
  supportSystemControl: false,   // EquipmentSupportFunction flag — true or false
  bands: [
    {
      id: 1,                     // Internal unique ID — auto-incremented, never reused
      prefix: '44XX',            // Band identifier: '44XX' | '0900' | '1800' | '2100' | 'CUSTOM'
      customPrefix: null,        // Only used when prefix === 'CUSTOM'
      numSectors: 3,             // Number of sectors — min 1, max 8
      rfTypeOverride: null,      // null = use preset | '2T2R' | '4T4R'
      adminStateOverride: null,  // null = use preset | 'UNLOCKED' | 'LOCKED'
      mixedModeOverride: null,   // null = use preset | true | false
      mechanicalTilt: 0,         // Integer degrees — only used for 4T4R bands
    }
  ]
};
```

---

## Band Presets — Authoritative Reference

| Band   | RF Type | Sector Admin | RF Port Admin | mixedModeRadio | Tilt field |
|--------|---------|-------------|---------------|----------------|------------|
| 44XX   | 4T4R    | UNLOCKED    | LOCKED        | false          | yes           |
| 0900   | 2T2R    | LOCKED      | UNLOCKED      | true           | no            |
| 1800   | 2T2R    | LOCKED      | UNLOCKED      | true           | no            |
| 2100   | 2T2R    | LOCKED      | UNLOCKED      | true           | no            |
| 2600   | 2T2R    | LOCKED      | UNLOCKED      | true           | no            |
| CUSTOM | user    | user        | auto from RF  | user           | if 4T4R/8T8R  |

**RF ports per type:**
- 8T8R → branches A, B, C, D, E, F, G, H (8 branches per sector)
- 4T4R → branches A, B, C, D (4 branches per sector)
- 2T2R → branches A, B (2 branches per sector)

---

## XML Generation Rules — Know Before You Code

### Structure of Every Generated Script

```
[NETCONF hello + rpc open]
  [Equipment open]
    FOR each band → FOR each sector:
      [AntennaUnitGroup with AntennaUnit → AntennaSubunit → AuPorts]
      FOR each RF port:
        [FieldReplaceableUnit with RfPort]   ← first one also has FRU adminState UNLOCKED
        [AntennaUnitGroup with RfBranch]     ← links AuPort → RfPort
    [Cabinet cabinetId=1]
    [BBU FRU id=1 with RiPorts A/B/C... + SyncPort]
    FOR each band → FOR each sector:
      [RRU FRU with DATA_1 and DATA_2 RiPorts]
    FOR each band → FOR each sector:
      [RiLink: BBU port → RRU DATA_2]
  [Equipment close]
  [EquipmentSupportFunction — supportSystemControl value]
  [NodeSupport]
    [MpClusterHandling → primaryCoreRef = BBU FRU]
    FOR each band → FOR each sector:
      [SectorEquipmentFunction with adminState + optional mixedModeRadio + rfBranchRefs]
[NETCONF close-session]
```

### Critical Rules the Generator Must Follow

1. **First RF port entry per sector** must include `<administrativeState>UNLOCKED</administrativeState>` on the FRU element itself — subsequent RF port entries on the same FRU do not repeat this
2. **44XX RF ports** are `<administrativeState>LOCKED</administrativeState>`
3. **0900 / 1800 / 2100 RF ports** are `<administrativeState>UNLOCKED</administrativeState>`
4. **`<mechanicalAntennaTilt>`** is only written for 4T4R bands — never for 2T2R
5. **`<mixedModeRadio>true</mixedModeRadio>`** is only written when the flag is true — never write it as false
6. **BBU ports** are allocated sequentially from PORT_SEQUENCE across all bands in order — first all sectors of band 1, then all sectors of band 2, and so on
7. **RiLink ID format:** `{BAND}_S{N}_1st` — e.g. `44XX_S1_1st`, `0900_S3_1st`
8. **All MO references** follow this pattern: `ManagedElement={nodeId},Equipment=1,...`

### Port Sequence (24 usable ports — skips I)
```
A B C D E F G H J K L M N P Q R S T U V W X Y Z
```

---

## Validation Test Cases — Two Real Sample Files

### Test Case 1 — 4SEC configuration (4 sectors per band)
- Bands: 44XX (4 sectors) + 0900 (4 sectors)
- supportSystemControl: **true**
- Expected BBU ports: A B C D → 44XX sectors, E F G H → 0900 sectors
- Expected 44XX SectorEquipmentFunctions: UNLOCKED, no mixedModeRadio
- Expected 0900 SectorEquipmentFunctions: LOCKED, mixedModeRadio=true

### Test Case 2 — L configuration (5 sectors per band)
- Bands: 44XX (5 sectors) + 0900 (5 sectors)
- supportSystemControl: **false**
- Expected BBU ports: A B C D E → 44XX sectors, F G H **J** K → 0900 sectors
- ⚠️ Port after H is J — not I. Verify this is correct in output.
- Expected RiLink IDs: 44XX_S1_1st … 44XX_S5_1st, 0900_S1_1st … 0900_S5_1st

---

## UI Rules — frontend-design Skill

Apply these rules to all UI files (`index.html`, all `css/` files):

- **Tone:** Professional engineering tool — clean, sharp, dark theme
- **Layout:** Split panel desktop (380px form left / flex preview right), tabs on mobile
- **Colors:** Dark base `#0f172a`, panel `#1e293b`, accent `#3b82f6` — use CSS variables exclusively
- **Typography:** Monospace font in preview panel, system sans-serif in form
- **Consistency:** Every button, toggle, badge, and card follows the same visual language
- **Never:** Inline styles, light theme, generic AI aesthetics, decorative elements

XML syntax highlight color scheme:
- Opening tags → `#60a5fa` (blue)
- Closing tags → `#f87171` (red)
- xmlns attributes → `#a78bfa` (purple)
- String values → `#86efac` (green)
- `]]>]]>` delimiters → `#f59e0b` (amber)
- Comments → `#6b7280` (grey)

---

## Edge Cases to Handle

| Scenario | Required handling |
|----------|------------------|
| Total sectors exceed 24 | Show warning — PORT_SEQUENCE only has 24 entries |
| Band with prefix = CUSTOM | Show text input for custom prefix, use it as-is in all IDs |
| User removes all bands | Preview shows empty Equipment block — no JS crash |
| Single sector site | Must still generate all required elements correctly |
| supportSystemControl | Written as lowercase `true` or `false` in XML |
| mechanicalTilt value | Written as integer only — no decimal, no units |

---

## What NOT to Do

- Never install npm packages — no package.json, no node_modules, ever
- Never put logic inside `index.html` — shell only
- Never let `generator.js` touch the DOM — pure function only
- Never let any file other than `app.js` mutate state
- Never skip the letter I in any context other than PORT_SEQUENCE
- Never add features not described in this file without confirming with Khaled
- Never use inline styles — all styling in CSS files

---

## Current Build Status

> Update this section after every session.

- [ ] Stage 1 — Foundation (file structure, PWA shell, CSS base, config constants)
- [ ] Stage 2 — XML Generator Engine (generator.js built and validated)
- [ ] Stage 3 — App State & UI (app.js, ui.js, download.js)
- [ ] Stage 4 — Styling (form.css, components.css, preview.css)
- [ ] Stage 5 — PWA Polish & Deploy (sw.js complete, icons, GitHub Pages)

---

*This file is the authority on all business logic and technical rules.*
*Read BUILD_GUIDE.md for the session-by-session prompt plan.*
