# Handoff: Ericsson Equipment Configurator (EEC)

## Overview
A browser-based PWA that generates Ericsson NETCONF XML equipment configuration scripts for base station sites. Engineers fill in a form (bands, sectors, RF type, admin states) and the app instantly produces a ready-to-use XML script, previewed with syntax highlighting and downloadable as a `.xml` file.

This package contains the **finalized visual design** for the app, on top of the existing build guide that defines all functional logic.

---

## About the Design Files
The files in this bundle (`prototype.html`, `prototype_alt_dark.html`) are **design references created in HTML** — interactive prototypes showing the intended look, layout, and behavior. They are **not** production code to copy directly.

Your task is to recreate these designs in the target codebase. The build guide (`EEC_Build_Guide.md`) specifies the target stack: **Vanilla JS (ES6+) · Pure Frontend · PWA · GitHub Pages**. Use that stack exactly. Treat the prototypes as a pixel-and-behavior spec to mirror in real vanilla JS/CSS, with the file/folder layout from §2 of the build guide.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadow recipes, interactions, and copy are all decided. Recreate the UI pixel-perfectly — colors and dimensions in this README are the authoritative source.

Two prototypes are included:
- **`prototype.html`** — **PRIMARY**. Light navy "HeroUI" theme — the chosen direction.
- **`prototype_alt_dark.html`** — Optional alternate dark variant, included for reference only.

Build to `prototype.html`.

---

## Screens / Views

The app is a **single-page split layout**. Two panels visible simultaneously on desktop; tab-switched on mobile.

### Top Bar (64px tall)
- **Layout**: Flex row, space-between, 22px horizontal padding.
- **Background**: `rgba(255,255,255,0.7)` with `backdrop-filter: saturate(160%) blur(14px)`. Bottom border `#e3eaf3`.
- **Left — Brand**:
  - Mark: 38×38 tile, `border-radius: 12px`, gradient `linear-gradient(135deg, #338ef7 0%, #006fee 50%, #0058c5 100%)`, shadow `0 6px 16px rgba(0,111,238,0.35), inset 0 1px 0 rgba(255,255,255,0.35)`. White "EEC" text, 13px / weight 800 / letter-spacing 0.4px.
  - Title "Equipment Configurator", 15px / weight 700 / letter-spacing -0.01em.
  - Subtitle "NETCONF · v1.0", 11px / muted / weight 500.
- **Right — Status & lang**:
  - Pill chip "● Offline ready" — bg `#d8f7e6`, color `#0e7a3c`, dot `#17c964` with 3px halo, 11.5px / weight 600.
  - "EN" pill button — bg `#eef3fa`, color `#3c4d66`, 11.5px / weight 600, hover → bg `#e2efff` / color `#006fee`.

### Form Panel (left, 460px fixed width)
- Rounded card, `border-radius: 20px`, `box-shadow: 0 4px 14px rgba(15,38,71,0.06)`, border `#e3eaf3`. 14px padding gap from top bar and right panel.
- Internal scroll, 22px padding.

**Section: Node settings**
- Card with white background, 16px radius, hairline border `#e3eaf3`, soft shadow.
- Two rows separated by a hairline:
  - **Node ID**: label "Node ID" (13.5px/weight 600) + helper "managedElementId & equipmentId" (11.5px/muted). Right: monospace text input, bg `#eef3fa`, 12px radius, 9×12 padding, right-aligned, 110px wide. Focus → bg white, border `#006fee`.
  - **Support System Control**: label "Support System Control" + helper "EquipmentSupportFunction flag". Right: iOS-style switch, 44×26, off bg `#cfd8e6`, on bg `#006fee`. White knob with shadow `0 2px 4px rgba(15,38,71,0.2)`, eased translate.

