/* Draws each screen as a small website on a canvas, for use as a WebGL texture. */
const BONE = "#f4efe6", MIST = "#a99f91";

async function fontDataURL(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = ""; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return "data:font/woff2;base64," + btoa(bin);
}

function loadImage(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

function wrap(ctx, text, maxW) {
  const words = text.split(" "), lines = []; let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildScreenCanvases(screens, categories, opt = {}) {
  const W = opt.width || 1024, H = Math.round(W * 0.5625), k = W / 1024;
  await Promise.all([
    document.fonts.load(`400 ${64 * k}px Instrument`),
    document.fonts.load(`600 ${20 * k}px Hanken`),
    document.fonts.load(`400 ${20 * k}px Hanken`)
  ]).catch(() => {});
  const font = await fontDataURL(opt.fontURL || "assets/fonts/hanken.woff2").catch(() => null);
  const n = screens.length;
  const jobs = screens.map(async (s, i) => {
    const color = categories[s.cat].color;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    // background: warm black with a glow in the category colour
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#110e0b"); bg.addColorStop(1, "#060505");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W * 0.74, H * 0.55, 10, W * 0.74, H * 0.55, W * 0.55);
    glow.addColorStop(0, color + "33"); glow.addColorStop(1, color + "00");
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(255,255,255,0.028)"; g.lineWidth = 1;
    for (let x = 0; x < W; x += 48 * k) { g.beginPath(); g.moveTo(x, 64 * k); g.lineTo(x, H - 64 * k); g.stroke(); }
    for (let y = 64 * k; y < H - 64 * k; y += 48 * k) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // header
    g.fillStyle = color; g.beginPath(); g.arc(40 * k, 32 * k, 6 * k, 0, 7); g.fill();
    g.font = `600 ${20 * k}px Hanken, Arial`; g.textBaseline = "middle"; g.fillText(categories[s.cat].name, 56 * k, 33 * k);
    g.fillStyle = MIST; g.textAlign = "right"; g.font = `500 ${20 * k}px Hanken, Arial`;
    g.fillText(`${String(i + 1).padStart(2, "0")} / ${n}`, W - 40 * k, 33 * k); g.textAlign = "left";
    g.fillStyle = "rgba(255,255,255,0.09)"; g.fillRect(0, 64 * k, W, 1);
    // title and purpose
    let size = 64 * k; g.font = `400 ${size}px Instrument, Georgia`;
    let lines = wrap(g, s.title, 410 * k);
    if (lines.length > 3) { size = 52 * k; g.font = `400 ${size}px Instrument, Georgia`; lines = wrap(g, s.title, 410 * k); }
    g.fillStyle = BONE; g.textBaseline = "alphabetic";
    let y = 150 * k;
    lines.slice(0, 4).forEach(l => { g.fillText(l, 40 * k, y); y += size * 0.98; });
    g.font = `400 ${21 * k}px Hanken, Arial`; g.fillStyle = MIST;
    y += 18 * k;
    const p = wrap(g, s.purpose, 400 * k).slice(0, 4);
    p.forEach(l => { g.fillText(l, 40 * k, y); y += 30 * k; });
    // diagram
    if (window.VIZ) {
      const svg = window.VIZ(s.viz, color, { font, w: 960, h: 540 });
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      try { const im = await loadImage(url); g.drawImage(im, 470 * k, 112 * k, 520 * k, 292.5 * k); } catch (e) {}
      URL.revokeObjectURL(url);
    }
    // footer
    g.fillStyle = "rgba(255,255,255,0.09)"; g.fillRect(40 * k, H - 44 * k, W - 80 * k, 2 * k);
    g.fillStyle = color; g.fillRect(40 * k + (W - 80 * k) * (i / n), H - 44 * k, Math.max(8 * k, (W - 80 * k) / n), 2 * k);
    g.font = `500 ${16 * k}px Hanken, Arial`; g.fillStyle = MIST; g.textBaseline = "middle";
    g.fillText("Abedellah Abusuhaiban", 40 * k, H - 22 * k);
    g.textAlign = "right"; g.fillStyle = BONE; g.fillText("Open screen", W - 40 * k, H - 22 * k);
    return c;
  });
  return Promise.all(jobs);
}
