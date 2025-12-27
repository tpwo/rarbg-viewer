import { categorySets } from './consts.js';

export function getTopLevelCategory(cat) {
  for (const [top, subs] of Object.entries(categorySets)) {
    if (subs.has(cat)) return top;
  }
  return 'Other';
}

export function getCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('category') || '';
}

export function humanReadableSize(size) {
  if (typeof size !== 'number' || Number.isNaN(size) || size === 0) return 'N/A';
  if (size < 1000) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let unit = -1;
  do {
    size = size / 1000;
    unit++;
  } while (size >= 1000 && unit < units.length - 1);
  return `${size.toFixed(2)} ${units[unit]}`;
}

export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
