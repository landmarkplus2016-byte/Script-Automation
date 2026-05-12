// Skips I to avoid confusion with digit 1
export const PORT_SEQUENCE = [
  'A','B','C','D','E','F','G','H',
  'J','K','L','M','N','P','Q','R',
  'S','T','U','V','W','X','Y','Z',
];

export const RF_PORTS = {
  '8T8R': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  '4T4R': ['A', 'B', 'C', 'D'],
  '2T2R': ['A', 'B'],
};

export const BAND_PRESETS = {
  '44XX': {
    rfType:             '4T4R',
    sectorAdminState:   'UNLOCKED',
    rfPortAdminState:   'LOCKED',
    mixedModeRadio:     false,
    hasMechanicalTilt:  true,
  },
  '0900': {
    rfType:             '2T2R',
    sectorAdminState:   'LOCKED',
    rfPortAdminState:   'UNLOCKED',
    mixedModeRadio:     true,
    hasMechanicalTilt:  false,
  },
  '1800': {
    rfType:             '2T2R',
    sectorAdminState:   'LOCKED',
    rfPortAdminState:   'UNLOCKED',
    mixedModeRadio:     true,
    hasMechanicalTilt:  false,
  },
  '2100': {
    rfType:             '2T2R',
    sectorAdminState:   'LOCKED',
    rfPortAdminState:   'UNLOCKED',
    mixedModeRadio:     true,
    hasMechanicalTilt:  false,
  },
  '2600': {
    rfType:             '2T2R',
    sectorAdminState:   'LOCKED',
    rfPortAdminState:   'UNLOCKED',
    mixedModeRadio:     true,
    hasMechanicalTilt:  false,
  },
};

export function getEffectivePreset(band) {
  const base = BAND_PRESETS[band.prefix] ?? {
    rfType:             '2T2R',
    sectorAdminState:   'LOCKED',
    rfPortAdminState:   'UNLOCKED',
    mixedModeRadio:     false,
    hasMechanicalTilt:  false,
  };

  const rfType            = band.rfTypeOverride    ?? base.rfType;
  const sectorAdminState  = band.adminStateOverride ?? base.sectorAdminState;
  const mixedModeRadio    = band.mixedModeOverride  ?? base.mixedModeRadio;
  const rfPortAdminState  = rfType === '4T4R' ? 'LOCKED' : 'UNLOCKED';
  const hasMechanicalTilt = rfType === '4T4R' || rfType === '8T8R';

  return { rfType, sectorAdminState, rfPortAdminState, mixedModeRadio, hasMechanicalTilt };
}

export function allocatePorts(bands) {
  const total = bands.reduce((sum, b) => sum + b.numSectors, 0);
  if (total > PORT_SEQUENCE.length) {
    throw new Error(
      `Total sectors (${total}) exceeds the maximum of ${PORT_SEQUENCE.length}. ` +
      `Reduce sector counts to continue.`
    );
  }

  // Collect all manually pinned ports so auto-assignment skips them
  const pinned = new Set();
  for (const band of bands) {
    const ov = band.riPortOverrides || {};
    for (let s = 1; s <= band.numSectors; s++) {
      if (ov[s]) pinned.add(ov[s].toUpperCase());
    }
  }

  const result = [];
  let autoIdx = 0;

  for (const band of bands) {
    const prefix = band.prefix === 'CUSTOM' ? (band.customPrefix ?? 'CUSTOM') : band.prefix;
    const ov = band.riPortOverrides || {};

    for (let s = 1; s <= band.numSectors; s++) {
      const manual = ov[s];
      if (manual) {
        result.push({ prefix, sectorNum: s, bbuPort: manual.toUpperCase(), bandId: band.id });
      } else {
        while (autoIdx < PORT_SEQUENCE.length && pinned.has(PORT_SEQUENCE[autoIdx])) autoIdx++;
        const bbuPort = autoIdx < PORT_SEQUENCE.length ? PORT_SEQUENCE[autoIdx++] : '?';
        result.push({ prefix, sectorNum: s, bbuPort, bandId: band.id });
      }
    }
  }

  return result;
}
