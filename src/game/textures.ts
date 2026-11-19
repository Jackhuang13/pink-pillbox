import Phaser from 'phaser';
import type { MedIconId } from '../domain/icons';

const ICON_W = 88;
const ICON_H = 64;

export function iconTextureKey(icon: MedIconId): string {
  return `icon_${icon}`;
}

/** 共用微笑小臉（眼睛＋微笑弧＋粉紅腮紅） */
function drawSmileFace(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  scale = 1,
  blushColor = 0xffc4db
): void {
  const eyeOffset = 7.5 * scale;
  g.fillStyle(0x6b4f5b, 1);
  g.fillCircle(cx - eyeOffset, cy, 2.3 * scale);
  g.fillCircle(cx + eyeOffset, cy, 2.3 * scale);
  g.lineStyle(Math.max(1.5, 2 * scale), 0x6b4f5b, 1);
  g.beginPath();
  g.arc(cx, cy + 2.8 * scale, 4.5 * scale, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155), false);
  g.strokePath();
  g.fillStyle(blushColor, 0.85);
  g.fillCircle(cx - 11.5 * scale, cy + 4.5 * scale, 3 * scale);
  g.fillCircle(cx + 11.5 * scale, cy + 4.5 * scale, 3 * scale);
}

/** 微笑膠囊：白左半＋粉右半＋臉＋腮紅（任意區域繪製） */
function drawCapsuleAt(
  g: Phaser.GameObjects.Graphics,
  ox: number,
  oy: number,
  w: number,
  h: number
): void {
  const r = h / 2;
  const line = Math.max(2, h * 0.065);
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(ox + line, oy + line, w - line * 2, h - line * 2, r - line);
  g.fillStyle(0xff9ec4, 1);
  g.fillRoundedRect(ox + w / 2, oy + line, w / 2 - line, h - line * 2, {
    tl: 0,
    tr: r - line,
    br: r - line,
    bl: 0
  });
  g.lineStyle(line, 0xe88bb0, 1);
  g.lineBetween(ox + w / 2, oy + line + 1, ox + w / 2, oy + h - line - 1);
  g.strokeRoundedRect(ox + line, oy + line, w - line * 2, h - line * 2, r - line);
  drawSmileFace(g, ox + w * 0.27, oy + h * 0.45, h / 48);
  g.lineStyle(Math.max(2, h * 0.055), 0xffffff, 0.75);
  g.lineBetween(ox + w * 0.65, oy + h * 0.28, ox + w * 0.78, oy + h * 0.28);
}

/** 奶油微笑圓錠 */
function drawTablet(g: Phaser.GameObjects.Graphics): void {
  const cx = ICON_W / 2;
  const cy = ICON_H / 2 + 2;
  const r = 24;
  g.fillStyle(0xfff1c9, 1);
  g.fillCircle(cx, cy, r);
  g.lineStyle(3, 0xe8b86b, 1);
  g.strokeCircle(cx, cy, r);
  g.lineStyle(2, 0xefd092, 0.85);
  g.lineBetween(cx - 15, cy - 11, cx + 15, cy - 11);
  drawSmileFace(g, cx, cy + 2, 0.95, 0xffbfd3);
}

/** 愛心糖衣錠 */
function drawHeartPill(g: Phaser.GameObjects.Graphics): void {
  const cx = ICON_W / 2;
  const cy = ICON_H / 2 + 2;
  const r = 13;
  g.fillStyle(0xffa7c9, 1);
  g.fillCircle(cx - 10, cy - 7, r);
  g.fillCircle(cx + 10, cy - 7, r);
  g.fillTriangle(cx - 22.5, cy - 3, cx + 22.5, cy - 3, cx, cy + 22);
  g.lineStyle(3, 0xe87ea7, 1);
  g.beginPath();
  g.arc(cx - 10, cy - 7, r, Phaser.Math.DegToRad(150), Phaser.Math.DegToRad(345), false);
  g.strokePath();
  g.beginPath();
  g.arc(cx + 10, cy - 7, r, Phaser.Math.DegToRad(195), Phaser.Math.DegToRad(30), false);
  g.strokePath();
  g.lineBetween(cx - 21.5, cy - 1, cx, cy + 22);
  g.lineBetween(cx + 21.5, cy - 1, cx, cy + 22);
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(cx - 13, cy - 11, 7, 4);
  drawSmileFace(g, cx, cy - 1, 0.85, 0xffd6e7);
}

