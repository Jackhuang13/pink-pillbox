import Phaser from 'phaser';

/** 泡泡音效：正弦波 620→980Hz、0.18s 衰減（於點擊手勢內播放，符合 autoplay 政策） */
export function playPop(scene: Phaser.Scene): void {
  try {
    const ctx = (scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>).context;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  } catch {
    /* 音效失敗不影響應用 */
  }
}
