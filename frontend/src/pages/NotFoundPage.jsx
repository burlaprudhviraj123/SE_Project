import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const containerRef = useRef(null);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const $ = (sel) => root.querySelector(sel);

    const scene = $('[data-scene]');
    const bird = $('[data-bird]');
    const limbBack = $('[data-limb="back"]');
    const limbFront = $('[data-limb="front"]');
    const toesBack = $('[data-toes="back"]');
    const toesFront = $('[data-toes="front"]');
    const head = $('[data-head]');
    const body = $('[data-body]');
    const wing = $('[data-wing]');
    const pupil = $('[data-pupil]');
    const armSvg = $('[data-arm]');
    const armLimb = $('[data-arm-limb]');
    const armHand = $('[data-arm-hand]');
    const lens = $('[data-lens]');
    const trail = $('[data-trail]');
    const bubble = $('[data-bubble]');
    const bubbleText = $('[data-bubble-text]');
    const hint = $('[data-hint]');

    if (!scene || !bird) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const lerp = (a, b, t) => a + (b - a) * t;

    const VB_MID = 118;
    const VB_FLOOR = 250;
    const GROUND_Y = 248;

    const HIP = [{ x: 110, y: 208 }, { x: 128, y: 208 }];
    const THIGH = 25, SHIN = 25;
    const STRIDE = 60;
    const DUTY = 0.60;
    const LIFT = 12;
    const BOB = 6;
    const THRUST = 9;
    const MAX_SPEED = 1.3;

    function footAt(u) {
      const sweep = DUTY * STRIDE;
      if (u < DUTY) {
        const s = u / DUTY;
        return { x: (0.5 - s) * sweep, y: 0 };
      }
      const s = (u - DUTY) / (1 - DUTY);
      const e = s * s * (3 - 2 * s);
      return { x: (-0.5 + e) * sweep, y: -LIFT * Math.sin(Math.PI * s) };
    }

    function solveLeg(hip, foot) {
      let dx = foot.x - hip.x, dy = foot.y - hip.y;
      let d = Math.hypot(dx, dy) || 0.001;
      const far = THIGH + SHIN - 0.8, near = Math.abs(THIGH - SHIN) + 8;
      if (d > far) { dx *= far / d; dy *= far / d; d = far; }
      if (d < near) { dx *= near / d; dy *= near / d; d = near; }
      const cosA = clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1);
      const ang = Math.atan2(dy, dx) + Math.acos(cosA);
      return {
        knee: { x: hip.x + THIGH * Math.cos(ang), y: hip.y + THIGH * Math.sin(ang) },
        foot: { x: hip.x + dx, y: hip.y + dy },
      };
    }

    const LENS_OFF = -0.78;
    const SHOULDER = { x: 150, y: 158 };
    const MOUTH = { x: 146, y: 40 };

    const M = { w: 0, h: 0, groundY: 0, scale: 1, birdW: 0, birdH: 0, lensR: 74, offX: 0, offY: 0 };

    function measure() {
      if (!scene || !bird) return;
      const r = scene.getBoundingClientRect();
      const ground = parseFloat(getComputedStyle(scene).getPropertyValue('--ground')) || 54;
      M.w = r.width;
      M.h = r.height;
      M.groundY = r.height - ground;
      M.birdW = bird.offsetWidth || 150;
      M.birdH = bird.offsetHeight || 160;
      M.scale = (bird.offsetHeight / 260) || 1;
      M.lensR = parseFloat(getComputedStyle(root).getPropertyValue('--lens-r')) || 74;
      M.offX = M.offY = M.lensR * LENS_OFF;
      scene.dataset.lensOff = `${M.offX.toFixed(1)},${M.offY.toFixed(1)}`;
    }

    function birdPoint(vx, vy) {
      return {
        x: S.bx + S.faceT * (vx - VB_MID) * M.scale,
        y: M.groundY - (VB_FLOOR - vy) * M.scale,
      };
    }

    const S = {
      bx: 0,
      vx: 0,
      face: 1,
      faceT: 1,
      side: 1,
      walking: false,
      phase: 0,
      step: 0,
      lx: 0, ly: 0,
      tlx: 0, tly: 0,
      gait: 0,
      frontFootX: 0,
      still: 0,
      t: 0,
      live: false,
      said: -1,
    };

    const LINES = [
      'Nothing here.',
      'Swept it twice.',
      'Not a crumb.',
      'Definitely gone.',
      'Try the front door?',
    ];

    let last = 0;
    let raf = 0;
    let saying = false;
    const prints = [];

    function dropPrint() {
      if (!trail) return;
      const el = document.createElement('span');
      el.className = 'print';
      el.style.setProperty('--fx', (S.bx + S.faceT * (S.frontFootX - VB_MID) * M.scale).toFixed(1));
      el.style.setProperty('--fy', (M.groundY + 4).toFixed(1));
      el.style.setProperty('--fd', String(S.face));
      el.style.setProperty('--fr', `${(Math.random() * 10 - 5).toFixed(1)}deg`);
      trail.appendChild(el);
      requestAnimationFrame(() => el.classList.add('is-in'));
      prints.push(el);

      const kill = () => {
        el.classList.remove('is-in');
        setTimeout(() => el.remove(), 600);
      };
      setTimeout(kill, 2600);
      while (prints.length > 14) prints.shift()?.remove();
    }

    function speak(moving) {
      if (!bubble || !bubbleText) return;
      if (moving) {
        if (saying) { saying = false; bubble.style.setProperty('--say', '0'); }
        return;
      }
      if (saying) { place(); return; }
      if (S.still < 0.9) return;

      saying = true;
      S.said = (S.said + 1) % LINES.length;
      bubbleText.textContent = LINES[S.said];
      place();
      bubble.style.setProperty('--say', '1');
    }

    function place() {
      if (!bubble) return;
      const m = birdPoint(MOUTH.x, MOUTH.y);
      const bw = bubble.offsetWidth || 120;
      const sx = clamp(S.face > 0 ? m.x - bw - 4 : m.x + 4, 8, M.w - bw - 8);
      bubble.style.setProperty('--sx', sx.toFixed(1));
      bubble.style.setProperty('--sy', (m.y - 10).toFixed(1));
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = last ? clamp((now - last) / 1000, 0, 1 / 20) : 1 / 60;
      last = now;
      S.t += dt;

      if (!S.live) {
        S.tlx = M.w * 0.5 + Math.sin(S.t * 0.55) * M.w * 0.3;
        S.tly = M.groundY - M.h * 0.34 + Math.sin(S.t * 1.3) * 12;
      }

      const follow = 1 - Math.exp(-(S.live ? 16 : 5) * dt);
      S.lx = lerp(S.lx, S.tlx, follow);
      S.ly = lerp(S.ly, S.tly, follow);

      const reach = M.birdW * 0.92;
      const standoff = M.birdW * 0.86;

      if (Math.abs(S.lx - S.bx) > M.birdW * 0.8) S.side = S.lx > S.bx ? 1 : -1;

      const edge = M.birdW * 0.42;
      const want = clamp(S.lx - S.side * standoff, edge, M.w - edge);
      const gap = want - S.bx;
      const prevX = S.bx;

      const startThresh = gap * S.side > 0 ? M.birdW * 0.26 : M.birdW * 0.55;
      if (!S.walking && Math.abs(gap) > startThresh) S.walking = true;
      if (S.walking && Math.abs(gap) < 8) S.walking = false;

      if (S.walking) {
        S.face = gap > 0 ? 1 : -1;
        const committed = clamp(S.faceT * S.face, 0, 1);
        const pull = (1 - Math.exp(-4.2 * dt)) * committed;
        const cap = MAX_SPEED * M.birdW * dt;
        S.bx += clamp(gap * pull, -cap, cap);
      } else {
        S.face = S.side;
      }
      S.vx = (S.bx - prevX) / dt;

      S.faceT = lerp(S.faceT, S.face, 1 - Math.exp(-11 * dt));
      const faceR = Math.abs(S.faceT) < 0.06 ? Math.sign(S.faceT || S.face) * 0.06 : S.faceT;

      const travelled = Math.abs(S.bx - prevX);
      S.phase += (travelled / (STRIDE * M.scale)) * 2 * Math.PI;

      const moving = travelled / dt > 14;
      S.still = moving ? 0 : S.still + dt;

      S.gait = lerp(S.gait, S.walking ? 1 : 0, 1 - Math.exp(-7 * dt));

      const cycle = S.phase / (2 * Math.PI);
      const g = S.gait;

      const bob = -BOB * (0.5 - 0.5 * Math.cos(4 * Math.PI * cycle)) * g;
      const lean = clamp(Math.abs(S.vx) * 0.020, 0, 5) * g;
      body?.style.setProperty('--bob', bob.toFixed(2));
      body?.style.setProperty('--lean', lean.toFixed(2));

      const hp = (cycle * 2) % 1;
      const thrust = hp < 0.72
        ? THRUST * (1 - (hp / 0.72) * 2)
        : (() => { const s = (hp - 0.72) / 0.28, e = s * s * (3 - 2 * s); return THRUST * (-1 + 2 * e); })();
      head?.style.setProperty('--hx', (thrust * g).toFixed(2));

      const limbs = [limbBack, limbFront], toes = [toesBack, toesFront];
      for (let i = 0; i < 2; i++) {
        if (!limbs[i] || !toes[i]) continue;
        const hip = { x: HIP[i].x, y: HIP[i].y + bob };
        const u = (((cycle + i * 0.5) % 1) + 1) % 1;
        const f = footAt(u);
        const target = { x: hip.x + f.x * g, y: GROUND_Y + f.y * g };
        const L = solveLeg(hip, target);
        limbs[i].setAttribute('d',
          `M${hip.x.toFixed(1)} ${hip.y.toFixed(1)}L${L.knee.x.toFixed(1)} ${L.knee.y.toFixed(1)}L${L.foot.x.toFixed(1)} ${L.foot.y.toFixed(1)}`);
        const fx = L.foot.x, fy = L.foot.y;
        toes[i].setAttribute('d',
          `M${(fx - 11).toFixed(1)} ${(fy + 1).toFixed(1)}h22M${fx.toFixed(1)} ${fy.toFixed(1)}l-8 8M${fx.toFixed(1)} ${fy.toFixed(1)}l8 8`);
        if (i === 1) S.frontFootX = fx;
      }

      const rest = birdPoint(SHOULDER.x, SHOULDER.y);
      const up = clamp((rest.y - S.ly) / (M.birdW * 0.9), -1, 1);
      wing?.style.setProperty('--wing', (up * -18).toFixed(2));
      const shoulderPt = birdPoint(SHOULDER.x + Math.max(0, up) * 5, SHOULDER.y - Math.max(0, up) * 24);

      const step = Math.floor(S.phase / Math.PI);
      if (step !== S.step) {
        if (moving) dropPrint();
        S.step = step;
      }

      let dx = shoulderPt.x - S.lx;
      let dy = shoulderPt.y - S.ly;
      let d = Math.hypot(dx, dy) || 1;

      const FAR = reach * 1.45;
      const NEAR = reach * 0.9;
      if (d > FAR) { const over = d - FAR; S.lx += (dx / d) * over; S.ly += (dy / d) * over; }
      if (d < NEAR) { const in_ = NEAR - d; S.lx -= (dx / d) * in_ * 0.55; S.ly -= (dy / d) * in_ * 0.55; }

      S.lx = clamp(S.lx, M.lensR + 6, M.w - M.lensR - 6);
      S.ly = clamp(S.ly, M.lensR + 6, M.h - M.lensR - 6);

      dx = shoulderPt.x - S.lx; dy = shoulderPt.y - S.ly;
      d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const hand = { x: S.lx + ux * (M.lensR + 44), y: S.ly + uy * (M.lensR + 44) };

      const mx = (shoulderPt.x + hand.x) / 2;
      const my = (shoulderPt.y + hand.y) / 2;
      const bendX = -uy * 18 * Math.sign(S.faceT || 1);
      const bendY = ux * 18 * Math.sign(S.faceT || 1);
      armLimb?.setAttribute('d', `M${shoulderPt.x.toFixed(1)} ${shoulderPt.y.toFixed(1)} Q${(mx + bendX).toFixed(1)} ${(my + bendY).toFixed(1)} ${hand.x.toFixed(1)} ${hand.y.toFixed(1)}`);
      armHand?.setAttribute('cx', hand.x.toFixed(1));
      armHand?.setAttribute('cy', hand.y.toFixed(1));
      armSvg?.style.setProperty('--arm-w', (M.birdW * 0.055).toFixed(1));
      armHand?.setAttribute('r', (M.birdW * 0.062).toFixed(1));

      const eyePt = birdPoint(152, 112);
      const edx = (S.lx - eyePt.x) / M.scale * (S.faceT >= 0 ? 1 : -1);
      const edy = (S.ly - eyePt.y) / M.scale;
      const ed = Math.hypot(edx, edy) || 1;
      const pull = Math.min(ed, 60) / 60 * 6;
      pupil?.style.setProperty('--px', ((edx / ed) * pull).toFixed(2));
      pupil?.style.setProperty('--py', ((edy / ed) * pull).toFixed(2));

      bird?.style.setProperty('--bx', S.bx.toFixed(1));
      bird?.style.setProperty('--by', M.groundY.toFixed(1));
      bird?.style.setProperty('--face', faceR.toFixed(3));
      scene?.style.setProperty('--lx', S.lx.toFixed(1));
      scene?.style.setProperty('--ly', S.ly.toFixed(1));
      lens?.style.setProperty('--handle', ((Math.atan2(uy, ux) * 180) / Math.PI).toFixed(1));

      speak(moving);
    }

    function point(e) {
      if (reduced.matches || !scene) return;
      const r = scene.getBoundingClientRect();
      S.tlx = clamp(e.clientX - r.left + M.offX, M.lensR + 6, r.width - M.lensR - 6);
      S.tly = clamp(e.clientY - r.top + M.offY, M.groundY - (bird?.offsetHeight || 150) * 1.25, M.groundY - 12);

      if (!S.live) {
        S.live = true;
        scene.dataset.mode = 'live';
        if (hint) hint.textContent = 'Only the glass reads the floor. He follows it.';
      }
    }

    function onPointerLeave(e) {
      if (e.pointerType !== 'mouse') return;
      S.live = false;
      if (scene) scene.dataset.mode = 'patrol';
    }

    function pose() {
      measure();
      S.bx = M.w * 0.34;
      S.face = S.faceT = S.side = 1;
      S.walking = false;
      S.lx = M.w * 0.56;
      S.ly = M.groundY - M.h * 0.36;
      S.t = 0;
      S.phase = 0;
      S.gait = 0;

      bird?.style.setProperty('--bx', S.bx.toFixed(1));
      bird?.style.setProperty('--by', M.groundY.toFixed(1));
      bird?.style.setProperty('--face', '1');
      scene?.style.setProperty('--lx', S.lx.toFixed(1));
      scene?.style.setProperty('--ly', S.ly.toFixed(1));

      for (const [i, limb, toe] of [[0, limbBack, toesBack], [1, limbFront, toesFront]]) {
        if (!limb || !toe) continue;
        const hip = HIP[i];
        const L = solveLeg(hip, { x: hip.x, y: GROUND_Y });
        limb.setAttribute('d', `M${hip.x} ${hip.y}L${L.knee.x.toFixed(1)} ${L.knee.y.toFixed(1)}L${L.foot.x.toFixed(1)} ${L.foot.y.toFixed(1)}`);
        toe.setAttribute('d', `M${(L.foot.x - 11).toFixed(1)} ${(L.foot.y + 1).toFixed(1)}h22M${L.foot.x.toFixed(1)} ${L.foot.y.toFixed(1)}l-8 8M${L.foot.x.toFixed(1)} ${L.foot.y.toFixed(1)}l8 8`);
      }
      head?.style.setProperty('--hx', '0');
      body?.style.setProperty('--bob', '0');
      body?.style.setProperty('--lean', '0');

      const sh = birdPoint(SHOULDER.x, SHOULDER.y);
      const dx = sh.x - S.lx, dy = sh.y - S.ly, d = Math.hypot(dx, dy) || 1;
      const lensR = parseFloat(getComputedStyle(root).getPropertyValue('--lens-r')) || 74;
      const hand = { x: S.lx + (dx / d) * (lensR + 44), y: S.ly + (dy / d) * (lensR + 44) };
      armLimb?.setAttribute('d', `M${sh.x.toFixed(1)} ${sh.y.toFixed(1)} Q${((sh.x + hand.x) / 2).toFixed(1)} ${((sh.y + hand.y) / 2 - 16).toFixed(1)} ${hand.x.toFixed(1)} ${hand.y.toFixed(1)}`);
      armHand?.setAttribute('cx', hand.x.toFixed(1));
      armHand?.setAttribute('cy', hand.y.toFixed(1));
      lens?.style.setProperty('--handle', ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1));
    }

    function start() {
      measure();
      S.bx = M.w * 0.4;
      S.lx = M.w * 0.55;
      S.ly = M.groundY - M.h * 0.34;
      S.tlx = S.lx; S.tly = S.ly;
      S.face = S.faceT = S.side = 1;
      S.walking = false;
      if (scene) scene.dataset.mode = 'patrol';
      last = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (trail) trail.replaceChildren();
      prints.length = 0;
      if (bubble) bubble.style.setProperty('--say', '0');
      saying = false;
    }

    function apply() {
      if (reduced.matches) {
        stop();
        if (scene) scene.dataset.mode = 'still';
        if (hint) hint.textContent = 'Reduced motion: the glass is parked.';
        pose();
      } else {
        S.live = false;
        start();
        if (hint) hint.textContent = "Move your cursor — the glass is yours. He'll follow.";
      }
    }

    apply();
    reduced.addEventListener('change', apply);

    let lastW = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastW) { measure(); return; }
      lastW = window.innerWidth;
      measure();
      if (reduced.matches) pose();
      else {
        S.bx = clamp(S.bx, M.birdW * 0.42, M.w - M.birdW * 0.42);
        S.lx = clamp(S.lx, 40, M.w - 40);
        S.ly = clamp(S.ly, 40, M.groundY - 10);
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', point);
    window.addEventListener('pointerdown', point);
    document.addEventListener('pointerleave', onPointerLeave);

    if (document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }

    return () => {
      stop();
      reduced.removeEventListener('change', apply);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', point);
      window.removeEventListener('pointerdown', point);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return (
    <div className="sleuth-viewport" ref={containerRef}>
      <div className="paper" aria-hidden="true"></div>

      <main className="stage">
        <section className="scene" data-scene data-mode="patrol">
          <span className="floor" aria-hidden="true"></span>

          <p className="glyph glyph--base" aria-hidden="true">404</p>

          <div className="found" data-found aria-hidden="true">
            <p className="glyph glyph--lit">404</p>
            <span className="note" style={{ '--nx': '12%', '--ny': '22%' }}>swept</span>
            <span className="note" style={{ '--nx': '74%', '--ny': '16%' }}>nothing</span>
            <span className="note" style={{ '--nx': '31%', '--ny': '70%' }}>checked twice</span>
            <span className="note" style={{ '--nx': '86%', '--ny': '62%' }}>no crumbs</span>
            <span className="note" style={{ '--nx': '52%', '--ny': '88%' }}>still gone</span>
            <span className="note" style={{ '--nx': '6%',  '--ny': '56%' }}>looked here</span>
            <span className="note" style={{ '--nx': '63%', '--ny': '40%' }}>not this one</span>
            <span className="note" style={{ '--nx': '22%', '--ny': '44%' }}>empty</span>
            <span className="note" style={{ '--nx': '44%', '--ny': '14%' }}>dusted</span>
            <span className="note" style={{ '--nx': '92%', '--ny': '34%' }}>no trace</span>
            <span className="note" style={{ '--nx': '38%', '--ny': '32%' }}>moved out</span>
            <span className="note" style={{ '--nx': '70%', '--ny': '80%' }}>nobody home</span>
            <span className="note" style={{ '--nx': '16%', '--ny': '84%' }}>case cold</span>
          </div>

          <div className="dust" aria-hidden="true">
            <i style={{ '--x': '12%', '--y': '26%', '--s': '5px',   '--dx': '34px',  '--dy': '-46px', '--dur': '19s', '--delay': '-2s' }}></i>
            <i style={{ '--x': '26%', '--y': '52%', '--s': '3.5px', '--dx': '-26px', '--dy': '-38px', '--dur': '24s', '--delay': '-9s' }}></i>
            <i style={{ '--x': '38%', '--y': '18%', '--s': '4px',   '--dx': '22px',  '--dy': '40px',  '--dur': '21s', '--delay': '-14s' }}></i>
            <i style={{ '--x': '49%', '--y': '63%', '--s': '3px',   '--dx': '30px',  '--dy': '-30px', '--dur': '27s', '--delay': '-5s' }}></i>
            <i style={{ '--x': '61%', '--y': '31%', '--s': '5.5px', '--dx': '-32px', '--dy': '34px',  '--dur': '23s', '--delay': '-17s' }}></i>
            <i style={{ '--x': '72%', '--y': '57%', '--s': '3.5px', '--dx': '24px',  '--dy': '-44px', '--dur': '20s', '--delay': '-11s' }}></i>
            <i style={{ '--x': '84%', '--y': '22%', '--s': '4.5px', '--dx': '-20px', '--dy': '42px',  '--dur': '26s', '--delay': '-3s' }}></i>
            <i style={{ '--x': '92%', '--y': '47%', '--s': '3px',   '--dx': '-28px', '--dy': '-32px', '--dur': '22s', '--delay': '-20s' }}></i>
            <i style={{ '--x': '5%',  '--y': '68%', '--s': '4px',   '--dx': '26px',  '--dy': '-36px', '--dur': '25s', '--delay': '-7s' }}></i>
          </div>

          <div className="trail" data-trail aria-hidden="true"></div>

          <span className="ground" aria-hidden="true"></span>

          <div className="bird" data-bird aria-hidden="true">
            <svg className="bird__svg" viewBox="0 0 240 260" fill="none">
              <ellipse className="bird__shadow" data-shadow cx="118" cy="250" rx="66" ry="8" />

              <g className="bird__legs" data-legs>
                <g className="leg">
                  <path className="leg__limb" data-limb="back" d="" />
                  <path className="leg__toes" data-toes="back" d="" />
                </g>
                <g className="leg">
                  <path className="leg__limb" data-limb="front" d="" />
                  <path className="leg__toes" data-toes="front" d="" />
                </g>
              </g>

              <g className="bird__body" data-body>
                <path className="bird__tail" d="M62 132 14 96l14 44-16 34 54 12z" />
                <ellipse className="bird__blob" cx="118" cy="142" rx="72" ry="76" />

                <g className="bird__head" data-head>
                  <g className="bird__crest">
                    <path d="M96 74c-6-16-2-30 8-38 2 14 8 22 14 28z" />
                    <path d="M118 66c-2-18 4-30 16-36-2 14 0 24 4 32z" />
                    <path d="M140 72c4-16 14-25 26-26-8 11-11 21-10 31z" />
                  </g>

                  <path className="bird__beak" d="M176 120l40 11-40 12z" />

                  <g className="bird__eye" data-eye>
                    <circle className="eye__white" cx="152" cy="112" r="16" />
                    <circle className="eye__pupil" data-pupil cx="152" cy="112" r="7" />
                    <circle className="eye__spark" cx="147" cy="106" r="2.6" />
                  </g>
                </g>

                <g className="bird__spots">
                  <circle cx="92" cy="150" r="4.4" /><circle cx="80" cy="176" r="4.4" />
                  <circle cx="100" cy="192" r="4.4" /><circle cx="120" cy="204" r="4.4" />
                  <circle cx="72" cy="132" r="4.4" /><circle cx="144" cy="200" r="4.4" />
                </g>

                <g className="bird__wing" data-wing>
                  <ellipse className="wing__plate" cx="140" cy="166" rx="36" ry="44" />
                  <path className="wing__swirl" d="M156 152c-18 0-32 12-32 26 0 12 9 20 21 20" />
                </g>
              </g>
            </svg>
          </div>

          <svg className="arm" data-arm aria-hidden="true">
            <path className="arm__limb" data-arm-limb d="" />
            <circle className="arm__hand" data-arm-hand r="13" cx="0" cy="0" />
          </svg>

          <div className="lens" data-lens aria-hidden="true">
            <span className="lens__handle"></span>
            <span className="lens__ring"></span>
            <span className="lens__glass"></span>
          </div>

          <p className="bubble" data-bubble aria-hidden="true"><span data-bubble-text>Hmm.</span></p>
        </section>

        <section className="copy">
          <h1 className="copy__title">Case Closed · 404</h1>
          <p className="copy__sub">The grievance file or evidence you are looking for does not exist.</p>
          <p className="copy__actions">
            <Link className="btn btn--go" to={isAuthenticated ? "/dashboard" : "/login"}>
              {isAuthenticated ? "Return to Dashboard" : "Back to Login"}
            </Link>
          </p>
          <p className="u-sr" role="status" data-hint>Move your cursor over the scene — the magnifying glass follows it.</p>
        </section>
      </main>
    </div>
  );
}
