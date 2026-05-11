import { getXML } from './app.js';
import { showCopyFeedback } from './ui.js';

export async function copyXMLToClipboard() {
  const xml = getXML();

  try {
    await navigator.clipboard.writeText(xml);
    showCopyFeedback();
  } catch {
    // Fallback for browsers without Clipboard API access
    try {
      const ta = document.createElement('textarea');
      ta.value = xml;
      ta.setAttribute('style', 'position:fixed;top:-9999px;left:-9999px;opacity:0');
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showCopyFeedback();
    } catch (fallbackErr) {
      console.error('Copy failed:', fallbackErr);
    }
  }
}

export function downloadXMLFile() {
  const xml      = getXML();
  const filename = document.getElementById('preview-filename')?.textContent
    || 'SiteEquipment_1.xml';

  const blob = new Blob([xml], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 100);
}
