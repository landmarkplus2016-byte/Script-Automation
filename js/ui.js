import { updateBand, removeBand, setRiPortOverride, setRruPortOverride, getPortMap } from './app.js';
import { getEffectivePreset } from './config.js';
import { PORT_SEQUENCE } from './config.js';

// ── Internal helpers ─────────────────────────────────────────

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createSegment(options, activeValue, onChange, variant) {
  const seg = document.createElement('div');
  seg.className = 'segment' + (variant ? ' ' + variant : '');

  for (const opt of options) {
    const btn = document.createElement('button');
    btn.className = (opt === activeValue ? 'active ' : '') + opt.toLowerCase();
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(opt);
    });
    seg.appendChild(btn);
  }
  return seg;
}

function makeRow(labelText, control) {
  const r = document.createElement('div');
  r.className = 'row';
  if (labelText) {
    const lbl = document.createElement('span');
    lbl.className = 'row-label';
    lbl.textContent = labelText;
    r.append(lbl, control);
  } else {
    r.appendChild(control);
  }
  return r;
}

// ── RiPort row ───────────────────────────────────────────────

function buildRiPortSelect(bandId, sectorNum, override) {
  const sel = document.createElement('select');
  sel.className = 'riport-select' + (override ? ' is-override' : '');
  sel.dataset.bandId = bandId;
  sel.dataset.sector  = sectorNum;

  // Auto option — text updated by updateRiPortSelects()
  const autoOpt = document.createElement('option');
  autoOpt.value = '';
  autoOpt.textContent = 'auto';
  sel.appendChild(autoOpt);

  for (const port of PORT_SEQUENCE) {
    const opt = document.createElement('option');
    opt.value = port;
    opt.textContent = port;
    if (override === port) opt.selected = true;
    sel.appendChild(opt);
  }

  if (!override) sel.value = '';

  sel.addEventListener('change', () => {
    const val = sel.value || null;
    sel.classList.toggle('is-override', !!val);
    setRiPortOverride(bandId, sectorNum, val);
  });

  return sel;
}

function buildRruPortSelect(bandId, sectorNum, override) {
  const sel = document.createElement('select');
  sel.className = 'riport-rru-select' + (override === 'DATA_1' ? ' is-override' : '');

  ['DATA_2', 'DATA_1'].forEach(port => {
    const opt = document.createElement('option');
    opt.value = port;
    opt.textContent = port;
    if ((override || 'DATA_2') === port) opt.selected = true;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    sel.classList.toggle('is-override', sel.value === 'DATA_1');
    setRruPortOverride(bandId, sectorNum, sel.value === 'DATA_1' ? 'DATA_1' : null);
  });

  return sel;
}

function renderRiPortsRow(band) {
  const row = document.createElement('div');
  row.className = 'row';

  const lbl = document.createElement('span');
  lbl.className = 'row-label';
  lbl.textContent = 'RiPorts';

  const list = document.createElement('div');
  list.className = 'riport-list';

  const bbuOv = band.riPortOverrides  || {};
  const rruOv = band.rruPortOverrides || {};

  for (let s = 1; s <= band.numSectors; s++) {
    const item = document.createElement('div');
    item.className = 'riport-item';

    const sLbl = document.createElement('span');
    sLbl.className   = 'riport-sector';
    sLbl.textContent = `S${s}`;

    item.append(
      sLbl,
      buildRiPortSelect(band.id, s, bbuOv[s] || null),
      buildRruPortSelect(band.id, s, rruOv[s] || null)
    );
    list.appendChild(item);
  }

  row.append(lbl, list);
  return row;
}

// ── renderBandCard ───────────────────────────────────────────

