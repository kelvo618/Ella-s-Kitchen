'use strict';
const $ = s => document.querySelector(s);
const TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (TOUCH) $('#hud').classList.add('touch');

/* ---------- Recipes: [station, label, kind, seconds] ---------- */
const ST = { fridge: -6, sink: -3, board: 0, stove: 3, serve: 6 };
const NAMES = { fridge: 'Fridge', sink: 'Sink', board: 'Chopping board', stove: 'Stove', serve: 'Serving counter' };
const REC = {
  plantain: { n: 'Fried plantain', lvl: 1, pay: 40, col: [0xf2d36b, 0xe9b73a, 0xb8741f], steps: [
    ['fridge', 'Take ripe plantain', 'tap', 0], ['sink', 'Wash plantain', 'hold', 1.5],
    ['board', 'Slice plantain', 'hold', 2], ['stove', 'Fry in hot oil', 'cook', 5], ['serve', 'Serve', 'tap', 0]] },
  jollof: { n: 'Jollof rice', lvl: 2, pay: 90, col: [0xf4f0e6, 0xd9a07a, 0xd2562b], steps: [
    ['fridge', 'Take rice and tomatoes', 'tap', 0], ['sink', 'Wash the rice', 'hold', 2],
    ['board', 'Chop tomatoes and onions', 'hold', 3], ['stove', 'Boil rice in pepper sauce', 'cook', 7], ['serve', 'Serve', 'tap', 0]] },
  burger: { n: 'Burger', lvl: 3, pay: 130, col: [0xe0b070, 0x8a4a2a, 0xc2352a], steps: [
    ['fridge', 'Take patty, bun and tomato', 'tap', 0], ['board', 'Slice the tomato', 'hold', 2],
    ['stove', 'Grill the patty', 'cook', 6], ['board', 'Assemble the burger', 'hold', 2], ['serve', 'Serve', 'tap', 0]] }
};

/* ---------- State ---------- */
const save = JSON.parse(localStorage.getItem('mc3d') || '{"money":0,"xp":0}');
const G = { mode: null, playing: false, rec: null, step: 0, prog: 0, cookT: -1, time: 0, score: 0, sens: 5 };
const keys = {}; let pressed = false, actHeld = false;
const joy = { x: 0, y: 0 };
const P = { x: 0, z: 2, yaw: 0, pitch: 0 };

