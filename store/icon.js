// Icon concepts for Barometer, drawn as SVG and rendered with Playwright
// (Chromium). `node store/icon.js options` writes docs/design/icon-options.png:
// each concept large, and at 60 px on a light and a dark wallpaper.
// `node store/icon.js` writes the shipped icon files from CHOSEN (Brian picked
// 3, Ridge, on Nov 27, 2026; null would write a plain stand-in tile).
// No letters, no weather symbols, no brand marks.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const CHOSEN = 'ridge';

const ROOT = path.join(__dirname, '..');
const TEAL = '#0B6E66';
const MINT = '#5FD4C4';

function ticks(cx, cy, r, len, n, from, to, color, w, majorEvery = 0, majorLen = 0, majorW = 0) {
  let s = '';
  for (let i = 0; i <= n; i++) {
    const a = ((from + ((to - from) * i) / n - 90) * Math.PI) / 180;
    const major = majorEvery && i % majorEvery === 0;
    const l = major ? majorLen : len;
    const x1 = cx + r * Math.cos(a);
    const y1 = cy + r * Math.sin(a);
    const x2 = cx + (r - l) * Math.cos(a);
    const y2 = cy + (r - l) * Math.sin(a);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${major ? majorW : w}" stroke-linecap="round"/>`;
  }
  return s;
}

function hand(cx, cy, deg, len, tail, width, color) {
  const a = ((deg - 90) * Math.PI) / 180;
  const p = (d, r) => [cx + r * Math.cos(((d - 90) * Math.PI) / 180), cy + r * Math.sin(((d - 90) * Math.PI) / 180)];
  const tip = [cx + len * Math.cos(a), cy + len * Math.sin(a)];
  const back = p(deg + 180, tail);
  const l = p(deg - 90, width);
  const r = p(deg + 90, width);
  return `<path d="M${tip} L${l} L${back} L${r} Z" fill="${color}"/>`;
}

const CONCEPTS = {
  // 1. Bulkhead: the app's own dial. A pale enamel face in a graphite bezel, fine graduations, the teal hand and the set hand.
  bulkhead: () => `
    <rect width="1024" height="1024" fill="#1F272C"/>
    <circle cx="512" cy="512" r="400" fill="#FBFBF8"/>
    <circle cx="512" cy="512" r="400" fill="none" stroke="#C9D0D3" stroke-opacity=".5" stroke-width="6"/>
    ${ticks(512, 512, 352, 34, 40, -135, 135, '#4A5258', 7, 5, 78, 18)}
    ${hand(512, 512, -70, 300, 0, 4, '#757E84')}
    ${hand(512, 512, 38, 330, 96, 26, TEAL)}
    <circle cx="512" cy="512" r="40" fill="#101418"/><circle cx="512" cy="512" r="15" fill="#FBFBF8"/>`,
  // 2. Set hand: no face, a bold arc of graduations on deep teal, a white hand and the thin set hand, so the trend is the mark.
  sethand: () => `
    <rect width="1024" height="1024" fill="#0E3B3A"/>
    ${ticks(512, 560, 380, 0, 30, -120, 120, '#FFFFFF', 0, 3, 92, 30)}
    <path d="M${512 + 300 * Math.cos((-210 * Math.PI) / 180)} ${560 + 300 * Math.sin((-210 * Math.PI) / 180)} A300 300 0 1 1 ${512 + 300 * Math.cos((30 * Math.PI) / 180)} ${560 + 300 * Math.sin((30 * Math.PI) / 180)}" fill="none" stroke="${MINT}" stroke-width="16" stroke-linecap="round"/>
    ${hand(512, 560, -55, 270, 0, 7, MINT)}
    ${hand(512, 560, 30, 280, 70, 30, '#FFFFFF')}
    <circle cx="512" cy="560" r="42" fill="#FFFFFF"/><circle cx="512" cy="560" r="16" fill="#0E3B3A"/>`,
  // 3. Ridge: a dial arc over a mountain ridge, for the barometer and the altimeter in one, on fog.
  ridge: () => `
    <rect width="1024" height="1024" fill="#ECEEEA"/>
    <path d="M70 840 L330 520 L470 690 L640 450 L960 840 Z" fill="#1F272C"/>
    <path d="M640 450 L700 530 L662 520 L640 560 L610 520 L578 535 Z" fill="#FBFBF8"/>
    ${ticks(512, 600, 420, 30, 24, -110, 110, '#1F272C', 9, 4, 70, 18)}
    ${hand(512, 600, 20, 380, 0, 22, TEAL)}
    <circle cx="512" cy="600" r="34" fill="${TEAL}"/>`,
};

const svg = (inner, size = 1024, round = 0) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><defs><clipPath id="c"><rect width="1024" height="1024" rx="${round}"/></clipPath></defs><g clip-path="url(#c)">${inner}</g></svg>`;

async function shoot(page, html, w, h, out, transparent = false) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : '#FFFFFF'}">${html}</body></html>`);
  await page.screenshot({ path: out, omitBackground: transparent });
}

async function options(page) {
  const names = Object.keys(CONCEPTS);
  const title = { bulkhead: '1. Bulkhead', sethand: '2. Set hand', ridge: '3. Ridge' };
  const cell = (n) => `
    <div style="width:420px;display:flex;flex-direction:column;align-items:center;gap:18px;font:600 22px -apple-system,Helvetica,Arial">
      ${svg(CONCEPTS[n](), 360, 230)}
      <div>${title[n]}</div>
      <div style="display:flex;gap:16px">
        <div style="background:#DDE3E8;padding:22px;border-radius:18px">${svg(CONCEPTS[n](), 60, 230)}</div>
        <div style="background:#1C1F24;padding:22px;border-radius:18px">${svg(CONCEPTS[n](), 60, 230)}</div>
      </div>
    </div>`;
  const html = `<div style="display:flex;gap:20px;padding:40px;background:#F6F7F5;width:1340px">${names.map(cell).join('')}</div>`;
  await shoot(page, html, 1420, 640, path.join(ROOT, 'docs/design/icon-options.png'));
}

async function shipped(page) {
  const inner = CHOSEN ? CONCEPTS[CHOSEN]() : `<rect width="1024" height="1024" fill="#0E3B3A"/>`;
  await shoot(page, svg(inner, 1024, 0), 1024, 1024, path.join(ROOT, 'assets/icon.png'));
  await shoot(page, svg(inner, 1024, 0), 1024, 1024, path.join(ROOT, 'assets/android-icon-foreground.png'));
  await shoot(page, `<div style="width:512px;height:512px;background:#ECEEEA;display:flex;align-items:center;justify-content:center">${svg(inner, 320, 72)}</div>`, 512, 512, path.join(ROOT, 'assets/splash-icon.png'));
  await shoot(page, `<div style="width:512px;height:512px;background:#0A0F12;display:flex;align-items:center;justify-content:center">${svg(inner, 320, 72)}</div>`, 512, 512, path.join(ROOT, 'assets/splash-icon-dark.png'));
  await shoot(page, svg(inner, 48, 0), 48, 48, path.join(ROOT, 'assets/favicon.png'));
  await shoot(page, svg(inner, 180, 0), 180, 180, path.join(ROOT, 'docs/apple-touch-icon.png'));
  // The website logo: rounded, with clear corners so it sits on the light and the dark page.
  await shoot(page, svg(inner, 512, 112), 512, 512, path.join(ROOT, 'docs/icon-512.png'), true);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  if (process.argv[2] === 'options') await options(page);
  else await shipped(page);
  await browser.close();
})();
