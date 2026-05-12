import { updateBand, removeBand } from './app.js';
import { getEffectivePreset } from './config.js';

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

  // Band name or custom input
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

  // Admin state badge — keep references for live updates
  const adminBadge = document.createElement('span');
  adminBadge.className = `badge ${preset.sectorAdminState === 'UNLOCKED' ? 'unlocked' : 'locked'}`;
  const adminDot = document.createElement('span');
  adminDot.className = 'dot';
  const adminText = document.createElement('span');
  adminText.textContent = preset.sectorAdminState;
  adminBadge.append(adminDot, adminText);

  // RF type badge
  const rfBadge = document.createElement('span');
  rfBadge.className = 'badge rftype';
  const rfDot = document.createElement('span');
  rfDot.className = 'dot';
  const rfText = document.createElement('span');
  rfText.textContent = preset.rfType;
  rfBadge.append(rfDot, rfText);

  // Remove button
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
  });

  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'slider-wrap';
  sliderWrap.append(slider, sectorVal);
  body.appendChild(makeRow('Sectors', sliderWrap));

  // RF type segmented control
  const rfSeg = createSegment(['2T2R', '4T4R', '8T8R'], preset.rfType, val => {
    updateBand(band.id, { rfTypeOverride: val });
    rfText.textContent = val;
  });
  body.appendChild(makeRow('RF Type', rfSeg));

  // Admin state segmented control
  const adminSeg = createSegment(['UNLOCKED', 'LOCKED'], preset.sectorAdminState, val => {
    updateBand(band.id, { adminStateOverride: val });
    adminBadge.className  = `badge ${val === 'UNLOCKED' ? 'unlocked' : 'locked'}`;
    adminText.textContent = val;
  }, 'state');
  body.appendChild(makeRow('Admin State', adminSeg));

  // Mixed mode + optional tilt row (shares one .row)
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
// Line-by-line approach handles comments, delimiters, and
// declarations correctly before applying tag/attribute rules.

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

    // Text content between tags
    out = out.replace(/(&gt;)([^&<>]+?)(&lt;)/g, (m, a, txt, b) =>
      /^\s*$/.test(txt) ? m : `${a}<span class="text-content">${txt}</span>${b}`
    );

    // Closing tags </Name>
    out = out.replace(
      /(&lt;\/)([A-Za-z_][\w:-]*)(&gt;)/g,
      '<span class="tag-close">$1$2$3</span>'
    );

    // Opening tags <Name ...> with attribute highlighting
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
  const output     = document.getElementById('xml-output');
  const gutter     = document.getElementById('xml-gutter');
  const lineCountEl = document.getElementById('preview-linecount');
  const bytesEl    = document.getElementById('preview-bytes');

  const lines = xml.split('\n').length;

  if (output)     output.innerHTML = highlightXML(xml);
  if (gutter)     gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  if (lineCountEl) lineCountEl.textContent = lines;
  if (bytesEl)    bytesEl.textContent = xml.length.toLocaleString();
}

export function showCopyFeedback() {
  const btn = document.getElementById('preview-btn-copy');
  if (!btn) return;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="ok">✓</span> <span class="ok">Copied</span>';
  setTimeout(() => { btn.innerHTML = original; }, 1800);
}