function renderBandCard(band) {
  const preset      = getEffectivePreset(band);
  const isCustom    = band.prefix === 'CUSTOM';
  const displayPrefix = isCustom ? (band.customPrefix || 'CUSTOM') : band.prefix;

  const card = document.createElement('div');
  card.className = 'band-card';
  card.dataset.bandId = band.id;

  // ── Head ──────────────────────────────────────────────────
  const head = document.createElement('div');
  head.className = 'band-head';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'band-title';

  let nameEl;
  if (isCustom) {
    nameEl = document.createElement('input');
    nameEl.type        = 'text';
    nameEl.className   = 'band-name-input';
    nameEl.value       = band.customPrefix || '';
    nameEl.placeholder = 'prefix';
    nameEl.maxLength   = 8;
    nameEl.addEventListener('input', e => {
      e.target.value = e.target.value.toUpperCase().slice(0, 8);
      updateBand(band.id, { customPrefix: e.target.value });
    });
  } else {
    nameEl = document.createElement('span');
    nameEl.className   = 'band-name';
    nameEl.textContent = displayPrefix;
  }

  const adminBadge = document.createElement('span');
  adminBadge.className = `badge ${preset.sectorAdminState === 'UNLOCKED' ? 'unlocked' : 'locked'}`;
  const adminDot  = document.createElement('span'); adminDot.className = 'dot';
  const adminText = document.createElement('span'); adminText.textContent = preset.sectorAdminState;
  adminBadge.append(adminDot, adminText);

  const rfBadge = document.createElement('span');
  rfBadge.className = 'badge rftype';
  const rfDot  = document.createElement('span'); rfDot.className = 'dot';
  const rfText = document.createElement('span'); rfText.textContent = preset.rfType;
  rfBadge.append(rfDot, rfText);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'icon-btn';
  removeBtn.setAttribute('aria-label', 'Remove band');
  removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  removeBtn.addEventListener('click', () => removeBand(band.id));

  titleGroup.append(nameEl, adminBadge, rfBadge);
  head.append(titleGroup, removeBtn);
  card.appendChild(head);

  // ── Body ──────────────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'band-body';

  // Declare riPortsRow here so the slider listener can reference it
  let riPortsRow;

  // Sectors slider
  const sectorPct = ((band.numSectors - 1) / 7 * 100).toFixed(1);

  const sectorVal = document.createElement('span');
  sectorVal.className   = 'slider-value';
  sectorVal.textContent = band.numSectors;

  const slider = document.createElement('input');
  slider.type      = 'range';
  slider.className = 'slider';
  slider.min       = 1;
  slider.max       = 8;
  slider.value     = band.numSectors;
  slider.style.setProperty('--pct', sectorPct + '%');
  slider.addEventListener('input', e => {
    const v = Number(e.target.value);
    sectorVal.textContent = v;
    slider.style.setProperty('--pct', ((v - 1) / 7 * 100).toFixed(1) + '%');
    updateBand(band.id, { numSectors: v });
    // Re-render RiPorts row for the new sector count
    const newRow = renderRiPortsRow(band); // band.numSectors already updated
    riPortsRow.replaceWith(newRow);
    riPortsRow = newRow;
    updateRiPortSelects(getPortMap());
  });

  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'slider-wrap';
  sliderWrap.append(slider, sectorVal);
  body.appendChild(makeRow('Sectors', sliderWrap));

  // RF type segment
  const rfSeg = createSegment(['2T2R', '4T4R', '8T8R'], preset.rfType, val => {
    updateBand(band.id, { rfTypeOverride: val });
    rfText.textContent = val;
  });
  body.appendChild(makeRow('RF Type', rfSeg));

  // Admin state segment
  const adminSeg = createSegment(['UNLOCKED', 'LOCKED'], preset.sectorAdminState, val => {
    updateBand(band.id, { adminStateOverride: val });
    adminBadge.className  = `badge ${val === 'UNLOCKED' ? 'unlocked' : 'locked'}`;
    adminText.textContent = val;
  }, 'state');
  body.appendChild(makeRow('Admin State', adminSeg));

  // Dual RRU toggle row
  const dualRow = document.createElement('div');
  dualRow.className = 'row';
  const dualCheck = document.createElement('div');
  dualCheck.className = 'checkbox-row';
  const dualBox = document.createElement('div');
  dualBox.className = 'checkbox' + (band.dualRru ? ' on' : '');
  const dualText = document.createElement('span');
  dualText.textContent = 'Dual RRU (Node Daisy)';
  dualCheck.append(dualBox, dualText);
  dualCheck.addEventListener('click', () => {
    const newVal = !dualBox.classList.contains('on');
    dualBox.classList.toggle('on', newVal);
    updateBand(band.id, { dualRru: newVal });
  });
  dualRow.appendChild(dualCheck);
  body.appendChild(dualRow);

  // RiPorts row — assigned after body rows are appended so replaceWith works
  riPortsRow = renderRiPortsRow(band);
  body.appendChild(riPortsRow);

  // Mixed mode + optional tilt
  const lastRow = document.createElement('div');
  lastRow.className = 'row';

  const checkRow = document.createElement('div');
  checkRow.className = 'checkbox-row';
  const checkBox  = document.createElement('div');
  checkBox.className = 'checkbox' + (preset.mixedModeRadio ? ' on' : '');
  const checkText = document.createElement('span');
  checkText.textContent = 'Mixed Mode Radio';
  checkRow.append(checkBox, checkText);
  checkRow.addEventListener('click', () => {
    const newVal = !checkBox.classList.contains('on');
    checkBox.classList.toggle('on', newVal);
    updateBand(band.id, { mixedModeOverride: newVal });
  });
  lastRow.appendChild(checkRow);

  if (preset.hasMechanicalTilt) {
    const tiltGroup = document.createElement('div');
    tiltGroup.className = 'tilt-group';

    const tiltLabel = document.createElement('span');
    tiltLabel.className   = 'row-label';
    tiltLabel.textContent = 'Tilt';

    const tiltInput = document.createElement('input');
    tiltInput.type      = 'number';
    tiltInput.className = 'tilt-input';
    tiltInput.value     = band.mechanicalTilt;
    tiltInput.min       = 0;
    tiltInput.max       = 20;
    tiltInput.addEventListener('change', e =>
      updateBand(band.id, { mechanicalTilt: parseInt(e.target.value, 10) || 0 })
    );

    const deg = document.createElement('span');
    deg.className   = 'tilt-degree';
    deg.textContent = '°';

    tiltGroup.append(tiltLabel, tiltInput, deg);
    lastRow.appendChild(tiltGroup);
  }

  body.appendChild(lastRow);
  card.appendChild(body);
  return card;
}

