/** Play a short ring tone for incoming Dialog transfers. */
export function playTransferRingtone() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // Two-tone ring pattern
    playTone(880, 0, 0.15);
    playTone(660, 0.2, 0.15);
    playTone(880, 0.45, 0.15);
    playTone(660, 0.65, 0.15);
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Audio not available — silent fallback
  }
}
