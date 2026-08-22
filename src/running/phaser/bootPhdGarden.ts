import Phaser from 'phaser';
import type { RunningGameHandle } from '../RunningModeHost';
import { RUNNING_WORLD, RunningSimulation, type ReviewScene, type RunningInput, type RunningSnapshot, type UpgradeId } from '../core/simulation';
import { t, type StringKey } from '../../i18n/strings';
import { parseDifficulty } from '../core/difficulty';
import { SemanticHints } from '../SemanticHints';
import { RunningAudio } from '../RunningAudio';
import { RunningLegend, createPhdLegendEntries } from '../RunningLegend';
import { loadRunningSave, markWorldCompleted, updateRunningSave } from '../core/save';
import type { AnnualMilestoneKind } from '../core/phdSystems';
import { PromotionAction } from '../PromotionAction';

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
  hudOverlay.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px"><span data-role="stats"></span><span data-role="systems" style="font-size:14px;color:#d7eddc;text-align:right"></span><span data-role="help" style="color:#8fb9ab;font-size:14px;font-weight:500">${t('running.help')}</span></div><div style="width:min(220px,58vw);height:12px;border-radius:8px;background:#0b1614;margin-top:10px;overflow:hidden"><i data-role="hp" style="display:block;height:100%;background:#f27878"></i></div><div style="width:min(220px,58vw);height:8px;border-radius:6px;background:#0b1614;margin-top:7px;overflow:hidden"><i data-role="xp" style="display:block;height:100%;background:#74e2c2"></i></div><div data-role="resources" style="margin-top:8px;font-size:13px;letter-spacing:3px"></div><div data-role="meeting" style="position:fixed;left:50%;top:max(18px,env(safe-area-inset-top));transform:translateX(-50%);color:#ffdda1;font-size:22px;white-space:nowrap"></div><div data-role="milestone-objective" style="position:fixed;left:50%;top:max(74px,calc(env(safe-area-inset-top) + 62px));transform:translateX(-50%);width:min(440px,calc(100vw - 36px));padding:8px 12px;border-radius:12px;background:#07100edb;text-align:center;font-size:14px;line-height:1.35;white-space:pre-line;display:none"></div>`;
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
    private hints!: SemanticHints;
    private audio!: RunningAudio;
    private legend!: RunningLegend;
    private legendOpen = false;
    private promotion!: PromotionAction;
    private previous: RunningSnapshot | null = null;
    private completionRecorded = false;
    private touchCount = 0;
    private pollutionTrail: Array<{ x: number; y: number }> = [];
    private lastPollutionSample = -1;

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
      this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ONE,TWO,THREE,FOUR,FIVE,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
      this.input.on('pointerdown', this.onPointerDown, this);
      this.input.on('pointermove', this.onPointerMove, this);
      this.input.on('pointerup', this.onPointerUp, this);
      this.input.on('pointerupoutside', this.onPointerUp, this);
      this.scale.on('resize', this.resizeCamera, this);
      this.resizeCamera();
      this.hints = new SemanticHints(root, isTextOff());
      this.audio = new RunningAudio(root, 'phd');
      this.legend = new RunningLegend(root, { world: 'phd', textOff: isTextOff(), getEntries: () => createPhdLegendEntries(this.simulation.snapshot(), loadRunningSave().seenHints), onOpenChange: (open) => { this.legendOpen = open; if (open) this.joystick = null; } });
      this.promotion = new PromotionAction(root, isTextOff());
      this.render(this.simulation.snapshot());
    }

    override update(_time: number, deltaMs: number): void {
      if (this.legendOpen) return;
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
      const keys = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR, this.keys.FIVE];
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
      this.touchCount += 1;
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
      this.previous = null;
      this.completionRecorded = false;
      this.pollutionTrail = [];
      this.lastPollutionSample = -1;
      this.promotion.hide();
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
        const alpha = this.touchCount === 1 ? .38 : .2;
        g.lineStyle(2, 0xd7fff0, alpha).lineBetween(this.joystick.x, this.joystick.y, this.joystick.currentX, this.joystick.currentY);
        g.fillStyle(0xd7fff0, alpha + .14).fillCircle(this.joystick.currentX, this.joystick.currentY, this.touchCount === 1 ? 8 : 6);
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
      if (state.phd.supervisorId) hudOverlay.querySelector<HTMLElement>('[data-role="systems"]')!.textContent += textOff ? '  ◆' : `  ·  ◆ ${t(`running.supervisor.${state.phd.supervisorId}` as StringKey)}`;
      if (!textOff && state.phd.annualMilestone) hudOverlay.querySelector<HTMLElement>('[data-role="systems"]')!.textContent += `  ·  ${t(annualMilestoneKey(state.phd.annualMilestone.kind))}`;
      if (!textOff && state.phd.revisionRemaining > 0) hudOverlay.querySelector<HTMLElement>('[data-role="systems"]')!.textContent += `  ·  ${t('running.revision')}`;
      if (state.phd.lifestyle) {
        const lifestyleIcon = { rest: '☾', exercise: '↗', social: '◇◇', mindfulness: '◌', weekendOvertime: '⚡+' }[state.phd.lifestyle.id];
        hudOverlay.querySelector<HTMLElement>('[data-role="systems"]')!.textContent += textOff ? `  ${lifestyleIcon}` : `  ·  ${lifestyleIcon} ${t(`running.lifestyle.${state.phd.lifestyle.id}` as StringKey)} ${Math.ceil(state.phd.lifestyle.remaining)}s`;
      }
      hudOverlay.querySelector<HTMLElement>('[data-role="resources"]')!.textContent = `⚡${Math.round(state.phd.energy)}  ◉${Math.round(state.phd.focus)}  ♡${Math.round(state.phd.spirit)}  ▧${Math.round(state.phd.calendarLoad)}  ◈${Math.round(state.phd.pollution)}`;
      const objective = hudOverlay.querySelector<HTMLElement>('[data-role="milestone-objective"]')!;
      if (state.phd.milestone) {
        const title = state.phd.milestone.kind === 'qualifying' ? t('running.qualifying') : t('running.defense');
        const detail = state.phd.milestone.kind === 'qualifying' ? t('running.milestone.qualifyingObjective') : t('running.milestone.defenseObjective');
        objective.textContent = textOff ? `△?  ${state.phd.milestone.progress} / ${state.phd.milestone.target}` : `${title}\n${detail}   △?  ${state.phd.milestone.progress} / ${state.phd.milestone.target}`;
        objective.style.display = 'block';
      } else objective.style.display = 'none';
      hudOverlay.dataset.year = String(state.phd.year);
      hudOverlay.dataset.simulationTime = state.time.toFixed(3);
      hudOverlay.dataset.difficulty = state.difficulty;
      hudOverlay.dataset.choiceKind = state.phd.choice?.kind ?? '';
      hudOverlay.dataset.upgradePending = String(state.upgradePending);
      hudOverlay.dataset.milestone = state.phd.milestone ? `${state.phd.milestone.kind}:${state.phd.milestone.phase}` : '';
      hudOverlay.dataset.milestoneProgress = state.phd.milestone ? `${state.phd.milestone.progress}/${state.phd.milestone.target}` : '';
      hudOverlay.dataset.supervisor = state.phd.supervisorId ?? 'unselected';
      hudOverlay.dataset.lifestyle = state.phd.lifestyle?.id ?? '';
      hudOverlay.querySelector<HTMLElement>('[data-role="help"]')!.style.display = textOff || this.isPortrait() || state.upgradePending || state.phd.choice || state.gameOver || state.phd.terminal === 'ended' || state.phd.terminal === 'graduated' ? 'none' : 'inline';
      if (state.phd.choice) this.drawPhdChoice(g, state);
      if (state.upgradePending && !state.phd.milestone) this.drawUpgradeOverlay(g);
      if (state.gameOver) this.drawGameOver(g);
      else if (state.phd.terminal === 'ended' || state.phd.terminal === 'graduated') this.drawPhdTerminal(g, state.phd.terminal);
      this.updateSemanticsAndAudio(state);
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
      else if (enemy.kind === 'reviewer' && enemy.source === 'meeting') {
        g.lineStyle(5, color, 1).strokeRoundedRect(enemy.x - 22, enemy.y - 16, 44, 32, 9);
        g.fillStyle(color, 1).fillTriangle(enemy.x - 6, enemy.y + 16, enemy.x + 7, enemy.y + 16, enemy.x, enemy.y + 27);
      }
      else if (enemy.kind === 'reviewer') g.fillTriangle(enemy.x, enemy.y - 23, enemy.x - 21, enemy.y + 18, enemy.x + 21, enemy.y + 18);
      else g.fillCircle(enemy.x, enemy.y, enemy.radius);
      if (enemy.source === 'milestone') {
        const marker = enemy.radius + 14;
        g.lineStyle(4, 0x8de5ff, .95);
        g.lineBetween(enemy.x, enemy.y - marker - 8, enemy.x - 8, enemy.y - marker + 3);
        g.lineBetween(enemy.x - 8, enemy.y - marker + 3, enemy.x + 8, enemy.y - marker + 3);
        g.lineBetween(enemy.x + 8, enemy.y - marker + 3, enemy.x, enemy.y - marker - 8);
        g.lineStyle(3, 0x8de5ff, .65).strokeCircle(enemy.x, enemy.y, marker);
      }
    }

    private drawPhdSystems(g: Phaser.GameObjects.Graphics, state: RunningSnapshot): void {
      const phd = state.phd;
      // A slow, bounded diamond silhouette keeps the supervisor distinct from the
      // circular player. Connections exist only during an actual feedback event.
      if (phd.supervisorId) {
      const supervisorX = 230 + Math.sin(state.time * 0.105 + 0.7) * 135;
      const supervisorY = 150 + Math.cos(state.time * 0.083 + 1.4) * 72;
      const supervisorColor = phd.supervisorId === 'controlling' ? 0xf1c36d : phd.supervisorId === 'handsOff' ? 0x9fc8e8 : 0x9be8c2;
      g.lineStyle(3, supervisorColor, .42).strokeCircle(supervisorX, supervisorY, 34);
      g.fillStyle(supervisorColor, .96).fillTriangle(supervisorX, supervisorY - 25, supervisorX - 22, supervisorY, supervisorX + 22, supervisorY);
      g.fillTriangle(supervisorX, supervisorY + 25, supervisorX - 22, supervisorY, supervisorX + 22, supervisorY);
      g.fillStyle(0x163c31, 1).fillRect(supervisorX - 5, supervisorY - 5, 10, 10);
      if (phd.supervisorFeedback) {
        const dx = state.player.x - supervisorX;
        const dy = state.player.y - supervisorY;
        const length = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / length;
        const uy = dy / length;
        if (phd.supervisorFeedback.signal > 0) {
          g.lineStyle(4, 0x8ce9ff, Math.min(.9, .38 + phd.supervisorFeedback.signal / 34));
          for (let offset = 28; offset < Math.min(length - 28, 190); offset += 32) {
            g.lineBetween(supervisorX + ux * offset, supervisorY + uy * offset, supervisorX + ux * (offset + 20), supervisorY + uy * (offset + 20));
          }
          const arrowX = supervisorX + ux * Math.min(length - 28, 215);
          const arrowY = supervisorY + uy * Math.min(length - 28, 215);
          g.fillStyle(0x8ce9ff, .9).fillTriangle(arrowX + ux * 12, arrowY + uy * 12, arrowX - uy * 8, arrowY + ux * 8, arrowX + uy * 8, arrowY - ux * 8);
        }
        if (phd.supervisorFeedback.noise > 0) {
          const px = -uy;
          const py = ux;
          g.lineStyle(4, 0x9d58b5, Math.min(.85, .28 + phd.supervisorFeedback.noise / 24));
          let priorX = supervisorX;
          let priorY = supervisorY;
          for (let index = 1; index <= 7; index += 1) {
            const distance = Math.min(length * .72, index * 25);
            const jitter = (index % 2 ? 12 : -12) + Math.sin(state.time * 18 + index) * 5;
            const nextX = supervisorX + ux * distance + px * jitter;
            const nextY = supervisorY + uy * distance + py * jitter;
            g.lineBetween(priorX, priorY, nextX, nextY);
            priorX = nextX;
            priorY = nextY;
          }
        }
      }
      }
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
      if (phd.pollution > 0) {
        if (state.time - this.lastPollutionSample >= .13) {
          this.lastPollutionSample = state.time;
          this.pollutionTrail.unshift({ x: state.player.x, y: state.player.y });
          this.pollutionTrail.length = Math.min(7, this.pollutionTrail.length);
        }
        const alpha = Math.min(.34, .12 + phd.pollution / 420);
        this.pollutionTrail.forEach((point, index) => {
          const drift = Math.sin(state.time * 1.7 + index * 2.1) * (5 + index * 1.5);
          g.fillStyle(0x9d58b5, alpha * (1 - index / 9)).fillCircle(point.x - index * 5, point.y + drift, 16 + index * 2 + phd.pollution * .08);
          g.fillStyle(0x603168, alpha * .8).fillCircle(point.x - 8 - index * 4, point.y + drift + 7, 7 + index);
        });
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
      if (phd.preDefense !== 'hidden' || phd.defense !== 'hidden') {
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
      const labels = choice.kind === 'project' ? [t('running.projectReplication'), t('running.projectIdea'), t('running.projectHelping'), t('running.projectPrestige')]
        : choice.kind === 'supervisor' ? [t('running.supervisor.supportive'), t('running.supervisor.controlling'), t('running.supervisor.handsOff')]
          : choice.kind === 'lifestyle' ? [t('running.lifestyle.rest'), t('running.lifestyle.exercise'), t('running.lifestyle.social'), t('running.lifestyle.mindfulness'), t('running.lifestyle.weekendOvertime')]
            : [t('running.attempt'), t('running.defer')];
      const icons = choice.kind === 'project' ? ['▣', '✦', '◇', '★']
        : choice.kind === 'supervisor' ? ['◆◇', '◆!', '◆·']
          : choice.kind === 'lifestyle' ? ['☾', '↗', '◇◇', '◌', '⚡+'] : ['▶', '◷'];
      const details = choice.kind === 'project' ? ['⚡16  ◉12  ▧12  →  ⬡◈', '⚡13  ◉18  ▧10  →  ✦', '⚡17  ◉8  ▧15  →  ◇', '⚡22  ◉16  ▧22  →  ★']
        : choice.kind === 'supervisor' ? [t('running.supervisor.supportiveDetail'), t('running.supervisor.controllingDetail'), t('running.supervisor.handsOffDetail')]
          : choice.kind === 'lifestyle' ? [t('running.lifestyle.restDetail'), t('running.lifestyle.exerciseDetail'), t('running.lifestyle.socialDetail'), t('running.lifestyle.mindfulnessDetail'), t('running.lifestyle.weekendOvertimeDetail')]
            : ['◉  ▶  ◆', '◷  ♡'];
      const colors = [0x79d8b0, 0xf1c867, 0x7fc6ef, 0xd99af0, 0xff9678];
      for (let index = 0; index < labels.length; index += 1) {
        const portrait = this.isPortrait();
        const width = portrait ? view.width - 48 : view.width / labels.length - 32;
        const height = portrait ? (view.height - 150) / labels.length - 8 : 260;
        const x = portrait ? view.left + 24 : view.left + index * (view.width / labels.length) + 16;
        const y = portrait ? view.top + 140 + index * ((view.height - 150) / labels.length) : view.centerY - 130;
        g.fillStyle(0x132e28, 1).fillRoundedRect(x, y, width, height, 22);
        g.lineStyle(4, colors[index], 0.9).strokeRoundedRect(x, y, width, height, 22);
        this.ephemeralText(x + width / 2, y + height * (portrait ? 0.22 : 0.38), icons[index], `#${colors[index].toString(16)}`, portrait ? 31 : 58);
        if (!isTextOff()) this.ephemeralText(x + width / 2, y + height * (portrait ? 0.5 : 0.62), labels[index], '#ffffff', portrait ? 14 : 18, true, portrait ? Math.max(180, width - 24) : undefined);
        if (!isTextOff() || choice.kind === 'project' || choice.kind === 'qualifying' || choice.kind === 'preDefense' || choice.kind === 'defense') this.ephemeralText(x + width / 2, y + height * (portrait ? 0.73 : 0.78), portrait ? details[index].replace(' · ', '\n') : details[index], '#c8ddcf', portrait ? 10 : 14, false, portrait ? Math.max(180, width - 24) : undefined);
        this.ephemeralText(x + width / 2, y + height * 0.91, String(index + 1), '#9dc8b8', 14);
      }
      const portraitTitle = choice.kind === 'supervisor' ? t('running.supervisorChoiceTitleCompact') : choice.kind === 'lifestyle' ? t('running.lifestyleTitleCompact') : '';
      const title = choice.kind === 'supervisor' ? t('running.supervisorChoiceTitle') : choice.kind === 'lifestyle' ? t('running.lifestyleTitle') : choice.kind === 'qualifying' ? t('running.qualifying') : choice.kind === 'preDefense' ? t('running.preDefense') : choice.kind === 'defense' ? t('running.defense') : '';
      if (title && !isTextOff()) this.ephemeralText(view.centerX, view.top + (this.isPortrait() ? 112 : 55), this.isPortrait() && portraitTitle ? portraitTitle : title, '#fff3bc', this.isPortrait() ? 15 : 26, true, this.isPortrait() ? Math.max(220, view.width - 28) : undefined);
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

    private updateSemanticsAndAudio(state: RunningSnapshot): void {
      if (state.phd.supervisorId) this.hints.show('supervisor', 'running.supervisorHint');
      this.hints.show('orbit', 'running.hint.orbit');
      this.hints.show('resources', 'running.hint.resources');
      if (state.phd.completedProjects > 0) this.hints.show('satellite', 'running.hint.satellite');
      if (state.phd.activeProject) this.hints.show('activeProject', 'running.hint.activeProject');
      if (state.phd.thesisStage !== 'seed') this.hints.show('thesis', 'running.hint.thesis');
      if (state.phd.signal > 0) this.hints.show('signal', 'running.hint.signal');
      if (state.phd.noise > 0 || state.phd.pollution > 0) this.hints.show('noise', 'running.hint.noise');
      if (state.meeting.phase !== 'idle') this.hints.show('meeting', 'running.hint.meeting');
      if (state.phd.annualMilestone || state.phd.milestone) this.hints.show('milestone', 'running.hint.milestone');
      for (const enemy of state.enemies) {
        if (enemy.kind === 'phone') this.hints.show('phone', 'running.hint.phone');
        else if (enemy.kind === 'reviewer' || enemy.kind === 'chair') this.hints.show('reviewer', 'running.hint.reviewer');
        else if (enemy.kind === 'committee') this.hints.show('committee', 'running.hint.committee');
      }
      const prior = this.previous;
      this.audio.setPressure(state.meeting.phase === 'active' || !!state.phd.milestone);
      if (prior) {
        if (state.hitPulses.some((pulse) => pulse.color === 0xf9f29f && !prior.hitPulses.some((old) => old.id === pulse.id))) this.audio.cue('hit');
        if (state.defeated > prior.defeated) this.audio.cue('defeat');
        if (prior.pickups.some((pickup) => !state.pickups.some((current) => current.id === pickup.id))) this.audio.cue('pickup');
        if (state.player.hp < prior.player.hp) this.audio.cue(state.enemies.some((enemy) => enemy.kind === 'phone') ? 'phone' : 'damage');
        if (state.level > prior.level) this.audio.cue('orbit');
        if (state.upgradePending && !prior.upgradePending) this.audio.cue('choice');
        if (state.phd.completedProjects > prior.phd.completedProjects) this.audio.cue('project');
        if (state.phd.signal > prior.phd.signal) this.audio.cue('signal');
        if (state.meeting.phase === 'telegraph' && prior.meeting.phase !== 'telegraph') this.audio.cue('meeting-warning');
        if (state.meeting.phase === 'active' && prior.meeting.phase === 'telegraph') this.audio.cue('meeting-start');
        if (state.enemies.some((enemy) => enemy.kind === 'phone' && !prior.enemies.some((old) => old.id === enemy.id))) this.audio.cue('phone');
        if (state.phd.milestone?.phase === 'telegraph' && !prior.phd.milestone) this.audio.cue('milestone-warning');
        if (state.phd.milestone?.phase === 'active' && prior.phd.milestone?.phase === 'telegraph') this.audio.cue(state.phd.milestone.kind === 'defense' ? 'boss' : 'meeting-start');
        if (state.gameOver && !prior.gameOver) this.audio.cue('game-over');
        if (state.phd.qualifying === 'passed' && prior.phd.qualifying !== 'passed') {
          this.audio.cue('success');
          const save = loadRunningSave();
          updateRunningSave({ milestoneCompletions: [...save.milestoneCompletions, 'phd:qualifying'] });
        }
        if (state.phd.preDefense === 'passed' && prior.phd.preDefense !== 'passed') {
          this.audio.cue('success');
          const save = loadRunningSave();
          updateRunningSave({ milestoneCompletions: [...save.milestoneCompletions, 'phd:pre-defense'] });
        }
      }
      if (state.phd.terminal === 'graduated' && !this.completionRecorded) {
        this.completionRecorded = true;
        this.audio.cue('complete');
        markWorldCompleted('phd', state.difficulty);
        const refreshed = loadRunningSave();
        updateRunningSave({ milestoneCompletions: [...refreshed.milestoneCompletions, 'phd:defense'] });
        this.promotion.show({
          world: 'phd', completionNumber: refreshed.worldCompletions.phd ?? 1, difficulty: state.difficulty,
          orbitCount: state.orbitCount, energy: state.phd.energy, focus: state.phd.focus, spirit: state.phd.spirit,
          evidence: state.phd.evidence, connection: state.phd.connection,
        });
      }
      this.previous = state;
    }
    destroyRuntime(): void { this.legend?.destroy(); this.audio?.destroy(); this.hints?.destroy(); this.promotion?.destroy(); }

    private ephemeralText(x: number, y: number, value: string, color: string, size: number, bold = false, wrapWidth?: number): void {
      const label = this.add.text(x, y, value, { color, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', fontFamily: 'system-ui', align: 'center', ...(wrapWidth ? { wordWrap: { width: wrapWidth, useAdvancedWrap: false } } : {}) }).setOrigin(0.5).setDepth(30);
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
  return { destroy: () => { const scene = game.scene.getScene('phd-garden') as PhdGardenScene | undefined; scene?.destroyRuntime(); exit.remove(); hudOverlay.remove(); game.destroy(true); } };
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

function annualMilestoneKey(kind: AnnualMilestoneKind): StringKey {
  return kind === 'firstYearTalk' ? 'running.milestone.year1' : kind === 'proposal' ? 'running.milestone.year2' : 'running.milestone.annual';
}

function createSimulation(): RunningSimulation {
  const search = new URLSearchParams(window.location.search);
  const simulation = new RunningSimulation(seedFromUrl(), { difficulty: parseDifficulty(search.get('difficulty')) });
  const reviewMilestone = search.get('reviewMilestone');
  if (import.meta.env.DEV && (reviewMilestone === 'qualifying' || reviewMilestone === 'defense')) {
    simulation.startMilestoneReview(reviewMilestone);
  }
  const reviewChoice = search.get('reviewChoice');
  if (import.meta.env.DEV && (reviewChoice === 'supervisor' || reviewChoice === 'lifestyle')) simulation.startChoiceReview(reviewChoice);
  const reviewSupervisor = search.get('reviewSupervisor');
  if (import.meta.env.DEV && (reviewSupervisor === 'supportive' || reviewSupervisor === 'controlling' || reviewSupervisor === 'handsOff')) {
    simulation.startChoiceReview('supervisor');
    simulation.choosePhdOption(reviewSupervisor);
  }
  const reviewFeedback = search.get('reviewFeedback');
  if (import.meta.env.DEV && (reviewFeedback === 'supportive' || reviewFeedback === 'controlling' || reviewFeedback === 'handsOff')) simulation.startSupervisorFeedbackReview(reviewFeedback);
  const reviewScene = search.get('reviewScene');
  if (import.meta.env.DEV && isReviewScene(reviewScene)) simulation.startSceneReview(reviewScene);
  return simulation;
}

function isReviewScene(value: string | null): value is ReviewScene {
  return value === 'dense' || value === 'meeting' || value === 'phone' || value === 'thesis' || value === 'defenseGate' || value === 'year9'
    || value === 'thesisSeed' || value === 'thesisSapling' || value === 'thesisTree' || value === 'thesisBloom'
    || value === 'seasonBefore' || value === 'seasonAfter' || value === 'year9End' || value === 'graduated'
    || value === 'annual1' || value === 'annual2' || value === 'annual3' || value === 'annual4';
}
