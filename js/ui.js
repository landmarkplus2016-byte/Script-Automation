import { updateBand, removeBand } from './app.js';
import { getEffectivePreset } from './config.js';

// ── Internal helpers ─────────────────────────────────────────

function createPill(options, activeValue, onChange) {
  const pill = document.createElement('div');
  pill.className = 'pill';

  for (const opt of options) {
    const btn = document.createElement('button');
    btn.className = 'pill-btn' + (opt === activeValue ? ' pill-btn--active' : '');
    btn.dataset.value = opt;
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      pill.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('pill-btn--active'));
      btn.classList.add('pill-btn--active');
      onChange(opt);
    });
    pill.appendChild(btn);
  }

  return pill;
}

function makeRow(labelText, control) {
  const r = document.createElement('div');
  if (labelText) {
    r.className = 'band-card__row';
    const lbl = document.createElement('span');
    lbl.className = 'field-label';
    lbl.textContent = labelText;
    r.append(lbl, control);
  } else {
    r.className = 'band-card__row band-card__row--full';
    r.appendChild(control);
  }
  return r;
}

// ── renderBandCard ───────────────────────────────────────────

function renderBandCard(band) {
  const preset        = getEffectivePreset(band);
  const displayPrefix = band.prefix === 'CUSTOM'
    ? (band.customPrefix || 'CUSTOM')
    : band.prefix;

  const card = document.createElement('div');
  card.className = 'band-card';
  card.dataset.bandId = band.id;

  // ── Header ────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'band-card__header';

  const dot = document.createElement('span');
  dot.className = 'status-dot status-dot--' +
    (preset.sectorAdminState === 'UNLOCKED' ? 'green' : 'amber');

  const prefixLabel = document.createElement('span');
  prefixLabel.className = 'band-card__prefix';
  prefixLabel.textContent = displayPrefix;

  const rfBadge = document.createElement('span');
  rfBadge.className = 'badge';
  rfBadge.textContent = preset.rfType;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-icon';
  removeBtn.setAttribute('aria-label', 'Remove band');
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => removeBand(band.id));

  header.append(dot, prefixLabel, rfBadge, removeBtn);
  card.appendChild(header);

  // ── Custom prefix input ───────────────────────────────────
  if (band.prefix === 'CUSTOM') {
    const customInput = document.createElement('input');
    customInput.type        = 'text';
    customInput.className   = 'input-text';
    customInput.value       = band.customPrefix || '';
    customInput.placeholder = 'Band prefix, e.g. 2600';
    customInput.addEventListener('input', e =>
      updateBand(band.id, { customPrefix: e.target.value })
    );
    card.appendChild(makeRow('Prefix', customInput));
  }

  // ── Sectors slider ────────────────────────────────────────
  const sectorVal = document.createElement('span');
  sectorVal.className   = 'slider-value';
  sectorVal.textContent = band.numSectors;

  const slider = document.createElement('input');
  slider.type      = 'range';
  slider.className = 'slider';
  slider.min       = 1;
  slider.max       = 8;
  slider.value     = band.numSectors;
  slider.addEventListener('input', e => {
    sectorVal.textContent = e.target.value;
    updateBand(band.id, { numSectors: Number(e.target.value) });
  });

  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'slider-wrap';
  sliderWrap.append(slider, sectorVal);
  card.appendChild(makeRow('Sectors', sliderWrap));

  // ── RF type toggle ────────────────────────────────────────
  const rfPill = createPill(['2T2R', '4T4R'], preset.rfType, val => {
    updateBand(band.id, { rfTypeOverride: val });
    rfBadge.textContent = val;
  });
  card.appendChild(makeRow('RF Type', rfPill));

  // ── Sector admin state toggle ─────────────────────────────
  const adminPill = createPill(['UNLOCKED', 'LOCKED'], preset.sectorAdminState, val => {
    updateBand(band.id, { adminStateOverride: val });
    dot.className = 'status-dot status-dot--' + (val === 'UNLOCKED' ? 'green' : 'amber');
  });
  card.appendChild(makeRow('Sector Admin', adminPill));

  // ── Mixed mode radio ──────────────────────────────────────
  const mmLabel = document.createElement('label');
  mmLabel.className = 'checkbox-label';

  const mmCheck = document.createElement('input');
  mmCheck.type      = 'checkbox';
  mmCheck.className = 'checkbox';
  mmCheck.checked   = preset.mixedModeRadio;
  mmCheck.addEventListener('change', e =>
    updateBand(band.id, { mixedModeOverride: e.target.checked })
  );

  const mmText = document.createElement('span');
  mmText.textContent = 'Mixed Mode Radio';
  mmLabel.append(mmCheck, mmText);
  card.appendChild(makeRow('', mmLabel));

  // ── Mechanical tilt — 4T4R only ───────────────────────────
  if (preset.hasMechanicalTilt) {
    const tiltInput = document.createElement('input');
    tiltInput.type      = 'number';
    tiltInput.className = 'input-number';
    tiltInput.value     = band.mechanicalTilt;
    tiltInput.min       = 0;
    tiltInput.max       = 20;
    tiltInput.addEventListener('change', e =>
      updateBand(band.id, { mechanicalTilt: parseInt(e.target.value, 10) || 0 })
    );
    card.appendChild(makeRow('Mech. Tilt (°)', tiltInput));
  }

  return card;
}

// ── highlightXML ─────────────────────────────────────────────

export function highlightXML(xml) {
  const s = xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Single-pass replacement — injected <span> tags are never re-matched
  return s.replace(
    /(\]\]&gt;\]\]&gt;)|(xmlns(?::\w+)?="[^"]*")|("(?:[^"]*)")|(&lt;\/[\w:.-]+&gt;)|(&lt;[?!]?[A-Za-z_][\w:.-]*)/g,
    (m, delim, attr, val, closing, opening) => {
      if (delim)   return `<span class="xt-delim">${m}</span>`;
      if (attr)    return `<span class="xt-attr">${m}</span>`;
      if (val)     return `<span class="xt-val">${m}</span>`;
      if (closing) return `<span class="xt-close">${m}</span>`;
      if (opening) return `<span class="xt-open">${m}</span>`;
      return m;
    }
  );
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
  const output    = document.getElementById('xml-output');
  const lineCount = document.getElementById('preview-linecount');
  if (output)    output.innerHTML = highlightXML(xml);
  if (lineCount) lineCount.textContent = xml.split('\n').length + ' lines';
}

export function showCopyFeedback() {
  const btn = document.getElementById('btn-copy');
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = '✓ Copied!';
  setTimeout(() => { btn.textContent = original; }, 2000);
}
