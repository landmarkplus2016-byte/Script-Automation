import { RF_PORTS, getEffectivePreset, allocatePorts } from './config.js';

function getPrefix(band) {
  return band.prefix === 'CUSTOM' ? (band.customPrefix ?? 'CUSTOM') : band.prefix;
}

function buildNetconfHeader(nodeId) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<hello xmlns="urn:ietf:params:xml:ns:netconf:base:1.0">',
    '  <capabilities>',
    '    <capability>urn:ietf:params:xml:ns:netconf:base:1.0</capability>',
    '  </capabilities>',
    '</hello>',
    ']]>]]>',
    '<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">',
    '  <edit-config>',
    '    <target>',
    '      <running/>',
    '    </target>',
    '    <config>',
    '      <ManagedElement xmlns="urn:com:ericsson:ecim:ComTop">',
    `        <managedElementId>${nodeId}</managedElementId>`,
    '        <Equipment xmlns="urn:com:ericsson:ecim:ReqEquipment">',
    '          <equipmentId>1</equipmentId>',
  ];
}

function buildAntennaSection(bands, baseRef) {
  const lines = [];

  for (const band of bands) {
    const preset  = getEffectivePreset(band);
    const prefix  = getPrefix(band);
    const rfPorts = RF_PORTS[preset.rfType];

    for (let s = 1; s <= band.numSectors; s++) {
      const augId = `${prefix}_S${s}`;

      if (band.dualRru) {
        // ── Dual RRU (Node Daisy) ────────────────────────────────────
        // Split ports evenly: each RRU gets rfPorts.length/2 ports (same letter names)
        const half      = rfPorts.length / 2;
        const fruPorts  = rfPorts.slice(0, half); // e.g. ['A'] for 2T2R, ['A','B'] for 4T4R
        const fruId1    = `${prefix}-${s}-RRUW-1`;
        const fruId2    = `${prefix}-${s}-RRUW-2`;

        // AntennaUnitGroup — all N AuPorts, numbered 1…N
        lines.push('          <AntennaUnitGroup>');
        lines.push(`            <antennaUnitGroupId>${augId}</antennaUnitGroupId>`);
        lines.push('            <AntennaUnit>');
        lines.push('              <antennaUnitId>1</antennaUnitId>');
        lines.push('              <AntennaSubunit>');
        lines.push('                <antennaSubunitId>1</antennaSubunitId>');
        if (preset.hasMechanicalTilt) {
          lines.push(`                <mechanicalAntennaTilt>${band.mechanicalTilt}</mechanicalAntennaTilt>`);
        }
        for (let i = 1; i <= rfPorts.length; i++) {
          lines.push('                <AuPort>');
          lines.push(`                  <auPortId>${i}</auPortId>`);
          lines.push('                </AuPort>');
        }
        lines.push('              </AntennaSubunit>');
        lines.push('            </AntennaUnit>');
        lines.push('          </AntennaUnitGroup>');

        // RRUW-1 → branches 1 … half
        let branchNum = 1;
        let isFirst = true;
        for (const port of fruPorts) {
          lines.push('          <FieldReplaceableUnit>');
          lines.push(`            <fieldReplaceableUnitId>${fruId1}</fieldReplaceableUnitId>`);
          if (isFirst) { lines.push('            <administrativeState>UNLOCKED</administrativeState>'); isFirst = false; }
          lines.push('            <RfPort>');
          lines.push(`              <rfPortId>${port}</rfPortId>`);
          lines.push(`              <administrativeState>${preset.rfPortAdminState}</administrativeState>`);
          lines.push('            </RfPort>');
          lines.push('          </FieldReplaceableUnit>');
          lines.push('          <AntennaUnitGroup>');
          lines.push(`            <antennaUnitGroupId>${augId}</antennaUnitGroupId>`);
          lines.push('            <RfBranch>');
          lines.push(`              <rfBranchId>${branchNum}</rfBranchId>`);
          lines.push(`              <auPortRef>${baseRef},AntennaUnitGroup=${augId},AntennaUnit=1,AntennaSubunit=1,AuPort=${branchNum}</auPortRef>`);
          lines.push(`              <rfPortRef>${baseRef},FieldReplaceableUnit=${fruId1},RfPort=${port}</rfPortRef>`);
          lines.push('            </RfBranch>');
          lines.push('          </AntennaUnitGroup>');
          branchNum++;
        }

        // RRUW-2 → branches half+1 … N
        isFirst = true;
        for (const port of fruPorts) {
          lines.push('          <FieldReplaceableUnit>');
          lines.push(`            <fieldReplaceableUnitId>${fruId2}</fieldReplaceableUnitId>`);
          if (isFirst) { lines.push('            <administrativeState>UNLOCKED</administrativeState>'); isFirst = false; }
          lines.push('            <RfPort>');
          lines.push(`              <rfPortId>${port}</rfPortId>`);
          lines.push(`              <administrativeState>${preset.rfPortAdminState}</administrativeState>`);
          lines.push('            </RfPort>');
          lines.push('          </FieldReplaceableUnit>');
          lines.push('          <AntennaUnitGroup>');
          lines.push(`            <antennaUnitGroupId>${augId}</antennaUnitGroupId>`);
          lines.push('            <RfBranch>');
          lines.push(`              <rfBranchId>${branchNum}</rfBranchId>`);
          lines.push(`              <auPortRef>${baseRef},AntennaUnitGroup=${augId},AntennaUnit=1,AntennaSubunit=1,AuPort=${branchNum}</auPortRef>`);
          lines.push(`              <rfPortRef>${baseRef},FieldReplaceableUnit=${fruId2},RfPort=${port}</rfPortRef>`);
          lines.push('            </RfBranch>');
          lines.push('          </AntennaUnitGroup>');
          branchNum++;
        }

      } else {
        // ── Single RRU (original behavior) ──────────────────────────
        const fruId = `${prefix}-${s}-RRUW-1`;

        lines.push('          <AntennaUnitGroup>');
        lines.push(`            <antennaUnitGroupId>${augId}</antennaUnitGroupId>`);
        lines.push('            <AntennaUnit>');
        lines.push('              <antennaUnitId>1</antennaUnitId>');
        lines.push('              <AntennaSubunit>');
        lines.push('                <antennaSubunitId>1</antennaSubunitId>');
        if (preset.hasMechanicalTilt) {
          lines.push(`                <mechanicalAntennaTilt>${band.mechanicalTilt}</mechanicalAntennaTilt>`);
        }
        for (const port of rfPorts) {
          lines.push('                <AuPort>');
          lines.push(`                  <auPortId>${port}</auPortId>`);
          lines.push('                </AuPort>');
        }
        lines.push('              </AntennaSubunit>');
        lines.push('            </AntennaUnit>');
        lines.push('          </AntennaUnitGroup>');

        let firstPort = true;
        for (const port of rfPorts) {
          lines.push('          <FieldReplaceableUnit>');
          lines.push(`            <fieldReplaceableUnitId>${fruId}</fieldReplaceableUnitId>`);
          if (firstPort) { lines.push('            <administrativeState>UNLOCKED</administrativeState>'); firstPort = false; }
          lines.push('            <RfPort>');
          lines.push(`              <rfPortId>${port}</rfPortId>`);
          lines.push(`              <administrativeState>${preset.rfPortAdminState}</administrativeState>`);
          lines.push('            </RfPort>');
          lines.push('          </FieldReplaceableUnit>');
          lines.push('          <AntennaUnitGroup>');
          lines.push(`            <antennaUnitGroupId>${augId}</antennaUnitGroupId>`);
          lines.push('            <RfBranch>');
          lines.push(`              <rfBranchId>${port}</rfBranchId>`);
          lines.push(`              <auPortRef>${baseRef},AntennaUnitGroup=${augId},AntennaUnit=1,AntennaSubunit=1,AuPort=${port}</auPortRef>`);
          lines.push(`              <rfPortRef>${baseRef},FieldReplaceableUnit=${fruId},RfPort=${port}</rfPortRef>`);
          lines.push('            </RfBranch>');
          lines.push('          </AntennaUnitGroup>');
        }
      }
    }
  }

  return lines;
}

