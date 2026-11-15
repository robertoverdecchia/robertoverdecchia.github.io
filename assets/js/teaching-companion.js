/* Teaching page easter egg: a tiny gryphon living behind a tiny door in the bottom-right corner.
   The gryphon is a set of short looping animations in images/gryphon/
   (idle, walk, fly, happy, wave, dizzy, sleep), cross-faded according to what it is doing.
   Click the door to let it out. Tap it for hearts; it cannot be picked up.
   It only moves when you steer it: keyboard A / D walk, W flap upwards, S dive.
   On phones and tablets it glides the way the device is inclined (motion sensors), like a marble on a tray.
   Walk or glide it to its door, or click the door again, to send it home.
   The game: five pages appear one after the other; steer the gryphon into each one.
   After the fifth it graduates: a cap and a speech bubble with the time it took. */
(function () {
  'use strict';
  if (window.__teachingCompanion) { return; }
  window.__teachingCompanion = true;

  var SIZE = 48;                 // on-screen height of the companion, in pixels
  var FACES_LEFT = true;         // which way the gryphon in the pictures looks; it is mirrored when it moves the other way
  var RUN_SPEED = 3.2;           // how fast it moves when steered with A / D
  var FADE = 0.13;               // seconds of cross-fade between two animations
  var TILT_DEAD = 6, TILT_FULL = 28;   // degrees of inclination that are ignored / that give full speed
  var PAGES_TO_WIN = 5;          // how many pages it has to collect
  var PAGE_STAYS = 4500;         // a page moves somewhere else after this many milliseconds
  // The animations sit next to this script's folder: <site>/images/gryphon/<name>.webp
  var me = document.currentScript && document.currentScript.src;
  var FOLDER = me ? me.replace(/assets\/js\/[^\/]*$/, 'images/gryphon/') : '/images/gryphon/';
  var NAMES = ['idle', 'walk', 'fly', 'happy', 'wave', 'dizzy', 'sleep'];
  var EXT = '.webp';
  var R = SIZE / 2;
  var GRAVITY = 0.55, BOUNCE = 0.45, FRICTION = 0.90, AIR = 0.995;
  var SCROLL_PUSH = 0.06, SCROLL_MAX = 8;   // how strongly scrolling moves it, and the top speed it can reach that way
  var SCROLL_LIFT = 110;                    // roughly how high (in pixels) scrolling can carry it
  var FLUTTER = 7;                          // top falling speed: it flaps its wings on the way down
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- styles ----------
  var css = document.createElement('style');
  css.textContent =
    '#tc-dot{position:fixed;right:16px;bottom:0;width:11px;height:14px;border-radius:6px 6px 0 0;background:#2b1d16;' +
      'opacity:.3;cursor:pointer;z-index:9000;transition:opacity .3s,box-shadow .3s;-webkit-perspective:60px;perspective:60px}' +
    '#tc-dot:before{content:"";position:absolute;left:1px;top:1px;right:1px;bottom:0;border-radius:5px 5px 0 0;' +
      'background:#9a6a44 radial-gradient(circle at 78% 58%,#e9c46a 0,#e9c46a 1px,transparent 1.6px);' +
      '-webkit-transform-origin:left center;transform-origin:left center;transition:transform .35s;animation:tc-peek 9s ease-in-out infinite}' +
    '#tc-dot:after{content:"";position:absolute;left:-12px;top:-12px;right:-14px;bottom:0}' +
    '#tc-dot:hover{opacity:.85}' +
    '#tc-dot:hover:before{transform:rotateY(-35deg);animation:none}' +
    '#tc-dot.tc-away:before{animation:none}' +
    '#tc-dot.tc-open{opacity:.9;pointer-events:none}' +
    '#tc-dot.tc-open:before{transform:rotateY(-78deg);animation:none}' +
    '@keyframes tc-peek{0%,91%,100%{transform:rotateY(0)}94%{transform:rotateY(-30deg)}97%{transform:rotateY(0)}}' +
    '#tc-stage{position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9000;overflow:hidden}' +
    '#tc-pal{position:absolute;left:0;top:0;height:' + SIZE + 'px;margin:-' + R + 'px 0 0 -' + R + 'px;' +
      'pointer-events:auto;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;will-change:transform}' +
    '#tc-pal img{position:absolute;left:0;top:0;height:100%;width:auto;pointer-events:none;-webkit-user-drag:none;opacity:0;transition:opacity ' + FADE + 's linear}' +
    '#tc-pal img.tc-on{opacity:1}' +
    '.tc-page{position:absolute;left:0;top:0;width:22px;height:26px;margin:-13px 0 0 -11px;pointer-events:none;transition:opacity .25s;animation:tc-bob 1.6s ease-in-out infinite}' +
    '.tc-page svg,.tc-hat svg{display:block;width:100%;height:100%;overflow:visible}' +
    '@keyframes tc-bob{0%,100%{margin-top:-13px}50%{margin-top:-19px}}' +
    '.tc-count{position:absolute;left:50%;top:100%;transform:translateX(-50%);font:bold 10px/1.2 sans-serif;color:#8a7a68;white-space:nowrap}' +
    '.tc-hat{position:absolute;left:14%;top:-17%;width:46%;height:32%;transform:rotate(-13deg);pointer-events:none;animation:tc-pop .4s ease-out}' +
    '@keyframes tc-pop{0%{transform:rotate(-13deg) translateY(-30px);opacity:0}100%{transform:rotate(-13deg);opacity:1}}' +
    '.tc-bubble{position:absolute;left:0;top:0;padding:5px 10px;border-radius:12px;background:#fff;color:#2b1d16;border:2px solid #4b2e1a;' +
      'font:bold 13px/1.3 sans-serif;white-space:nowrap;text-align:center;pointer-events:none;animation:tc-pop2 .3s ease-out}' +
    '.tc-bubble:after{content:"";position:absolute;left:50%;top:100%;margin-left:-6px;border:6px solid transparent;border-top-color:#4b2e1a}' +
    '@keyframes tc-pop2{0%{opacity:0}100%{opacity:1}}' +
    '.tc-fx{position:absolute;left:0;top:0;font:14px/1 sans-serif;pointer-events:none;animation:tc-rise 1.1s ease-out forwards}' +
    '@keyframes tc-rise{0%{opacity:0;margin-top:0}20%{opacity:1}100%{opacity:0;margin-top:-34px}}';
  document.head.appendChild(css);

  // ---------- the tiny door ----------
  var dot = document.createElement('div');
  dot.id = 'tc-dot';
  dot.title = '...';
  document.body.appendChild(dot);

  // ---------- the companion ----------
  var stage, pal, pics = [], front = 0, shown = '', sprites = {}, keys = {}, steering = 0;

  // ---------- the game: pages and the graduation cap ----------
  var PAGE_SVG = '<svg viewBox="0 0 20 24" aria-hidden="true"><path d="M2 1h11l5 5v17H2z" fill="#fffdf5" stroke="#4b2e1a" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M13 1v5h5" fill="#e9dfc8" stroke="#4b2e1a" stroke-width="1.6" stroke-linejoin="round"/><path d="M5 11h10M5 15h10M5 19h7" stroke="#b9a98a" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var HAT_SVG = '<svg viewBox="0 0 32 22" aria-hidden="true"><path d="M8 11v5c4 3 12 3 16 0v-5l-8 3z" fill="#3a3a44" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<path d="M16 2 31 8 16 14 1 8z" fill="#2b2b33" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/><path d="M27 9v8" stroke="#e9c46a" stroke-width="1.4"/><circle cx="27" cy="18.5" r="1.8" fill="#e9c46a"/></svg>';
  var caught = 0, won = false, page = null, pageX = 0, pageY = 0, pageZone = -1, pageTimer = 0, bubble = null, bubbleUntil = 0;
  var playedMs = 0, outSince = 0;                        // time the gryphon has spent outside its door

  function placePage() {                                 // somewhere else every time: the window is split in six zones
    var zone, tries = 0;
    do {
      zone = Math.floor(Math.random() * 6);
      pageX = W() * (0.18 + 0.32 * (zone % 3)) + (Math.random() - 0.5) * W() * 0.14;
      pageY = H() * (zone < 3 ? 0.3 : 0.68) + (Math.random() - 0.5) * H() * 0.16;
      tries++;
    } while (tries < 12 && (zone === pageZone || Math.abs(pageX - x) + Math.abs(pageY - y) < 170));
    pageZone = zone;
    page.style.transform = 'translate(' + pageX.toFixed(0) + 'px,' + pageY.toFixed(0) + 'px)';
    page.style.opacity = 1;
    clearTimeout(pageTimer);
    pageTimer = setTimeout(function () {                 // not caught in time: it fades and pops up elsewhere
      if (!page) { return; }
      page.style.opacity = 0;
      pageTimer = setTimeout(function () { if (page) { placePage(); } }, 280);
    }, PAGE_STAYS);
  }

  function nextPage(delay) {
    clearTimeout(pageTimer);
    if (won || !awake || hiding) { return; }
    pageTimer = setTimeout(function () {
      if (won || !awake || hiding || page) { return; }
      page = document.createElement('div'); page.className = 'tc-page';
      page.innerHTML = PAGE_SVG + '<span class="tc-count">' + (caught + 1) + ' / ' + PAGES_TO_WIN + '</span>';
      page.style.opacity = 0; stage.appendChild(page);
      placePage();
    }, delay);
  }

  function dropPage() { clearTimeout(pageTimer); if (page && page.parentNode) { page.parentNode.removeChild(page); } page = null; }

  function catchPage(t) {
    dropPage(); caught++;
    fx(caught + ' / ' + PAGES_TO_WIN, '#3d8b4f');
    happyUntil = t + 900;
    if (caught >= PAGES_TO_WIN) { win(t); } else { nextPage(700); }
  }

  function win(t) {
    won = true; happyUntil = t + 4000; bubbleUntil = t + 6000;
    var hat = document.createElement('div'); hat.className = 'tc-hat'; hat.innerHTML = HAT_SVG; pal.appendChild(hat);
    // how long it took, from the door opening to the last page (only the time spent outside the door counts)
    var secs = (playedMs + (now() - outSince)) / 1000, m = Math.floor(secs / 60), sec = secs - m * 60;
    var took = m ? m + ':' + (sec < 10 ? '0' : '') + sec.toFixed(1) : sec.toFixed(1) + ' s';
    bubble = document.createElement('div'); bubble.className = 'tc-bubble';
    bubble.appendChild(document.createTextNode(took + ','));
    bubble.appendChild(document.createElement('br'));
    bubble.appendChild(document.createTextNode('congratz!'));
    stage.appendChild(bubble);
  }

  // ---------- gliding with the phone's inclination ----------
  var tilt = { x: 0, y: 0, base: null, on: false };
  function curve(deg) {                                  // dead zone, then a smooth ramp up to full speed
    var a = Math.abs(deg); if (a < TILT_DEAD) { return 0; }
    return (deg < 0 ? -1 : 1) * Math.min(1, (a - TILT_DEAD) / (TILT_FULL - TILT_DEAD));
  }
  function onTilt(e) {
    if (e.beta === null || e.gamma === null) { return; }
    var lr = e.gamma, fb = e.beta;                       // left-right and front-back inclination, in degrees
    var turn = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    if (turn === 90) { var q = lr; lr = fb; fb = -q; } else if (turn === 270 || turn === -90) { var q2 = lr; lr = -fb; fb = q2; }
    if (tilt.base === null) { tilt.base = fb; }          // however the phone is held when the gryphon comes out counts as level
    tilt.x = curve(lr); tilt.y = curve(fb - tilt.base);
    if (awake && !running && (tilt.x || tilt.y)) { start(); }
  }
  function enableTilt() {                                // called from the tap on the door, which iOS needs for its permission prompt
    tilt.base = null;
    if (tilt.on || !window.DeviceOrientationEvent || !(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) { return; }
    var listen = function () { tilt.on = true; window.addEventListener('deviceorientation', onTilt); };
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') { listen(); } }).catch(function () {});
    } else { listen(); }
  }

  // ---------- state ----------
  var x = 0, y = 0, vx = 0, vy = 0, angle = 0, squash = 0, size = 1, facing = 1, spin = 0;
  var awake = false, held = false, onGround = false, hiding = false, running = false;
  var lastScroll = window.pageYOffset || 0, lastFrame = 0, lastActive = 0;
  var dizzyUntil = 0, happyUntil = 0, waveUntil = 0, sleeping = false, nextIdle = 0, taps = [], zTimer = 0;

  function W() { return window.innerWidth; }
  function H() { return window.innerHeight; }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function doorX() { return W() - 21.5; }

  function build() {
    stage = document.createElement('div'); stage.id = 'tc-stage';
    pal = document.createElement('div'); pal.id = 'tc-pal';
    for (var i = 0; i < 2; i++) {                        // two stacked pictures, so one animation can fade into the next
      var im = document.createElement('img'); im.alt = ''; im.draggable = false;
      pics.push(im); pal.appendChild(im);
    }
    pics[0].onload = function () {                       // centre the picture on its own width
      var w = SIZE * this.naturalWidth / this.naturalHeight;
      pal.style.width = w + 'px'; pal.style.marginLeft = (-w / 2) + 'px'; this.onload = null; start();
    };
    NAMES.forEach(function (n) { var pre = new Image(); pre.src = FOLDER + n + EXT; sprites[n] = pre; });   // preload every animation
    show('idle');
    stage.appendChild(pal); document.body.appendChild(stage);
    pal.addEventListener('pointerdown', onDown);
  }

  // Swap animations smoothly: the new one fades in on top while the old one fades out
  function show(name) {
    if (name === shown) { return; }
    shown = name;
    var next = pics[1 - front], prev = pics[front];
    next.src = FOLDER + name + EXT;
    next.className = 'tc-on'; prev.className = '';
    front = 1 - front;
  }

  // Which picture fits what it is doing right now
  function pose(t) {
    if (t < dizzyUntil) { return 'dizzy'; }
    if (sleeping) { return 'sleep'; }
    if (t < happyUntil) { return 'happy'; }
    if (!onGround) { return 'fly'; }
    if (Math.abs(steering) > 0.15 && !hiding) { return 'walk'; }
    if (t < waveUntil) { return 'wave'; }
    return 'idle';
  }

  function fx(text, color) {
    var s = document.createElement('span');
    s.className = 'tc-fx'; s.textContent = text; s.style.color = color || '#e2574c';
    s.style.transform = 'translate(' + (x + (Math.random() * 16 - 8)) + 'px,' + (y - R - 14) + 'px)';
    stage.appendChild(s);
    setTimeout(function () { if (s.parentNode) { s.parentNode.removeChild(s); } }, 1150);
  }

  function touch() { lastActive = now(); if (sleeping) { sleeping = false; fx('!', '#e0a030'); } start(); }

  // ---------- waking up and hiding ----------
  function wake() {
    if (awake) { return; }
    outSince = now();
    enableTilt();
    if (!stage) { build(); }
    awake = true; hiding = false; sleeping = false;
    stage.style.display = ''; dot.className = 'tc-open';
    setTimeout(function () { if (awake && !hiding && !held) { dot.className = 'tc-away'; } }, 900);
    size = 0.25;                                        // it squeezes out of the door, then pops to full size
    x = doorX(); y = H() - R; vx = -(2.5 + Math.random() * 1.5); vy = -(7.5 + Math.random() * 1.5); angle = 0;
    nextIdle = now() + 12000; touch(); fx('\u2665');
    nextPage(3000);
  }

  function goHide() { if (awake && !hiding) { hiding = true; held = false; sleeping = false; waveUntil = 0; keys = {}; dropPage(); pal.className = ''; dot.className = 'tc-open'; start(); } }

  function finishHide() {
    if (!won) { playedMs += now() - outSince; }
    awake = false; hiding = false; running = false;
    stage.style.display = 'none'; dot.className = '';
  }

  // ---------- tapping (it cannot be picked up) ----------
  function onDown(e) {
    if (hiding) { return; }
    e.preventDefault();
    var t = now();
    taps = taps.filter(function (v) { return t - v < 2500; }); taps.push(t);
    if (taps.length >= 5) { taps = []; dizzyUntil = t + 3000; spin = 720; vx = (Math.random() < 0.5 ? -1 : 1) * 5; vy = -7; fx('@_@', '#8a7a68'); }
    else { happyUntil = t + 900; vy = -(7 + Math.random() * 3); vx += Math.random() * 4 - 2; squash = 0.35; fx('\u2665'); }
    waveUntil = 0;
    touch();
  }

  // ---------- scrolling carries it along ----------
  function onScroll() {
    var s = window.pageYOffset || 0, d = s - lastScroll; lastScroll = s;
    if (!awake || held || hiding || calm || !d) { return; }
    // The page moves by -d: scrolling down sweeps the companion upwards, scrolling up presses it down
    var push = -d * SCROLL_PUSH;
    if (push < 0) { push *= 1 - clamp((H() - R - y) / SCROLL_LIFT, 0, 1); }   // the higher it already is, the less scrolling can lift it
    vy = clamp(vy + push, -SCROLL_MAX, SCROLL_MAX);
    vx += (Math.random() - 0.5) * Math.min(Math.abs(d), 30) * 0.04;
    if (d < 0 && onGround) { squash = Math.min(0.45, squash + Math.abs(d) * 0.01); }
    touch();
  }

  // ---------- animation loop (pauses itself when nothing is happening) ----------
  function start() { if (!running && awake) { running = true; lastFrame = now(); requestAnimationFrame(frame); } }

  function frame(t) {
    if (!awake) { running = false; return; }
    var k = clamp((t - lastFrame) / 16.67, 0.2, 3); lastFrame = t;
    var floor = H() - R;

    if (hiding) {                                       // hop back to the door, then squeeze through it
      var dx = doorX() - x;
      if (onGround && Math.abs(dx) > 10) { vx = clamp(dx * 0.06, -6, 6); vy = -5.5; onGround = false; }
      if (Math.abs(dx) <= 10 && y >= floor - 1) {
        vx = 0; x += dx * 0.25 * k; size += (0.15 - size) * 0.16 * k;
        if (size < 0.27) { finishHide(); return; }
      }
    } else if (size < 1) { size = Math.min(1, size + (1.02 - size) * 0.14 * k); }

    // steering comes from the keyboard or from how the phone is inclined
    var steer = clamp((keys.d ? 1 : 0) - (keys.a ? 1 : 0) + tilt.x, -1, 1);
    var up = keys.w ? 1 : Math.max(0, -tilt.y), down = keys.s ? 1 : Math.max(0, tilt.y);
    if (!held && !hiding && onGround && steer > 0.3 && x > W() - R - 36) { goHide(); steer = 0; }   // walked up to its door: go home
    steering = hiding ? 0 : steer;
    // a page is caught when the gryphon gets to it by itself (flying, walking or thrown), not while it is carried
    if (page && !held && !hiding && page.style.opacity !== '0' && Math.abs(pageX - x) < R + 6 && Math.abs(pageY - y) < R + 8) { catchPage(t); }
    if (!held && !hiding && (steer || up || down)) {
      lastActive = t; waveUntil = 0;
      if (sleeping) { sleeping = false; fx('!', '#e0a030'); }
      if (up) { vy = Math.max(vy - 1.25 * up * k, -7.5); }
      if (down && !onGround) { vy = Math.min(vy + 1.0 * down * k, 13); }
      if (steer) { vx += (steer * RUN_SPEED - vx) * 0.25 * k; }
    }
    if (!held) {
      vy += GRAVITY * k; vx *= Math.pow(AIR, k);
      if (vy > FLUTTER && down < 0.3) { vy += (FLUTTER - vy) * 0.25 * k; }   // flapping slows the fall
      x += vx * k; y += vy * k;
      if (x < R) { x = R; vx = Math.abs(vx) * BOUNCE; }
      if (x > W() - R) { x = W() - R; vx = -Math.abs(vx) * BOUNCE; }
      if (y < R) { y = R; vy = Math.abs(vy) * BOUNCE; }
      if (y >= floor) {
        y = floor;
        if (vy > 2.2) { squash = Math.max(squash, Math.min(0.45, vy * 0.035)); vy = -vy * BOUNCE; }
        else { vy = 0; }
        if (!steer) { vx *= Math.pow(FRICTION, k); }
        onGround = true;
      } else { onGround = false; }
      if (onGround && Math.abs(vx) < 0.05) { vx = 0; }
      if (Math.abs(vx) > 0.4) { facing = vx < 0 ? -1 : 1; }
      var lean = onGround ? 0 : clamp(vx * 3, -25, 25);    // it leans into the direction it flies
      angle += (lean - angle) * 0.2 * k;
    } else { angle += (Math.sin(t / 90) * 8 - angle) * 0.3 * k; }   // it wriggles while held
    if (spin > 0) { spin = Math.max(0, spin - 22 * k); }

    squash *= Math.pow(0.80, k);

    // left alone it stays where it is: now and then it waves a wing, and eventually it naps
    var idle = t - lastActive, busy = t < waveUntil || t < dizzyUntil || steer || up;
    if (!held && !hiding && onGround && !busy && !calm) {
      if (!sleeping && idle > 45000) { sleeping = true; zTimer = 0; }
      if (!sleeping && t > nextIdle) { waveUntil = t + 1700; nextIdle = t + 14000 + Math.random() * 14000; }
    }
    if (sleeping && t > zTimer) { zTimer = t + 2600; fx('z', '#8a94a6'); }

    draw(t);

    var atRest = onGround && vx === 0 && vy === 0 && squash < 0.01 && size === 1 && Math.abs(angle) < 0.3 && spin === 0 && !held && !hiding;
    if (!atRest || steer || up || t < dizzyUntil || t < happyUntil || t < waveUntil || t < bubbleUntil) { requestAnimationFrame(frame); }
    else {                                              // nothing moves: stop the loop and just check back later
      running = false;
      setTimeout(start, sleeping ? 2600 : Math.max(120, nextIdle - t));
    }
  }

  function draw(t) {
    var sx = 1 + squash * 0.55, sy = 1 - squash * 0.75;
    if (!onGround && !held) { var st = clamp(Math.abs(vy) * 0.012, 0, 0.18); sx -= st; sy += st; }
    if (sleeping) { sy *= 1 + Math.sin(t / 900) * 0.035; }
    sx *= size; sy *= size;
    show(pose(t));
    if (bubble) {
      if (t > bubbleUntil) { bubble.parentNode.removeChild(bubble); bubble = null; }
      else { bubble.style.transform = 'translate(' + clamp(x - 40, 4, W() - 96).toFixed(0) + 'px,' + Math.max(4, y - R - 58).toFixed(0) + 'px)'; }
    }
    var mirror = (facing < 0) === FACES_LEFT ? 1 : -1;   // look where it is going
    pal.style.transform = 'translate(' + x.toFixed(1) + 'px,' + (y + (1 - sy) * R).toFixed(1) + 'px) rotate(' + (angle + spin).toFixed(1) + 'deg) scale(' + (sx * mirror).toFixed(3) + ',' + sy.toFixed(3) + ')';
  }

  // ---------- keyboard: W A S D ----------
  function onKey(e) {
    if (!awake || hiding || e.ctrlKey || e.metaKey || e.altKey) { return; }
    var el = e.target, tag = el && el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) { return; }
    var key = (e.key || '').toLowerCase();
    if (key !== 'w' && key !== 'a' && key !== 's' && key !== 'd') { return; }
    var down = e.type === 'keydown';
    keys[key] = down;
    if (down) { start(); }
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', function () { keys = {}; });

  // ---------- wiring ----------
  dot.addEventListener('click', function () { if (awake) { goHide(); } else { wake(); } });   // the door lets it out, and calls it back in
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    if (awake) { x = clamp(x, R, W() - R); y = clamp(y, R, H() - R); start(); }
  });
})();