**Section: Bands** (+ count chip "N bands · M sectors")
- Vertical list, 14px gap.
- **Band card** — white, 16px radius, hairline border, soft shadow, hover lifts `translateY(-1px)` + bigger shadow.
  - **Head row**: band name (`JetBrains Mono` 15px/700) + admin state badge + RF type badge + remove `×` icon button (30×30 / 10px radius, hover red).
  - Admin state badge:
    - UNLOCKED → bg `#d8f7e6` / color `#0e7a3c`
    - LOCKED → bg `#ffd8e4` / color `#b3023f`
  - RF type badge → bg `#e2efff` / color `#0058c5`.
  - All badges: 999px radius, 10.5px / weight 700, letter-spacing 0.3px, 3×9 padding, 5px filled-circle dot.
  - **Body rows** (vertically stacked, hairline `#f0f3f8` between):
    1. **Sectors slider** — label "Sectors". Range 1–8. Track 6px tall, 999px radius, fill `#006fee` / empty `#dbe4f0`. Thumb 20×20 white with 2px `#006fee` border, shadow `0 2px 6px rgba(0,111,238,0.35)`, hover scale 1.1. Value chip on right: bg `#e2efff`, color `#006fee`, 8px radius.
    2. **RF Type** — pill segmented control with options `2T2R` / `4T4R`. Track bg `#eef3fa`, 999px radius, 3px padding. Active pill: white bg, color `#006fee`, soft shadow.
    3. **Admin State** — same segment pattern with options `UNLOCKED` / `LOCKED`. Active variants:
       - UNLOCKED → bg `#17c964` / white text / shadow `0 2px 6px rgba(23,201,100,0.4)`
       - LOCKED → bg `#f31260` / white text / shadow `0 2px 6px rgba(243,18,96,0.4)`
    4. **Mixed Mode Radio** checkbox + **Tilt** number input (visible only when effective RF type is 4T4R).
       - Checkbox 18×18, 6px radius, off white with `#c8d4e3` 2px border, on `#006fee` fill with white tick.
       - Tilt input: monospace, bg `#eef3fa`, 10px radius, 64px wide, right-side `°` glyph.

**Section: Add band**
- 2-column grid, 10px gap.
- Each button: white, 1.5px `#e3eaf3` border, 14px radius, 11×12 padding, monospace 12.5px/700. Hover → bg `#f0f6ff`, border + text `#006fee`. Active → `scale(0.98)`.
- Small "+" badge (18×18, 6px radius, `#006fee`, white text) before each label.
- Presets: `44XX`, `0900`, `1800`, `2100`.
- "Custom band" button spans both columns; clicking it adds a band whose name becomes an editable monospace input (8-char max, auto-uppercased).

**Overflow warning** (only when total sectors > 24):
- Banner above add-band section. Bg `#fcecd1`, color `#7a4f00`, 12px radius, alert triangle icon `#f5a524`. Text: "Total sectors exceed 24 — BBU port sequence is limited."

### Preview Panel (right, fills remaining width)
- Same card chrome as the form panel (white, 20px radius, hairline, soft shadow).
- **Header row** (14×20 padding, bottom hairline):
  - Left: file icon (`#006fee` stroke) + filename `SiteEquipment_{nodeId}.xml`. Monospace 13/600.
  - Right: two meta chips ("lines N", "bytes N"). Bg `#eef3fa`, 999px radius, 11px / 600, value strong in `#0e1a2b` / 700.
- **Code body**: scrollable, bg `#f9fbfd`.
  - **Gutter**: line numbers, monospace 12px / line-height 1.6 / right-aligned / color `#98a6bb`, bg `#eef3fa`, 16×12 padding.
  - **Code**: monospace 12px / line-height 1.6 / pre-wrap NO, color `#3c4d66`.
  - Token colors (XML syntax highlight):
    | Token | Color |
    |---|---|
    | Opening tag (`<Name` and closing `>`) | `#006fee` |
    | Closing tag (`</Name>`) | `#f31260` |
    | Attribute name | `#7828c8` |
    | Attribute value (quoted) | `#0e7a3c` |
    | Text content between tags | `#0e1a2b` (weight 600) |
    | `]]>]]>` delimiter | `#c25c00` (weight 700) |
    | Comments `<!-- ... -->` | `#98a6bb` italic |
    | XML declaration `<?xml ...?>` | `#7828c8` |