/** 草莓藥水瓶 */
function drawSyrup(g: Phaser.GameObjects.Graphics): void {
  const cx = ICON_W / 2;
  // 瓶蓋
  g.fillStyle(0xff8fb8, 1);
  g.fillRoundedRect(cx - 12, 5, 24, 10, 4);
  g.lineStyle(2.5, 0xe474a2, 1);
  g.strokeRoundedRect(cx - 12, 5, 24, 10, 4);
  // 瓶頸
  g.fillStyle(0xffffff, 1);
  g.fillRect(cx - 9, 15, 18, 6);
  // 瓶身（白色玻璃＋草莓液體）
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(cx - 19, 20, 38, 38, 12);
  g.fillStyle(0xffb3cf, 1);
  g.fillRoundedRect(cx - 17, 32, 34, 24, { tl: 4, tr: 4, br: 10, bl: 10 });
  g.lineStyle(2.8, 0xe88bb0, 1);
  g.strokeRoundedRect(cx - 19, 20, 38, 38, 12);
  // 刻度
  g.lineStyle(2, 0xffffff, 0.85);
  g.lineBetween(cx + 10, 38, cx + 15, 38);
  g.lineBetween(cx + 12, 44, cx + 15, 44);
  drawSmileFace(g, cx, 42, 0.82, 0xffe0ec);
}

/** 薄荷小滴管 */
function drawDropper(g: Phaser.GameObjects.Graphics): void {
  const cx = ICON_W / 2 - 4;
  // 橡膠滴頭
  g.fillStyle(0x9fe0c0, 1);
  g.fillRoundedRect(cx - 8, 5, 16, 15, { tl: 8, tr: 8, br: 2, bl: 2 });
  g.lineStyle(2.5, 0x6dbb95, 1);
  g.strokeRoundedRect(cx - 8, 5, 16, 15, { tl: 8, tr: 8, br: 2, bl: 2 });
  // 瓶領
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(cx - 12, 18, 24, 6, 3);
  g.lineStyle(2.2, 0x6dbb95, 1);
  g.strokeRoundedRect(cx - 12, 18, 24, 6, 3);
  // 玻璃瓶身
  g.fillStyle(0xe8faf0, 1);
  g.fillRoundedRect(cx - 16, 24, 32, 34, 11);
  g.lineStyle(2.8, 0x6dbb95, 1);
  g.strokeRoundedRect(cx - 16, 24, 32, 34, 11);
  drawSmileFace(g, cx, 41, 0.8, 0xffc9dd);
  // 可愛薄荷小水滴
  const dx = cx + 23;
  const dy = 24;
  g.fillStyle(0x9ee0ff, 1);
  g.fillCircle(dx, dy + 6, 5.5);
  g.fillTriangle(dx - 5.2, dy + 5, dx + 5.2, dy + 5, dx, dy - 4);
  g.lineStyle(2, 0x6bbce8, 1);
  g.strokeCircle(dx, dy + 6, 5.5);
}

/** 薰衣草小藥包 */
function drawSachet(g: Phaser.GameObjects.Graphics): void {
  const cx = ICON_W / 2;
  const left = cx - 22;
  const top = 11;
  const w = 44;
  const h = 46;
  g.fillStyle(0xeee7ff, 1);
  g.fillRoundedRect(left, top, w, h, 8);
  // 頂部封口條紋
  g.fillStyle(0xd8c8ff, 1);
  g.fillRoundedRect(left + 2, top + 2, w - 4, 9, { tl: 6, tr: 6, br: 0, bl: 0 });
  g.lineStyle(2.8, 0xb89ef0, 1);
  g.strokeRoundedRect(left, top, w, h, 8);
  g.lineStyle(2, 0xb89ef0, 0.85);
  g.lineBetween(left + 2, top + 11, left + w - 2, top + 11);
  // 白色小貼紙
  g.fillStyle(0xffffff, 0.95);
  g.fillRoundedRect(cx - 16, top + 16, 32, 24, 7);
  drawSmileFace(g, cx, top + 27, 0.78, 0xffc9dd);
}

/** 雲朵噴霧器 */
function drawInhaler(g: Phaser.GameObjects.Graphics): void {
  const cx = ICON_W / 2 - 4;
  // 上方藥罐
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(cx - 12, 7, 18, 16, 5);
  g.lineStyle(2.4, 0x87bce8, 1);
  g.strokeRoundedRect(cx - 12, 7, 18, 16, 5);
  // L 型外殼
  g.fillStyle(0xc8e7ff, 1);
  g.fillRoundedRect(cx - 16, 18, 26, 40, 10);
  g.fillRoundedRect(cx - 6, 36, 30, 22, 9);
  g.lineStyle(2.8, 0x7cb4e2, 1);
  g.strokeRoundedRect(cx - 16, 18, 26, 40, 10);
  g.strokeRoundedRect(cx + 4, 36, 20, 22, { tl: 0, tr: 9, br: 9, bl: 0 });
  // 噴口
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(cx + 18, 41, 6, 12, 3);
  // 雲朵小泡泡
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(cx + 30, 38, 4.5);
  g.fillCircle(cx + 34, 34, 3.5);
  g.lineStyle(1.5, 0xa8d4f5, 1);
  g.strokeCircle(cx + 30, 38, 4.5);
  drawSmileFace(g, cx - 3, 35, 0.72, 0xffc4db);
}

