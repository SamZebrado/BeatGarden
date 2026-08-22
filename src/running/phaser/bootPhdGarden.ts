import Phaser from 'phaser';
import type { RunningGameHandle } from '../RunningModeHost';
import { RUNNING_WORLD, RunningSimulation, type ReviewScene, type RunningInput, type RunningSnapshot, type UpgradeId } from '../core/simulation';
import { t } from '../../i18n/strings';
import { parseDifficulty } from '../core/difficulty';

const STEP = 1 / 60;

export async function bootPhdGarden(root: HTMLElement, options: { onExit: () => void }): Promise<RunningGameHandle> {
  root.replaceChildren();
  root.style.cssText = 'width:100vw;height:100vh;display:block;overflow:hidden;background:#071512;touch-action:none;';
  const host = document.createElement('div');
  host.id = 'running-game';
  host.style.cssText = 'width:100%;height:100%;';
  root.appendChild(host);
  const hudOverlay = document.createElement('div');
  hudOverlay.dataset.role = 'running-hud';
  hudOverlay.style.cssText = 'position:fixed;z-index:40;left:max(18px,env(safe-area-inset-left));right:max(18px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));pointer-events:none;color:#e7fff1;font:700 18px system-ui;text-shadow:0 2px 8px #000;';
  hudOverlay.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px"><span data-role="stats"></span><span data-role="systems" style="font-size:14px;color:#d7eddc;text-align:right"></span><span data-role="help" style="color:#8fb9ab;font-size:14px;font-weight:500">${t('running.help')}</span></div><div style="width:min(220px,58vw);height:12px;border-radius:8px;background:#0b1614;margin-top:10px;overflow:hidden"><i data-role="hp" style="display:block;height:100%;background:#f27878"></i></div><div style="width:min(220px,58vw);height:8px;border-radius:6px;background:#0b1614;margin-top:7px;overflow:hidden"><i data-role="xp" style="display:block;height:100%;background:#74e2c2"></i></div><div data-role="resources" style="margin-top:8px;font-size:13px;letter-spacing:3px"></div><div data-role="meeting" style="position:fixed;left:50%;top:max(18px,env(safe-area-inset-top));transform:translateX(-50%);color:#ffdda1;font-size:22px;white-space:nowrap"></div>`;
  root.appendChild(hudOverlay);

  class PhdGardenScene extends Phaser.Scene {
    private simulation = createSimulation();
    private graphics!: Phaser.GameObjects.Graphics;
    private uiGraphics!: Phaser.GameObjects.Graphics;
    private hud!: Phaser.GameObjects.Text;
    private meetingHud!: Phaser.GameObjects.Text;
    private help!: Phaser.GameObjects.Text;
    private keys!: Record<string, Phaser.Input.Keyboard.Key>;
    private accumulator = 0;
    private joystick: { pointerId: number; x: number; y: number; currentX: number; currentY: number } | null = null;

    constructor() { super('phd-garden'); }

    create(): void {
      this.cameras.main.setBackgroundColor('#071512');
      this.graphics = this.add.graphics();
      this.uiGraphics = this.add.graphics().setScrollFactor(0).setDepth(19);
      this.hud = this.add.text(0, 0, '', { color: '#e7fff1', fontFamily: 'system-ui', fontSize: '20px', fontStyle: 'bold' }).setScrollFactor(0).setDepth(20);
      this.meetingHud = this.add.text(0, 0, '', { color: '#ffdda1', fontFamily: 'system-ui', fontSize: '25px', fontStyle: 'bold', align: 'center' }).setScrollFactor(0).setOrigin(0.5).setDepth(20);
      this.help = this.add.text(0, 0, 'WASD / arrows  ·  drag to move', { color: '#8fb9ab', fontFamily: 'system-ui', fontSize: '15px' }).setScrollFactor(0).setOrigin(1, 0).setDepth(20);
      this.hud.setVisible(false);
      this.meetingHud.setVisible(false);
      this.help.setVisible(false);
      const keyboard = this.input.keyboard;
      if (!keyboard) throw new Error('Keyboard input unavailable');
      this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ONE,TWO,THREE,FOUR,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
      this.input.on('pointerdown', this.onPointerDown, this);
      this.input.on('pointermove', this.onPointerMove, this);
      this.input.on('pointerup', this.onPointerUp, this);
      this.input.on('pointerupoutside', this.onPointerUp, this);
      this.scale.on('resize', this.resizeCamera, this);
      this.resizeCamera();
      this.render(this.simulation.snapshot());
    }

    override update(_time: number, deltaMs: number): void {
      const snapshot = this.simulation.snapshot();
      if (snapshot.phd.terminal === 'ended' || snapshot.phd.terminal === 'graduated') {
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.restart();
        this.render(snapshot);
        return;
      }
      if (snapshot.gameOver) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.restart();
        this.render(snapshot);
        return;
      }
      if (snapshot.phd.choice) {
        this.handlePhdChoiceKeys(snapshot);
        this.render(this.simulation.snapshot());
        return;
      }
      if (snapshot.upgradePending && !snapshot.phd.milestone) {
        this.handleUpgradeKeys();
        this.render(this.simulation.snapshot());
        return;
      }
      this.accumulator += Math.min(deltaMs / 1000, 0.1);
      const input = this.readInput();
      while (this.accumulator >= STEP) {
        this.simulation.step(STEP, input);
        this.accumulator -= STEP;
      }
      this.render(this.simulation.snapshot());
    }

    private readInput(): RunningInput {
      const x = Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown);
      const y = Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown);
      if (!this.joystick) return { x, y };
      const dx = this.joystick.currentX - this.joystick.x;
      const dy = this.joystick.currentY - this.joystick.y;
      const magnitude = Math.hypot(dx, dy);
      if (magnitude < 8) return { x, y };
      return { x: dx / Math.max(48, magnitude), y: dy / Math.max(48, magnitude) };
    }

    private handleUpgradeKeys(): void {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.chooseUpgrade('orbit');
      else if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.chooseUpgrade('cadence');
      else if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) this.chooseUpgrade('vitality');
    }

    private handlePhdChoiceKeys(state: RunningSnapshot): void {
      const choice = state.phd.choice;
      if (!choice) return;
      const keys = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR];
      for (let index = 0; index < choice.options.length; index += 1) {
        if (Phaser.Input.Keyboard.JustDown(keys[index])) this.simulation.choosePhdOption(choice.options[index]);
      }
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
      const snapshot = this.simulation.snapshot();
      if (snapshot.gameOver || snapshot.phd.terminal === 'ended' || snapshot.phd.terminal === 'graduated') { this.restart(); return; }
      if (snapshot.phd.choice) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const view = this.cameras.main.worldView;
        const count = snapshot.phd.choice.options.length;
        const index = this.isPortrait()
          ? Math.max(0, Math.min(count - 1, Math.floor((world.y - view.top) / (view.height / count))))
          : Math.max(0, Math.min(count - 1, Math.floor((world.x - view.left) / (view.width / count))));
        this.simulation.choosePhdOption(snapshot.phd.choice.options[index]);
        return;
      }
      if (snapshot.upgradePending && !snapshot.phd.milestone) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const view = this.cameras.main.worldView;
        const index = this.isPortrait()
          ? Math.max(0, Math.min(2, Math.floor((world.y - view.top) / (view.height / 3))))
          : Math.max(0, Math.min(2, Math.floor((world.x - view.left) / (view.width / 3))));
        this.chooseUpgrade((['orbit', 'cadence', 'vitality'] as const)[index]);
        return;
      }
      this.joystick = { pointerId: pointer.id, x: pointer.x, y: pointer.y, currentX: pointer.x, currentY: pointer.y };
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
      if (this.joystick?.pointerId === pointer.id) {
        this.joystick.currentX = pointer.x;
        this.joystick.currentY = pointer.y;
      }
    }

    private onPointerUp(pointer: Phaser.Input.Pointer): void {
      if (this.joystick?.pointerId === pointer.id) this.joystick = null;
    }

    private chooseUpgrade(id: UpgradeId): void { this.simulation.chooseUpgrade(id); }

    private restart(): void {
      this.simulation = createSimulation();
      this.accumulator = 0;
      this.joystick = null;
    }

    private resizeCamera(): void {
      const zoom = this.isPortrait()
        ? this.scale.height / RUNNING_WORLD.height
        : Math.min(this.scale.width / RUNNING_WORLD.width, this.scale.height / RUNNING_WORLD.height);
      this.cameras.main.setBounds(0, 0, RUNNING_WORLD.width, RUNNING_WORLD.height).setZoom(zoom);
      this.positionHud(zoom);
    }

    private render(state: RunningSnapshot): void {
      const g = this.graphics;
      g.clear();
      if (this.isPortrait()) this.cameras.main.centerOn(state.player.x, state.player.y);
      else this.cameras.main.centerOn(RUNNING_WORLD.width / 2, RUNNING_WORLD.height / 2);
      g.fillStyle(0x0a241d, 1).fillRect(0, 0, RUNNING_WORLD.width, RUNNING_WORLD.height);
      g.lineStyle(1, 0x245044, 0.35);
      for (let x = 0; x <= RUNNING_WORLD.width; x += 80) g.lineBetween(x, 0, x, RUNNING_WORLD.height);
      for (let y = 0; y <= RUNNING_WORLD.height; y += 80) g.lineBetween(0, y, RUNNING_WORLD.width, y);
      this.drawWorldSeason(g, state);
      this.drawMeetingCue(g, state);
      this.drawMilestoneArena(g, state);

      g.lineStyle(2, 0x7ae2b1, 0.22).strokeCircle(state.player.x, state.player.y, 64);
      for (let index = 0; index < state.orbitCount; index += 1) {
        const angle = state.time * 2.2 + (index / state.orbitCount) * Math.PI * 2;
        g.fillStyle(0x8df5c2, 1).fillCircle(state.player.x + Math.cos(angle) * 64, state.player.y + Math.sin(angle) * 64, 9);
      }
      this.drawPhdSystems(g, state);
      for (const pickup of state.pickups) {
        g.fillStyle(0x68f0da, 0.28).fillCircle(pickup.x, pickup.y, 14);
        g.fillStyle(0xa0ffe8, 1).fillCircle(pickup.x, pickup.y, pickup.radius);
      }
      for (const projectile of state.projectiles) {
        g.fillStyle(0xffef92, 0.28).fillCircle(projectile.x, projectile.y, 12);
        g.fillStyle(0xfff4b5, 1).fillCircle(projectile.x, projectile.y, projectile.radius);
      }
      for (const enemy of state.enemies) this.drawEnemy(g, enemy, state);
      for (const pulse of state.hitPulses) {
        g.lineStyle(4, pulse.color, Math.min(1, pulse.ttl * 5));
        g.strokeCircle(pulse.x, pulse.y, 12 + (0.35 - pulse.ttl) * 45);
      }
      if (state.player.invulnerable <= 0 || Math.floor(state.time * 12) % 2 === 0) {
        g.fillStyle(0x68d494, 0.25).fillCircle(state.player.x, state.player.y, 29);
        g.fillStyle(0xb9f7d0, 1).fillCircle(state.player.x, state.player.y, state.player.radius);
        g.fillStyle(0x123c30, 1).fillCircle(state.player.x + 5, state.player.y - 4, 4);
      }
      if (this.joystick) {
        g.lineStyle(3, 0xd7fff0, 0.35).strokeCircle(this.joystick.x, this.joystick.y, 48);
        const dx = this.joystick.currentX - this.joystick.x;
        const dy = this.joystick.currentY - this.joystick.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const radius = Math.min(40, length);
        g.fillStyle(0xd7fff0, 0.55).fillCircle(this.joystick.x + dx / length * radius, this.joystick.y + dy / length * radius, 15);
      }
      this.drawBars(this.uiGraphics, state);
      this.uiGraphics.setVisible(false);
      const textOff = isTextOff();
      hudOverlay.querySelector<HTMLElement>('[data-role="stats"]')!.textContent = textOff ? `⬡${state.level}  ◆${state.defeated}` : `${t('running.level')} ${state.level}   ◆ ${state.defeated}`;
      hudOverlay.querySelector<HTMLElement>('[data-role="hp"]')!.style.width = `${Math.max(0, state.player.hp / state.player.maxHp) * 100}%`;
      hudOverlay.querySelector<HTMLElement>('[data-role="xp"]')!.style.width = `${state.xp / state.xpNeeded * 100}%`;
      hudOverlay.querySelector<HTMLElement>('[data-role="meeting"]')!.textContent = state.meeting.phase === 'telegraph' ? `◉  ${Math.max(1, Math.ceil(state.meeting.remaining))}` : state.meeting.phase === 'active' ? (textOff ? '◉' : `◉  ${t('running.meeting')}`) : '';
      const thesisSymbol = { seed: '·', sapling: '♧', tree: '♣', bloom: '✿' }[state.phd.thesisStage];
      hudOverlay.querySelector<HTMLElement>('[data-role="systems"]')!.textContent = textOff ? `◷${state.phd.year}  ${thesisSymbol}` : `Y${state.phd.year}  🌱 ${t(`running.thesis.${state.phd.thesisStage}` as const)}`;
      hudOverlay.querySelector<HTMLElement>('[data-role="resources"]')!.textContent = `⚡${Math.round(state.phd.energy)}  ◉${Math.round(state.phd.focus)}  ♡${Math.round(state.phd.spirit)}  ▧${Math.round(state.phd.calendarLoad)}  ◈${Math.round(state.phd.pollution)}`;
      hudOverlay.dataset.year = String(state.phd.year);
      hudOverlay.dataset.choiceKind = state.phd.choice?.kind ?? '';
      hudOverlay.dataset.upgradePending = String(state.upgradePending);
      hudOverlay.dataset.milestone = state.phd.milestone ? `${state.phd.milestone.kind}:${state.phd.milestone.phase}` : '';
      hudOverlay.dataset.milestoneProgress = state.phd.milestone ? `${state.phd.milestone.progress}/${state.phd.milestone.target}` : '';
      hudOverlay.querySelector<HTMLElement>('[data-role="help"]')!.style.display = textOff || this.isPortrait() || state.upgradePending || state.phd.choice || state.gameOver || state.phd.terminal === 'ended' || state.phd.terminal === 'graduated' ? 'none' : 'inline';
      if (state.phd.choice) this.drawPhdChoice(g, state);
      if (state.upgradePending && !state.phd.milestone) this.drawUpgradeOverlay(g);
      if (state.gameOver) this.drawGameOver(g);
      else if (state.phd.terminal === 'ended' || state.phd.terminal === 'graduated') this.drawPhdTerminal(g, state.phd.terminal);
    }

    private drawEnemy(g: Phaser.GameObjects.Graphics, enemy: RunningSnapshot['enemies'][number], state: RunningSnapshot): void {
      const color = enemy.flash > 0 ? 0xffffff : enemy.kind === 'mite' ? 0xee776f : enemy.kind === 'phone' ? 0x74cfff : enemy.kind === 'reviewer' ? 0xd47bed : enemy.kind === 'committee' ? 0xffdd72 : 0xffa54f;
      g.fillStyle(color, 0.2).fillCircle(enemy.x, enemy.y, enemy.radius + 8);
      g.fillStyle(color, 1);
      if (enemy.kind === 'chair') g.fillRoundedRect(enemy.x - 24, enemy.y - 21, 48, 42, 8);
      else if (enemy.kind === 'committee') {
        g.fillCircle(enemy.x, enemy.y, 42);
        g.lineStyle(7, 0xfff1ad, 0.9).strokeCircle(enemy.x, enemy.y, 51);
        for (let index = 0; index < 5; index += 1) {
          const angle = index / 5 * Math.PI * 2;
          g.fillStyle(0x5f4722, 1).fillCircle(enemy.x + Math.cos(angle) * 27, enemy.y + Math.sin(angle) * 27, 7);
        }
      }
      else if (enemy.kind === 'phone') {
        const vibration = Math.sin(state.time * 24) * 4;
        const x = enemy.x + vibration;
        const pulse = (state.time * 46) % 34;
        g.lineStyle(4, 0x5bc8ff, Math.max(0.12, 0.8 - pulse / 42)).strokeCircle(x, enemy.y, enemy.radius + 10 + pulse);
        g.lineStyle(3, 0xb4eaff, 0.75).strokeCircle(x, enemy.y, enemy.radius + 5 + (pulse + 17) % 34);
        const dx = state.player.x - x;
        const dy = state.player.y - enemy.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / length;
        const uy = dy / length;
        const px = -uy;
        const py = ux;
        g.lineStyle(5, 0x5bc8ff, 0.7);
        let previousX = x - ux * 28;
        let previousY = enemy.y - uy * 28;
        for (let index = 1; index <= 5; index += 1) {
          const nextX = x - ux * (28 + index * 18) + px * (index % 2 === 0 ? -9 : 9);
          const nextY = enemy.y - uy * (28 + index * 18) + py * (index % 2 === 0 ? -9 : 9);
          g.lineBetween(previousX, previousY, nextX, nextY);
          previousX = nextX;
          previousY = nextY;
        }
        g.fillStyle(color, 1).fillRoundedRect(x - 13, enemy.y - 22, 26, 44, 7);
        g.lineStyle(3, 0xe1f7ff, 1).strokeRoundedRect(x - 13, enemy.y - 22, 26, 44, 7);
        g.lineStyle(3, 0x1e5875, 1).lineBetween(x - 8, enemy.y - 14, x + 8, enemy.y + 13);
      }
      else if (enemy.kind === 'reviewer') g.fillTriangle(enemy.x, enemy.y - 23, enemy.x - 21, enemy.y + 18, enemy.x + 21, enemy.y + 18);
      else g.fillCircle(enemy.x, enemy.y, enemy.radius);
    }

    private drawPhdSystems(g: Phaser.GameObjects.Graphics, state: RunningSnapshot): void {
      const phd = state.phd;
      for (let index = 0; index < Math.min(4, phd.completedProjects); index += 1) {
        const angle = -state.time * 0.8 + index / Math.max(1, phd.completedProjects) * Math.PI * 2;
        const x = state.player.x + Math.cos(angle) * 94;
        const y = state.player.y + Math.sin(angle) * 94;
        g.fillStyle([0x7fc6ef, 0xf1c867, 0xd99af0, 0x79d8b0][index], 0.95);
        g.fillTriangle(x, y - 9, x - 9, y + 7, x + 9, y + 7);
      }
      if (phd.activeProject) {
        const ratio = phd.activeProject.progress / phd.activeProject.goal;
        g.lineStyle(5, 0x8bdcc1, 0.35 + ratio * 0.6).strokeCircle(state.player.x, state.player.y, 108 + ratio * 16);
      }
      if (phd.signal > 0) {
        g.lineStyle(3, 0x8ce9ff, Math.min(0.7, phd.signal / 100)).strokeCircle(state.player.x, state.player.y, 34);
      }
      if (phd.pollution > 0) {
        g.fillStyle(0x793d8f, Math.min(0.24, phd.pollution / 300)).fillCircle(state.player.x, state.player.y, 48 + phd.pollution * 0.35);
      }
      const treeX = 1080;
      const treeY = 610;
      this.drawThesisLandmark(g, treeX, treeY, phd.thesisStage);
      if (phd.thesisStage === 'bloom') {
        g.lineStyle(7, 0xffd68a, 0.7);
        for (let progress = 0; progress < 1; progress += 0.18) {
          const x = treeX + 28 + (1170 - treeX - 28) * progress;
          const y = treeY - 31 + (455 - treeY + 31) * progress;
          const next = Math.min(1, progress + 0.1);
          g.lineBetween(x, y, treeX + 28 + (1170 - treeX - 28) * next, treeY - 31 + (455 - treeY + 31) * next);
        }
      }
      if (phd.defense !== 'hidden') {
        const ready = phd.defense === 'ready' || phd.defense === 'passed';
        g.lineStyle(ready ? 9 : 5, ready ? 0xffe080 : 0x65736e, ready ? 0.95 : 0.45).strokeRoundedRect(1170, 265, 70, 190, 24);
      }
    }

    private drawThesisLandmark(g: Phaser.GameObjects.Graphics, x: number, y: number, stage: RunningSnapshot['phd']['thesisStage']): void {
      if (stage === 'seed') {
        g.fillStyle(0x5e402b, 1).fillEllipse(x, y, 34, 14);
        g.fillStyle(0xffd28d, 1).fillEllipse(x, y - 8, 13, 9);
        return;
      }
      if (stage === 'sapling') {
        g.lineStyle(7, 0x7b5234, 1).lineBetween(x, y, x, y - 42);
        g.fillStyle(0x75db94, 1).fillEllipse(x - 12, y - 31, 25, 13);
        g.fillEllipse(x + 12, y - 45, 25, 13);
        return;
      }
      const scale = stage === 'bloom' ? 1.28 : 1;
      g.lineStyle(12 * scale, 0x70482f, 1).lineBetween(x, y, x, y - 66 * scale);
      g.lineStyle(7 * scale, 0x70482f, 1);
      g.lineBetween(x, y - 42 * scale, x - 28 * scale, y - 71 * scale);
      g.lineBetween(x, y - 50 * scale, x + 30 * scale, y - 82 * scale);
      const canopy = [[-30, -78], [0, -91], [31, -78], [-16, -107], [20, -108]];
      for (const [dx, dy] of canopy) g.fillStyle(0x67c88b, 0.98).fillCircle(x + dx * scale, y + dy * scale, 24 * scale);
      if (stage === 'bloom') {
        const flowers = [[-45, -91], [-19, -124], [14, -101], [42, -118], [39, -77], [-5, -73]];
        for (const [dx, dy] of flowers) {
          g.fillStyle(0xff9fc9, 1).fillCircle(x + dx * scale, y + dy * scale, 10);
          g.fillStyle(0xfff0a8, 1).fillCircle(x + dx * scale, y + dy * scale, 4);
        }
      }
    }

    private drawBars(g: Phaser.GameObjects.Graphics, state: RunningSnapshot): void {
      const zoom = this.cameras.main.zoom;
      const unit = (value: number) => value / zoom;
      g.clear();
      g.fillStyle(0x0b1614, 0.8).fillRoundedRect(unit(28), unit(58), unit(220), unit(14), unit(7));
      g.fillStyle(0xf27878, 1).fillRoundedRect(unit(28), unit(58), unit(220 * Math.max(0, state.player.hp / state.player.maxHp)), unit(14), unit(7));
      g.fillStyle(0x0b1614, 0.8).fillRoundedRect(unit(28), unit(80), unit(220), unit(10), unit(5));
      g.fillStyle(0x74e2c2, 1).fillRoundedRect(unit(28), unit(80), unit(220 * state.xp / state.xpNeeded), unit(10), unit(5));
    }

    private drawUpgradeOverlay(g: Phaser.GameObjects.Graphics): void {
      const view = this.cameras.main.worldView;
      g.fillStyle(0x030908, 0.82).fillRect(view.left, view.top, view.width, view.height);
      const cards = this.isPortrait() ? [
        { x: view.centerX - 140, y: view.top + 70, width: 280, height: 155, color: 0x59d69d, title: t('running.upgradeOrbit'), icon: '◉', detail: '1' },
        { x: view.centerX - 140, y: view.top + 280, width: 280, height: 155, color: 0xffda71, title: t('running.upgradeCadence'), icon: '⚡', detail: '2' },
        { x: view.centerX - 140, y: view.top + 490, width: 280, height: 155, color: 0xff8b86, title: t('running.upgradeVitality'), icon: '♥', detail: '3' },
      ] : [
        { x: 95, y: 205, width: 300, height: 300, color: 0x59d69d, title: t('running.upgradeOrbit'), icon: '◉', detail: '1' },
        { x: 450, y: 205, width: 300, height: 300, color: 0xffda71, title: t('running.upgradeCadence'), icon: '⚡', detail: '2' },
        { x: 805, y: 205, width: 300, height: 300, color: 0xff8b86, title: t('running.upgradeVitality'), icon: '♥', detail: '3' },
      ];
      for (const card of cards) {
        g.fillStyle(0x102c25, 1).fillRoundedRect(card.x, card.y, card.width, card.height, 24);
        g.lineStyle(4, card.color, 0.9).strokeRoundedRect(card.x, card.y, card.width, card.height, 24);
        const compact = this.isPortrait();
        this.ephemeralText(card.x + card.width / 2, card.y + (compact ? 43 : 73), card.icon, `#${card.color.toString(16)}`, compact ? 42 : 72);
        if (!isTextOff()) this.ephemeralText(card.x + card.width / 2, card.y + (compact ? 99 : 177), card.title, '#ffffff', compact ? 17 : 22, true);
        this.ephemeralText(card.x + card.width / 2, card.y + (compact ? 132 : 247), card.detail, '#9dc8b8', 18);
      }
    }

    private drawGameOver(g: Phaser.GameObjects.Graphics): void {
      const view = this.cameras.main.worldView;
      g.fillStyle(0x020706, 0.78).fillRect(view.left, view.top, view.width, view.height);
      this.ephemeralText(view.centerX, view.centerY - 42, isTextOff() ? '♡' : t('running.resting'), '#f2fff7', this.isPortrait() ? 30 : 48, true);
      if (!isTextOff()) this.ephemeralText(view.centerX, view.centerY + 34, t('running.restartHint'), '#a8cabb', 21);
    }

    private drawPhdTerminal(g: Phaser.GameObjects.Graphics, terminal: 'ended' | 'graduated'): void {
      const view = this.cameras.main.worldView;
      g.fillStyle(0x020706, 0.84).fillRect(view.left, view.top, view.width, view.height);
      this.ephemeralText(view.centerX, view.centerY - 28, terminal === 'graduated' ? '✿  ✓' : '⌛  ❄', terminal === 'graduated' ? '#ffd48f' : '#c8e8ff', this.isPortrait() ? 48 : 72, true);
      if (!isTextOff()) this.ephemeralText(view.centerX, view.centerY + 58, terminal === 'graduated' ? t('running.graduated') : t('running.finalWinter'), '#dcefe8', 24, true);
    }

    private drawPhdChoice(g: Phaser.GameObjects.Graphics, state: RunningSnapshot): void {
      const choice = state.phd.choice;
      if (!choice) return;
      const view = this.cameras.main.worldView;
      g.fillStyle(0x030908, 0.86).fillRect(view.left, view.top, view.width, view.height);
      const labels = choice.kind === 'project'
        ? [t('running.projectReplication'), t('running.projectIdea'), t('running.projectHelping'), t('running.projectPrestige')]
        : [t('running.attempt'), t('running.defer')];
      const icons = choice.kind === 'project' ? ['▣', '✦', '◇', '★'] : ['▶', '◷'];
      const details = choice.kind === 'project'
        ? ['⚡16  ◉12  ▧12  →  ⬡◈', '⚡13  ◉18  ▧10  →  ✦', '⚡17  ◉8  ▧15  →  ◇', '⚡22  ◉16  ▧22  →  ★']
        : ['◉  ▶  ◆', '◷  ♡'];
      const colors = [0x79d8b0, 0xf1c867, 0x7fc6ef, 0xd99af0];
      for (let index = 0; index < labels.length; index += 1) {
        const portrait = this.isPortrait();
        const width = portrait ? view.width - 48 : view.width / labels.length - 32;
        const height = portrait ? view.height / labels.length - 28 : 260;
        const x = portrait ? view.left + 24 : view.left + index * (view.width / labels.length) + 16;
        const y = portrait ? view.top + index * (view.height / labels.length) + 14 : view.centerY - 130;
        g.fillStyle(0x132e28, 1).fillRoundedRect(x, y, width, height, 22);
        g.lineStyle(4, colors[index], 0.9).strokeRoundedRect(x, y, width, height, 22);
        this.ephemeralText(x + width / 2, y + height * 0.38, icons[index], `#${colors[index].toString(16)}`, portrait ? 38 : 58);
        if (!isTextOff()) this.ephemeralText(x + width / 2, y + height * 0.62, labels[index], '#ffffff', portrait ? 16 : 18, true);
        this.ephemeralText(x + width / 2, y + height * 0.78, details[index], '#c8ddcf', portrait ? 13 : 15);
        this.ephemeralText(x + width / 2, y + height * 0.91, String(index + 1), '#9dc8b8', 14);
      }
      const title = choice.kind === 'qualifying' ? t('running.qualifying') : choice.kind === 'defense' ? t('running.defense') : '';
      if (title && !isTextOff()) this.ephemeralText(view.centerX, view.top + 55, title, '#fff3bc', 26, true);
    }

    private drawWorldSeason(g: Phaser.GameObjects.Graphics, state: RunningSnapshot): void {
      const season = (state.phd.year - 1) % 4;
      const colors = [0x72d596, 0xf3cb70, 0xd18466, 0xb9dcf2];
      g.fillStyle(colors[season], 0.045).fillRect(0, 0, RUNNING_WORLD.width, RUNNING_WORLD.height);
      for (let index = 0; index < 34; index += 1) {
        const x = (index * 173 + season * 47) % RUNNING_WORLD.width;
        const y = (index * 97 + season * 73) % RUNNING_WORLD.height;
        g.fillStyle(colors[season], season === 3 ? 0.42 : 0.24);
        if (season === 2) g.fillTriangle(x, y - 8, x - 7, y + 7, x + 8, y + 4);
        else if (season === 3) {
          g.lineStyle(3, colors[season], 0.55).lineBetween(x - 7, y, x + 7, y);
          g.lineBetween(x, y - 7, x, y + 7);
        } else g.fillCircle(x, y, season === 1 ? 9 : 6);
      }
      if (state.phd.seasonPulse > 0) {
        const progress = 1 - state.phd.seasonPulse / 4;
        const sweepX = -260 + progress * (RUNNING_WORLD.width + 520);
        g.lineStyle(22, colors[season], 0.75 - progress * 0.25).lineBetween(sweepX, 0, sweepX - 260, RUNNING_WORLD.height);
        for (let index = 0; index < 28; index += 1) {
          const y = index / 27 * RUNNING_WORLD.height;
          const drift = Math.sin(index * 1.7 + state.time * 4) * 38;
          g.fillStyle(colors[season], 0.88).fillCircle(sweepX - y * 0.36 + drift, y, 8);
        }
      }
    }

    private drawMeetingCue(g: Phaser.GameObjects.Graphics, state: RunningSnapshot): void {
      if (state.meeting.phase === 'idle') return;
      const radius = state.meeting.phase === 'telegraph' ? 240 - state.meeting.remaining * 42 : 115;
      g.lineStyle(state.meeting.phase === 'telegraph' ? 9 : 5, 0xffc96e, state.meeting.phase === 'telegraph' ? 0.75 : 0.28)
        .strokeCircle(state.player.x, state.player.y, radius);
      for (let index = 0; index < 8; index += 1) {
        const angle = index / 8 * Math.PI * 2;
        g.fillStyle(0xffd98c, 0.55).fillCircle(state.player.x + Math.cos(angle) * radius, state.player.y + Math.sin(angle) * radius, 7);
      }
    }

    private drawMilestoneArena(g: Phaser.GameObjects.Graphics, state: RunningSnapshot): void {
      const milestone = state.phd.milestone;
      if (!milestone) return;
      const color = milestone.kind === 'qualifying' ? 0x77d9ff : 0xffd36e;
      if (milestone.phase === 'telegraph') {
        const pulse = 28 + Math.sin(state.time * 10) * 12;
        g.lineStyle(10, color, 0.3 + Math.abs(Math.sin(state.time * 8)) * 0.5)
          .strokeRoundedRect(pulse, pulse, RUNNING_WORLD.width - pulse * 2, RUNNING_WORLD.height - pulse * 2, 36);
        g.fillStyle(color, 0.14).fillCircle(state.player.x, state.player.y, 130 - milestone.remaining * 18);
      } else {
        g.lineStyle(8, color, 0.72).strokeRoundedRect(18, 18, RUNNING_WORLD.width - 36, RUNNING_WORLD.height - 36, 32);
        const width = 360;
        g.fillStyle(0x07100e, 0.85).fillRoundedRect(RUNNING_WORLD.width / 2 - width / 2, 102, width, 18, 9);
        g.fillStyle(color, 1).fillRoundedRect(RUNNING_WORLD.width / 2 - width / 2, 102, width * milestone.progress / milestone.target, 18, 9);
      }
    }

    private ephemeralText(x: number, y: number, value: string, color: string, size: number, bold = false): void {
      const label = this.add.text(x, y, value, { color, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', fontFamily: 'system-ui' }).setOrigin(0.5).setDepth(30);
      this.time.delayedCall(20, () => label.destroy());
    }

    private positionHud(zoom: number): void {
      this.hud.setPosition(28 / zoom, 24 / zoom);
      this.meetingHud.setPosition((this.scale.width / 2) / zoom, 54 / zoom);
      this.help.setPosition((this.scale.width - 28) / zoom, 24 / zoom);
    }

    private isPortrait(): boolean { return this.scale.width / this.scale.height < 0.75; }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: host, width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#071512', scene: PhdGardenScene,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, pixelArt: false }, input: { activePointers: 3 },
  });
  const exit = document.createElement('button');
  exit.textContent = '←';
  exit.setAttribute('aria-label', t('running.backToWorlds'));
  exit.style.cssText = 'position:fixed;z-index:50;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));width:48px;height:48px;border-radius:50%;border:1px solid #7ea996;background:#102d25;color:#fff;font-size:22px;cursor:pointer;';
  exit.addEventListener('click', options.onExit);
  root.appendChild(exit);
  return { destroy: () => { exit.remove(); hudOverlay.remove(); game.destroy(true); } };
}

