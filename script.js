/* VelthineGlow sale page — interactions */
const WHATSAPP = '923472616688'; // business WhatsApp number, international format without +
const PRICES = { niac: 1990, vitc: 1990, duo: 3490 };
const NAMES = { niac: 'Niacinamide 10% + Zinc 1% Serum', vitc: 'Extra-C Vitamin C Serum', duo: 'Glow Duo (Vitamin C + Niacinamide)' };
const FREE_DELIVERY_FROM = 0, DELIVERY_FEE = 0; // free delivery on every order
// Google Apps Script web-app URL (see google-sheet/SETUP.md). Leave empty to send orders to WhatsApp only.
const ORDER_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzK1V_Mxn7EmlmHqNj_3-rvuhrSGp1mYMR9pJWh-eGo05G33hDAfElXz67_-K9Lfz0SsA/exec';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rs = n => 'Rs ' + n.toLocaleString('en-PK');
const ur = t => `<span class="ur" lang="ur" dir="rtl">${t}</span>`;

/* remember where the visitor came from (ads), so each order in the sheet shows its source */
const source = (() => {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'ttclid', 'gclid'];
  const q = new URLSearchParams(location.search), found = {};
  keys.forEach(k => { if (q.get(k)) found[k] = q.get(k).slice(0, 120); });
  try {
    if (Object.keys(found).length) sessionStorage.setItem('vg_src', JSON.stringify(found));
    else Object.assign(found, JSON.parse(sessionStorage.getItem('vg_src') || '{}'));
  } catch (e) { /* storage blocked: keep what is in the URL */ }
  found.referrer = document.referrer.slice(0, 200);
  return found;
})();

/* ---------- nav + reveal + sticky bar ---------- */
const nav = $('#nav'), mbar = $('#mbar');
addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 10);
  const orderTop = $('#order').getBoundingClientRect().top;
  mbar.classList.toggle('show', scrollY > 500 && orderTop > innerHeight);
}, { passive: true });

/* mobile menu */
const burger = $('#burger');
const setMenu = open => { nav.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
$$('#navLinks a').forEach(a => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', e => { if (nav.classList.contains('open') && !nav.contains(e.target)) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* highlight the menu link of the section on screen */
const navMap = new Map($$('#navLinks a:not(.nav-order-m)').map(a => [a.getAttribute('href').slice(1), a]));
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  navMap.forEach(a => a.classList.remove('active'));
  navMap.get(e.target.id).classList.add('active');
}), { rootMargin: '-45% 0px -50% 0px' });
navMap.forEach((a, id) => { const sec = document.getElementById(id); if (sec) spy.observe(sec); });

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12 });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
if (location.hash === '#shot') $$('.reveal').forEach(el => el.classList.add('in')); // full-page screenshots

/* ---------- WhatsApp links ---------- */
const waUrl = msg => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
$$('.js-wa').forEach(a => { a.href = waUrl(a.dataset.msg); a.target = '_blank'; a.rel = 'noopener'; });

/* ---------- hero 3D bottles ---------- */
function loadLogo() {
  return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = window.VG_LOGO; });
}
async function initHero() {
  const fontsReady = Promise.all(['400', '500', '600', '700', '800'].map(w => document.fonts.load(`${w} 12px Montserrat`)));
  const [logo] = await Promise.all([loadLogo(), fontsReady]);

  const stage = $('#heroStage'), duo = $('#duo');
  const bottles = $$('.bottle', stage).map(el => Bottle3D.create(el, el.dataset.kind, logo));
  const chips = $$('.chip', stage);

  let rot = -18, vel = reduceMotion ? 0 : 0.18, dragging = false, lastX = 0, mx = 0, my = 0, tx = 0, ty = 0;
  const auto = reduceMotion ? 0 : 0.18;

  stage.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5;
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; rot += dx * .5; vel = dx * .5; }
  });
  const stop = () => { dragging = false; };
  stage.addEventListener('pointerup', stop); stage.addEventListener('pointercancel', stop);
  stage.addEventListener('pointerleave', () => { mx = my = 0; });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);

  (function frame() {
    if (visible) {
      if (!dragging) { vel += (auto - vel) * .04; rot += vel; }
      tx += (mx - tx) * .08; ty += (my - ty) * .08;
      duo.style.transform = `translate3d(${tx * -14}px, ${ty * -10}px, 0)`;
      bottles.forEach((b, i) => b.set(rot + i * 40));
      chips.forEach(c => { const d = +c.dataset.depth; c.style.transform = `translate3d(${tx * d}px, ${ty * d}px, 0)`; });
    }
    requestAnimationFrame(frame);
  })();
}
initHero();