- **Footer row** (14×20 padding, top hairline):
  - Secondary button "Copy XML" — bg `#eef3fa`, color `#0e1a2b`, 14px radius, 13/600, flex 1. Hover bg `#e0e8f1`. On click: copies via `navigator.clipboard.writeText(xml)`, flips label to green "✓ Copied" for 1.8s.
  - Primary button "Download .xml" — bg `#006fee`, white, 14px radius, 13/600, flex 1, accent shadow `0 8px 24px rgba(0,111,238,0.28)`. Hover bg `#0058c5`. On click: creates Blob, triggers download as `SiteEquipment_{nodeId}.xml`.
  - Both buttons: lucide-style icons (16px, stroke 2). Active state: `translateY(1px)`.

### Mobile (< 900px)
- Single column, panels stacked with 10px gap, 10px outer padding.
- Tab bar replaces the side-by-side layout: pill group "Form" / "Preview" with translucent white background and blur, active tab gets `#e2efff` background + `#006fee` text.
- Otherwise identical to desktop chrome.

---

## Interactions & Behavior

- **Live regeneration** — every state mutation re-runs `generateXML(state)` and updates the preview in the same frame. No debounce needed; output is small.
- **Slider drag** — value chip updates live; track fill animates with the thumb via CSS `--pct` custom property.
- **Hover lift** on band cards: `transform: translateY(-1px)` + shadow increase, 180ms ease.
- **Switch knob translate**: `transform .22s cubic-bezier(.34,1.4,.46,.95)`.
- **Slider thumb hover**: `transform: scale(1.1)`, 150ms.
- **Button active**: `translateY(1px)`, 80ms.
- **Add-band hover**: bg → `#f0f6ff`, border + text → `#006fee`.
- **Copy feedback**: button content swaps to green "✓ Copied" for 1800ms then reverts.
- **Custom band**: typing in the prefix input uppercases input and caps at 8 chars.
- **Tilt visibility**: only render when effective RF type (preset + override) is `4T4R`.
- **Effective preset merge**: `getEffectivePreset(band)` overlays `rfTypeOverride / adminStateOverride / mixedModeOverride` on the band's preset defaults. Used everywhere — badges, XML output, control state.

## State Management

State shape (per build guide §3):

```js
const state = {
  nodeId: '1',
  supportSystemControl: false,
  bands: [
    { id, prefix, customPrefix, numSectors, rfTypeOverride, adminStateOverride, mixedModeOverride, mechanicalTilt }
  ]
};
```

Mutation API: `setNodeId`, `setSupportSystemControl`, `addBand(prefix)`, `removeBand(id)`, `updateBand(id, changes)`. Each mutation calls `refreshXML()` which pipes `generateXML(state)` → `updatePreview(xml)`.

Initial state: `nodeId: '1'`, `supportSystemControl: true`, one 44XX (3 sectors) + one 0900 (3 sectors).

## XML Generator

See **`EEC_Build_Guide.md` §5** for the authoritative spec. The prototype contains a working reference implementation of `generateXML()` (in the script tag, ~150 lines). Mirror the structure and rules:
- AntennaUnitGroup → AntennaUnit → AntennaSubunit → AuPorts (N ports per sector by RF type)
- FRU per RF port (first one carries `<administrativeState>UNLOCKED</administrativeState>`)
- BBU FRU with sequentially-allocated RiPorts using `PORT_SEQUENCE` (skips letter I)
- RRU FRU with DATA_1 / DATA_2 RiPorts per sector
- RiLink per sector, ID `{BAND}_S{N}_1st`
- SectorEquipmentFunction per sector with effective admin state + `mixedModeRadio` (only when true) + rfBranchRef list

