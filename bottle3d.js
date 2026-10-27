/* VelthineGlow — lightweight 3D dropper bottle drawn on ONE <canvas>.
   The wrap label is painted once to an offscreen canvas, then mapped onto a
   cylinder column-by-column each frame, so it really turns. Both serums use
   the same bottle shape. No libraries, no heavy DOM. */
(function () {
  const D2R = Math.PI / 180;

  // geometry in CSS px; origin = floor point under the bottle centre, y up = negative
  const R = 72, BODY_TOP = -228, BODY_BOT = -8, BODY_H = BODY_BOT - BODY_TOP;
  const E = 9;                         // ellipse depth (we look slightly from above)
  const TEX_W = 2 * Math.PI * R;       // label wraps the full circumference
  const SCALE = 3;                     // label texture resolution
  const CW = 220, CH = 440, OX = 110, OY = 432;

  /* ---------- label painting ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br); ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl); ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
  function text(ctx, s, x, y, font, color, align, spacing) {
    ctx.font = font;
    ctx.fillStyle = color || '#1b1b1b';
    ctx.textAlign = align || 'left';
    ctx.letterSpacing = (spacing || 0) + 'px';
    ctx.fillText(s, x, y);
    ctx.letterSpacing = '0px';
  }
  function vtext(ctx, s, x, y, font, color) { // reads bottom-to-top, starting at (x,y)
    ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2);
    text(ctx, s, 0, 0, font, color, 'left'); ctx.restore();
  }
  function fitFont(ctx, s, weight, max, size) {
    let f = size;
    ctx.font = `${weight} ${f}px Montserrat`;
    while (ctx.measureText(s).width > max && f > 6) { f -= .5; ctx.font = `${weight} ${f}px Montserrat`; }
    return f;
  }
  function paintBase(ctx, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#eef1f3'); g.addColorStop(1, '#e2e6e9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, TEX_W, H);
  }
  function paintLabelPanel(ctx, cx, H) {
    ctx.fillStyle = '#fdfdfc';
    roundRect(ctx, cx - 190, 8, 380, H - 14, 4); ctx.fill();
  }
  function barcode(ctx, x, y, w, h) {
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, w + 6, h + 12);
    let px = x, i = 0;
    const pat = [2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 2, 1, 3, 1];
    ctx.fillStyle = '#111';
    while (px < x + w) { const bw = pat[i % pat.length] * .7; if (i % 2 === 0) ctx.fillRect(px, y, bw, h); px += bw + .6; i++; }
    text(ctx, '1535 4044', x + w / 2, y + h + 7, '500 6px Montserrat', '#111', 'center', 1);
  }

  function paintNiac(ctx, logo, H) {
    const cx = TEX_W / 2;
    paintBase(ctx, H); paintLabelPanel(ctx, cx, H);
    ctx.drawImage(logo, cx - 64, 14, 128, 128 * logo.height / logo.width);

    const bx = cx - 78, by = 66, bw = 42, bh = 98;
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, '#FFB721'); g.addColorStop(1, '#F59B17');
    ctx.fillStyle = g; roundRect(ctx, bx, by, bw, bh, [0, 12, 12, 0]); ctx.fill();
    const fs = fitFont(ctx, 'Niacinamide', 800, bh - 10, 18);
    vtext(ctx, 'Niacinamide', bx + 24, by + bh - 5, `800 ${fs}px Montserrat`, '#1b1b1b');
    vtext(ctx, 'Serum', bx + 35, by + bh - 5, '400 9px Montserrat', '#1b1b1b');
    vtext(ctx, '+ Niacinamide', cx - 20, by + bh - 4, '500 11px Montserrat', '#2b2b2b');
    vtext(ctx, '+ Zinc', cx - 4, by + bh - 4, '500 11px Montserrat', '#2b2b2b');

    text(ctx, 'Evens Skin Tone &', bx, 180, '700 9.5px Montserrat');
    text(ctx, 'Soothes Skin', bx, 191, '700 9.5px Montserrat');
    ctx.fillStyle = '#cfcfcf'; ctx.fillRect(bx, 196, 92, 2);
    text(ctx, 'For all skin types', bx, 207, '400 7.5px Montserrat', '#444');

    ctx.fillStyle = '#7d7f83';
    ctx.beginPath(); ctx.moveTo(cx + 8, H - 6); ctx.lineTo(cx + 50, H - 6); ctx.lineTo(cx + 38, H - 46); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#F5A21B'; ctx.lineWidth = 13; ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(cx + 24, H + 4); ctx.lineTo(cx + 60, 92); ctx.lineTo(cx + 98, H + 4); ctx.stroke();

    const sx = cx + 108;
    text(ctx, 'Benefits', sx, 34, '700 10px Montserrat');
    ['Fades dark spots', 'Controls oil & shine', 'Smaller-looking pores', 'Evens skin tone', 'Strengthens skin barrier', 'Soft, smooth skin']
      .forEach((s, i) => text(ctx, '• ' + s, sx, 50 + i * 11, '400 7px Montserrat', '#333'));
    text(ctx, 'Skin types', sx, 128, '700 9px Montserrat');
    text(ctx, 'For all skin types', sx, 140, '400 7px Montserrat', '#333');
    text(ctx, '30 ml / 1.01 fl oz', sx, 196, '600 8px Montserrat', '#222');

    const lx = cx - 182;
    text(ctx, 'Directions', lx, 34, '700 10px Montserrat');
    ['1. Cleanse face', '2. Apply 3–4 drops', '3. Massage gently', '4. Use at night'].forEach((s, i) => text(ctx, s, lx, 50 + i * 11, '400 7px Montserrat', '#333'));
    text(ctx, 'Do not use together', lx, 112, '700 7px Montserrat', '#222');
    text(ctx, 'with Vitamin C.', lx, 122, '400 7px Montserrat', '#333');
    barcode(ctx, lx, 160, 58, 26);
  }

  function paintVitc(ctx, logo, H) {
    const cx = TEX_W / 2;
    paintBase(ctx, H); paintLabelPanel(ctx, cx, H);

    ctx.save();
    roundRect(ctx, cx - 190, 8, 380, H - 14, 4); ctx.clip();
    const g = ctx.createLinearGradient(0, 118, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.35, '#FFE3BC'); g.addColorStop(.75, '#F9B562'); g.addColorStop(1, '#F08A1C');
    ctx.fillStyle = g; ctx.fillRect(cx - 190, 118, 380, H - 118);
    for (let y = 150; y < H; y += 18) for (let x = cx - 200 + ((y / 18) % 2) * 10; x < cx + 200; x += 20) {
      ctx.fillStyle = `rgba(255,255,255,${.06 + (Math.round(x * 7 + y) % 5) * .025})`;
      ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x + 10, y); ctx.lineTo(x + 20, y + 18); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    ctx.drawImage(logo, cx - 64, 14, 128, 128 * logo.height / logo.width);
    text(ctx, 'EXTRA-C', cx, 78, '600 10px Montserrat', '#1b1b1b', 'center', 2);
    const fs = fitFont(ctx, 'VITAMIN C', 800, 170, 26);
    text(ctx, 'VITAMIN C', cx, 102, `800 ${fs}px Montserrat`, '#15171a', 'center');
    text(ctx, 'BRIGHTENING SERUM', cx, 115, '600 8.5px Montserrat', '#1b1b1b', 'center', 1.6);
    ctx.fillStyle = '#16181b'; ctx.fillRect(cx - 44, 124, 88, 16);
    text(ctx, '5% VITAMIN C', cx, 135.5, '800 9px Montserrat', '#fff', 'center', .6);
    text(ctx, 'WITH COLLAGEN & CENTELLA', cx, 154, '700 7.5px Montserrat', '#1b1b1b', 'center', .5);
    text(ctx, '30 ml / 1.01 fl oz', cx, 198, '600 10px Montserrat', '#1b1b1b', 'center');

    const sx = cx + 104;
    text(ctx, 'VITAMIN C', sx, 40, '800 9px Montserrat');
    ['• Brightens', '• Firms', '• Hydrates'].forEach((s, i) => text(ctx, s, sx, 56 + i * 12, '500 8px Montserrat', '#333'));
    ctx.fillStyle = '#16181b'; ctx.fillRect(sx, 98, 66, 12);
    text(ctx, 'FOR ALL SKIN TYPES', sx + 3, 106.5, '700 5.6px Montserrat', '#fff');

    const lx = cx - 182;
    ['Paraben Free', 'Fragrance Free', 'Cruelty Free', 'Dermatologist Tested'].forEach((s, i) => text(ctx, s, lx, 40 + i * 12, '500 7.5px Montserrat', '#333'));
    text(ctx, 'Use in the morning.', lx, 104, '700 7px Montserrat', '#222');
    text(ctx, 'Follow with sunscreen.', lx, 114, '400 7px Montserrat', '#333');
    barcode(ctx, lx, 160, 58, 26);
  }

  function makeTexture(kind, logo) {
    const c = document.createElement('canvas');
    c.width = Math.round(TEX_W * SCALE); c.height = BODY_H * SCALE;
    const ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE);
    (kind === 'vitc' ? paintVitc : paintNiac)(ctx, logo, BODY_H);
    return c;
  }

  /* ---------- per-frame drawing ---------- */
  function hGrad(ctx, x0, x1, stops) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }
  const BODY_SHADE = [[0, 'rgba(20,14,6,.34)'], [.1, 'rgba(20,14,6,.12)'], [.22, 'rgba(255,255,255,.0)'],
    [.29, 'rgba(255,255,255,.55)'], [.36, 'rgba(255,255,255,0)'], [.68, 'rgba(20,14,6,.04)'],
    [.88, 'rgba(20,14,6,.22)'], [.94, 'rgba(255,255,255,.28)'], [1, 'rgba(20,14,6,.4)']];
  const FROST = [[0, '#bfc5ca'], [.14, '#dfe4e7'], [.3, '#ffffff'], [.42, '#eef1f3'], [.75, '#d8dde1'], [.92, '#eef1f3'], [1, '#b4babf']];
  const GOLD = [[0, '#7a4c0f'], [.1, '#c9953a'], [.2, '#fff1c4'], [.3, '#e2b45a'], [.52, '#a8741f'], [.72, '#f3d37f'], [.88, '#b98327'], [1, '#6e430c']];
  const WHITE = [[0, '#c5c5c1'], [.16, '#efefec'], [.3, '#ffffff'], [.62, '#ecebe8'], [.88, '#cfcfcb'], [1, '#b5b5b1']];

  function draw(b, rotDeg) {
    const { ctx, tex, dpr } = b;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    ctx.translate(OX, OY);

    // --- body: cylinder-mapped label ---
    ctx.save();
    ctx.beginPath();
    ctx.rect(-R, BODY_TOP - 4, 2 * R, BODY_H + 4 - 10);
    ctx.ellipse(0, BODY_BOT - 10, R, E + 10, 0, 0, Math.PI);
    ctx.clip();
    const step = 1 / dpr, texW = tex.width, texH = tex.height;
    const shift = rotDeg * D2R * R;
    for (let x = -R; x < R; x += step) {
      const xc = Math.max(-R + .01, Math.min(R - .01, x + step / 2));
      const s = xc / R, th = Math.asin(s), cos = Math.cos(th);
      let u = (TEX_W / 2 + th * R - shift) % TEX_W; if (u < 0) u += TEX_W;
      const sw = Math.max(1, (step / Math.max(cos, .06)) * SCALE);
      let sx = u * SCALE; if (sx + sw > texW) sx = texW - sw;
      ctx.drawImage(tex, sx, 0, sw, texH, x, BODY_TOP + E * cos, step + .35, BODY_H);
    }
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = hGrad(ctx, -R, R, BODY_SHADE);
    ctx.fillRect(-R, BODY_TOP, 2 * R, BODY_H + E + 4);
    const vg = ctx.createLinearGradient(0, BODY_BOT - 30, 0, BODY_BOT + E);
    vg.addColorStop(0, 'rgba(20,14,6,0)'); vg.addColorStop(1, 'rgba(20,14,6,.18)');
    ctx.fillStyle = vg; ctx.fillRect(-R, BODY_BOT - 30, 2 * R, 40 + E);
    ctx.restore();

    // --- shoulder (frosted glass) ---
    ctx.beginPath();
    ctx.moveTo(-R, BODY_TOP);
    ctx.bezierCurveTo(-R, BODY_TOP - 18, -42, BODY_TOP - 24, -34, -256);
    ctx.lineTo(34, -256);
    ctx.bezierCurveTo(42, BODY_TOP - 24, R, BODY_TOP - 18, R, BODY_TOP);
    ctx.ellipse(0, BODY_TOP, R, E, 0, 0, Math.PI);
    ctx.fillStyle = hGrad(ctx, -R, R, FROST); ctx.fill();
    const sg = ctx.createLinearGradient(0, -258, 0, BODY_TOP + E);
    sg.addColorStop(0, 'rgba(255,255,255,.45)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fill();

    // --- gold collar ---
    const cr = 37, ce = E * cr / R;
    ctx.beginPath();
    ctx.moveTo(-cr, -312); ctx.lineTo(-cr, -258);
    ctx.ellipse(0, -258, cr, ce, 0, Math.PI, 0, true);
    ctx.lineTo(cr, -312); ctx.closePath();
    ctx.fillStyle = hGrad(ctx, -cr, cr, GOLD); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.globalAlpha = .18; ctx.strokeStyle = '#4a2c05'; ctx.lineWidth = 1;
    for (const y of [-300, -270]) { ctx.beginPath(); ctx.ellipse(0, y, cr, ce, 0, 0, Math.PI); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, -312, cr, ce, 0, 0, Math.PI * 2);
    const tg = ctx.createRadialGradient(-8, -314, 2, 0, -312, cr);
    tg.addColorStop(0, '#fff3cf'); tg.addColorStop(.7, '#d6a548'); tg.addColorStop(1, '#94631a');
    ctx.fillStyle = tg; ctx.fill();

    // --- white rubber bulb ---
    const br = 30, be = E * br / R;
    ctx.beginPath();
    ctx.moveTo(-br, -312);
    ctx.lineTo(-27, -390);
    ctx.bezierCurveTo(-27, -420, 27, -420, 27, -390);
    ctx.lineTo(br, -312);
    ctx.ellipse(0, -312, br, be, 0, 0, Math.PI);
    ctx.fillStyle = hGrad(ctx, -br, br, WHITE); ctx.fill();
    const bg = ctx.createRadialGradient(-9, -398, 1, -9, -398, 16);
    bg.addColorStop(0, 'rgba(255,255,255,.9)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg; ctx.fill();
  }

  window.Bottle3D = {
    create(canvas, kind, logo) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = CW * dpr; canvas.height = CH * dpr;
      canvas.style.width = CW + 'px'; canvas.style.height = CH + 'px';
      const b = { ctx: canvas.getContext('2d'), tex: makeTexture(kind, logo), dpr };
      b.set = rot => draw(b, rot);
      return b;
    }
  };
})();
