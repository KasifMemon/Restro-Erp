// Shared audio for kitchen alerts. Browsers keep audio locked until the page has had a tap/click,
// so one context is created and unlocked on the first interaction anywhere in the app.
let ctx = null;
const AC = () => window.AudioContext || window.webkitAudioContext;

export function unlockAudio() {
  try {
    if (!AC()) return;
    if (!ctx) ctx = new (AC())();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const b = ctx.createBuffer(1, 1, 22050); // silent blip: required by iOS Safari to fully unlock
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch { /* ignore */ }
}
export const audioReady = () => Boolean(ctx && ctx.state === 'running');
export const audioSupported = () => Boolean(AC());

export function installAutoUnlock() {
  const evs = ['pointerdown', 'touchstart', 'keydown', 'click'];
  const h = () => { unlockAudio(); if (audioReady()) evs.forEach((e) => window.removeEventListener(e, h, true)); };
  evs.forEach((e) => window.addEventListener(e, h, { capture: true, passive: true }));
}

export function ding() {
  try {
    if (!ctx) unlockAudio();
    if (!ctx) return;
    const play = () => {
      [880, 1175, 880, 1175].forEach((f, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.2;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.start(t); o.stop(t + 0.19);
      });
      try { navigator.vibrate?.([120, 60, 120]); } catch { /* ignore */ }
    };
    if (ctx.state === 'running') play(); else ctx.resume().then(play).catch(() => {});
  } catch { /* ignore */ }
}
