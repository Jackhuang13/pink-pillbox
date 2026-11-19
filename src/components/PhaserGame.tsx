import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ShelfScene } from '../game/scenes/ShelfScene';

export function PhaserGame() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 480,
      height: 300,
      backgroundColor: '#fff5f8',
      banner: false,
      autoFocus: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [ShelfScene]
    });
    gameRef.current = game;

    // 頁面隱藏：遊戲迴圈睡眠省電；回到前景喚醒
    const onVisibility = () => {
      if (document.hidden) game.loop.sleep();
      else game.loop.wake();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      gameRef.current = null;
      game.destroy(true); // 移除 canvas + 場景 + 監聽，StrictMode 雙掛載安全
    };
  }, []);

  return <div ref={parentRef} className="scene-wrap" aria-label="pill shelf scene" />;
}
