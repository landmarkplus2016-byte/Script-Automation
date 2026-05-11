# Ericsson Equipment Configurator

Generates ready-to-use Ericsson NETCONF XML equipment configuration scripts for base station sites — no server, no install, runs entirely in the browser.

## Live App

**[https://landmarkplus2016-byte.github.io/Script-Automation/ericsson-equipment-configurator/](https://landmarkplus2016-byte.github.io/Script-Automation/ericsson-equipment-configurator/)**

## How to Use

**1. Open the app**
Navigate to the URL above. The app loads instantly and works offline after the first visit.

**2. Configure your site**
- Enter the **Node ID** (ManagedElement ID used in all generated MO references)
- Toggle **Support System Control** if required for this site
- Use the **Add Band** buttons to add frequency bands (44XX, 0900, 1800, 2100, or Custom)
- For each band card: adjust sector count (1–8), RF type, sector admin state, mixed mode, and mechanical tilt

**3. Download the XML**
- The NETCONF XML script generates instantly as you configure
- Click **Copy XML** to copy to clipboard, or **↓ Download** to save as `SiteEquipment_{NodeID}.xml`
- The file is ready to apply directly to the node via NETCONF

## Notes

- Works fully **offline** — all files are cached by the service worker on first load
- **Installable as a PWA** on Android: tap the browser menu → *Add to Home Screen*
- Port sequence skips the letter **I** to avoid confusion with digit 1 (A B C D E F G H **J** K …)
- Validated against real 4SEC and L-configuration sample files

## Project Structure

```
ericsson-equipment-configurator/
├── index.html          App shell
├── manifest.json       PWA manifest
├── sw.js               Cache-first service worker
├── css/
│   ├── styles.css      Variables, reset, split-panel layout
│   ├── form.css        Left panel — form and controls
│   ├── preview.css     Right panel — XML output
│   └── components.css  Band cards, toggles, sliders
├── js/
│   ├── config.js       Band presets, port sequence, preset logic
│   ├── generator.js    generateXML() — pure function, no DOM
│   ├── ui.js           DOM rendering — band cards, XML preview
│   ├── app.js          State, mutations, init
│   └── download.js     Copy to clipboard, download file
└── assets/
    ├── icon-192.png
    └── icon-512.png
```