/* ---------- product card tilt ---------- */
$$('.tilt').forEach(card => {
  card.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.transform = `rotateY(${(x - .5) * 10}deg) rotateX(${(.5 - y) * 8}deg)`;
    card.style.setProperty('--gx', x * 100 + '%'); card.style.setProperty('--gy', y * 100 + '%');
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
});

/* ---------- 3D carton ---------- */
const BW = 200, BH = 520, BD = 200;
const chevron = `<svg class="chev" viewBox="0 0 150 220" preserveAspectRatio="none"><path d="M10 220 L40 220 L52 172 Z" fill="#111"/><path d="M28 230 L86 70 L146 230" fill="none" stroke="#F59B17" stroke-width="22" stroke-linejoin="miter"/></svg>`;
const flower = `<svg style="position:absolute;left:4px;bottom:40px;width:70px;opacity:.35;z-index:1" viewBox="0 0 60 80"><path d="M30 80 C28 60 34 44 46 30 M34 54 C20 50 12 40 10 26 M36 46 C46 46 54 38 56 28 M32 62 C22 64 12 60 6 52" stroke="#9a9a9a" stroke-width="2" fill="none"/><circle cx="46" cy="28" r="5" fill="#bdbdbd"/><circle cx="10" cy="24" r="4" fill="#bdbdbd"/></svg>`;
const logo = '<img class="bf-logo" src="img/logo.png" alt="">';
const why = (title, rows) => `<div class="bf-pad"><div class="why-h">${title}</div>${rows.map(([ic, t]) => `<div class="why-row"><span class="why-ic">${ic}</span>${t}</div>`).join('')}</div>`;
const directions = `<div class="bf-pad"><span class="dir-h">DIRECTION FOR USE</span><ol class="dir-list">
  <li>Cleanse your face thoroughly.</li><li>Apply 3–4 drops of serum to your face and neck.</li>
  <li>Gently massage in a circular motion until fully absorbed.</li><li>For best results, use daily.</li></ol>
  <div class="symbols"><span>♻</span><span>℮</span><span>↻</span></div><div class="barcode"></div></div>`;

const BOX = {
  niac: {
    cls: '',
    front: `<div class="bf-pad">${logo}
      <div class="nf-block"><div class="nf-or"><div class="vt">Niacinamide<small>Serum</small></div></div>
      <div class="nf-act"><div class="vt">+ 10% Niacinamide <small style="font-size:11px">(Vitamin B3)</small></div></div>
      <div class="nf-act"><div class="vt">+ 1% Zinc</div></div></div>
      <div class="nf-claims">Fade Dark Spots<br>Control Oil<br>Brighten Skin</div>
      <div class="nf-types">For all skin types</div>
      ${flower}<span class="vol" style="left:auto;right:96px;bottom:14px">30 ml / 1.01 fl oz</span>${chevron}</div>`,
    right: directions,
    back: `<div class="bf-pad"><div class="d-title">Niacinamide<br>Serum</div>
      <p class="d-text">A potent formula with Niacinamide to help refine pores, control excess oil and improve uneven skin tone while strengthening the skin barrier for a healthy, balanced complexion.</p>
      <div class="d-rule"></div><div class="d-ing"><b class="dh">INGREDIENTS (Key Actives)</b><p>Niacinamide, Zinc PCA, Hyaluronic Acid, Alpha Arbutin and Panthenol (Vitamin B5).</p></div>
      <p class="d-small">For external use only.<br>Store in a cool, dry place.<br>Avoid direct sunlight.</p></div>`,
    left: why('Why Niacinamide?', [['◎', 'Reduces Appearance of Pores'], ['💧', 'Controls Oil Production'], ['◐', 'Improves Uneven Skin Tone'], ['🛡', 'Strengthens Skin Barrier']])
  },
  vitc: {
    cls: 'vc',
    front: `<div class="bf-pad">${logo}<div class="vc-portrait"></div>
      <div class="vc-name"><small>EXTRA-C</small><strong>VITAMIN C</strong><em>BRIGHTENING SERUM</em></div>
      <div class="vc-claim">IMPROVES RADIANCE &amp;<br>REDUCES THE LOOK OF WRINKLES</div>
      <span class="vc-pill">5% VITAMIN C</span><div class="vc-with">WITH COLLAGEN &amp; CENTELLA</div>
      <div class="vc-vol">30 ml / 1.01 fl oz</div></div>`,
    right: directions,
    back: `<div class="bf-pad"><div class="d-title">Vitamin C<br>Serum</div>
      <p class="d-text">A lightweight, fast-absorbing formula powered by stabilized Vitamin C to brighten, hydrate and protect the skin.</p>
      <p class="d-text" style="margin-top:10px">Helps improve uneven tone, boost radiance and defend against daily stressors for a healthy, luminous glow.</p>
      <div class="d-rule"></div><div class="d-ing"><b class="dh">INGREDIENTS (Key Actives)</b><p>Vitamin C, Collagen &amp; Centella — brighten, hydrate and firm skin.</p></div>
      <p class="d-small">For external use only.<br>Store in a cool, dry place.<br>Avoid direct sunlight.</p></div>`,
    left: why('Why Vitamin C?', [['✦', 'Brightens &amp; evens skin tone'], ['☀', 'Boosts radiance &amp; glow'], ['🛡', 'Antioxidant protection'], ['◐', 'Reduces dullness']])
  }
};