function buildCabinet() {
  return [
    '          <Cabinet>',
    '            <cabinetId>1</cabinetId>',
    '          </Cabinet>',
  ];
}

function buildBBUFru(bbuPorts, baseRef) {
  const lines = [
    '          <FieldReplaceableUnit>',
    '            <fieldReplaceableUnitId>1</fieldReplaceableUnitId>',
    '            <administrativeState>UNLOCKED</administrativeState>',
  ];

  for (const port of bbuPorts) {
    lines.push('            <RiPort>');
    lines.push(`              <riPortId>${port}</riPortId>`);
    lines.push('            </RiPort>');
  }

  lines.push('            <SyncPort>');
  lines.push('              <syncPortId>1</syncPortId>');
  lines.push('            </SyncPort>');
  lines.push('          </FieldReplaceableUnit>');

  return lines;
}

function buildRRUFrus(bands) {
  const lines = [];

  for (const band of bands) {
    const prefix = getPrefix(band);
    const count  = band.dualRru ? 2 : 1;
    for (let s = 1; s <= band.numSectors; s++) {
      for (let r = 1; r <= count; r++) {
        const fruId = `${prefix}-${s}-RRUW-${r}`;
        lines.push('          <FieldReplaceableUnit>');
        lines.push(`            <fieldReplaceableUnitId>${fruId}</fieldReplaceableUnitId>`);
        lines.push('            <RiPort>');
        lines.push('              <riPortId>DATA_1</riPortId>');
        lines.push('            </RiPort>');
        lines.push('            <RiPort>');
        lines.push('              <riPortId>DATA_2</riPortId>');
        lines.push('            </RiPort>');
        lines.push('          </FieldReplaceableUnit>');
      }
    }
  }

  return lines;
}