function seedFromUrl(): number {
  const value = new URLSearchParams(window.location.search).get('seed');
  if (!value) return 0xbea72026;
  let seed = 2166136261;
  for (const character of value) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

function isTextOff(): boolean {
  return new URLSearchParams(window.location.search).get('textOff') === '1';
}

function createSimulation(): RunningSimulation {
  const search = new URLSearchParams(window.location.search);
  const simulation = new RunningSimulation(seedFromUrl(), { difficulty: parseDifficulty(search.get('difficulty')) });
  const reviewMilestone = search.get('reviewMilestone');
  if (import.meta.env.DEV && (reviewMilestone === 'qualifying' || reviewMilestone === 'defense')) {
    simulation.startMilestoneReview(reviewMilestone);
  }
  const reviewScene = search.get('reviewScene');
  if (import.meta.env.DEV && isReviewScene(reviewScene)) simulation.startSceneReview(reviewScene);
  return simulation;
}

function isReviewScene(value: string | null): value is ReviewScene {
  return value === 'dense' || value === 'meeting' || value === 'phone' || value === 'thesis' || value === 'defenseGate' || value === 'year9'
    || value === 'thesisSeed' || value === 'thesisSapling' || value === 'thesisTree' || value === 'thesisBloom'
    || value === 'seasonBefore' || value === 'seasonAfter' || value === 'year9End' || value === 'graduated';
}
