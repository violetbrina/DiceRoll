/* eslint-disable no-console */
/**
 * Build-time dice-image generator.
 *
 * Reads the 8 hand-authored outline images in assets/dice/{type}.png and burns
 * each die value onto the correct front face, producing one composite PNG per
 * (type, value) in assets/dice/generated/{type}-{value}.png.
 *
 * These composites are used UNCHANGED for both the on-screen preview and the
 * note insertion, so "insert produces the same image as the preview" is true by
 * construction.
 *
 * Also emits src/diceImages.ts: a static require() map RN's bundler can resolve.
 *
 * Run: node scripts/generateDice.js   (or: npm run gen:dice)
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'assets', 'dice');
const OUT_DIR = path.join(SRC_DIR, 'generated');
const MAP_FILE = path.join(ROOT, 'src', 'diceImages.ts');

// Output resolution: 2x the 150px insert size, crisp on e-ink, still tiny in b&w.
const OUT = 300;

// All dice are normalised to the SAME line-art height (TARGET_H_FRAC of the
// canvas) and vertically centred, so a row of dice lines up exactly. The number
// text scales with the die but is otherwise sized to fit its face box.
const TARGET_H_FRAC = 0.84;
const TARGET_H = TARGET_H_FRAC * OUT;

/**
 * Per-die layout, expressed against the ORIGINAL source canvas (1:1 fractions).
 *  source     : which outline PNG to draw (d100 reuses the d10 outline).
 *  values     : how many faces (1..N).
 *  cx,cy      : centre of the number, as a fraction of the source canvas.
 *  boxW,boxH  : the face's usable width/height, as fractions of the source
 *               canvas. Font is shrunk to fit BOTH, so 1- and 3-digit values
 *               (e.g. d100's "100") all stay inside the face.
 * These are transformed by the same scale+centre that normalises the die, so
 * the number rides along with the art exactly as before.
 */
const DICE = {
  d2: { source: 'd2', values: 2, cx: 0.5, cy: 0.5, boxW: 0.5, boxH: 0.4 },
  d4: { source: 'd4', values: 4, cx: 0.47, cy: 0.55, boxW: 0.34, boxH: 0.22 },
  d6: { source: 'd6', values: 6, cx: 0.45, cy: 0.53, boxW: 0.32, boxH: 0.3 },
  d8: { source: 'd8', values: 8, cx: 0.5, cy: 0.45, boxW: 0.38, boxH: 0.24 },
  d10: { source: 'd10', values: 10, cx: 0.5, cy: 0.47, boxW: 0.28, boxH: 0.17 },
  d12: { source: 'd12', values: 12, cx: 0.5, cy: 0.46, boxW: 0.3, boxH: 0.18 },
  d20: { source: 'd20', values: 20, cx: 0.5, cy: 0.49, boxW: 0.22, boxH: 0.14 },
  d100: { source: 'd10', values: 100, cx: 0.5, cy: 0.47, boxW: 0.38, boxH: 0.16 },
};

// Circle placeholder for any die type without dedicated art (e.g. d7). The
// rolled value can be 1..100 (a dN where N<=100), so generate dX-1..dX-100.
const CIRCLE = { source: 'dX', values: 100, cx: 0.5, cy: 0.5, boxW: 0.5, boxH: 0.4 };

// Approximate width of one bold-sans glyph relative to font size.
const GLYPH_RATIO = 0.6;

function numberSvg(value, x, y, fontSize) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT}" height="${OUT}">` +
      `<text x="${Math.round(x)}" y="${Math.round(y)}" ` +
      `font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(fontSize)}" ` +
      `font-weight="bold" text-anchor="middle" dominant-baseline="central" ` +
      `fill="#000">${value}</text>` +
      `</svg>`,
  );
}

// Bounding box of the dark line-art within a source, plus its centre, in source
// pixels. Used to normalise every die to a common height.
async function darkBox(srcPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;
  return { S: W, sw, sh, cx: minX + sw / 2, cy: minY + sh / 2 };
}

// Turn a "black line-art on white" source into a sticker stencil:
//   - outside the outer outline  -> fully transparent
//   - faces sealed inside it      -> pure white, opaque
//   - lines / edges               -> pure black, opaque (anti-aliased)
// The inside/outside split is found by flood-filling the white background in
// from the image border; white sealed by the outline is never reached.
async function buildStencil(srcPath, S) {
  const { data } = await sharp(srcPath)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true }); // 1 channel, length S*S

  // Levels: pull lines to pure black and faces/background to pure white, while
  // keeping anti-aliased greys in between (lo..hi -> 0..255).
  const LO = 40;
  const HI = 215;
  const slope = 255 / (HI - LO);
  const lev = new Uint8Array(S * S);
  for (let i = 0; i < lev.length; i++) {
    const v = (data[i] - LO) * slope;
    lev[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }

  // Flood fill the "outside" from every border pixel across near-white pixels.
  const FILL = 200; // a pixel is background-fillable when leveled value > FILL
  const outside = new Uint8Array(S * S);
  const stack = [];
  const seed = (x, y) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const idx = y * S + x;
    if (outside[idx] || lev[idx] <= FILL) return;
    outside[idx] = 1;
    stack.push(idx);
  };
  for (let x = 0; x < S; x++) {
    seed(x, 0);
    seed(x, S - 1);
  }
  for (let y = 0; y < S; y++) {
    seed(0, y);
    seed(S - 1, y);
  }
  while (stack.length) {
    const idx = stack.pop();
    const x = idx % S;
    const y = (idx - x) / S;
    seed(x + 1, y);
    seed(x - 1, y);
    seed(x, y + 1);
    seed(x, y - 1);
  }

  const out = Buffer.alloc(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    const g = lev[i];
    const o = i * 4;
    out[o] = g;
    out[o + 1] = g;
    out[o + 2] = g;
    out[o + 3] = outside[i] ? 0 : 255; // transparent outside, opaque die
  }
  return out;
}