function buildRiLinks(bands, portMap, baseRef) {
  const lines = [];
  let idx = 0;

  for (const band of bands) {
    const prefix = getPrefix(band);
    for (let s = 1; s <= band.numSectors; s++) {
      const fruId1  = `${prefix}-${s}-RRUW-1`;
      const bbuPort = portMap[idx++].bbuPort;
      const rruPort = (band.rruPortOverrides || {})[s] || 'DATA_2';

      // BBU → RRUW-1
      lines.push('          <RiLink>');
      lines.push(`            <riLinkId>${prefix}_S${s}_1st</riLinkId>`);
      lines.push(`            <riPortRef1>${baseRef},FieldReplaceableUnit=1,RiPort=${bbuPort}</riPortRef1>`);
      lines.push(`            <riPortRef2>${baseRef},FieldReplaceableUnit=${fruId1},RiPort=${rruPort}</riPortRef2>`);
      lines.push('          </RiLink>');

      // RRUW-1 DATA_2 → RRUW-2 DATA_1 (daisy chain — only when Dual RRU enabled)
      if (band.dualRru) {
        const fruId2 = `${prefix}-${s}-RRUW-2`;
        lines.push('          <RiLink>');
        lines.push(`            <riLinkId>${prefix}_S${s}_ND</riLinkId>`);
        lines.push(`            <riPortRef1>${baseRef},FieldReplaceableUnit=${fruId1},RiPort=DATA_2</riPortRef1>`);
        lines.push(`            <riPortRef2>${baseRef},FieldReplaceableUnit=${fruId2},RiPort=DATA_1</riPortRef2>`);
        lines.push('          </RiLink>');
      }
    }
  }

  return lines;
}

function buildEquipmentSupportFunction(supportSystemControl) {
  return [
    '        <EquipmentSupportFunction xmlns="urn:com:ericsson:ecim:ReqEquipmentSupport">',
    '          <equipmentSupportFunctionId>1</equipmentSupportFunctionId>',
    `          <supportSystemControl>${supportSystemControl}</supportSystemControl>`,
    '        </EquipmentSupportFunction>',
  ];
}

function buildNodeSupport(bands, baseRef) {
  const lines = [
    '        <NodeSupport xmlns="urn:com:ericsson:ecim:ReqNodeSupport">',
    '          <nodeSupportId>1</nodeSupportId>',
    '          <MpClusterHandling>',
    '            <mpClusterHandlingId>1</mpClusterHandlingId>',
    `            <primaryCoreRef>${baseRef},FieldReplaceableUnit=1</primaryCoreRef>`,
    '          </MpClusterHandling>',
  ];

  for (const band of bands) {
    const preset  = getEffectivePreset(band);
    const prefix  = getPrefix(band);
    const rfPorts = RF_PORTS[preset.rfType];

    for (let s = 1; s <= band.numSectors; s++) {
      const augId = `${prefix}_S${s}`;
      lines.push('          <SectorEquipmentFunction>');
      lines.push(`            <sectorEquipmentFunctionId>${augId}</sectorEquipmentFunctionId>`);
      lines.push(`            <administrativeState>${preset.sectorAdminState}</administrativeState>`);
      if (preset.mixedModeRadio) {
        lines.push('            <mixedModeRadio>true</mixedModeRadio>');
      }
      if (band.dualRru) {
        // Dual RRU branches are numbered 1…N
        for (let i = 1; i <= rfPorts.length; i++) {
          lines.push(`            <rfBranchRef>${baseRef},AntennaUnitGroup=${augId},RfBranch=${i}</rfBranchRef>`);
        }
      } else {
        // Single RRU branches use port letters (A, B…)
        for (const port of rfPorts) {
          lines.push(`            <rfBranchRef>${baseRef},AntennaUnitGroup=${augId},RfBranch=${port}</rfBranchRef>`);
        }
      }
      lines.push('          </SectorEquipmentFunction>');
    }
  }

  lines.push('        </NodeSupport>');

  return lines;
}

function buildNetconfFooter() {
  return [
    '      </ManagedElement>',
    '    </config>',
    '  </edit-config>',
    '</rpc>',
    ']]>]]>',
    '<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="2">',
    '  <close-session/>',
    '</rpc>',
    ']]>]]>',
  ];
}

export function generateXML(state) {
  const { nodeId, supportSystemControl, bands } = state;
  const baseRef = `ManagedElement=${nodeId},Equipment=1`;
  const portMap = allocatePorts(bands);
  const bbuPorts = portMap.map(e => e.bbuPort);

  return [
    ...buildNetconfHeader(nodeId),
    ...buildAntennaSection(bands, baseRef),
    ...buildCabinet(),
    ...buildBBUFru(bbuPorts, baseRef),
    ...buildRRUFrus(bands),
    ...buildRiLinks(bands, portMap, baseRef),
    '        </Equipment>',
    ...buildEquipmentSupportFunction(supportSystemControl),
    ...buildNodeSupport(bands, baseRef),
    ...buildNetconfFooter(),
  ].join('\n');
}