/* ---------- Three.js scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: !TOUCH });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a1d18); scene.fog = new THREE.Fog(0x2a1d18, 12, 26);
const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 50); cam.position.y = 1.65;

function tex(draw, w = 256, rep = 1) {
  const c = document.createElement('canvas'); c.width = c.height = w; draw(c.getContext('2d'), w);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
}
const floorT = tex((g, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#d9d2c4' : '#8c8478'; g.fillRect(i * w / 8, j * w / 8, w / 8, w / 8); } }, 256, 4);
const wallT = tex((g, w) => { g.fillStyle = '#f2efe8'; g.fillRect(0, 0, w, w); g.strokeStyle = '#c9c3b6'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, w); g.moveTo(0, i * w / 8); g.lineTo(w, i * w / 8); g.stroke(); } }, 256, 3);
const steel = new THREE.MeshStandardMaterial({ color: 0xbfc5ca, metalness: .6, roughness: .35 });
const mat = (c, r = .7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
function box(w, h, d, m, x, y, z, parent = scene) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; }
function cyl(rt, rb, h, m, x, y, z, seg = 20, parent = scene) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; }

// room
const fl = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ map: floorT, roughness: .5 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
const wm = new THREE.MeshStandardMaterial({ map: wallT, roughness: .8 });
box(18, 4, .3, wm, 0, 2, -8); box(18, 4, .3, wm, 0, 2, 8); box(.3, 4, 18, wm, -9, 2, 0); box(.3, 4, 18, wm, 9, 2, 0);
box(18, .3, 18, mat(0xe8e4dc), 0, 4.1, 0);
// back counters, cabinets, ovens
box(18, .9, 1.4, steel, 0, .45, -7.1); box(18, .08, 1.5, mat(0x555a60, .3), 0, .94, -7.1);
for (let i = -8; i <= 8; i += 2) box(1.9, .8, .05, mat(0x6b4a33), i, .45, -6.4);
for (let i = -8; i <= 8; i += 4) box(3.8, 1, .8, mat(0x8a5a3a), i, 3, -7.6);
box(3.4, 1.1, 1, steel, -8, .55, -3).visible = false;
// fridge
const fr = box(1.8, 3, 1.3, mat(0xe9edf0, .3), ST.fridge, 1.5, -7.1); box(.06, 1.2, .1, steel, ST.fridge + .6, 1.8, -6.4);
// sink
box(1.6, .06, 1, mat(0x30363b, .2), ST.sink, .98, -7.1); cyl(.05, .05, .5, steel, ST.sink, 1.2, -7.5); box(.08, .08, .4, steel, ST.sink, 1.45, -7.35);
// chopping board + knife
box(1.3, .08, .8, mat(0xc89b62), ST.board, 1, -7); const knife = box(.5, .03, .09, steel, ST.board + .3, 1.08, -7);
// stove
box(2, .1, 1.2, mat(0x15171a, .3), ST.stove, 1, -7.1);
[[-.5, -.3], [.5, -.3], [-.5, .3], [.5, .3]].forEach(([a, b]) => cyl(.25, .25, .03, mat(0x2a2d30), ST.stove + a, 1.07, -7.1 + b, 16));
const pot = cyl(.3, .27, .35, steel, ST.stove - .5, 1.27, -7.4, 20);
const potFood = cyl(.27, .27, .04, mat(0xffffff), ST.stove - .5, 1.43, -7.4, 20); potFood.visible = false;
const oven = box(2, 1.4, 1, mat(0x2b2f33, .4), ST.stove + 1.9, .75, -7.1); box(1.5, .6, .05, mat(0x111, .1), ST.stove + 1.9, .8, -6.57);
// serving counter + bell
box(2, .1, 1.2, mat(0xd8c6a0), ST.serve, 1, -7.1); cyl(.14, .14, .1, steel, ST.serve + .6, 1.1, -7);
// dining hint table
box(2.4, .9, 1.2, mat(0x7a5133), 6, .45, 0);
// lights
scene.add(new THREE.HemisphereLight(0xfff3e0, 0x554433, .85));
const sun = new THREE.DirectionalLight(0xffffff, .8); sun.position.set(3, 8, 4); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); scene.add(sun);
const warm = new THREE.PointLight(0xffc27a, .6, 14); warm.position.set(0, 3.5, -5); scene.add(warm);

// held plate (child of camera)
const hand = new THREE.Group(); hand.position.set(.38, -.32, -.75); cam.add(hand); scene.add(cam);
cyl(.2, .17, .03, mat(0xffffff, .3), 0, 0, 0, 24, hand);
const held = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 10), mat(0xffffff)); held.position.y = .1; held.scale.y = .6; hand.add(held);

// steam
const steam = []; const sm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .4, depthWrite: false });
for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 6), sm.clone()); s.visible = false; s.userData = { t: Math.random() }; scene.add(s); steam.push(s); }

/* ---------- UI helpers ---------- */
function show(id) { document.querySelectorAll('.panel').forEach(p => p.classList.add('hide')); if (id) $('#' + id).classList.remove('hide'); }
let toastT; function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 1300); }
const lvl = () => Math.floor(save.xp / 100) + 1;
function hudStats() { $('#money').textContent = '₦' + save.money; $('#lvl').textContent = 'Lv ' + lvl(); $('#xp').style.width = (save.xp % 100) + '%'; localStorage.setItem('mc3d', JSON.stringify(save)); }
function status() { return G.mode === 'challenge' ? 'Time ' + Math.ceil(G.time) + 's · Score ' + G.score : ''; }