// ── highlightXML ─────────────────────────────────────────────

export function highlightXML(xml) {
  return xml.split('\n').map(line => {
    const trimmed = line.trim();

    if (trimmed.startsWith('<!--'))
      return `<span class="comment">${escapeHtml(line)}</span>`;

    if (trimmed === ']]>]]>')
      return `<span class="delim">${escapeHtml(line)}</span>`;

    if (trimmed.startsWith('<?xml'))
      return `<span class="decl">${escapeHtml(line)}</span>`;

    let out = escapeHtml(line);

    out = out.replace(/(&gt;)([^&<>]+?)(&lt;)/g, (m, a, txt, b) =>
      /^\s*$/.test(txt) ? m : `${a}<span class="text-content">${txt}</span>${b}`
    );
    out = out.replace(
      /(&lt;\/)([A-Za-z_][\w:-]*)(&gt;)/g,
      '<span class="tag-close">$1$2$3</span>'
    );
    out = out.replace(
      /(&lt;)([A-Za-z_][\w:-]*)([^&]*?)(\/?&gt;)/g,
      (m, lt, name, attrs, gt) => {
        const styledAttrs = attrs.replace(
          /([\w:-]+)=(&quot;)([^&]*?)(&quot;)/g,
          '<span class="attr">$1</span>=$2<span class="value">$3</span>$4'
        );
        return `<span class="tag-open">${lt}${name}</span>${styledAttrs}<span class="tag-open">${gt}</span>`;
      }
    );
    return out;
  }).join('\n');
}

// ── Public exports ────────────────────────────────────────────

export function renderBandCards(bands) {
  const container = document.getElementById('band-list');
  if (!container) return;
  container.innerHTML = '';
  for (const band of bands) {
    container.appendChild(renderBandCard(band));
  }
}

export function updatePreview(xml) {
  const output      = document.getElementById('xml-output');
  const gutter      = document.getElementById('xml-gutter');
  const lineCountEl = document.getElementById('preview-linecount');
  const bytesEl     = document.getElementById('preview-bytes');

  const lines = xml.split('\n').length;

  if (output)      output.innerHTML = highlightXML(xml);
  if (gutter)      gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  if (lineCountEl) lineCountEl.textContent = lines;
  if (bytesEl)     bytesEl.textContent = xml.length.toLocaleString();
}

// Updates the "auto" option label in every RiPort select to show computed port
export function updateRiPortSelects(portMap) {
  portMap.forEach(({ bandId, sectorNum, bbuPort }) => {
    const sel = document.querySelector(
      `.riport-select[data-band-id="${bandId}"][data-sector="${sectorNum}"]`
    );
    if (!sel) return;
    const autoOpt = sel.querySelector('option[value=""]');
    if (autoOpt) autoOpt.textContent = `${bbuPort} · auto`;
  });
}

export function showCopyFeedback() {
  const btn = document.getElementById('preview-btn-copy');
  if (!btn) return;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="ok">✓</span> <span class="ok">Copied</span>';
  setTimeout(() => { btn.innerHTML = original; }, 1800);
}