async function generate() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Per-source: the dark-box geometry and a height-normalised, centred base
  // image (the die scaled so its line-art height == TARGET_H, centred in OUT).
  const sourceCache = {};
  async function loadSource(source) {
    if (!sourceCache[source]) {
      const srcPath = path.join(SRC_DIR, `${source}.png`);
      if (!fs.existsSync(srcPath)) {
        throw new Error(`Missing source outline: ${srcPath}`);
      }
      const box = await darkBox(srcPath);
      const scale = TARGET_H / box.sh; // scale that makes the line-art height uniform
      const scaledSize = Math.round(box.S * scale);
      // Window over the scaled source, centred on the dark-box centre, so every
      // die ends up the same height and vertically centred in OUT.
      const left = Math.round(box.cx * scale - OUT / 2);
      const top = Math.round(box.cy * scale - OUT / 2);
      const PAD = OUT; // guard so extract never runs out of bounds
      // Build the transparent-background sticker stencil, then scale + centre it.
      // Two passes: sharp reorders resize/extract within one pipeline, so
      // materialise the scaled+padded image first, then extract the window.
      const stencil = await buildStencil(srcPath, box.S);
      const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
      const padded = await sharp(stencil, {
        raw: { width: box.S, height: box.S, channels: 4 },
      })
        .resize(scaledSize, scaledSize)
        .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: transparent })
        .png()
        .toBuffer();
      const baseBuf = await sharp(padded)
        .extract({ left: left + PAD, top: top + PAD, width: OUT, height: OUT })
        .png()
        .toBuffer();
      sourceCache[source] = { box, scale, baseBuf };
    }
    return sourceCache[source];
  }

  let count = 0;

  // Composite every value of a config onto its normalised base.
  async function renderConfig(type, cfg) {
    const { box, scale, baseBuf } = await loadSource(cfg.source);
    const S = box.S;
    const valueLines = [];
    for (let value = 1; value <= cfg.values; value++) {
      // Apply the same scale+centre transform used for the art to the number
      // anchor and face box, so placement matches the original tuning exactly.
      const ncx = OUT / 2 + scale * (cfg.cx * S - box.cx);
      const ncy = OUT / 2 + scale * (cfg.cy * S - box.cy);
      const bw = cfg.boxW * S * scale;
      const bh = cfg.boxH * S * scale;
      const nchars = String(value).length;
      const fontSize = Math.min(bw / (GLYPH_RATIO * nchars), bh);

      const outName = `${type}-${value}.png`;
      await sharp(baseBuf)
        .composite([{ input: numberSvg(value, ncx, ncy, fontSize), top: 0, left: 0 }])
        // Transparent background, white faces, black lines/text. Palette with
        // dither:0 keeps files small without speckling the alpha edges.
        .png({ palette: true, colours: 64, dither: 0, effort: 10, compressionLevel: 9 })
        .toFile(path.join(OUT_DIR, outName));
      valueLines.push(
        `    ${value}: require('../assets/dice/generated/${outName}'),`,
      );
      count++;
    }
    return valueLines;
  }

  // Dedicated dice (d2..d100), keyed by side count.
  const mapEntries = [];
  for (const [type, cfg] of Object.entries(DICE)) {
    const sides = Number(type.slice(1));
    const valueLines = await renderConfig(type, cfg);
    mapEntries.push(`  ${sides}: {\n${valueLines.join('\n')}\n  },`);
  }

  // Circle placeholders (dX), keyed by rolled value, for any other die type.
  const circleLines = await renderConfig('dX', CIRCLE);

  const header =
    '// AUTO-GENERATED by scripts/generateDice.js — do not edit by hand.\n' +
    '// Run `npm run gen:dice` to regenerate after changing source art or layout.\n' +
    "import { ImageSourcePropType } from 'react-native';\n\n" +
    'type DiceImageMap = Record<number, Record<number, ImageSourcePropType>>;\n' +
    'type CircleImageMap = Record<number, ImageSourcePropType>;\n\n';

  const body =
    '// Dice with dedicated artwork; d100 reuses the d10 outline.\n' +
    'export const DICE_IMAGES: DiceImageMap = {\n' +
    mapEntries.join('\n') +
    '\n};\n\n' +
    '// Circle placeholder by rolled value, used for any die type without art.\n' +
    'export const CIRCLE_IMAGES: CircleImageMap = {\n' +
    circleLines.join('\n') +
    '\n};\n\n' +
    'export function diceImage(sides: number, value: number): ImageSourcePropType | undefined {\n' +
    '  const dedicated = DICE_IMAGES[sides];\n' +
    '  if (dedicated && dedicated[value]) return dedicated[value];\n' +
    '  // Fall back to the circle placeholder for arbitrary die types (e.g. d7).\n' +
    '  return CIRCLE_IMAGES[value];\n' +
    '}\n';

  fs.writeFileSync(MAP_FILE, header + body);

  console.log(`Generated ${count} dice composites in ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`Wrote require map: ${path.relative(ROOT, MAP_FILE)}`);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
