import { generateXML } from './generator.js';
import { renderBandCards, updatePreview, updateRiPortSelects } from './ui.js';
import { copyXMLToClipboard, downloadXMLFile } from './download.js';
import { allocatePorts } from './config.js';

// ── State ────────────────────────────────────────────────────
const state = {
  nodeId: '1',
  supportSystemControl: false,
  bands: [],
};

let nextBandId = 1;
let lastXML    = '';

// ── Band factory ─────────────────────────────────────────────
function createBand(prefix) {
  return {
    id:                 nextBandId++,
    prefix,
    customPrefix:       null,
    numSectors:         3,
    rfTypeOverride:     null,
    adminStateOverride: null,
    mixedModeOverride:  null,
    mechanicalTilt:     0,
    dualRru:            false,
    riPortOverrides:    {},
    rruPortOverrides:   {},
  };
}

// Default bands
state.bands.push(createBand('44XX'));
state.bands.push(createBand('0900'));

// ── Public accessors ─────────────────────────────────────────
export function getXML() { return lastXML; }

export function getPortMap() {
  try { return allocatePorts(state.bands); } catch (_) { return []; }
}

// ── State mutations ──────────────────────────────────────────
export function setNodeId(value) {
  state.nodeId = value || '1';
  refreshXML();
}

export function setSupportSystemControl(value) {
  state.supportSystemControl = value;
  refreshXML();
}

export function addBand(prefix) {
  state.bands.push(createBand(prefix));
  renderBandCards(state.bands);
  refreshXML();
}

export function removeBand(id) {
  state.bands = state.bands.filter(b => b.id !== id);
  renderBandCards(state.bands);
  refreshXML();
}

export function updateBand(id, changes) {
  const band = state.bands.find(b => b.id === id);
  if (band) {
    Object.assign(band, changes);
    // Drop overrides for sectors that no longer exist
    if (changes.numSectors !== undefined) {
      for (const s in band.riPortOverrides || {}) {
        if (Number(s) > changes.numSectors) delete band.riPortOverrides[s];
      }
      for (const s in band.rruPortOverrides || {}) {
        if (Number(s) > changes.numSectors) delete band.rruPortOverrides[s];
      }
    }
  }
  refreshXML();
}

export function setRruPortOverride(bandId, sectorNum, port) {
  const band = state.bands.find(b => b.id === bandId);
  if (!band) return;
  if (port && port !== 'DATA_2') {
    band.rruPortOverrides[sectorNum] = port;
  } else {
    delete band.rruPortOverrides[sectorNum];
  }
  refreshXML();
}

export function setRiPortOverride(bandId, sectorNum, port) {
  const band = state.bands.find(b => b.id === bandId);
  if (!band) return;
  if (port) {
    band.riPortOverrides[sectorNum] = port.toUpperCase();
  } else {
    delete band.riPortOverrides[sectorNum];
  }
  refreshXML();
}

// ── XML refresh ──────────────────────────────────────────────
export function refreshXML() {
  let portMap = [];
  try {
    lastXML = generateXML(state);
    updatePreview(lastXML);
    portMap = allocatePorts(state.bands);
  } catch (e) {
    updatePreview(`<!-- ${e.message} -->`);
  }

  // Filename
  const filenameEl = document.getElementById('preview-filename');
  if (filenameEl) filenameEl.textContent = `SiteEquipment_${state.nodeId}.xml`;

  // Bands count chip
  const totalSectors = state.bands.reduce((a, b) => a + b.numSectors, 0);
  const countEl = document.getElementById('bands-count');
  if (countEl) {
    const nb = state.bands.length;
    const ns = totalSectors;
    countEl.textContent = `${nb} band${nb !== 1 ? 's' : ''} · ${ns} sector${ns !== 1 ? 's' : ''}`;
  }

  // Overflow warning
  const warnEl = document.getElementById('overflow-warning');
  if (warnEl) warnEl.classList.toggle('is-visible', totalSectors > 24);

  // Update RiPort select auto labels
  updateRiPortSelects(portMap);
}

// ── Mobile tab switcher ──────────────────────────────────────
function initTabSwitcher() {
  const switcher = document.getElementById('tab-switcher');
  if (!switcher) return;

  const formPanel    = document.getElementById('pane-form');
  const previewPanel = document.getElementById('pane-preview');

  formPanel?.classList.add('active');

  switcher.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switcher.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const showForm = btn.dataset.tab === 'form';
      formPanel?.classList.toggle('active', showForm);
      previewPanel?.classList.toggle('active', !showForm);
    });
  });
}

// ── Init ─────────────────────────────────────────────────────
function init() {
  // Node ID input
  const nodeIdEl = document.getElementById('node-id');
  if (nodeIdEl) {
    nodeIdEl.value = state.nodeId;
    nodeIdEl.addEventListener('input', e => setNodeId(e.target.value.trim()));
  }

  // Support System Control — div switch
  const sscEl = document.getElementById('support-system-control');
  if (sscEl) {
    sscEl.classList.toggle('on', state.supportSystemControl);
    sscEl.setAttribute('aria-checked', state.supportSystemControl);
    sscEl.addEventListener('click', () => {
      const newVal = !state.supportSystemControl;
      setSupportSystemControl(newVal);
      sscEl.classList.toggle('on', newVal);
      sscEl.setAttribute('aria-checked', newVal);
    });
  }

  // Add Band buttons
  ['44XX', '0900', '1800', '2100', '2600', 'CUSTOM'].forEach(prefix => {
    document.getElementById(`btn-add-${prefix}`)
      ?.addEventListener('click', () => addBand(prefix));
  });

  // Copy / Download buttons
  document.getElementById('preview-btn-copy')
    ?.addEventListener('click', copyXMLToClipboard);
  document.getElementById('preview-btn-download')
    ?.addEventListener('click', downloadXMLFile);

  // Render initial band cards and XML
  renderBandCards(state.bands);
  refreshXML();

  // Mobile tab switcher
  initTabSwitcher();

  // Service worker + update detection
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'UPDATE_AVAILABLE') showUpdateBanner();
    });
  }
}

function showUpdateBanner() {
  if (document.querySelector('.update-banner')) return;

  const banner = document.createElement('div');
  banner.className = 'update-banner';

  const msg = document.createElement('span');
  msg.textContent = 'A new version is available';

  const btn = document.createElement('button');
  btn.className   = 'update-btn';
  btn.textContent = 'Update';
  btn.addEventListener('click', async () => {
    const reg = await navigator.serviceWorker.ready;
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => location.reload(),
        { once: true }
      );
    } else {
      location.reload();
    }
  });

  banner.append(msg, btn);
  document.body.appendChild(banner);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
