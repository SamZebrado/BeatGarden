import Phaser from 'phaser';
import { t, type StringKey } from '../../i18n/strings';
import type { RunningGameHandle } from '../RunningModeHost';
import { RUNNING_WORLD, type RunningInput } from '../core/simulation';
import { ScenarioSimulation, type ScenarioEnemy, type ScenarioSnapshot, type ScenarioWorld } from '../core/scenarioSimulation';
import type { RunningDifficulty } from '../core/difficulty';
import { SemanticHints } from '../SemanticHints';
import { RunningAudio } from '../RunningAudio';
import { RunningLegend, createScenarioLegendEntries } from '../RunningLegend';
import { loadRunningSave, markWorldCompleted } from '../core/save';
import { PromotionAction } from '../PromotionAction';
import { beginCardPress, cardAtPoint, cardPressMovedTooFar, completesCardPress, scenarioChoiceCardRects, type CardPress, type ChoiceViewport } from './choiceCards';
import { clearCurrentRun, saveCurrentRun, type CurrentRunV1 } from '../core/currentRun';

const STEP = 1 / 60;

type ScenarioCurrentRun = Extract<CurrentRunV1, { world: ScenarioWorld }>;

export async function bootScenarioGarden(root: HTMLElement, options: { world: ScenarioWorld; onExit: () => void; difficulty: RunningDifficulty; resume?: ScenarioCurrentRun }): Promise<RunningGameHandle> {
  const runSeed = options.resume?.seed ?? scenarioSeed(options.world);
  root.replaceChildren();
  root.style.cssText = `width:100vw;height:100vh;overflow:hidden;background:${options.world === 'master' ? '#0b1830' : '#171b22'};touch-action:none;`;
  const host = document.createElement('div');
  host.style.cssText = 'width:100%;height:100%';
  root.appendChild(host);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;z-index:40;left:max(18px,env(safe-area-inset-left));right:max(18px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));pointer-events:none;color:#fff;font:700 17px system-ui;text-shadow:0 2px 8px #000';
  overlay.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px"><span data-role="stats"></span><span data-role="cycle"></span></div><div style="width:min(225px,58vw);height:11px;background:#080b10;border-radius:8px;overflow:hidden;margin-top:9px"><i data-role="hp" style="display:block;height:100%;background:#f27b7b"></i></div><div style="width:min(225px,58vw);height:8px;background:#080b10;border-radius:8px;overflow:hidden;margin-top:7px"><i data-role="progress" style="display:block;height:100%;background:#79e4bd"></i></div><div data-role="resources" style="margin-top:8px;letter-spacing:3px;font-size:13px"></div><div data-role="event" style="position:fixed;top:24px;left:50%;transform:translateX(-50%);font-size:24px;color:#ffe18b"></div>`;
  root.appendChild(overlay);

  class ScenarioScene extends Phaser.Scene {
    private simulation = createSimulation(options.world, options.difficulty, options.resume);
    private graphics!: Phaser.GameObjects.Graphics;
    private keys!: Record<string, Phaser.Input.Keyboard.Key>;
    private accumulator = 0;
    private joystick: { id: number; x: number; y: number; currentX: number; currentY: number } | null = null;
    private hints!: SemanticHints;
    private audio!: RunningAudio;
    private legend!: RunningLegend;
    private legendOpen = false;
    private promotion!: PromotionAction;
    private previous: ScenarioSnapshot | null = null;
    private completionRecorded = false;
    private touchCount = 0;
    private choicePress: CardPress | null = null;
    private checkpointToken = '';

    constructor() { super(`${options.world}-garden`); }

    create(): void {
      this.graphics = this.add.graphics();
      const keyboard = this.input.keyboard;
      if (!keyboard) throw new Error('Keyboard input unavailable');
      this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ONE,TWO,THREE,FOUR,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
      this.input.on('pointerdown', this.onPointerDown, this);
      this.input.on('pointermove', this.onPointerMove, this);
      this.input.on('pointerup', this.onPointerUp, this);
      this.input.on('pointerupoutside', this.onPointerUp, this);
      this.scale.on('resize', this.resizeCamera, this);
      this.resizeCamera();
      this.hints = new SemanticHints(root, isTextOff());
      this.showPortraitHintIfNeeded();
      this.audio = new RunningAudio(root, options.world);
      this.legend = new RunningLegend(root, { world: options.world, textOff: isTextOff(), getEntries: () => createScenarioLegendEntries(this.simulation.snapshot(), loadRunningSave().seenHints), onOpenChange: (open) => { this.legendOpen = open; if (open) this.joystick = null; } });
      this.promotion = new PromotionAction(root, isTextOff());
      this.time.addEvent({ delay: 4000, loop: true, callback: () => this.saveNow() });
      this.saveNow();
    }

    override update(_time: number, deltaMs: number): void {
      if (this.legendOpen) return;
      let state = this.simulation.snapshot();
      if (state.completed || state.gameOver) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.restart();
        this.render(state);
        return;
      }
      if (state.choice) {
        const keys = [this.keys.ONE, this.keys.TWO, this.keys.THREE, this.keys.FOUR];
        for (let index = 0; index < state.choice.options.length; index += 1) if (Phaser.Input.Keyboard.JustDown(keys[index]) && this.simulation.choose(state.choice.options[index])) this.saveNow();
        this.render(this.simulation.snapshot());
        return;
      }
      this.accumulator += Math.min(0.1, deltaMs / 1000);
      const input = this.readInput();
      while (this.accumulator >= STEP) { this.simulation.step(STEP, input); this.accumulator -= STEP; }
      state = this.simulation.snapshot();
      this.render(state);
    }

    private restart(): void { clearCurrentRun(); this.simulation = createSimulation(options.world, options.difficulty); this.accumulator = 0; this.joystick = null; this.choicePress = null; this.checkpointToken = ''; this.previous = null; this.completionRecorded = false; this.promotion.hide(); this.saveNow(); }

    saveNow(): void {
      const state = this.simulation.snapshot();
      if (state.completed || state.gameOver) { clearCurrentRun(); return; }
      const simulation = this.simulation.exportState();
      if (options.world === 'master') saveCurrentRun({ version: 1, status: 'active', savedAt: Date.now(), seed: runSeed, world: 'master', difficulty: state.difficulty, simulation });
      else saveCurrentRun({ version: 1, status: 'active', savedAt: Date.now(), seed: runSeed, world: 'work', difficulty: state.difficulty, simulation });
    }

    private readInput(): RunningInput {
      const keyboard = { x: Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown), y: Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown) };
      if (!this.joystick) return keyboard;
      const dx = this.joystick.currentX - this.joystick.x;
      const dy = this.joystick.currentY - this.joystick.y;
      const length = Math.hypot(dx, dy);
      return length < 8 ? keyboard : { x: dx / Math.max(48, length), y: dy / Math.max(48, length) };
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
      const state = this.simulation.snapshot();
      if (state.completed || state.gameOver) { this.restart(); return; }
      if (state.choice) {
        const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const index = cardAtPoint(scenarioChoiceCardRects(this.choiceViewport(), state.choice.options.length, this.isPortrait()), point);
        this.choicePress = index === null ? null : beginCardPress(pointer.id, index, { x: pointer.x, y: pointer.y });
        return;
      }
      this.joystick = { id: pointer.id, x: pointer.x, y: pointer.y, currentX: pointer.x, currentY: pointer.y };
      this.touchCount += 1;
    }

    private onPointerMove(pointer: Phaser.Input.Pointer): void {
      if (this.choicePress?.pointerId === pointer.id) {
        if (cardPressMovedTooFar(this.choicePress, { x: pointer.x, y: pointer.y })) this.choicePress = null;
        return;
      }
      if (this.joystick?.id === pointer.id) { this.joystick.currentX = pointer.x; this.joystick.currentY = pointer.y; }
    }

    private onPointerUp(pointer: Phaser.Input.Pointer): void {
      const press = this.choicePress;
      this.choicePress = null;
      const state = this.simulation.snapshot();
      if (state.choice) {
        const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const index = completesCardPress(press, pointer.id, scenarioChoiceCardRects(this.choiceViewport(), state.choice.options.length, this.isPortrait()), point, { x: pointer.x, y: pointer.y });
        if (index !== null && this.simulation.choose(state.choice.options[index])) this.saveNow();
        return;
      }
      if (this.joystick?.id === pointer.id) this.joystick = null;
    }

    private resizeCamera(): void {
      const zoom = this.isPortrait() ? this.scale.height / RUNNING_WORLD.height : Math.min(this.scale.width / RUNNING_WORLD.width, this.scale.height / RUNNING_WORLD.height);
      this.cameras.main.setBounds(0, 0, RUNNING_WORLD.width, RUNNING_WORLD.height).setZoom(zoom);
      this.showPortraitHintIfNeeded();
    }

    private choiceViewport(): ChoiceViewport {
      const view = this.cameras.main.worldView;
      return { left: view.left, top: view.top, width: view.width, height: view.height, centerX: view.centerX, centerY: view.centerY };
    }

    private showPortraitHintIfNeeded(): void {
      if (this.isPortrait() && this.hints) this.hints.show('portrait', 'running.hint.portrait');
    }

    private render(state: ScenarioSnapshot): void {
      const g = this.graphics;
      g.clear();
      if (this.isPortrait()) this.cameras.main.centerOn(state.player.x, state.player.y);
      else this.cameras.main.centerOn(640, 360);
      this.drawWorld(g, state);
      this.drawEvent(g, state);
      this.drawMasterProposal(g, state);
      this.drawClimax(g, state);
      for (let index = 0; index < state.orbitCount; index += 1) {
        const angle = state.time * 2.2 + index / state.orbitCount * Math.PI * 2;
        g.fillStyle(options.world === 'master' ? 0x76d7ff : 0xffd174, 1).fillCircle(state.player.x + Math.cos(angle) * 64, state.player.y + Math.sin(angle) * 64, 9);
      }
      for (const pickup of state.pickups) { g.fillStyle(0x8df2c0, 0.28).fillCircle(pickup.x, pickup.y, 15); g.fillStyle(0xb9ffe0, 1).fillCircle(pickup.x, pickup.y, 8); }
      for (const projectile of state.projectiles) { g.fillStyle(0xfff1a4, 1).fillCircle(projectile.x, projectile.y, projectile.radius); }
      for (const enemy of state.enemies) this.drawEnemy(g, enemy, state.time);
      g.fillStyle(options.world === 'master' ? 0x9de7ff : 0xffda85, 0.25).fillCircle(state.player.x, state.player.y, 30);
      g.fillStyle(0xd6fff0, 1).fillCircle(state.player.x, state.player.y, state.player.radius);
      g.fillStyle(0x17252d, 1).fillCircle(state.player.x + 5, state.player.y - 4, 4);
      if (this.joystick) {
        const alpha = this.touchCount === 1 ? .38 : .2;
        g.lineStyle(2, 0xffffff, alpha).lineBetween(this.joystick.x, this.joystick.y, this.joystick.currentX, this.joystick.currentY);
        g.fillStyle(0xffffff, alpha + .12).fillCircle(this.joystick.currentX, this.joystick.currentY, this.touchCount === 1 ? 8 : 6);
      }
      this.updateOverlay(state);
      this.updateSemanticsAndAudio(state);
      this.saveCheckpointIfChanged(state);
      if (state.choice) this.drawChoice(g, state);
      if (state.completed || state.gameOver) this.drawTerminal(g, state);
    }

    private saveCheckpointIfChanged(state: ScenarioSnapshot): void {
      const token = state.masterPath
        ? [state.masterPath.year, state.masterPath.supervisorPersonId, state.masterPath.proposal.phase, state.masterPath.proposal.progress, state.masterPath.careerPlan, state.climax.phase, state.climax.progress, state.completed].join('|')
        : [state.workPath?.stage, state.workPath?.managerId, state.activePriority, state.priorityRemaining > 0, state.climax.phase, state.climax.progress, state.completed].join('|');
      if (!this.checkpointToken) { this.checkpointToken = token; return; }
      if (token !== this.checkpointToken) { this.checkpointToken = token; this.saveNow(); }
    }

    private drawWorld(g: Phaser.GameObjects.Graphics, state: ScenarioSnapshot): void {
      const bg = options.world === 'master' ? 0x0b1830 : 0x171b22;
      g.fillStyle(bg, 1).fillRect(0, 0, 1280, 720);
      if (options.world === 'master') {
        for (let y = 115; y < 720; y += 145) { g.fillStyle(0x254d73, 0.22).fillRoundedRect(0, y, 1280, 58, 18); g.lineStyle(3, 0x6fc4ef, 0.18).lineBetween(0, y + 29, 1280, y + 29); }
        const sweep = (state.time * 70) % 1500 - 120;
        g.fillStyle(0x7abfe8, 0.08).fillRect(sweep, 0, 90, 720);
      } else {
        for (let x = 0; x < 1280; x += 128) for (let y = 0; y < 720; y += 90) g.lineStyle(1, 0x8e97a8, 0.14).strokeRoundedRect(x + 10, y + 10, 104, 64, 8);
        const lane = Math.floor(state.time / 7) % 3;
        g.fillStyle([0x3f6f8e, 0x8a633c, 0x6c4c80][lane], 0.13).fillRect(lane * 1280 / 3, 0, 1280 / 3, 720);
      }
    }

    private drawEvent(g: Phaser.GameObjects.Graphics, state: ScenarioSnapshot): void {
      if (state.event.phase === 'idle') return;
      if (options.world === 'master') {
        const width = state.event.phase === 'telegraph' ? 160 + (2 - state.event.remaining) * 260 : 820;
        g.lineStyle(10, 0x82d6ff, 0.72).strokeRoundedRect(640 - width / 2, 105, width, 510, 26);
        for (let lane = 0; lane < 4; lane += 1) g.fillStyle(0x82d6ff, 0.25).fillRect(120 + lane * 280, 0, 48, 720);
      } else if (state.event.kind === 'daily') {
        const x = state.player.x + Math.max(-150, state.event.remaining - 1) * 140;
        g.lineStyle(9, 0xffc56f, 0.8).lineBetween(x, 0, x, 720);
        for (let y = 65; y < 720; y += 110) g.fillStyle(0xffc56f, 0.75).fillTriangle(x, y, x - 16, y + 24, x + 16, y + 24);
      } else {
        const radius = state.event.phase === 'telegraph' ? 130 + (3 - state.event.remaining) * 75 : 340;
        g.lineStyle(12, 0xd79cff, 0.75).strokeCircle(state.player.x, state.player.y, radius);
        g.lineStyle(5, 0xd79cff, 0.45).strokeCircle(state.player.x, state.player.y, radius + 50);
      }
    }

    private drawClimax(g: Phaser.GameObjects.Graphics, state: ScenarioSnapshot): void {
      if (state.climax.phase === 'none') return;
      const color = options.world === 'master' ? 0x82d6ff : 0xffc56f;
      g.lineStyle(9, color, 0.8).strokeRoundedRect(18, 18, 1244, 684, 32);
      if (state.climax.phase === 'active') {
        g.fillStyle(0x080b10, 0.86).fillRoundedRect(460, 92, 360, 18, 9);
        g.fillStyle(color, 1).fillRoundedRect(460, 92, 360 * state.climax.progress / state.climax.target, 18, 9);
      }
    }

    private drawMasterProposal(g: Phaser.GameObjects.Graphics, state: ScenarioSnapshot): void {
      const proposal = state.masterPath?.proposal;
      if (!proposal || proposal.phase === 'none' || proposal.phase === 'complete') return;
      const presentation = proposal.phase === 'presentation';
      g.lineStyle(presentation ? 8 : 5, 0x82d6ff, presentation ? .78 : .42).strokeRoundedRect(30, 30, 1220, 660, 28);
      if (presentation) {
        g.fillStyle(0x080b10, .86).fillRoundedRect(460, 120, 360, 18, 9);
        g.fillStyle(0x82d6ff, 1).fillRoundedRect(460, 120, 360 * proposal.progress / proposal.target, 18, 9);
      }
    }

    private drawEnemy(g: Phaser.GameObjects.Graphics, enemy: ScenarioEnemy, time: number): void {
      const palette: Record<ScenarioEnemy['kind'], number> = { courseBlock: 0x69b7e6, deadline: 0xff8c7d, exam: 0xb699ff, request: 0xffaa5b, notification: 0x70d5ff, delivery: 0xf0d06c };
      const color = enemy.flash > 0 ? 0xffffff : palette[enemy.kind];
      g.fillStyle(color, 0.22).fillCircle(enemy.x, enemy.y, enemy.radius + 9);
      g.fillStyle(color, 1);
      if (enemy.kind === 'courseBlock') { g.fillRoundedRect(enemy.x - 26, enemy.y - 19, 52, 38, 7); g.lineStyle(4, 0xd8efff, 0.8).lineBetween(enemy.x - 18, enemy.y - 7, enemy.x + 17, enemy.y - 7); }
      else if (enemy.kind === 'deadline') g.fillTriangle(enemy.x, enemy.y - 22, enemy.x - 20, enemy.y + 18, enemy.x + 20, enemy.y + 18);
      else if (enemy.kind === 'request') { g.fillRoundedRect(enemy.x - 25, enemy.y - 18, 50, 36, 8); g.fillStyle(0x5b3016, 1).fillTriangle(enemy.x + 25, enemy.y, enemy.x + 10, enemy.y - 10, enemy.x + 10, enemy.y + 10); }
      else if (enemy.kind === 'notification') { const shake = Math.sin(time * 24) * 4; g.fillCircle(enemy.x + shake, enemy.y, 18); g.lineStyle(4, 0xc7f2ff, 0.7).strokeCircle(enemy.x + shake, enemy.y, 28 + (time * 30) % 18); }
      else {
        g.fillCircle(enemy.x, enemy.y, 42);
        g.lineStyle(7, 0xffffff, 0.78).strokeCircle(enemy.x, enemy.y, 51);
        const count = enemy.kind === 'exam' ? 4 : 6;
        for (let index = 0; index < count; index += 1) { const angle = index / count * Math.PI * 2; g.fillStyle(0x382c45, 1).fillRect(enemy.x + Math.cos(angle) * 27 - 5, enemy.y + Math.sin(angle) * 27 - 5, 10, 10); }
      }
    }

    private updateOverlay(state: ScenarioSnapshot): void {
      const textOff = isTextOff();
      overlay.querySelector<HTMLElement>('[data-role="stats"]')!.textContent = textOff ? `⬡${state.orbitCount} ◆${state.defeated}` : `${options.world === 'master' ? t('running.master') : t('running.work')}  ◆ ${state.defeated}`;
      const pathStatus = state.masterPath
        ? `Y${state.masterPath.year} ${state.masterPath.careerPlan ? '◇' : ''}`
        : state.workPath ? `${state.workPath.stage}  ◒${Math.round(state.workPath.marketStrength * 100)}` : '';
      overlay.querySelector<HTMLElement>('[data-role="cycle"]')!.textContent = `${options.world === 'master' ? '▦' : '◷'}${state.cycle} ${pathStatus}  ${state.activePriority}${state.priorityRemaining > 0 ? ` ${Math.ceil(state.priorityRemaining)}s` : ''}`;
      overlay.querySelector<HTMLElement>('[data-role="hp"]')!.style.width = `${Math.max(0, state.player.hp / state.player.maxHp) * 100}%`;
      overlay.querySelector<HTMLElement>('[data-role="progress"]')!.style.width = `${state.progress / state.progressTarget * 100}%`;
      overlay.querySelector<HTMLElement>('[data-role="resources"]')!.textContent = `⚡${Math.round(state.energy)} ◉${Math.round(state.focus)} ♡${Math.round(state.spirit)} ▧${Math.round(state.calendar)}`;
      overlay.querySelector<HTMLElement>('[data-role="event"]')!.textContent = state.event.phase === 'telegraph' ? `${state.event.kind === 'weekly' ? '◎' : options.world === 'master' ? '▦' : '!' } ${textOff ? '' : t(`running.event.${state.event.kind}` as StringKey)} ${Math.max(1, Math.ceil(state.event.remaining))}` : '';
      overlay.dataset.world = state.world;
      overlay.dataset.simulationTime = state.time.toFixed(3);
      overlay.dataset.difficulty = state.difficulty;
      overlay.dataset.event = `${state.event.kind}:${state.event.phase}`;
      overlay.dataset.climax = state.climax.phase;
      overlay.dataset.completed = String(state.completed);
      overlay.dataset.priorityRemaining = state.priorityRemaining.toFixed(2);
      overlay.dataset.pathStage = state.masterPath?.stage ?? state.workPath?.stage ?? '';
      overlay.dataset.market = state.workPath?.marketStrength.toFixed(3) ?? '';
      overlay.dataset.choiceKind = state.choice?.kind ?? '';
      overlay.dataset.manager = state.workPath?.managerId ?? '';
      overlay.dataset.experience = state.workPath?.experience.toFixed(2) ?? '';
      overlay.dataset.careerPlan = state.masterPath?.careerPlan ?? '';
    }

    private drawChoice(g: Phaser.GameObjects.Graphics, state: ScenarioSnapshot): void {
      const choice = state.choice;
      if (!choice) return;
      const view = this.cameras.main.worldView;
      g.fillStyle(0x04070b, 0.88).fillRect(view.left, view.top, view.width, view.height);
      const icons = choice.kind === 'masterTrack' ? ['▦', '◆', '◇', '★']
        : choice.kind === 'masterSupervisor' ? ['◆◇', '◆!', '◆·']
          : choice.kind === 'careerPlan' ? ['✦', '▣', '◇']
            : choice.kind === 'workOffer' ? ['▦', '⚡', '◇']
              : choice.kind === 'workConversion' ? ['✓', '↗'] : ['▣', '⚡'];
      const colors = [0x7cc9f4, 0xffc56f, 0x79d8b0, 0xd99af0];
      const cards = scenarioChoiceCardRects(this.choiceViewport(), choice.options.length, this.isPortrait());
      for (let index = 0; index < choice.options.length; index += 1) {
        const portrait = this.isPortrait();
        const { x, y, width, height } = cards[index];
        g.fillStyle(0x172832, 1).fillRoundedRect(x, y, width, height, 22);
        g.lineStyle(4, colors[index], 0.9).strokeRoundedRect(x, y, width, height, 22);
        this.label(x + width / 2, y + height * 0.38, icons[index], `#${colors[index].toString(16)}`, portrait ? 42 : 64);
        if (!isTextOff()) this.label(x + width / 2, y + height * 0.65, t(`running.choice.${choice.options[index]}` as StringKey), '#ffffff', 17);
        if (!isTextOff() && choice.kind === 'workPriority') this.label(x + width / 2, y + height * 0.78, portrait ? t(`running.choice.${choice.options[index]}Detail` as StringKey).replace(/, /g, ',\n') : t(`running.choice.${choice.options[index]}Detail` as StringKey), '#c8ddcf', portrait ? 11 : 14, portrait ? Math.max(180, width - 30) : undefined);
        this.label(x + width / 2, y + height * 0.86, String(index + 1), '#a9c9c0', 15);
      }
    }

    private drawTerminal(g: Phaser.GameObjects.Graphics, state: ScenarioSnapshot): void {
      const view = this.cameras.main.worldView;
      g.fillStyle(0x030507, 0.82).fillRect(view.left, view.top, view.width, view.height);
      this.label(view.centerX, view.centerY - 20, state.completed ? (options.world === 'master' ? '✦  ✓' : '▣  ✓') : '♡', state.completed ? '#ffe18b' : '#ffffff', 68);
      if (!isTextOff()) this.label(view.centerX, view.centerY + 58, state.completed ? t('running.completed') : t('running.resting'), '#d8eee5', 24);
    }

    private label(x: number, y: number, value: string, color: string, size: number, wrapWidth?: number): void {
      const text = this.add.text(x, y, value, { color, fontFamily: 'system-ui', fontSize: `${size}px`, fontStyle: 'bold', align: 'center', ...(wrapWidth ? { wordWrap: { width: wrapWidth, useAdvancedWrap: false } } : {}) }).setOrigin(0.5).setDepth(30);
      this.time.delayedCall(20, () => text.destroy());
    }
    private updateSemanticsAndAudio(state: ScenarioSnapshot): void {
      this.hints.show('orbit', 'running.hint.orbit');
      this.hints.show('resources', 'running.hint.resources');
      if (state.orbitCount > 1) this.hints.show('satellite', 'running.hint.satellite');
      for (const enemy of state.enemies) {
        if (enemy.kind === 'courseBlock') this.hints.show('courseBlock', 'running.hint.courseBlock');
        else if (enemy.kind === 'deadline') this.hints.show('deadline', 'running.hint.deadline');
        else if (enemy.kind === 'request') this.hints.show('request', 'running.hint.request');
        else if (enemy.kind === 'notification') this.hints.show('notification', 'running.hint.notification');
      }
      const prior = this.previous;
      this.audio.setPressure(state.event.phase === 'active' || state.climax.phase !== 'none');
      if (prior) {
        if (state.defeated > prior.defeated) this.audio.cue('defeat');
        if (prior.pickups.some((pickup) => !state.pickups.some((current) => current.id === pickup.id))) this.audio.cue('pickup');
        if (state.player.hp < prior.player.hp) this.audio.cue('damage');
        if (state.choice && !prior.choice) this.audio.cue('choice');
        if (state.event.phase === 'telegraph' && prior.event.phase !== 'telegraph') this.audio.cue('meeting-warning');
        if (state.event.phase === 'active' && prior.event.phase === 'telegraph') this.audio.cue('meeting-start');
        if (state.climax.phase === 'telegraph' && prior.climax.phase === 'none') this.audio.cue('milestone-warning');
        if (state.climax.phase === 'active' && prior.climax.phase === 'telegraph') this.audio.cue('boss');
        if (state.gameOver && !prior.gameOver) this.audio.cue('game-over');
      }
      if (state.event.phase !== 'idle') this.hints.show(state.event.kind === 'weekly' ? 'meeting' : state.world === 'master' ? 'milestone' : 'meeting', state.event.kind === 'weekly' ? 'running.hint.weeklyWork' : 'running.hint.milestone');
      if (state.completed && !this.completionRecorded) {
        clearCurrentRun();
        this.completionRecorded = true;
        this.audio.cue('complete');
        markWorldCompleted(state.world, state.difficulty);
        const refreshed = loadRunningSave();
        this.promotion.show({
          world: state.world, completionNumber: refreshed.worldCompletions[state.world] ?? 1, difficulty: state.difficulty,
          orbitCount: state.orbitCount, energy: state.energy, focus: state.focus, spirit: state.spirit,
          activePriority: state.activePriority,
        });
      }
      this.previous = state;
    }
    destroyRuntime(): void { this.legend?.destroy(); this.audio?.destroy(); this.hints?.destroy(); this.promotion?.destroy(); }
    private isPortrait(): boolean { return this.scale.width / this.scale.height < 0.75; }
  }

  const game = new Phaser.Game({ type: Phaser.AUTO, parent: host, width: innerWidth, height: innerHeight, scene: ScenarioScene, backgroundColor: options.world === 'master' ? '#0b1830' : '#171b22', scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: true }, input: { activePointers: 3 } });
  const exit = document.createElement('button');
  exit.textContent = '←';
  exit.setAttribute('aria-label', t('running.backToWorlds'));
  exit.style.cssText = 'position:fixed;z-index:50;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));width:48px;height:48px;border-radius:50%;border:1px solid #789;background:#14232a;color:#fff;font-size:22px';
  exit.addEventListener('click', options.onExit);
  root.appendChild(exit);
  return { saveNow: () => { const scene = game.scene.getScene(`${options.world}-garden`) as ScenarioScene | undefined; scene?.saveNow(); }, destroy: () => { const scene = game.scene.getScene(`${options.world}-garden`) as ScenarioScene | undefined; scene?.saveNow(); scene?.destroyRuntime(); exit.remove(); overlay.remove(); game.destroy(true); } };
}