const box = $('#box3d'), boxStage = $('#boxStage'), boxScale = $('.box-scale');
if (box) { // home page only
let boxFaces = [];
function buildBox(kind) {
  const d = BOX[kind];
  box.innerHTML = '';
  boxFaces = [];
  ['front', 'right', 'back', 'left'].forEach((side, k) => {
    const f = document.createElement('div');
    f.className = 'bf ' + d.cls;
    f.style.cssText = `width:${BW}px;height:${BH}px;left:${-BW / 2}px;top:${-BH / 2}px;transform:rotateY(${k * 90}deg) translateZ(${BD / 2}px)`;
    f.innerHTML = d[side] + '<span class="sh"></span>';
    box.appendChild(f);
    boxFaces.push({ a: k * 90, sh: f.querySelector('.sh') });
  });
  const top = document.createElement('div');
  top.className = 'bf bf-top';
  top.style.cssText = `width:${BW}px;height:${BD}px;left:${-BW / 2}px;top:${-BD / 2}px;transform:translateY(${-BH / 2}px) rotateX(90deg)`;
  top.innerHTML = '<img src="img/logo.png" alt=""><span class="sh" style="opacity:.04"></span>';
  box.appendChild(top);
}
buildBox('niac');

let bRot = -28, bVel = 0, bTarget = null, bDrag = false, bLast = 0, bIdle = 0;
boxStage.addEventListener('pointerdown', e => { bDrag = true; bTarget = null; bLast = e.clientX; boxStage.setPointerCapture(e.pointerId); });
boxStage.addEventListener('pointermove', e => { if (!bDrag) return; const dx = e.clientX - bLast; bLast = e.clientX; bRot += dx * .45; bVel = dx * .45; });
['pointerup', 'pointercancel'].forEach(t => boxStage.addEventListener(t, () => { bDrag = false; bIdle = 0; }));

$$('.sw').forEach(b => b.addEventListener('click', () => {
  $$('.sw').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); });
  buildBox(b.dataset.box);
  bTarget = Math.round(bRot / 360) * 360 + 360; // full spin on switch
}));
$$('.side-btns button').forEach(b => b.addEventListener('click', () => {
  $$('.side-btns button').forEach(x => x.classList.toggle('on', x === b));
  const want = -b.dataset.side * 90;
  bTarget = want + Math.round((bRot - want) / 360) * 360;
  bIdle = 0;
}));

function fitBox() {
  const w = boxStage.clientWidth, h = boxStage.clientHeight;
  const k = Math.min(1, w / 380, h / 640);
  boxScale.style.transform = `scale(${k})`;
}
fitBox(); addEventListener('resize', fitBox);