## Design Tokens

### Colors
| Token | Value |
|---|---|
| `--bg-base` | `#f4f7fb` |
| `--bg-panel` | `#ffffff` |
| `--bg-card` | `#ffffff` |
| `--bg-soft` | `#eef3fa` |
| `--bg-code` | `#f9fbfd` |
| `--bg-gutter` | `#eef3fa` |
| `--border` | `#e3eaf3` |
| `--border-strong` | `#c8d4e3` |
| `--text-primary` | `#0e1a2b` |
| `--text-secondary` | `#3c4d66` |
| `--text-muted` | `#6b7c95` |
| `--text-dim` | `#98a6bb` |
| `--accent` | `#006fee` |
| `--accent-strong` | `#0058c5` |
| `--accent-deep` | `#00407d` |
| `--accent-soft` | `#e2efff` |
| `--accent-tint` | `#f0f6ff` |
| `--green` | `#17c964` |
| `--green-soft` | `#d8f7e6` |
| `--amber` | `#f5a524` |
| `--amber-soft` | `#fcecd1` |
| `--red` | `#f31260` |
| `--red-soft` | `#ffd8e4` |

### Shadows
| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(15,38,71,0.04), 0 1px 3px rgba(15,38,71,0.04)` |
| `--shadow-md` | `0 4px 14px rgba(15,38,71,0.06), 0 2px 4px rgba(15,38,71,0.04)` |
| `--shadow-lg` | `0 12px 28px rgba(15,38,71,0.10), 0 4px 10px rgba(15,38,71,0.05)` |
| `--shadow-accent` | `0 8px 24px rgba(0,111,238,0.28)` |

### Radii
| Token | Value |
|---|---|
| `--radius-xs` | `8px` |
| `--radius-sm` | `12px` |
| `--radius` | `16px` |
| `--radius-lg` | `20px` |
| `--radius-xl` | `24px` |

### Typography
- **Sans**: `Inter` (Google Fonts), weights 400/500/600/700/800. Body 14px, letter-spacing `-0.005em`. Antialiased.
- **Mono**: `JetBrains Mono` (Google Fonts), weights 400/500/600. Used for: band names, value inputs, XML preview, all "machine-y" values.

### Spacing / sizing
- Form panel: 460px fixed width.
- App outer padding: 14px.
- Panel internal padding: 22px (form) / 14px×20px (preview header/footer).
- Card padding: 14×16 head / 4×16 body.
- Field rows: 14px vertical padding, hairline `#f0f3f8` divider.
- List gaps: 14px between band cards, 10px in add-band grid.

## Assets
- **Fonts**: Inter + JetBrains Mono via Google Fonts.
- **Icons**: Inline SVGs in the lucide style (stroke 2, no fill). Already embedded in the prototype.
- **App icons (PWA)**: Per build guide §9 — `assets/icon-192.png` and `assets/icon-512.png`. Use a `#006fee` background tile with white "E" or antenna glyph.

## Files in this bundle
- **`prototype.html`** — primary design reference. Light navy HeroUI-style theme. Open this in a browser to see the final intended look and interactions.
- **`prototype_alt_dark.html`** — alternate dark variant. Reference only; not the chosen direction.
- **`EEC_Build_Guide.md`** — full functional spec from the user (state shape, XML generator structure, file layout, PWA config, step-by-step build prompts, edge cases). Authoritative for behavior, file structure, and stack choices.
- **`tweaks-panel.jsx`** — a runtime tweaks panel used in the prototype to demo different palettes / moods / density. Not part of the production app — ignore unless you want to reference the in-prototype color system.
- **`README.md`** — this file.

## Implementation order
Follow the step-by-step prompts in `EEC_Build_Guide.md` §11 (Steps 1–10). Use this README as the visual spec when you reach Step 7 (Styling). The build guide's CSS variables in §8 are superseded by the **Design Tokens** table above — use the values in this README.