function createSimulation(world: ScenarioWorld, difficulty: RunningDifficulty, resume?: ScenarioCurrentRun): ScenarioSimulation {
  const params = new URLSearchParams(location.search);
  const seed = resume?.seed ?? scenarioSeed(world);
  const simulation = new ScenarioSimulation(world, seed, resume?.difficulty ?? difficulty, resume ? { restore: resume.simulation } : {});
  if (resume) return simulation;
  const scene = params.get('reviewScene');
  if (import.meta.env.DEV && (scene === 'dense' || scene === 'event' || scene === 'choice' || scene === 'climax' || scene === 'complete')) simulation.startReview(scene);
  const reviewChoice = params.get('reviewChoice');
  if (import.meta.env.DEV && (reviewChoice === 'careerPlan' || reviewChoice === 'workOffer' || reviewChoice === 'workConversion' || reviewChoice === 'workPriority')) simulation.startChoiceReview(reviewChoice);
  if (import.meta.env.DEV && world === 'master') {
    const year = Number(params.get('reviewMasterYear'));
    const plan = params.get('reviewCareerPlan');
    if (year === 1 || year === 2 || year === 3) simulation.startMasterPathReview(year, plan === 'researchPhd' || plan === 'employment' || plan === 'undecided' ? plan : null);
  }
  if (import.meta.env.DEV && world === 'work') {
    const stage = params.get('reviewWorkStage');
    const market = params.get('reviewMarket') === 'weak' ? .25 : params.get('reviewMarket') === 'strong' ? .75 : .5;
    if (stage === 'offers' || stage === 'trial' || stage === 'conversion' || stage === 'employed' || stage === 'promotion') simulation.startWorkPathReview(stage, market);
  }
  return simulation;
}

function scenarioSeed(world: ScenarioWorld): number {
  const params = new URLSearchParams(location.search);
  let seed = 2166136261;
  for (const character of params.get('seed') ?? world) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

function isTextOff(): boolean { return new URLSearchParams(location.search).get('textOff') === '1'; }
