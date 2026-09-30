// Brand assets for the zhifou.io fork: the "bulb question mark" (灯泡问号) logo.
//
// Every SVG and PNG icon is generated from the geometry below, so the files
// stay consistent. To regenerate after changing it (run from blorp/):
//
//   npm i --prefix /tmp/resvg @resvg/resvg-js
//   NODE_PATH=/tmp/resvg/node_modules node scripts/generate-brand-icons.mjs
//
// (@resvg/resvg-js isn't a project dependency; NODE_PATH points at it.)
//
// The mark comes in three weights, picked by the rendered size:
//   large  (>= 64px): two screw threads on the bulb base
//   medium (33-63px): a single, heavier base bar
//   small  (<= 32px): everything thicker, for favicons
//
// The wordmark "知否" is Noto Serif SC Bold (SIL OFL), converted to outlines so
// the logo doesn't depend on the font being installed.

import { Buffer } from "node:buffer";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// createRequire, unlike import, honours NODE_PATH.
const load = createRequire(import.meta.url);
const { Resvg } = load("@resvg/resvg-js");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const INK = "#0b0b0f";
const PAPER = "#ffffff";
const PINK = "#d40091"; // --light-brand
const PINK_ON_DARK = "#ff1fbb"; // --dark-brand

const BOWL = "M33.09 41.16A18 18 0 1 1 68 35C68 45 50 47 50 55V56";

// Each weight lives in a 0 0 100 100 box. `cy` is the vertical centre of its
// ink, used to centre it on a tile.
const MARKS = {
  large: {
    cy: 51.5,
    body: (ink, dot) =>
      `<path d="${BOWL}" stroke="${ink}" stroke-width="6"/>` +
      `<path d="M42.5 64.5H57.5M45.5 71H54.5" stroke="${ink}" stroke-width="5"/>` +
      `<circle cx="50" cy="83" r="6" fill="${dot}"/>`,
  },
  medium: {
    cy: 49.5,
    body: (ink, dot) =>
      `<path d="${BOWL}" stroke="${ink}" stroke-width="6"/>` +
      `<path d="M43 65H57" stroke="${ink}" stroke-width="6"/>` +
      `<circle cx="50" cy="79" r="6" fill="${dot}"/>`,
  },
  small: {
    cy: 50.25,
    body: (ink, dot) =>
      `<path d="${BOWL}" stroke="${ink}" stroke-width="8"/>` +
      `<path d="M43 66.5H57" stroke="${ink}" stroke-width="7"/>` +
      `<circle cx="50" cy="80.5" r="7" fill="${dot}"/>`,
  },
};

const weightFor = (px) => (px <= 32 ? "small" : px < 64 ? "medium" : "large");

// 知 and 否 in font units (1000/em, y down, baseline at 0). 否 is pre-offset by 1000.
const ZHI =
  "M151 -665H347L409 -740Q409 -740 427.5 -726Q446 -712 472 -692Q498 -672 520 -652Q517 -637 493 -637H127ZM35 -414H376L435 -495Q435 -495 445.5 -486Q456 -477 473 -463Q490 -449 508.5 -432.5Q527 -416 541 -402Q537 -386 514 -386H43ZM222 -665H336V-480Q336 -427 330.5 -367.5Q325 -308 309 -245.5Q293 -183 260.5 -123Q228 -63 173.5 -8Q119 47 38 91L28 81Q92 17 130.5 -53Q169 -123 189 -196Q209 -269 215.5 -341Q222 -413 222 -480ZM140 -847 298 -806Q295 -796 285.5 -790Q276 -784 259 -784Q221 -679 166 -599.5Q111 -520 41 -466L29 -475Q54 -521 76 -581.5Q98 -642 115 -710Q132 -778 140 -847ZM297 -289Q373 -263 418.5 -230Q464 -197 483.5 -162.5Q503 -128 503.5 -99.5Q504 -71 489 -52.5Q474 -34 450.5 -32.5Q427 -31 400 -51Q393 -91 374.5 -132Q356 -173 332.5 -212Q309 -251 287 -283ZM608 -79H865V-50H608ZM810 -714H800L856 -777L968 -688Q963 -681 952.5 -675.5Q942 -670 927 -666V4Q927 8 911 16.5Q895 25 872 32Q849 39 828 39H810ZM542 -714V-765L661 -714H857V-686H657V13Q657 19 644 29.5Q631 40 609 47.5Q587 55 561 55H542Z";
