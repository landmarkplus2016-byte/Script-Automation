# Paste this into VS Code Claude Code

---

I've already built the Ericsson Equipment Configurator app — all the logic, XML generator, state, PWA setup, download/copy work fine. **Do not change behavior or rewrite the generator.** I only want you to **redesign the UI** to match the new visual design in `design_handoff_eec/`.

## What to do

1. **Read first**:
   - `design_handoff_eec/README.md` — the authoritative visual spec (tokens, layout, every dimension, interaction).
   - `design_handoff_eec/prototype.html` — open it in a browser to see the target look and feel. Inspect the DOM/CSS if anything in the README is ambiguous.

2. **Replace styling only**:
   - Rewrite `css/styles.css`, `css/form.css`, `css/components.css`, `css/preview.css` to match the new design.
   - Replace the CSS variable block in `styles.css` with the **Design Tokens** table from the handoff README (the new tokens supersede the ones originally in build guide §8).
   - Add the Google Fonts link for **Inter** + **JetBrains Mono** in `index.html`.

3. **Adjust markup only where needed for new structure**:
   - The top bar gets a brand mark tile, title/subtitle, "Offline ready" chip, and "EN" pill (per README).
   - Band cards get an admin-state badge AND an RF-type badge in the header.
   - Preview header gets file icon + filename + "lines / bytes" meta chips.
   - Add the mobile tab switcher (< 900px) per README.
   - Use lucide-style inline SVG icons (stroke 2, no fill) for the icon spots.

4. **Do NOT touch**:
   - `js/generator.js` — leave the XML engine alone.
   - `js/config.js` — band presets and constants stay as-is.
   - `js/app.js` state shape and mutation functions — keep them.
   - `sw.js` and `manifest.json` logic — only update `theme_color` if needed to match `#006fee`.

5. **Match exactly**:
   - Colors: `--accent #006fee`, UNLOCKED green `#17c964`, LOCKED red `#f31260`, etc. — full list in README §Design Tokens.
   - Radii: cards 16px, panels 20px, pills 999px.
   - Shadows: use the `--shadow-sm/md/lg/accent` recipes from README.
   - Typography: Inter for UI, JetBrains Mono for band names / values / XML / inputs.
   - XML syntax-highlight token colors: see README "Token colors" table.
   - Hover/active microinteractions: band-card lift, slider thumb scale, button translateY(1px), copy-button "✓ Copied" 1.8s feedback.

6. **When done**, run the app locally and verify against `prototype.html` side by side. Fix any pixel-level drift in spacing, font weights, badge sizes, or shadow opacity.

## Constraint
Keep the stack as-is: vanilla JS, no build tools, no framework. The prototype is React because that was easier to mock — but the production code stays vanilla JS as in your current implementation.
