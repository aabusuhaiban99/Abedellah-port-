/* =====================================================================
   SCREEN DIAGRAMS
   VIZ(type, colour) returns an SVG string (viewBox 320 x 180).
   Lines with class "d" draw themselves in; shapes with class "p" pop in,
   when the parent element gets the class "play".
   ===================================================================== */
(function () {
  const INK = "#eef2fb";
  const DIM = "rgba(238,242,251,.38)";
  const t = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-size="${o.size || 10.5}" text-anchor="${o.a || "middle"}" fill="${o.fill || INK}" font-weight="${o.w || 500}"${o.op ? ` opacity="${o.op}"` : ""}>${s}</text>`;
  const L = (d, c, w = 2, extra = "") =>
    `<path class="d" pathLength="1" d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const R = (x, y, w, h, c, o = {}) =>
    `<rect class="p" x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 6}" fill="${o.fill || c}" fill-opacity="${o.fo ?? 0.16}" stroke="${o.stroke || c}" stroke-opacity="${o.so ?? 0.9}" stroke-width="${o.sw ?? 1.4}"/>`;
  const C = (x, y, r, c, o = {}) =>
    `<circle class="p" cx="${x}" cy="${y}" r="${r}" fill="${o.fill || c}" fill-opacity="${o.fo ?? 0.22}" stroke="${o.stroke || c}" stroke-width="${o.sw ?? 1.4}" stroke-opacity="${o.so ?? 0.95}"/>`;
  const box = (x, y, w, h, c, s, o = {}) => R(x, y, w, h, c, o) + t(x + w / 2, y + h / 2 + 3.6, s, o);
  const arrowHead = (x, y, ang, c) => {
    const a = (ang * Math.PI) / 180, s = 6;
    const p1 = [x - s * Math.cos(a - 0.5), y - s * Math.sin(a - 0.5)];
    const p2 = [x - s * Math.cos(a + 0.5), y - s * Math.sin(a + 0.5)];
    return `<path class="p" d="M${x} ${y}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}Z" fill="${c}"/>`;
  };
  const arrow = (x1, y1, x2, y2, c, w = 1.8) =>
    L(`M${x1} ${y1}L${x2} ${y2}`, c, w) + arrowHead(x2, y2, (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI, c);

  const V = {
    fiveforces: c =>
      arrow(160, 46, 160, 66, c) + arrow(160, 134, 160, 114, c) + arrow(98, 90, 118, 90, c) + arrow(222, 90, 202, 90, c) +
      box(120, 68, 80, 44, c, "Rivalry", { fo: 0.35, w: 700 }) +
      box(115, 12, 90, 32, c, "New entrants") + box(115, 136, 90, 32, c, "Substitutes") +
      box(12, 74, 84, 32, c, "Suppliers") + box(224, 74, 84, 32, c, "Buyers"),

    swot: c => {
      let s = "";
      [["S", 14, 14, 0.4], ["W", 86, 14, 0.18], ["O", 14, 92, 0.28], ["T", 86, 92, 0.1]].forEach(([l, x, y, f]) =>
        s += R(x, y, 68, 72, c, { fo: f }) + t(x + 34, y + 46, l, { size: 30, w: 700 }));
      "PESTLE".split("").forEach((l, i) => {
        const x = 176 + (i % 3) * 46, y = 30 + Math.floor(i / 3) * 62;
        s += R(x, y, 40, 52, c, { fo: 0.1, so: 0.6 }) + t(x + 20, y + 33, l, { size: 20, w: 700, fill: c });
      });
      return s + t(244, 20, "outside", { size: 9, fill: DIM }) + t(82, 176, "inside", { size: 9, fill: DIM });
    },

    bcg: c =>
      L("M34 14V160H306", DIM, 1.4) + L("M170 14V160M34 87H306", DIM, 1, 'stroke-dasharray="3 4"') +
      t(102, 34, "Question marks", { fill: DIM, size: 9.5 }) + t(238, 34, "Stars", { fill: DIM, size: 9.5 }) +
      t(102, 150, "Dogs", { fill: DIM, size: 9.5 }) + t(238, 150, "Cash cows", { fill: DIM, size: 9.5 }) +
      C(232, 58, 18, c, { fo: 0.4 }) + C(268, 64, 10, c) + C(92, 62, 12, c, { fo: 0.15 }) + C(126, 70, 7, c) +
      C(250, 118, 24, c, { fo: 0.5 }) + C(86, 120, 9, c, { fo: 0.1 }) +
      t(18, 90, "growth", { size: 9, fill: DIM, a: "middle" }).replace("<text", '<text transform="rotate(-90 18 90)"') +
      t(170, 176, "relative market share", { size: 9, fill: DIM }),

    nine: c => {
      let s = "";
      for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
        const v = 2 - r + (2 - k), f = [0.04, 0.1, 0.2, 0.32, 0.46][v];
        s += R(58 + k * 72, 12 + r * 50, 68, 46, c, { fo: f, so: 0.5, rx: 4 });
      }
      return s + C(96, 34, 14, c, { fo: 0.6 }) + C(160, 92, 10, c, { fo: 0.5 }) + C(240, 136, 16, c, { fo: 0.4 }) + C(176, 40, 8, c, { fo: 0.6 }) +
        t(130, 176, "competitive strength", { size: 9, fill: DIM }) +
        t(30, 88, "attractiveness", { size: 9, fill: DIM }).replace("<text", '<text transform="rotate(-90 30 88)"');
    },

    ansoff: c =>
      box(60, 14, 118, 70, c, "Penetration", { fo: 0.4 }) + box(184, 14, 118, 70, c, "Product dev.", { fo: 0.24 }) +
      box(60, 90, 118, 70, c, "Market dev.", { fo: 0.24 }) + box(184, 90, 118, 70, c, "Diversification", { fo: 0.08 }) +
      t(119, 176, "existing products", { size: 9, fill: DIM }) + t(243, 176, "new products", { size: 9, fill: DIM }) +
      t(30, 50, "existing", { size: 9, fill: DIM }).replace("<text", '<text transform="rotate(-90 30 50)"') +
      t(30, 126, "new markets", { size: 9, fill: DIM }).replace("<text", '<text transform="rotate(-90 30 126)"') +
      arrow(80, 74, 286, 104, c, 1.4),

    valuechain: c => {
      let s = "";
      ["Infrastructure", "HR", "Technology", "Procurement"].forEach((l, i) =>
        s += R(14, 12 + i * 22, 236, 18, c, { fo: 0.1, so: 0.5, rx: 3 }) + t(22, 24.5 + i * 22, l, { a: "start", size: 9.5, fill: DIM }));
      ["Inbound", "Operations", "Outbound", "Marketing", "Service"].forEach((l, i) =>
        s += R(14 + i * 47.6, 104, 44, 60, c, { fo: 0.3, rx: 3 }) + t(36 + i * 47.6, 138, l, { size: 8.4 }));
      return s + `<path class="p" d="M254 12H276L306 88L276 164H254Z" fill="${c}" fill-opacity=".55"/>` + t(280, 92, "Margin", { size: 10, w: 700 }).replace("<text", '<text transform="rotate(90 280 88)"');
    },

    blueocean: c => {
      const xs = [40, 92, 144, 196, 248, 296];
      const red = [60, 52, 66, 58, 120, 130], blue = [150, 140, 40, 120, 30, 24];
      let s = L("M24 160H306", DIM, 1.2);
      xs.forEach(x => s += L(`M${x} 160V165`, DIM, 1));
      s += L("M" + xs.map((x, i) => `${x} ${red[i]}`).join("L"), DIM, 2, 'stroke-dasharray="4 4"');
      s += L("M" + xs.map((x, i) => `${x} ${blue[i]}`).join("L"), c, 3);
      xs.forEach((x, i) => s += C(x, blue[i], 4, c, { fo: 1 }));
      return s + t(300, 136, "industry", { a: "end", size: 9, fill: DIM }) + t(300, 18, "new value curve", { a: "end", size: 9.5, fill: c, w: 700 });
    },

    threecs: c =>
      C(160, 66, 46, c, { fo: 0.14 }) + C(124, 118, 46, c, { fo: 0.14 }) + C(196, 118, 46, c, { fo: 0.14 }) +
      t(160, 52, "Company") + t(110, 140, "Customers") + t(212, 140, "Competitors") +
      C(160, 102, 9, c, { fo: 1 }) + t(160, 178, "strategy sits where the three meet", { size: 9, fill: DIM }),

    mece: c => {
      const w = [0.38, 0.27, 0.2, 0.15]; let x = 20, s = "";
      w.forEach((f, i) => { const ww = 280 * f - 4; s += box(x, 42, ww, 84, c, ["A", "B", "C", "D"][i], { fo: 0.42 - i * 0.08, size: 18, w: 700 }); x += 280 * f; });
      return s + L("M20 140V148H298V140", DIM, 1.2) + t(160, 164, "100%, no overlaps, no gaps", { size: 10, fill: DIM }) +
        t(160, 26, "one split logic", { size: 10, fill: DIM });
    },

    issuetree: c => {
      let s = box(10, 72, 70, 36, c, "Hypothesis", { fo: 0.45, size: 9.5, w: 700 });
      [30, 90, 150].forEach((y, i) => {
        s += L(`M80 90C100 90 100 ${y} 120 ${y}`, c, 1.6) + box(120, y - 14, 74, 28, c, ["Market?", "Cost?", "Capability?"][i], { fo: 0.24, size: 9.5 });
        [-14, 14].forEach((d, k) => s += L(`M194 ${y}C210 ${y} 210 ${y + d} 226 ${y + d}`, c, 1.2) +
          R(226, y + d - 9, 84, 18, c, { fo: k ? 0.06 : 0.2, rx: 9, so: 0.6 }) + t(268, y + d + 3.4, k ? "kill" : "keep", { size: 9, fill: k ? DIM : INK }));
      });
      return s;
    },

    pyramid: c =>
      `<path class="p" d="M160 14L210 64H110Z" fill="${c}" fill-opacity=".6"/>` + t(160, 54, "Answer", { size: 10.5, w: 700 }) +
      `<path class="p" d="M106 70H214L254 112H66Z" fill="${c}" fill-opacity=".3"/>` + t(160, 96, "Three arguments", { size: 10 }) +
      `<path class="p" d="M60 118H260L302 164H18Z" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-opacity=".5"/>` + t(160, 146, "Data and evidence", { size: 10, fill: DIM }),

    scqa: c => {
      let s = L("M46 80H274", DIM, 1.4);
      [["S", "Situation"], ["C", "Complication"], ["Q", "Question"], ["A", "Answer"]].forEach(([l, w], i) => {
        const x = 46 + i * 76;
        s += C(x, 80, 24, c, { fo: 0.12 + i * 0.14 }) + t(x, 87, l, { size: 18, w: 700 }) + t(x, 126, w, { size: 9.5, fill: i === 3 ? INK : DIM });
      });
      return s;
    },

    pareto: c => {
      const v = [48, 28, 12, 6, 3, 1.6, 1, 0.4]; let cum = 0, s = L("M24 160H300", DIM, 1.2), pts = [];
      v.forEach((h, i) => {
        const x = 30 + i * 34, hh = h * 2.7;
        s += `<rect class="p" x="${x}" y="${160 - hh}" width="26" height="${hh}" rx="3" fill="${c}" fill-opacity="${i < 2 ? 0.85 : 0.28}"/>`;
        cum += h; pts.push(`${x + 13} ${160 - cum * 1.4}`);
      });
      return s + L("M24 48H300", DIM, 1, 'stroke-dasharray="3 4"') + t(298, 42, "80%", { a: "end", size: 9.5, fill: DIM }) + L("M" + pts.join("L"), INK, 2);
    },

    fishbone: c => {
      let s = L("M18 90H252", c, 2.4) + box(252, 72, 58, 36, c, "Problem", { fo: 0.5, size: 10, w: 700 });
      ["People", "Process", "Systems"].forEach((l, i) => { const x = 70 + i * 64; s += L(`M${x - 34} 22L${x} 90`, c, 1.4) + t(x - 34, 16, l, { size: 9, fill: DIM }); });
      ["Materials", "Methods", "Environment"].forEach((l, i) => { const x = 70 + i * 64; s += L(`M${x - 34} 158L${x} 90`, c, 1.4) + t(x - 34, 172, l, { size: 9, fill: DIM }); });
      return s + t(281, 128, "why \u00d75", { size: 9.5, fill: c, w: 700 });
    },

    sevens: c => {
      const lab = ["Strategy", "Structure", "Systems", "Style", "Staff", "Skills"], pts = [];
      lab.forEach((l, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; pts.push([160 + Math.cos(a) * 112, 90 + Math.sin(a) * 66]); });
      let s = "";
      pts.forEach((p, i) => pts.forEach((q, k) => { if (k > i) s += L(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`, DIM, 0.8); }));
      pts.forEach(p => s += L(`M160 90L${p[0].toFixed(1)} ${p[1].toFixed(1)}`, c, 1.2));
      pts.forEach((p, i) => s += C(p[0], p[1], 19, c, { fo: i < 3 ? 0.4 : 0.15 }) + t(p[0], p[1] + 3.4, lab[i], { size: 8.4 }));
      return s + C(160, 90, 26, c, { fo: 0.7 }) + t(160, 87, "Shared", { size: 8.6, w: 700 }) + t(160, 97, "values", { size: 8.6, w: 700 });
    },

    kotter: c => {
      let s = "";
      for (let i = 0; i < 8; i++) {
        const x = 14 + i * 37, h = 18 + i * 18;
        s += `<rect class="p" x="${x}" y="${166 - h}" width="33" height="${h}" rx="3" fill="${c}" fill-opacity="${0.1 + i * 0.09}" stroke="${c}" stroke-opacity=".7"/>` + t(x + 16.5, 160, i + 1, { size: 11, w: 700 });
      }
      return s + t(18, 24, "urgency", { a: "start", size: 9.5, fill: DIM }) + t(306, 18, "anchor in culture", { a: "end", size: 9.5, fill: c, w: 700 });
    },

    raci: c => {
      const g = ["RA·CI", "CRAI", "IC·RA", "ACIR"].map(r => r.replace("·", "")), heads = ["PM", "Lead", "Client", "Team"];
      let s = "";
      heads.forEach((h, k) => s += t(126 + k * 48, 22, h, { size: 9.5, fill: DIM }));
      ["Scope", "Migration", "Config", "Go-live"].forEach((r, i) => {
        s += t(18, 52 + i * 34, r, { a: "start", size: 10, fill: DIM });
        g[i].split("").forEach((l, k) => s += box(104 + k * 48, 34 + i * 34, 44, 28, c, l, { fo: l === "A" ? 0.65 : l === "R" ? 0.35 : 0.08, size: 12, w: 700, rx: 4 }));
      });
      return s;
    },

    okr: c => {
      let s = box(14, 14, 160, 30, c, "Objective", { fo: 0.5, w: 700 });
      [0.82, 0.55, 0.3].forEach((p, i) => s += t(16, 70 + i * 34, "Key result " + (i + 1), { a: "start", size: 9.5, fill: DIM }) +
        R(16, 76 + i * 34, 158, 8, c, { fo: 0.08, so: 0.3, rx: 4 }) + `<rect class="p" x="16" y="${76 + i * 34}" width="${158 * p}" height="8" rx="4" fill="${c}"/>`);
      ["Financial", "Customer", "Process", "Learning"].forEach((l, i) => s += box(192 + (i % 2) * 60, 30 + Math.floor(i / 2) * 64, 56, 58, c, l, { fo: 0.12 + i * 0.07, size: 8.6 }));
      return s;
    },

    lean: c => {
      let d = "M20 160", s = "";
      for (let x = 20; x <= 300; x += 4) { const z = (x - 160) / 42; d += `L${x} ${(160 - 124 * Math.exp(-z * z / 2)).toFixed(1)}`; }
      s += `<path class="p" d="${d}L300 160Z" fill="${c}" fill-opacity=".18"/>` + L(d, c, 2.4);
      [-3, -2, -1, 1, 2, 3].forEach(k => s += L(`M${160 + k * 42} 40V160`, DIM, 0.8, 'stroke-dasharray="2 4"') + t(160 + k * 42, 174, (k > 0 ? "+" : "\u2212") + Math.abs(k) + "\u03c3", { size: 8.6, fill: DIM }));
      return s + t(160, 24, "less variation, fewer defects", { size: 9.5, fill: c, w: 700 });
    },

    kanban: c => {
      let s = "";
      [["To do", 3], ["Doing", 2], ["Done", 4]].forEach(([h, n], k) => {
        const x = 14 + k * 102;
        s += R(x, 12, 94, 156, c, { fo: 0.04, so: 0.35 }) + t(x + 10, 30, h, { a: "start", size: 10, w: 700, fill: k === 1 ? c : INK });
        for (let i = 0; i < n; i++) s += R(x + 8, 40 + i * 30, 78, 24, c, { fo: k === 2 ? 0.45 : k === 1 ? 0.3 : 0.12, rx: 4 });
      });
      return s + arrow(98, 90, 112, 90, DIM, 1.2) + arrow(200, 90, 214, 90, DIM, 1.2);
    },

    eisenhower: c =>
      box(56, 14, 120, 72, c, "Do", { fo: 0.6, size: 13, w: 700 }) + box(182, 14, 120, 72, c, "Plan", { fo: 0.32, size: 13, w: 700 }) +
      box(56, 92, 120, 72, c, "Delegate", { fo: 0.16, size: 13, w: 700 }) + box(182, 92, 120, 72, c, "Drop", { fo: 0.05, size: 13, w: 700, fill: c }) +
      t(116, 178, "urgent", { size: 9, fill: DIM }) + t(242, 178, "not urgent", { size: 9, fill: DIM }) +
      t(30, 50, "important", { size: 9, fill: DIM }).replace("<text", '<text transform="rotate(-90 30 50)"') +
      t(30, 128, "not important", { size: 9, fill: DIM }).replace("<text", '<text transform="rotate(-90 30 128)"'),

    subscription: c => {
      let s = L("M18 160H304", DIM, 1.2), pts = [];
      for (let i = 0; i < 12; i++) {
        const h = 20 + i * 10, x = 22 + i * 23.5;
        s += `<rect class="p" x="${x}" y="${160 - h}" width="17" height="${h}" rx="3" fill="${c}" fill-opacity="${0.2 + i * 0.05}"/>`;
        pts.push(`${x + 8.5} ${160 - h - 8}`);
      }
      return s + L("M" + pts.join("L"), INK, 1.6) + t(22, 22, "recurring revenue, every month", { a: "start", size: 10, fill: DIM });
    },

    platform: c => {
      let s = "";
      const l = [30, 62, 94, 126, 158].map(y => [34, y - 6]), r = [30, 62, 94, 126, 158].map(y => [286, y - 6]);
      l.concat(r).forEach(p => s += L(`M${p[0]} ${p[1]}L160 90`, DIM, 1));
      l.forEach(p => s += C(p[0], p[1], 9, c, { fo: 0.25 }));
      r.forEach(p => s += C(p[0], p[1], 9, c, { fo: 0.55 }));
      return s + C(160, 90, 32, c, { fo: 0.65 }) + t(160, 94, "Platform", { size: 10.5, w: 700 }) +
        t(34, 176, "buyers", { size: 9, fill: DIM }) + t(286, 176, "sellers", { size: 9, fill: DIM }) + t(160, 140, "fee per transaction", { size: 9, fill: c });
    },

    razor: c => {
      let s = box(18, 46, 104, 88, c, "Core device", { fo: 0.18, w: 700 }) + t(70, 150, "low margin", { size: 9, fill: DIM });
      for (let i = 0; i < 9; i++) {
        const x = 168 + (i % 3) * 46, y = 30 + Math.floor(i / 3) * 44;
        s += R(x, y, 36, 32, c, { fo: 0.6, rx: 5 });
      }
      return s + arrow(126, 90, 160, 90, c) + t(234, 172, "high-margin refills, again and again", { size: 9, fill: c });
    },

    freemium: c =>
      `<path class="p" d="M20 20H300L236 76H84Z" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-opacity=".6"/>` + t(160, 50, "Free users", { size: 11 }) +
      `<path class="p" d="M88 82H232L200 118H120Z" fill="${c}" fill-opacity=".32" stroke="${c}"/>` + t(160, 104, "Plus", { size: 10.5 }) +
      `<path class="p" d="M124 124H196L176 160H144Z" fill="${c}" fill-opacity=".8"/>` + t(160, 146, "Pro", { size: 10.5, w: 700 }),

    franchise: c => {
      let s = "";
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, x = 160 + Math.cos(a) * 124, y = 90 + Math.sin(a) * 66;
        s += L(`M160 90L${x.toFixed(1)} ${y.toFixed(1)}`, c, 1.2) + R(x - 12, y - 10, 24, 20, c, { fo: 0.35, rx: 4 });
      }
      return s + C(160, 90, 30, c, { fo: 0.75 }) + t(160, 94, "Brand", { size: 11, w: 700 });
    },

    d2c: c =>
      box(12, 70, 82, 40, c, "Brand", { fo: 0.55, w: 700 }) + box(119, 70, 82, 40, c, "Wholesaler", { fo: 0.04, fill: DIM, stroke: DIM }) +
      box(226, 70, 82, 40, c, "Customer", { fo: 0.3, w: 700 }) +
      L("M110 64L210 116M210 64L110 116", DIM, 1.6) +
      L("M54 66C80 8 240 8 266 66", c, 2.6) + arrowHead(266, 66, 66, c) + t(160, 15, "direct, full margin", { size: 9.5, fill: c, w: 700 }) +
      L("M54 116C80 166 240 166 266 116", c, 1.4, 'stroke-dasharray="3 4"') + t(160, 170, "online and own stores", { size: 9, fill: DIM }),

    usage: c => {
      const v = [12, 20, 16, 34, 30, 48, 62, 54, 80, 96, 88, 118];
      let d = "M20 160", s = L("M18 160H304", DIM, 1.2);
      v.forEach((h, i) => { const x = 20 + i * 24; d += `V${160 - h}H${x + 24}`; });
      return s + `<path class="p" d="${d}V160Z" fill="${c}" fill-opacity=".18"/>` + L(d, c, 2.2) + t(24, 24, "billed per unit used", { a: "start", size: 10, fill: DIM });
    },

    b2b: c => {
      let s = "";
      ["Year 1", "Year 2", "Year 3"].forEach((y, i) => s += box(14 + i * 100, 40, 94, 48, c, y, { fo: 0.18 + i * 0.16, w: 700 }));
      s += L("M14 120H306", DIM, 1.2);
      [40, 100, 160, 220, 280].forEach(x => s += C(x, 120, 6, c, { fo: 1 }));
      return s + t(160, 146, "service levels tracked at every milestone", { size: 9.5, fill: DIM }) + t(160, 26, "multi-year contract", { size: 10, fill: c, w: 700 });
    },

    sheet: c => {
      let s = R(12, 12, 296, 24, c, { fo: 0.06, so: 0.4, rx: 4 }) + t(22, 28, "fx  =SUMIFS(Revenue, Region, \"MENA\")", { a: "start", size: 9.5, fill: DIM });
      for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) {
        const hot = (r === 2 && k > 1) || (k === 5 && r > 0);
        s += R(12 + k * 49.5, 44 + r * 25, 47, 22, c, { fo: hot ? 0.42 : 0.04, so: hot ? 0.9 : 0.2, rx: 2 });
      }
      return s;
    },

    dashboard: c => {
      let s = R(12, 12, 140, 70, c, { fo: 0.06, so: 0.4 }) + R(160, 12, 148, 70, c, { fo: 0.06, so: 0.4 }) + R(12, 90, 296, 78, c, { fo: 0.06, so: 0.4 });
      [26, 40, 32, 52].forEach((h, i) => s += `<rect class="p" x="${26 + i * 30}" y="${74 - h}" width="20" height="${h}" rx="3" fill="${c}" fill-opacity="${0.3 + i * 0.18}"/>`);
      s += `<circle class="p" cx="234" cy="47" r="24" fill="none" stroke="${DIM}" stroke-width="9"/>` +
        L("M234 23A24 24 0 1 1 212 56", c, 9, 'stroke-linecap="butt"');
      s += L("M24 150L70 130L116 138L162 112L208 118L254 100L296 104", c, 2.4);
      return s;
    },

    erp: c => {
      const m = ["Finance", "Sales", "Inventory", "Purchase", "HR", "CRM", "Projects", "Manufacturing"];
      let s = "";
      m.forEach((l, i) => {
        const a = (i / m.length) * Math.PI * 2 - Math.PI / 2, x = 160 + Math.cos(a) * 118, y = 90 + Math.sin(a) * 64;
        s += L(`M160 90L${x.toFixed(1)} ${y.toFixed(1)}`, c, 1.2) + R(x - 34, y - 11, 68, 22, c, { fo: 0.24, rx: 11 }) + t(x, y + 3.4, l, { size: 8.6 });
      });
      return s + C(160, 90, 28, c, { fo: 0.75 }) + t(160, 87, "One", { size: 9.5, w: 700 }) + t(160, 98, "database", { size: 9, w: 700 });
    },

    gantt: c => {
      let s = "";
      [[0, 70], [40, 90], [100, 60], [130, 100], [190, 90], [250, 46]].forEach(([x, w], i) =>
        s += t(14, 32 + i * 24, ["Discover", "Design", "Configure", "Migrate", "Train", "Go-live"][i], { a: "start", size: 9, fill: DIM }) +
          `<rect class="p" x="${76 + x * 0.74}" y="${22 + i * 24}" width="${w * 0.74}" height="14" rx="7" fill="${c}" fill-opacity="${0.25 + i * 0.12}"/>`);
      return s + L("M214 14V166", INK, 1.2, 'stroke-dasharray="3 3"') + t(216, 176, "today", { size: 9, fill: INK });
    },

    ads: c => {
      let s = "";
      for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 14 + i * 2.6, x = 92 + Math.cos(a) * r, y = 90 + Math.sin(a) * r * 0.8; s += C(x, y, 3.2, c, { fo: 0.5 }); }
      s += C(92, 90, 16, c, { fo: 0.8 }) + t(92, 94, "Users", { size: 9, w: 700 });
      s += arrow(168, 90, 196, 90, c);
      [["Bid", 0.9], ["Bid", 0.62], ["Bid", 0.4]].forEach(([l, w], i) => s += R(202, 46 + i * 34, 104 * w, 22, c, { fo: 0.25 + i * 0.1, rx: 4 }) + t(208, 61 + i * 34, l + " " + (i + 1), { a: "start", size: 9.5 }));
      return s + t(254, 32, "real-time auction", { size: 9.5, fill: c, w: 700 }) + t(92, 170, "free product, billions of users", { size: 9, fill: DIM });
    },

    fitgap: c => {
      const rows = [["Sales orders", "Fit"], ["Multi-currency", "Fit"], ["Approval flow", "Config"], ["Landed costs", "Config"], ["Custom rebate", "Develop"]];
      let s = t(18, 22, "Requirement", { a: "start", size: 9.5, fill: DIM }) + t(250, 22, "Classification", { size: 9.5, fill: DIM });
      rows.forEach(([r, k], i) => {
        const y = 32 + i * 28, f = k === "Fit" ? 0.65 : k === "Config" ? 0.32 : 0.08;
        s += R(14, y, 180, 22, c, { fo: 0.05, so: 0.3, rx: 4 }) + t(22, y + 15, r, { a: "start", size: 10 });
        s += box(204, y, 94, 22, c, k, { fo: f, size: 9.5, w: 700, rx: 11 });
      });
      return s;
    },

    bpmn: c => {
      let s = t(14, 22, "as-is", { a: "start", size: 9.5, fill: DIM }) + t(14, 112, "to-be", { a: "start", size: 9.5, fill: c, w: 700 });
      s += C(28, 50, 8, DIM, { fo: 0.1, stroke: DIM });
      ["Email", "Re-key", "Approve", "Re-key"].forEach((l, i) => s += R(48 + i * 64, 38, 54, 24, DIM, { fo: 0.06, stroke: DIM, so: 0.6, rx: 5 }) + t(75 + i * 64, 54, l, { size: 9, fill: DIM }));
      s += L("M36 50H48M102 50H112M166 50H176M230 50H240", DIM, 1.2) + C(306, 50, 8, DIM, { fo: 0.4, stroke: DIM });
      s += C(28, 140, 8, c, { fo: 0.2 });
      ["Order", "Auto-check", "Invoice"].forEach((l, i) => s += box(50 + i * 84, 126, 70, 28, c, l, { fo: 0.3, size: 9.5, rx: 6 }));
      s += `<path class="p" d="M276 140l10-10 10 10-10 10z" fill="${c}" fill-opacity=".5"/>`;
      return s + L("M36 140H50M120 140H134M204 140H218M288 140H286", c, 1.6) + C(306, 140, 8, c, { fo: 0.9 });
    },

    activate: c => {
      const ph = ["Discover", "Prepare", "Explore", "Realize", "Deploy", "Run"];
      let s = "";
      ph.forEach((l, i) => {
        const x = 12 + i * 50;
        s += `<path class="p" d="M${x} 66H${x + 42}L${x + 50} 90L${x + 42} 114H${x}L${x + 8} 90Z" fill="${c}" fill-opacity="${0.12 + i * 0.13}" stroke="${c}" stroke-opacity=".8"/>`;
        s += t(x + 25, 136, l, { size: 9 });
      });
      return s + t(160, 40, "go-live", { size: 10, fill: c, w: 700 }) + L("M262 46V60", c, 1.4) + t(160, 168, "migration, testing, cutover, hypercare", { size: 9, fill: DIM });
    },

    scor: c => {
      let s = box(14, 20, 292, 28, c, "Plan", { fo: 0.45, w: 700 });
      ["Source", "Make", "Deliver"].forEach((l, i) => s += box(14 + i * 100, 66, 92, 40, c, l, { fo: 0.25 + i * 0.08, w: 700 }));
      s += arrow(106, 86, 112, 86, c) + arrow(206, 86, 212, 86, c);
      s += box(14, 124, 292, 26, c, "Return", { fo: 0.08 });
      return s + t(160, 170, "one owner and one set of metrics per process", { size: 9, fill: DIM });
    },

    togaf: c => {
      let s = "";
      [["Business", 0.6], ["Data", 0.4], ["Applications", 0.28], ["Technology and backup", 0.14]].forEach(([l, f], i) => {
        const x = 20 + i * 12, w = 280 - i * 24;
        s += box(x, 16 + i * 38, w, 30, c, l, { fo: f, w: i ? 500 : 700 });
      });
      return s + L("M300 30V150", DIM, 1, 'stroke-dasharray="3 3"') + t(306, 172, "aligned", { a: "end", size: 9, fill: DIM });
    },

    method: c => {
      let s = L("M46 90H274", DIM, 1.4);
      ["Question", "Hypothesis", "Analysis", "Answer"].forEach((l, i) => {
        const x = 46 + i * 76;
        s += C(x, 90, 22, c, { fo: 0.1 + i * 0.16 }) + t(x, 96, i + 1, { size: 16, w: 700 }) + t(x, 134, l, { size: 9.5, fill: i === 3 ? INK : DIM });
      });
      return s + t(160, 40, "every case, the same four moves", { size: 10, fill: DIM });
    },

    cases: c => {
      let s = "";
      [3, 2, 1].forEach((k, i) => s += R(70 + k * 14, 22 + k * 10, 180, 118, c, { fo: 0.06 + i * 0.08, so: 0.4 + i * 0.25, rx: 8 }));
      return s + t(126, 76, "Week 01", { size: 16, w: 700, a: "start" }) + t(126, 96, "in production", { size: 10, fill: DIM, a: "start" }) +
        `<circle class="p" cx="112" cy="72" r="5" fill="#46e3b0"/>`;
    },

    letter: c =>
      R(60, 30, 200, 124, c, { fo: 0.1, rx: 10 }) + L("M60 36L160 104L260 36", c, 2) +
      L("M88 128H200M88 142H168", DIM, 1.4) + t(160, 172, "pick two options, the email writes itself", { size: 9.5, fill: DIM })
  };

  window.VIZ = function (type, color, opt = {}) {
    const f = V[type] || V.method;
    const head = opt.font ? `<style>@font-face{font-family:H;src:url(${opt.font}) format("woff2")}text{font-family:H,Arial,sans-serif}</style>` : "";
    const size = opt.w ? ` width="${opt.w}" height="${opt.h}"` : "";
    return `<svg class="viz" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"${size} aria-hidden="true">${head}${f(color)}</svg>`;
  };
  window.VIZ.prime = function (root) {
    root.querySelectorAll(".p").forEach((e, i) => e.style.setProperty("--k", i));
  };
})();