const FOU =
  "M1047 -773H1762L1830 -855Q1830 -855 1842 -846.5Q1854 -838 1873.5 -823.5Q1893 -809 1914.5 -792.5Q1936 -776 1953 -761Q1951 -753 1943.5 -749Q1936 -745 1925 -745H1055ZM1435 -621 1478 -677 1586 -638Q1583 -631 1575.5 -626Q1568 -621 1555 -619V-357Q1555 -353 1540.5 -344.5Q1526 -336 1504 -329Q1482 -322 1457 -322H1435ZM1189 -289V-338L1313 -289H1765V-261H1305V51Q1305 56 1290.5 65Q1276 74 1253 81Q1230 88 1206 88H1189ZM1693 -289H1681L1737 -352L1856 -261Q1851 -254 1839.5 -247.5Q1828 -241 1811 -238V55Q1811 58 1794 64.5Q1777 71 1754 76.5Q1731 82 1712 82H1693ZM1242 -27H1763V1H1242ZM1606 -610Q1706 -597 1784 -569Q1862 -541 1908 -494Q1930 -471 1936.5 -447.5Q1943 -424 1937 -404.5Q1931 -385 1915.5 -375Q1900 -365 1879 -368.5Q1858 -372 1835 -396Q1816 -428 1780.5 -466Q1745 -504 1699.5 -539.5Q1654 -575 1602 -598ZM1465 -764H1634Q1572 -669 1476.5 -587Q1381 -505 1265 -441Q1149 -377 1027 -335L1020 -346Q1091 -384 1159 -433.5Q1227 -483 1286.5 -538Q1346 -593 1392 -650.5Q1438 -708 1465 -764Z";

const svg = (viewBox, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>\n`;

// The bare mark, cropped to its ink.
function markSvg(weight, ink, dot) {
  return svg("27 11 46 80", MARKS[weight].body(ink, dot));
}

// The mark centred on a square tile. `scale` is how much of the tile the
// mark's 100-unit box covers; `radius` rounds the corners (0 = full bleed,
// for platforms that mask the icon themselves).
function tileSvg(weight, { scale, radius }) {
  const { cy, body } = MARKS[weight];
  const g = `<g transform="translate(50 50) scale(${scale}) translate(-50 -${cy})">${body(PAPER, PINK_ON_DARK)}</g>`;
  return svg(
    "0 0 100 100",
    `<rect width="100" height="100" rx="${radius}" fill="${INK}"/>${g}`,
  );
}

// Mark + 知否, laid out as in the design canvas (mark 132, text 64px).
function lockupSvg(ink, dot, text) {
  const mark = `<g transform="scale(1.32)">${MARKS.large.body(ink, dot)}</g>`;
  const word =
    `<g transform="translate(108 92.4) scale(0.064)" fill="${text}">` +
    `<path d="${ZHI}"/><path transform="translate(100 0)" d="${FOU}"/></g>`;
  return svg("34 14 208 108", mark + word);
}

function write(rel, contents) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  console.log("wrote", rel);
}

function render(svgText, width) {
  return new Resvg(svgText, { fitTo: { mode: "width", value: width } })
    .render()
    .asPng();
}

function png(rel, svgText, width) {
  const data = render(svgText, width);
  write(rel, data);
  return { width, height: width, data };
}

// Favicon-style tiles have rounded corners and a larger mark; app icons are
// full bleed with the mark inside the maskable safe zone.
const roundTile = (px) => tileSvg(weightFor(px), { scale: 0.95, radius: 22 });
const appTile = (px) => tileSvg(weightFor(px), { scale: 0.8, radius: 0 });

// PNG-in-ICO: the header plus a directory entry per image, then the PNGs.
function ico(rel, images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ width, height, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(width >= 256 ? 0 : width, e);
    header.writeUInt8(height >= 256 ? 0 : height, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  write(rel, Buffer.concat([header, ...images.map((i) => i.data)]));
}

// --- Vector sources ---
write("assets/brand/zhifou-mark.svg", markSvg("large", INK, PINK));
write(
  "assets/brand/zhifou-mark-dark.svg",
  markSvg("large", PAPER, PINK_ON_DARK),
);
write("assets/brand/zhifou-mark-medium.svg", markSvg("medium", INK, PINK));
write("assets/brand/zhifou-mark-small.svg", markSvg("small", INK, PINK));
write("assets/brand/zhifou-app-icon.svg", appTile(1024));
write("assets/brand/zhifou-favicon.svg", roundTile(32));
write("assets/logo-light.svg", lockupSvg(INK, PINK, INK));
write("assets/logo-dark.svg", lockupSvg(PAPER, PINK_ON_DARK, PAPER));

// --- Web icons (public/ and the PWA manifest's icons/) ---
const fav = (px) => png(`public/favicon-${px}x${px}.png`, roundTile(px), px);
const f16 = fav(16);
const f32 = fav(32);
fav(96);
png("public/favicon-128.png", roundTile(128), 128);
png("public/favicon-196x196.png", roundTile(196), 196);
ico("public/favicon.ico", [
  f16,
  f32,
  { width: 48, height: 48, data: render(roundTile(48), 48) },
]);

for (const px of [57, 60, 72, 76, 114, 120, 144, 152, 180]) {
  png(`public/apple-icon-${px}x${px}.png`, appTile(px), px);
}
png("public/apple-icon.png", appTile(192), 192);
png("public/apple-icon-precomposed.png", appTile(192), 192);
for (const px of [36, 48, 72, 96, 144, 192]) {
  png(`public/android-icon-${px}x${px}.png`, appTile(px), px);
}
for (const px of [70, 144, 150, 310]) {
  png(`public/ms-icon-${px}x${px}.png`, appTile(px), px);
}
png("public/app-icon.png", appTile(1024), 1024);
png("public/logo.png", lockupSvg(INK, PINK, INK), 753);

// The manifest lists these as image/png despite the extension; keep them PNG.
for (const px of [48, 72, 96, 128, 192, 256, 512]) {
  png(`icons/icon-${px}.webp`, appTile(px), px);
}
