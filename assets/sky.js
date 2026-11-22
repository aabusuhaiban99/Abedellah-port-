/* Starfield with optional warp streaks and floating dust.
   const sky = Sky(canvasElement, { stars: 260, dust: 60 });
   sky.setWarp(0..1)  // 0 = calm drift, 1 = full hyperspace streaks          */
window.Sky = function (canvas, opt = {}) {
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let w = 0, h = 0, dpr = 1, warp = 0, last = performance.now(), visible = true;
  const stars = Array.from({ length: opt.stars ?? 240 }, () => ({
    x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(0.08, 1), tw: rnd(0, 6.3), s: rnd(0.5, 1.4), hue: Math.random() < 0.18
  }));
  const dust = Array.from({ length: opt.dust ?? 0 }, () => ({
    x: rnd(0.2, 0.8), y: rnd(0.55, 1), v: rnd(0.000012, 0.00004), r: rnd(0.6, 1.9), a: rnd(0.25, 0.85), ph: rnd(0, 6.3)
  }));

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener("resize", size);
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; last = performance.now(); });

  function draw(now) {
    requestAnimationFrame(draw);
    if (!visible) return;
    const dt = Math.min(now - last, 50); last = now;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, sc = Math.max(w, h) * 0.55;
    const speed = reduce ? 0 : 0.000012 + warp * 0.0011;
    for (const s of stars) {
      const z0 = s.z;
      s.z -= speed * dt;
      if (s.z < 0.03) { s.z = 1; s.x = rnd(-1, 1); s.y = rnd(-1, 1); continue; }
      const px = cx + (s.x / s.z) * sc, py = cy + (s.y / s.z) * sc;
      if (px < -20 || px > w + 20 || py < -20 || py > h + 20) { if (warp > 0.05) { s.z = 1; } continue; }
      const tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(now * 0.0016 + s.tw);
      const a = Math.min(1, (1.15 - s.z) * tw);
      const r = s.s * (1.2 - s.z);
      ctx.strokeStyle = ctx.fillStyle = s.hue ? `rgba(150,190,255,${a})` : `rgba(238,242,251,${a})`;
      if (warp > 0.04) {
        const zt = Math.min(1, z0 + warp * 0.09);
        const qx = cx + (s.x / zt) * sc, qy = cy + (s.y / zt) * sc;
        ctx.lineWidth = Math.max(0.6, r); ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.35, r), 0, 6.283); ctx.fill();
      }
    }
    for (const d of dust) {
      if (!reduce) { d.y -= d.v * dt; if (d.y < 0.5) { d.y = 1.02; d.x = rnd(0.2, 0.8); } }
      const a = d.a * Math.min(1, (d.y - 0.5) * 4) * (0.6 + 0.4 * Math.sin(now * 0.002 + d.ph));
      ctx.fillStyle = `rgba(160,200,255,${a})`;
      ctx.beginPath(); ctx.arc(d.x * w + Math.sin(now * 0.0005 + d.ph) * 8, d.y * h, d.r, 0, 6.283); ctx.fill();
    }
  }
  requestAnimationFrame(draw);
  return { setWarp(v) { warp = Math.max(0, Math.min(1, v)); }, resize: size };
};