/* ---------- Game flow ---------- */
function startMode(m) {
  G.mode = m; G.score = 0; G.time = 60;
  if (m === 'free') { buildPicker(); show('picker'); return; }
  nextRecipe(); begin();
}
function begin() { show(null); $('#hud').classList.remove('hide'); G.playing = true; P.x = 0; P.z = 2; P.yaw = 0; P.pitch = 0; hudStats(); if (!TOUCH) $('#c').requestPointerLock && $('#c').requestPointerLock(); }
function nextRecipe(id) {
  const open = Object.keys(REC).filter(k => REC[k].lvl <= lvl());
  G.id = id || open[Math.floor(Math.random() * open.length)]; G.rec = REC[G.id]; G.step = 0; G.prog = 0; G.cookT = -1; refreshHeld();
}
function refreshHeld() {
  const r = G.rec; held.visible = G.step > 0 && r;
  if (held.visible) held.material.color.setHex(r.col[Math.min(2, Math.floor(G.step * 3 / r.steps.length))]);
  potFood.visible = false;
}
function finish(q) {
  const pay = Math.round(G.rec.pay * q); save.money += pay; save.xp += Math.round(pay / 2); G.score += pay;
  toast(q >= 1 ? `Perfect! +₦${pay}` : `Burnt edges +₦${pay}`); hudStats();
  if (G.mode === 'free') { G.playing = false; document.exitPointerLock && document.exitPointerLock(); buildPicker(); show('picker'); $('#hud').classList.add('hide'); }
  else nextRecipe();
}
function endGame() {
  G.playing = false; document.exitPointerLock && document.exitPointerLock(); $('#hud').classList.add('hide');
  $('#endT').textContent = "Time's up!"; $('#endP').textContent = `You earned ₦${G.score}. Total money ₦${save.money}, chef level ${lvl()}.`; show('end');
}
function pause() { if (!G.playing) return; G.playing = false; document.exitPointerLock && document.exitPointerLock(); show('pause'); }
function buildPicker() {
  const l = $('#pickList'); l.innerHTML = '';
  Object.entries(REC).forEach(([k, r]) => { const b = document.createElement('button'); const ok = r.lvl <= lvl(); b.textContent = ok ? r.n : `${r.n} (unlocks at Lv ${r.lvl})`; b.disabled = !ok; b.style.opacity = ok ? 1 : .5; b.onclick = () => { nextRecipe(k); begin(); }; l.append(b); });
}
function buildBook() {
  $('#bookList').innerHTML = Object.values(REC).map(r => `<div><b>${r.n}</b> (Lv ${r.lvl}, ₦${r.pay})<br>${r.steps.map((s, i) => `${i + 1}. ${s[1]} at ${NAMES[s[0]]}`).join('<br>')}</div>`).join('');
}

/* ---------- Per-frame logic ---------- */
function update(dt) {
  // movement
  let mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + joy.x, mz = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0) + joy.y;
  const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  const sp = 4 * dt, c = Math.cos(P.yaw), s = Math.sin(P.yaw);
  P.x = Math.max(-8, Math.min(8, P.x + (mx * c + mz * s) * sp)); P.z = Math.max(-5, Math.min(7.5, P.z + (-mx * s + mz * c) * sp));
  cam.position.set(P.x, 1.65 + Math.sin(performance.now() / 150) * .02 * (l > .1), P.z); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');

  if (G.mode === 'challenge') { G.time -= dt; if (G.time <= 0) return endGame(); }
  const st = G.rec.steps[G.step], [stn, label, kind, dur] = st;
  const near = Math.abs(P.x - ST[stn]) < 2.2 && P.z < -2.2;
  let prompt = '', prog = 0;
  if (G.cookT >= 0) { // pot is cooking
    G.cookT += dt; const r = G.cookT / dur; prog = Math.min(1, r);
    const col = G.rec.col; potFood.visible = true; potFood.material.color.setHex(r < 1 ? col[1] : (r < 1.35 ? col[2] : 0x1c1410));
    if (near) prompt = r < 1 ? 'Cooking… wait for it' : r < 1.35 ? 'Ready! Press E now' : 'Burning! Press E';
    if (pressed && near) { if (r < 1) toast('Not ready yet'); else { G.cookT = -1; potFood.visible = false; advance(r < 1.35 ? 1 : .4); } }
  } else if (near) {
    prompt = (kind === 'hold' ? 'Hold E: ' : kind === 'cook' ? 'E: Start – ' : 'E: ') + label;
    if (kind === 'tap' && pressed) advance(1);
    else if (kind === 'cook' && pressed) { G.cookT = 0; toast('Cooking started'); }
    else if (kind === 'hold') { if (actHeld) { G.prog += dt / dur; knife.position.y = 1.08 + Math.abs(Math.sin(performance.now() / 70)) * .12; if (G.prog >= 1) advance(1); } else G.prog = Math.max(0, G.prog - dt * .5); prog = G.prog; }
  }
  pressed = false;
  $('#prompt').textContent = prompt; $('#prog').style.display = prog > 0 ? 'block' : 'none'; $('#progf').style.width = prog * 100 + '%';
  $('#task').innerHTML = `<b>${G.rec.n}</b> · step ${G.step + 1}/${G.rec.steps.length}: ${label} at the <b>${NAMES[stn]}</b> ${status() ? '<br>' + status() : ''}`;
  $('#timer').textContent = G.mode === 'challenge' ? Math.ceil(G.time) + 's' : '';
  // steam
  steam.forEach(p => { const on = G.cookT >= 0; p.visible = on; if (!on) return; p.userData.t = (p.userData.t + dt * .5) % 1; const t = p.userData.t; p.position.set(ST.stove - .5 + Math.sin(t * 9 + p.id) * .1, 1.5 + t * 1.2, -7.4); p.material.opacity = .4 * (1 - t); p.scale.setScalar(1 + t * 2); });
}
function advance(q) {
  G.prog = 0; G.qsum = (G.qsum || 0) + q; knife.position.y = 1.08;
  if (G.step === G.rec.steps.length - 1) { const quality = Math.min(q, G.qMin || 1); G.qMin = 1; return finish(quality); }
  if (q < 1) G.qMin = q; else if (G.step === 0) G.qMin = 1;
  G.step++; refreshHeld(); toast('Done!');
}