/** 蜜桃小軟膏 */
function drawOintment(g: Phaser.GameObjects.Graphics): void {
  const cx = ICON_W / 2;
  // 尾端折痕
  g.fillStyle(0xffc9ad, 1);
  g.fillRoundedRect(cx - 20, 8, 40, 8, 3);
  g.lineStyle(2.4, 0xe89b78, 1);
  g.strokeRoundedRect(cx - 20, 8, 40, 8, 3);
  // 軟膏管身
  g.fillStyle(0xffe7d9, 1);
  g.fillPoints(
    [
      new Phaser.Math.Vector2(cx - 18, 16),
      new Phaser.Math.Vector2(cx + 18, 16),
      new Phaser.Math.Vector2(cx + 13, 48),
      new Phaser.Math.Vector2(cx - 13, 48)
    ],
    true
  );
  g.lineStyle(2.6, 0xe89b78, 1);
  g.strokePoints(
    [
      new Phaser.Math.Vector2(cx - 18, 16),
      new Phaser.Math.Vector2(cx + 18, 16),
      new Phaser.Math.Vector2(cx + 13, 48),
      new Phaser.Math.Vector2(cx - 13, 48)
    ],
    true
  );
  // 底部粉紅瓶蓋
  g.fillStyle(0xff9ec4, 1);
  g.fillRoundedRect(cx - 9, 48, 18, 10, 4);
  g.lineStyle(2.4, 0xe474a2, 1);
  g.strokeRoundedRect(cx - 9, 48, 18, 10, 4);
  drawSmileFace(g, cx, 31, 0.8, 0xffb8d0);
}

export function createTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('icon_capsule')) return;
  const g = scene.add.graphics();

  // 8 款可愛化劑型紋理（統一 88×64 畫布居中，方便藥櫃精靈無縫切換）
  drawCapsuleAt(g, 6, 13, 76, 38);
  g.generateTexture('icon_capsule', ICON_W, ICON_H);
  g.generateTexture('pill', ICON_W, ICON_H);
  g.clear();

  drawTablet(g);
  g.generateTexture('icon_tablet', ICON_W, ICON_H);
  g.clear();

  drawHeartPill(g);
  g.generateTexture('icon_heart_pill', ICON_W, ICON_H);
  g.clear();

  drawSyrup(g);
  g.generateTexture('icon_syrup', ICON_W, ICON_H);
  g.clear();

  drawDropper(g);
  g.generateTexture('icon_dropper', ICON_W, ICON_H);
  g.clear();

  drawSachet(g);
  g.generateTexture('icon_sachet', ICON_W, ICON_H);
  g.clear();

  drawInhaler(g);
  g.generateTexture('icon_inhaler', ICON_W, ICON_H);
  g.clear();

  drawOintment(g);
  g.generateTexture('icon_ointment', ICON_W, ICON_H);
  g.clear();

  // 右上角吉祥物大膠囊
  drawCapsuleAt(g, 0, 0, 160, 80);
  g.generateTexture('mascot', 160, 80);
  g.clear();

  g.fillStyle(0xf3c9da, 0.65);
  g.fillEllipse(32, 8, 64, 14);
  g.generateTexture('shadow', 64, 16);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillPoints(
    [
      new Phaser.Math.Vector2(8, 0),
      new Phaser.Math.Vector2(10, 6),
      new Phaser.Math.Vector2(16, 8),
      new Phaser.Math.Vector2(10, 10),
      new Phaser.Math.Vector2(8, 16),
      new Phaser.Math.Vector2(6, 10),
      new Phaser.Math.Vector2(0, 8),
      new Phaser.Math.Vector2(6, 6)
    ],
    true
  );
  g.generateTexture('sparkle', 16, 16);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillCircle(12, 12, 11);
  g.lineStyle(2, 0xff8fb8, 1);
  g.strokeCircle(12, 12, 11);
  g.generateTexture('badge', 24, 24);
  g.clear();

  g.fillStyle(0xff9ec4, 1);
  g.fillCircle(5, 5, 5);
  g.fillCircle(13, 5, 5);
  g.fillTriangle(0, 7, 18, 7, 9, 18);
  g.generateTexture('heart', 18, 18);
  g.clear();

  g.fillStyle(0x9ecbff, 1);
  g.fillCircle(6, 9, 5);
  g.fillTriangle(1, 9, 11, 9, 6, 0);
  g.generateTexture('sweat', 12, 14);
  g.clear();

  g.destroy();
}
