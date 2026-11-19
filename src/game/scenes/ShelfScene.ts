import Phaser from 'phaser';
import { EventBus } from '../../core/EventBus';
import type { SceneMed, SyncPayload } from '../types';
import { createTextures, iconTextureKey } from '../textures';
import { playPop } from '../audio';

const W = 480;
const H = 300;
const MAX_SLOTS = 15;
const PER_ROW = 5;
const FONT = '"Huninn", "Iansui", "PingFang TC", "Microsoft JhengHei", sans-serif';

const TINT: Record<SceneMed['state'], number> = {
  ok: 0xffffff,
  low: 0xffcf9e,
  empty: 0xcfc4cb,
  future: 0xc9ecd9,
  prn: 0xffffff
};

interface PillView {
  id: string;
  container: Phaser.GameObjects.Container;
  pill: Phaser.GameObjects.Image;
  badgeBg: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  bob: Phaser.Tweens.Tween | null;
  extra: Phaser.Tweens.Tween[];
  sweat: Phaser.GameObjects.Image | null;
  zzz: Phaser.GameObjects.Text | null;
}

function slotPos(i: number): { x: number; y: number } {
  return { x: 48 + (i % PER_ROW) * 84, y: 70 + Math.floor(i / PER_ROW) * 84 };
}