let boxVisible = false;
new IntersectionObserver(([e]) => { boxVisible = e.isIntersecting; }).observe(boxStage);
(function boxFrame() {
  if (boxVisible) {
    if (bTarget !== null) {
      bRot += (bTarget - bRot) * .08;
      if (Math.abs(bTarget - bRot) < .1) { bRot = bTarget; bTarget = null; bIdle = -240; }
    } else if (!bDrag) {
      bIdle++;
      bVel *= .94;
      bRot += bVel + (bIdle > 90 && !reduceMotion ? .22 : 0);
    }
    box.style.transform = `rotateX(-12deg) rotateY(${bRot}deg)`;
    boxFaces.forEach(f => {
      const phi = (f.a + bRot) * Math.PI / 180;
      const lit = Math.max(0, Math.cos(phi + .6));
      f.sh.style.opacity = (0.42 * (1 - lit)).toFixed(3);
    });
  }
  requestAnimationFrame(boxFrame);
})();
}

/* ---------- skin finder ---------- */
const result = $('#result');
const REC = {
  niac: { img: 'img/niacinamide-pack.jpg', name: 'Niacinamide 10% + Zinc 1% Serum', why: 'Your skin needs oil control and help with spots and pores. Use it every night.', whyUr: 'آپ کی جلد کو تیل کنٹرول اور دھبوں و مسام میں مدد چاہیے۔ اسے ہر رات استعمال کریں۔', pick: 'niac', price: PRICES.niac },
  vitc: { img: 'img/vitamin-c-pack.jpg', name: 'Extra-C Vitamin C Serum', why: 'Your skin needs more glow and an even tone. Use it every morning with sunscreen.', whyUr: 'آپ کی جلد کو مزید نکھار اور یکساں رنگت چاہیے۔ اسے ہر صبح سن اسکرین کے ساتھ استعمال کریں۔', pick: 'vitc', price: PRICES.vitc },
  duo:  { img: 'img/vitamin-c-pack.jpg', name: 'The Glow Duo', why: 'Your skin will love both. Vitamin C in the morning for glow, Niacinamide at night for spots and oil.', whyUr: 'آپ کی جلد کے لیے دونوں بہترین ہیں۔ نکھار کے لیے صبح وٹامن سی، دھبوں اور تیل کے لیے رات کو نیاسینامائیڈ۔', pick: 'duo', price: PRICES.duo }
};
$$('#chips button').forEach(b => b.addEventListener('click', () => {
  b.classList.toggle('on');
  const on = $$('#chips button.on');
  if (!on.length) { result.innerHTML = '<div class="result-empty">👆 Tap at least one problem above' + ur('اوپر کم از کم ایک مسئلہ منتخب کریں') + '</div>'; return; }
  let n = 0, c = 0;
  on.forEach(x => { n += +x.dataset.n; c += +x.dataset.c; });
  const key = (n && c && Math.min(n, c) / Math.max(n, c) >= .4) ? 'duo' : (n >= c ? 'niac' : 'vitc');
  const r = REC[key];
  result.innerHTML = `<div class="rec"><img src="${r.img}" alt="${r.name}">
    <div><small class="k">Best match for you</small><h3>${r.name}</h3><p>${r.why}${ur(r.whyUr)}</p>
    <a href="#order" class="btn btn-orange js-pick" data-pick="${r.pick}">Order for ${rs(r.price)}</a></div></div>`;
}));

/* ---------- flip cards on touch ---------- */
$$('.flip').forEach(f => f.addEventListener('click', () => f.classList.toggle('on')));

/* ---------- weekly offer: counts down to Sunday midnight, Pakistan time ---------- */
const PKT = 5 * 3600e3; // Pakistan is UTC+5 all year
function weekEnd(nowMs) {
  const pk = new Date(nowMs + PKT);                       // read the UTC fields as Pakistan wall time
  const daysLeft = (7 - pk.getUTCDay()) % 7;              // Sunday = 0 → ends tonight
  return Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate() + daysLeft + 1) - PKT;
}
function tick() {
  const now = Date.now();
  let s = Math.max(0, Math.floor((weekEnd(now) - now) / 1000));
  const p = n => String(n).padStart(2, '0');
  $('#cdD').textContent = p(Math.floor(s / 86400)); s %= 86400;
  $('#cdH').textContent = p(Math.floor(s / 3600)); s %= 3600;
  $('#cdM').textContent = p(Math.floor(s / 60));
  $('#cdS').textContent = p(s % 60);
}
if ($('#cdH')) { tick(); setInterval(tick, 1000); }