/* ---------- Input ---------- */
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyE') { if (!e.repeat) pressed = true; actHeld = true; } if (e.code === 'Escape') pause(); });
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'KeyE') actHeld = false; });
$('#c').addEventListener('mousedown', e => { if (!G.playing) return; if (!TOUCH && document.pointerLockElement !== $('#c')) $('#c').requestPointerLock(); else { pressed = true; actHeld = true; } });
addEventListener('mouseup', () => { if (!TOUCH) actHeld = false; });
addEventListener('mousemove', e => { if (document.pointerLockElement === $('#c') && G.playing) { const k = G.sens * .0005; P.yaw -= e.movementX * k; P.pitch = Math.max(-1.2, Math.min(1.2, P.pitch - e.movementY * k)); } });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.playing && !TOUCH) pause(); });
// touch: joystick (left) and look (drag on canvas)
const jz = $('#joy'), kn = $('#knob'); let jid = null;
function jmove(t) { const r = jz.getBoundingClientRect(), dx = t.clientX - (r.left + 65), dy = t.clientY - (r.top + 65), d = Math.min(1, Math.hypot(dx, dy) / 55), a = Math.atan2(dy, dx); joy.x = Math.cos(a) * d; joy.y = Math.sin(a) * d; kn.style.transform = `translate(${joy.x * 40}px,${joy.y * 40}px)`; }
jz.addEventListener('touchstart', e => { e.preventDefault(); jid = e.changedTouches[0].identifier; jmove(e.changedTouches[0]); }, { passive: false });
jz.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === jid) jmove(t); }, { passive: false });
const jend = e => { for (const t of e.changedTouches) if (t.identifier === jid) { jid = null; joy.x = joy.y = 0; kn.style.transform = ''; } };
jz.addEventListener('touchend', jend); jz.addEventListener('touchcancel', jend);
let lid = null, lx = 0, ly = 0;
$('#c').addEventListener('touchstart', e => { const t = e.changedTouches[0]; if (lid === null) { lid = t.identifier; lx = t.clientX; ly = t.clientY; } }, { passive: true });
$('#c').addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === lid) { P.yaw -= (t.clientX - lx) * .006 * G.sens / 5; P.pitch = Math.max(-1.2, Math.min(1.2, P.pitch - (t.clientY - ly) * .006 * G.sens / 5)); lx = t.clientX; ly = t.clientY; } }, { passive: true });
$('#c').addEventListener('touchend', e => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; });
const ab = $('#act'); ab.addEventListener('touchstart', e => { e.preventDefault(); pressed = true; actHeld = true; }, { passive: false });
ab.addEventListener('touchend', e => { e.preventDefault(); actHeld = false; }, { passive: false });
$('#pauseBtn').onclick = pause;

/* ---------- Menus ---------- */
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => startMode(b.dataset.mode));
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => show(G.playing || G.rec && G.mode && !$('#hud').classList.contains('hide') ? 'pause' : 'menu'));
$('#bookBtn').onclick = () => { buildBook(); show('book'); };
$('#setBtn').onclick = () => show('settings');
$('#sens').oninput = e => G.sens = +e.target.value;
$('#shadows').onchange = e => { renderer.shadowMap.enabled = e.target.checked; sun.castShadow = e.target.checked; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); };
$('#resume').onclick = () => { show(null); G.playing = true; if (!TOUCH) $('#c').requestPointerLock(); };
$('#restart').onclick = () => startMode(G.mode);
$('#quit').onclick = () => { G.playing = false; $('#hud').classList.add('hide'); show('menu'); };
$('#endBtn').onclick = () => show('menu');
// fix: "Back" from settings/book while paused returns to menu unless the game is mid-session
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => show($('#hud').classList.contains('hide') ? 'menu' : 'pause'));

/* ---------- Loop ---------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
nextRecipe('plantain'); hudStats();
let last = performance.now();
(function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (G.playing) update(dt); else { cam.position.set(Math.sin(now / 4000) * 2, 2, 3); cam.rotation.set(-.15, Math.sin(now / 4000) * .15, 0, 'YXZ'); }
  renderer.render(scene, cam); requestAnimationFrame(loop);
})(performance.now());