export class ShelfScene extends Phaser.Scene {
  private pills = new Map<string, PillView>();
  private pending: SyncPayload | null = null;
  private ready = false;
  private overflowView: Phaser.GameObjects.Container | null = null;
  private overflowText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('ShelfScene');
  }

  create(): void {
    createTextures(this);
    this.drawBackground();
    this.addAmbientParticles();
    this.createMascot();
    this.createOverflowView();

    EventBus.on('meds:sync', this.handleSync, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);

    // Web 字型載入完成後重繪場景文字
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!this.sys.isActive()) return;
        this.pills.forEach((v) => {
          v.nameText.setFontFamily(FONT);
          v.badge.setFontFamily(FONT);
        });
      });
    }

    this.ready = true;
    if (this.pending) this.applySync(this.pending);
    EventBus.emit('scene:ready');
  }

  private teardown(): void {
    EventBus.off('meds:sync', this.handleSync, this);
    this.pills.clear();
    this.ready = false;
  }

  private handleSync(payload: SyncPayload): void {
    this.pending = payload;
    if (this.ready) this.applySync(payload);
  }

  /** 差異化同步：新增 pop-in、刪除 pop-out、既有更新狀態動畫 */
  private applySync(payload: SyncPayload): void {
    const meds = payload.meds;
    const visible = meds.length > MAX_SLOTS ? meds.slice(0, MAX_SLOTS - 1) : meds;
    const keep = new Set(visible.map((m) => m.id));

    this.pills.forEach((view, id) => {
      if (!keep.has(id)) {
        this.pills.delete(id);
        this.tweens.add({
          targets: view.container,
          scale: 0,
          duration: 180,
          ease: 'Back.easeIn',
          onComplete: () => view.container.destroy(true)
        });
      }
    });

    visible.forEach((med, i) => {
      const { x, y } = slotPos(i);
      let view = this.pills.get(med.id);
      if (!view) {
        view = this.createPillView(med, x, y);
        this.pills.set(med.id, view);
      }
      this.updatePillView(view, med, x, y);
    });

    const overflow = meds.length - visible.length;
    if (this.overflowView && this.overflowText) {
      if (overflow > 0) {
        const { x, y } = slotPos(visible.length);
        this.overflowView.setPosition(x, y).setVisible(true);
        this.overflowText.setText(`+${overflow}`);
      } else {
        this.overflowView.setVisible(false);
      }
    }
  }

  private createPillView(med: SceneMed, x: number, y: number): PillView {
    const container = this.add.container(x, y).setDepth(3);
    const shadow = this.add.image(0, 22, 'shadow').setAlpha(0.7);
    const pill = this.add.image(0, -2, iconTextureKey(med.icon)).setScale(0.8);
    const badgeBg = this.add.image(28, -20, 'badge');
    const badge = this.add.text(28, -20, '', { fontFamily: FONT, fontSize: '12px', color: '#ee6fa5' }).setOrigin(0.5);
    const nameText = this.add.text(0, -38, '', { fontFamily: FONT, fontSize: '13px', color: '#6b4f5b' }).setOrigin(0.5);
    container.add([shadow, pill, badgeBg, badge, nameText]);

    container.setSize(84, 80);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      playPop(this);
      EventBus.emit('med:selected', med.id);
    });
    container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.08, duration: 120 }));
    container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 120 }));

    container.setScale(0);
    this.tweens.add({ targets: container, scale: 1, duration: 320, ease: 'Back.easeOut' });

    return { id: med.id, container, pill, badgeBg, badge, nameText, bob: null, extra: [], sweat: null, zzz: null };
  }

  private updatePillView(view: PillView, med: SceneMed, x: number, y: number): void {
    view.container.setPosition(x, y).setAngle(0).setAlpha(1);
    const texKey = iconTextureKey(med.icon);
    if (view.pill.texture.key !== texKey && this.textures.exists(texKey)) {
      view.pill.setTexture(texKey);
    }
    view.nameText.setText(med.name.length > 6 ? med.name.slice(0, 6) + '…' : med.name);
    view.badge.setText(med.daysRemaining === null ? '—' : String(med.daysRemaining));

    view.bob?.stop();
    view.bob = null;
    view.extra.forEach((t) => t.stop());
    view.extra = [];
    view.sweat?.destroy();
    view.sweat = null;
    view.zzz?.destroy();
    view.zzz = null;

    const tint = TINT[med.state];
    if (tint === 0xffffff) view.pill.clearTint();
    else view.pill.setTint(tint);
    view.badgeBg.setTint(med.state === 'low' ? 0xffe3c2 : med.state === 'empty' ? 0xe8e0e6 : 0xffffff);

    switch (med.state) {
      case 'ok':
      case 'future':
        view.bob = this.tweens.add({
          targets: view.container,
          y: y - 5,
          duration: med.state === 'future' ? 2200 : 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 600)
        });
        break;
      case 'low':
        view.bob = this.tweens.add({
          targets: view.container,
          angle: { from: -7, to: 7 },
          duration: 240,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        view.sweat = this.add.image(34, -30, 'sweat').setAlpha(0);
        view.container.add(view.sweat);
        view.extra.push(
          this.tweens.add({
            targets: view.sweat,
            alpha: { from: 0, to: 1 },
            y: -22,
            duration: 900,
            yoyo: true,
            repeat: -1
          })
        );
        break;
      case 'empty':
        view.container.setAlpha(0.75);
        view.zzz = this.add.text(24, -30, 'Z', { fontFamily: FONT, fontSize: '14px', color: '#a88795' }).setOrigin(0.5);
        view.container.add(view.zzz);
        view.extra.push(
          this.tweens.add({
            targets: view.zzz,
            y: -40,
            alpha: { from: 1, to: 0 },
            duration: 1600,
            repeat: -1
          })
        );
        break;
      case 'prn':
        view.container.setAlpha(0.9);
        view.bob = this.tweens.add({
          targets: view.container,
          x: x + 3,
          duration: 1800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
    }
  }

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0xfff5f8, 0xfff5f8, 0xffe9f2, 0xffe9f2, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xffe0ec, 1);
    for (let r = 0; r < 12; r++) {
      const y = 14 + r * 26;
      const off = (r % 2) * 13;
      for (let x = 14 + off; x < W; x += 26) g.fillCircle(x, y, 2);
    }
    const shelves = this.add.graphics().setDepth(2);
    for (let r = 0; r < 3; r++) {
      const y = 70 + r * 84 + 24;
      shelves.fillStyle(0xffd6e7, 1);
      shelves.fillRoundedRect(16, y, W - 32, 12, 6);
      shelves.fillStyle(0xffc0d8, 1);
      shelves.fillRoundedRect(16, y + 8, W - 32, 4, 2);
    }
    this.add.image(24, 26, 'heart').setDepth(2).setAlpha(0.9);
    this.add.image(456, 278, 'heart').setDepth(2).setAlpha(0.7).setScale(0.8);
  }

  private addAmbientParticles(): void {
    this.add
      .particles(0, 0, 'sparkle', {
        x: { min: 0, max: W },
        y: { min: 0, max: H },
        lifespan: 2400,
        speedX: { min: -4, max: 4 },
        speedY: { min: -16, max: -6 },
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.8, end: 0 },
        rotate: { min: 0, max: 180 },
        tint: [0xffd166, 0xff9ec4, 0xbfe8d4, 0xe6ddff],
        frequency: 380,
        quantity: 1
      })
      .setDepth(1);
  }

  private createMascot(): void {
    const mascot = this.add.image(432, 40, 'mascot').setScale(0.5).setDepth(4);
    mascot.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: mascot, y: 34, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    mascot.on('pointerdown', () => {
      playPop(this);
      EventBus.emit('ui:toast', { key: 'mascotCheer' });
      this.tweens.add({
        targets: mascot,
        angle: { from: -10, to: 10 },
        duration: 120,
        yoyo: true,
        repeat: 3,
        onComplete: () => mascot.setAngle(0)
      });
    });
  }

  private createOverflowView(): void {
    const c = this.add.container(0, 0).setDepth(3).setVisible(false);
    const pill = this.add.image(0, 0, 'pill').setScale(0.78).setTint(0xd8cdd3);
    this.overflowText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: '#6b4f5b' }).setOrigin(0.5);
    c.add([pill, this.overflowText]);
    this.overflowView = c;
  }
}