/* ---------- order form ---------- */
const qty = { niac: 0, vitc: 0, duo: 0 };
$$('.line').forEach(l => { qty[l.dataset.id] = +$('.qty span', l).textContent; }); // start from the quantities in the HTML
function renderOrder() {
  let sub = 0;
  $$('.line').forEach(l => {
    const id = l.dataset.id;
    $('span', $('.qty', l)).textContent = qty[id];
    l.classList.toggle('active', qty[id] > 0);
    sub += qty[id] * PRICES[id];
  });
  const del = sub === 0 || sub >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
  $('#tSub').textContent = rs(sub);
  $('#tDel').textContent = del ? rs(del) : 'Free';
  $('#tTot').textContent = rs(sub + del);
  return { sub, del };
}
$$('.line').forEach(l => $$('.qty button', l).forEach(b => b.addEventListener('click', () => {
  const id = l.dataset.id;
  qty[id] = Math.max(0, Math.min(10, qty[id] + +b.dataset.d));
  renderOrder();
})));
document.addEventListener('click', e => {
  const p = e.target.closest('.js-pick');
  if (!p) return;
  Object.keys(qty).forEach(k => { qty[k] = 0; });
  qty[p.dataset.pick] = 1;
  renderOrder();
});
renderOrder();

$('#orderForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target.elements, err = $('#formErr'); // .elements: form.name would be the form's own name
  const name = f.name.value.trim(), phone = f.phone.value.replace(/[\s-]/g, ''), city = f.city.value, address = f.address.value.trim();
  $$('.bad', e.target).forEach(x => x.classList.remove('bad'));
  const bad = [];
  if (name.length < 3) bad.push(f.name);
  if (!/^(03\d{9}|\+?923\d{9})$/.test(phone)) bad.push(f.phone);
  if (!city) bad.push(f.city);
  if (address.length < 8) bad.push(f.address);
  const { sub, del } = renderOrder();
  if (!sub) { err.innerHTML = 'Please add at least one product.' + ur('براہ کرم کم از کم ایک پروڈکٹ شامل کریں۔'); return; }
  if (bad.length) {
    bad.forEach(x => x.classList.add('bad'));
    err.innerHTML = bad.includes(f.phone) && bad.length === 1
      ? 'Please enter a correct mobile number, like 03001234567.' + ur('براہ کرم درست موبائل نمبر لکھیں، جیسے 03001234567۔')
      : 'Please fill all the boxes in red.' + ur('براہ کرم سرخ رنگ والے تمام خانے بھریں۔');
    bad[0].focus();
    return;
  }
  err.innerHTML = '';
  const items = Object.keys(qty).filter(k => qty[k]).map(k => `• ${NAMES[k]} × ${qty[k]} = ${rs(qty[k] * PRICES[k])}`).join('\n');
  const orderId = newOrderId();
  const msg = `Assalam o Alaikum! I want to order (Cash on Delivery):\n\nOrder ID: ${orderId}\n${items}\n\nDelivery: ${del ? rs(del) : 'Free'}\nTotal: ${rs(sub + del)}\n\nName: ${name}\nPhone: ${phone}\nCity: ${city}\nAddress: ${address}`;
  // save to the Google Sheet first, so the order is kept even if the customer never presses Send in WhatsApp
  saveOrder({ orderId, items: items.replace(/• /g, '').replace(/\n/g, ' | '), subtotal: sub, delivery: del, total: sub + del,
    name, phone, city, address, ...source, page: location.href.split('#')[0] });
  const url = waUrl(msg);
  window.open(url, '_blank', 'noopener');
  $('#formOk').innerHTML = `✅ Order <b>${orderId}</b> is ready. Press <b>Send</b> in WhatsApp to confirm. ` +
    `<a href="${url}" target="_blank" rel="noopener">WhatsApp didn't open? Tap here.</a>` +
    ur(`آرڈر ${orderId} تیار ہے۔ کنفرم کرنے کے لیے واٹس ایپ میں Send دبائیں۔`);
});

/* ---------- order backup to Google Sheet ---------- */
function newOrderId() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `VG-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
function saveOrder(data) {
  if (!ORDER_SHEET_URL) return;
  // text/plain avoids a CORS preflight; Apps Script reads e.postData.contents
  fetch(ORDER_SHEET_URL, { method: 'POST', mode: 'no-cors', keepalive: true,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) }).catch(() => {});
}

$('#yr').textContent = new Date().getFullYear();
