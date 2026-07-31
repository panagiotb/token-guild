import './style.css';
import { applyTokenInput, chooseUpgrade, createRun, tick } from '../game/simulation';
import { getXpRequiredForLevel } from '../game/math';
import { TokenBus } from '../telemetry/tokenBus';
import { AudioManager } from './audio';
import { downloadShareCard } from './shareCard';
import type { HeroId, RunState } from '../game/types';
import classes from '../game/data/classes.json';
import type { PersistedProgress, HostToWebviewMessage } from '../shared/types';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };
const vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;

const heroes: readonly HeroId[] = classes.map((hero) => hero.id as HeroId);
const heroNames: Record<HeroId, string> = Object.fromEntries(classes.map((hero) => [hero.id, hero.name])) as Record<HeroId, string>;
const icons = {
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 0a5 5 0 0 1 0 6m2.5-8.5a8.5 8.5 0 0 1 0 11"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M4 9v6h4l5 4V5L8 9H4Z"/></svg>',
  stealth: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  run: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 4 12 8-12 8V4Z"/></svg>',
  might: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.2 5.2L20 10l-4.3 3.7 1.3 5.8-5-3.1-5 3.1 1.3-5.8L4 10l5.8-1.8L12 3Z"/></svg>',
  weapon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 9-9m-6 7-2-2m5-7 2 2 6-6a2 2 0 0 0-2-2l-6 6Zm8-8 2 2"/></svg>',
  power: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/></svg>',
  heal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20S4 15.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6.5-8 11-8 11Z"/></svg>',
  hero: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.6-4.2 2.9-6.5 7-6.5s6.4 2.3 7 6.5"/></svg>'
} as const;
const upgradeIcons: Record<string, string> = { 'weapon-upgrade': icons.weapon, 'power-gauntlets': icons.power, heal: icons.heal };
const upgradeHints: Record<string, string> = { 'weapon-upgrade': 'More damage', 'power-gauntlets': '+10% Might', heal: 'Restore 25% HP' };

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Token Guild root element is missing');

app.innerHTML = `
  <section class="guild-shell" aria-labelledby="title">
    <header class="guild-header"><h1 id="title">Token Guild</h1><div class="header-actions" aria-label="Display settings"><button class="icon-button" type="button" id="mute" title="Mute sound" aria-label="Mute sound" aria-pressed="false">${icons.soundOn}</button><button class="icon-button" type="button" id="stealth" title="Toggle stealth view" aria-label="Toggle stealth view" aria-pressed="false">${icons.stealth}</button></div></header>
    <section id="guild-screen" class="screen" aria-labelledby="guild-title">
      <h2 id="guild-title">Guild Hall</h2><p>Choose a hero for the Code Dungeon.</p>
      <label for="hero-select">Hero</label><select id="hero-select"></select>
      <div class="guild-actions"><button class="primary-action" type="button" id="start-run">${icons.run}<span>Start dungeon run</span></button>
      <button type="button" id="buy-might">Buy Guild Might · 100 gold</button>
      </div><button class="info-link" type="button" id="might-info">What is Guild Might?</button><output id="guild-status" role="status">Ready.</output><dialog id="might-dialog" class="token-dialog"><form method="dialog"><h3>Guild Might</h3><p>Guild Might is a permanent between-run upgrade. Each rank costs 100 gold and adds 5% weapon damage to every future run.</p><ul><li>It persists when you return to the Guild or restart VS Code.</li><li>It affects weapon damage, not token counting or XP.</li><li>It is this MVP's simplified equivalent of a permanent meta-progression PowerUp.</li></ul><button class="dialog-close" type="submit">Close</button></form></dialog>
    </section>
    <section id="run-screen" class="screen hidden" aria-labelledby="run-title">
      <div class="run-heading"><h2 id="run-title">Code Dungeon</h2><button class="token-info" type="button" id="token-info" title="Explain synthetic token flow">Synthetic tokens <span id="token-rate">12/s</span></button></div>
      <canvas id="game-canvas" width="320" height="200" aria-label="Token Guild dungeon map"></canvas>
      <section class="character-panel" aria-labelledby="character-title">
        <div class="character-heading"><div class="character-portrait">${icons.hero}</div><div><h3 id="character-title">Character</h3><p id="character-role">Starting class</p></div><strong id="character-level">Lvl 1</strong></div>
        <div class="character-bars"><div class="bar-row"><span>HP</span><div id="hp-bar" class="stat-bar" role="progressbar" aria-label="Health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span></span></div><output id="hp-value">100/100</output></div><div class="bar-row"><span>XP</span><div id="xp-bar" class="stat-bar xp" role="progressbar" aria-label="Experience" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><output id="xp-value">0 / 5</output></div></div>
        <div class="character-loadout"><span id="weapon-detail">Weapon</span><span id="passive-detail">Passive</span></div><div id="character-attributes" class="character-attributes" aria-label="Character attributes"></div><div id="character-upgrades" class="character-upgrades" aria-label="Run upgrades"></div>
      </section>
      <div class="run-meta" id="run-meta" aria-live="polite"><span id="run-meta-copy"></span><span id="hero-hud" class="sr-only"></span><span id="run-hud" class="sr-only"></span><span id="phase-label" class="sr-only"></span></div>
      <div id="cards" class="cards hidden" aria-live="polite"></div>
      <p class="controls">Move with arrow keys or WASD.</p>
      <dialog id="token-dialog" class="token-dialog"><form method="dialog"><h3>Synthetic tokens</h3><p>This MVP uses a local deterministic fixture, not an LLM connection. While the run is active it emits 3 synthetic tokens every 250 ms, displayed as 12 tokens per second.</p><ul><li>Every token grants 1 XP.</li><li>Token throughput can modify combat; the fixture is intentionally steady.</li><li>The HUD labels this source <strong>synthetic / exact</strong>.</li><li>No prompt, response, API key, or external content is collected.</li></ul><p>Real telemetry adapters are future opt-in work and are not needed to play or test this build.</p><button class="dialog-close" type="submit">Close</button></form></dialog>
    </section>
    <section id="summary-screen" class="screen hidden" aria-labelledby="summary-title">
      <h2 id="summary-title">Run Summary</h2><output id="summary" role="status"></output>
      <button type="button" id="share-card">Export summary PNG</button>
      <button type="button" id="return-guild">Return to Guild</button>
    </section>
  </section>
`;

const heroSelect = document.querySelector<HTMLSelectElement>('#hero-select')!;
const buyMightButton = document.querySelector<HTMLButtonElement>('#buy-might')!;
const tokenInfoButton = document.querySelector<HTMLButtonElement>('#token-info')!;
const tokenDialog = document.querySelector<HTMLDialogElement>('#token-dialog')!;
const mightInfoButton = document.querySelector<HTMLButtonElement>('#might-info')!;
const mightDialog = document.querySelector<HTMLDialogElement>('#might-dialog')!;
tokenInfoButton.addEventListener('click', () => { if (typeof tokenDialog.showModal === 'function') tokenDialog.showModal(); else tokenDialog.setAttribute('open', ''); });
mightInfoButton.addEventListener('click', () => { if (typeof mightDialog.showModal === 'function') mightDialog.showModal(); else mightDialog.setAttribute('open', ''); });
buyMightButton.className = 'secondary-action';
buyMightButton.title = 'Guild Might: permanent +5% damage per rank';
buyMightButton.innerHTML = `${icons.might}<span>Guild Might</span><small>100 gold · +5% damage</small>`;
for (const hero of heroes) heroSelect.add(new Option(heroNames[hero], hero));
const guildScreen = document.querySelector<HTMLElement>('#guild-screen')!;
const runScreen = document.querySelector<HTMLElement>('#run-screen')!;
const summaryScreen = document.querySelector<HTMLElement>('#summary-screen')!;
const cards = document.querySelector<HTMLElement>('#cards')!;
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const drawingContext = canvas.getContext('2d');
if (!drawingContext) throw new Error('Canvas rendering is unavailable');
const context: CanvasRenderingContext2D = drawingContext;

let run: RunState | undefined;
let loop: number | undefined;
let tokenBus: TokenBus | undefined;
const keys = new Set<string>();
let progress: PersistedProgress = { schemaVersion: 1, gold: 0, unlockedHeroes: [...heroes], upgrades: {}, runCount: 0, totalTokens: 0, completedRunIds: [], settings: { muted: false, volume: 0.08 } };
const audioManager = new AudioManager(progress.settings);
let previousPhase = 'guild';

function renderGuildStatus(): void {
  document.querySelector<HTMLOutputElement>('#guild-status')!.value = `Gold ${progress.gold} · Runs ${progress.runCount} · Tokens ${progress.totalTokens} · Might rank ${progress.upgrades.might ?? 0}`;
  document.querySelector<HTMLButtonElement>('#buy-might')!.disabled = progress.gold < 100;
}

function show(element: HTMLElement, visible: boolean): void { element.classList.toggle('hidden', !visible); }

function renderWorld(): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#10131c'; context.fillRect(0, 0, canvas.width, canvas.height);
  if (!run) return;
  const screenX = (x: number) => canvas.width / 2 + x;
  const screenY = (y: number) => canvas.height / 2 + y;
  for (const pickup of run.pickups) { context.fillStyle = pickup.kind === 'gold-chest' ? '#f0c94b' : '#70c8ff'; context.fillRect(screenX(pickup.x) - 2, screenY(pickup.y) - 2, 4, 4); }
  for (const enemy of run.enemies) { context.fillStyle = enemy.isBoss ? '#e06c75' : '#a66cff'; context.beginPath(); context.arc(screenX(enemy.x), screenY(enemy.y), enemy.isBoss ? 9 : 4, 0, Math.PI * 2); context.fill(); }
  context.fillStyle = '#64d98b'; context.beginPath(); context.arc(screenX(run.hero.x), screenY(run.hero.y), 7, 0, Math.PI * 2); context.fill();
}

function renderRun(): void {
  if (!run) return;
  const heroHud = document.querySelector<HTMLElement>('#hero-hud')!;
  const runHud = document.querySelector<HTMLElement>('#run-hud')!;
  const phaseLabel = document.querySelector<HTMLElement>('#phase-label')!;
  heroHud.textContent = `${heroNames[run.heroId]} HP ${Math.max(0, Math.ceil(run.hero.stats.hp))}/${run.hero.stats.maxHp} · L${run.level}`;
  runHud.textContent = `${Math.floor(run.elapsedSeconds)}s · XP ${Math.floor(run.xp)} · Tokens ${run.totalTokens} · Synthetic/exact · Enemies ${run.enemies.length}`;
  phaseLabel.textContent = run.phase === 'level-up' ? 'Choose upgrade' : 'Dungeon';
  const classInfo = classes.find((entry) => entry.id === run!.heroId);
  const labelForId = (value: string | undefined): string => value ? value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : 'Unknown';
  const hp = Math.max(0, Math.ceil(run.hero.stats.hp));
  const hpPercent = Math.max(0, Math.min(100, (hp / run.hero.stats.maxHp) * 100));
  const xpRequired = getXpRequiredForLevel(run.level);
  const xpPercent = Math.max(0, Math.min(100, (run.xp / xpRequired) * 100));
  document.querySelector<HTMLElement>('#character-title')!.textContent = heroNames[run.heroId];
  document.querySelector<HTMLElement>('#character-role')!.textContent = `${labelForId(classInfo?.startingWeaponId)} class`;
  document.querySelector<HTMLElement>('#character-level')!.textContent = `Lvl ${run.level}`;
  document.querySelector<HTMLOutputElement>('#hp-value')!.value = `${hp}/${run.hero.stats.maxHp}`;
  document.querySelector<HTMLOutputElement>('#xp-value')!.value = `${Math.floor(run.xp)} / ${xpRequired}`;
  const hpBar = document.querySelector<HTMLElement>('#hp-bar')!;
  hpBar.style.setProperty('--bar-value', `${hpPercent}%`); hpBar.setAttribute('aria-valuenow', String(hp)); hpBar.setAttribute('aria-valuemax', String(run.hero.stats.maxHp));
  const xpBar = document.querySelector<HTMLElement>('#xp-bar')!;
  xpBar.style.setProperty('--bar-value', `${xpPercent}%`); xpBar.setAttribute('aria-valuenow', String(Math.floor(run.xp))); xpBar.setAttribute('aria-valuemax', String(xpRequired));
  document.querySelector<HTMLElement>('#weapon-detail')!.textContent = `Weapon · ${labelForId(run.weapons[0]?.id)}`;
  document.querySelector<HTMLElement>('#passive-detail')!.textContent = `Passive · ${labelForId(classInfo?.passive.stat)}`;
  document.querySelector<HTMLElement>('#run-meta-copy')!.textContent = `${Math.floor(run.elapsedSeconds)}s · ${run.enemies.length} enemies`;
  document.querySelector<HTMLElement>('#token-rate')!.textContent = `12/s · ${run.totalTokens} total`;
  const weapon = run.weapons[0];
  document.querySelector<HTMLElement>('#weapon-detail')!.textContent = `Weapon · ${labelForId(weapon?.id)} Lv${weapon?.level ?? 1}`;
  document.querySelector<HTMLElement>('#passive-detail')!.textContent = `Class passive · ${labelForId(classInfo?.passive.stat)}`;
  document.querySelector<HTMLElement>('#character-attributes')!.innerHTML = `<span>Might ${Math.round(run.hero.stats.might * 100)}%</span><span>Armor ${run.hero.stats.armor}</span><span>Move ${Math.round(run.hero.stats.moveSpeed)}</span><span>Cooldown ${Math.round(run.hero.stats.cooldown * 100)}%</span>`;
  const upgradeEntries = [
    ...(weapon && weapon.level > 1 ? [`${labelForId(weapon.id)} Lv${weapon.level}`] : []),
    ...Object.entries(run.passives).filter(([, rank]) => rank > 0).map(([id, rank]) => `${labelForId(id)} R${rank}`)
  ];
  document.querySelector<HTMLElement>('#character-upgrades')!.innerHTML = upgradeEntries.length > 0
    ? upgradeEntries.map((entry) => `<span>${entry}</span>`).join('')
    : '<span class="no-upgrades">No run upgrades yet</span>';
  document.querySelector<HTMLElement>('#run-meta-copy')!.textContent = `${Math.floor(run.elapsedSeconds)}s · Spawned ${run.enemiesSpawned} · Defeated ${run.enemiesDefeated} · Active ${run.enemies.length}`;
  if (run.phase !== previousPhase) {
    if (run.phase === 'level-up') audioManager.playTone(660, 140);
    if (run.phase === 'summary') audioManager.playTone(run.outcome === 'victory' ? 880 : 180, 240);
    previousPhase = run.phase;
  }
  renderWorld();
  show(cards, run.phase === 'level-up');
  if (run.phase === 'level-up') {
    cards.innerHTML = '<div class="level-up-heading"><h3>Level up</h3><span>Choose upgrade below to continue:</span></div><div class="upgrade-options"></div>';
    const options = cards.querySelector<HTMLElement>('.upgrade-options')!;
    for (const card of run.pendingCards) {
      const button = document.createElement('button'); button.className = 'upgrade-card'; button.type = 'button'; button.innerHTML = `${upgradeIcons[card.id] ?? icons.power}<span class="upgrade-copy"><strong>${card.label}</strong><small>${upgradeHints[card.id] ?? 'Improve your run'}</small></span>`; button.addEventListener('click', () => { if (run) { chooseUpgrade(run, card.id); renderRun(); } }); options.append(button);
    }
  }
}

function finishRun(): void {
  if (!run?.summary) return;
  if (loop !== undefined) { window.clearInterval(loop); loop = undefined; }
  show(runScreen, false); show(summaryScreen, true);
  const damage = Object.entries(run.summary.damageByWeapon).map(([weapon, amount]) => `${weapon}: ${Math.round(amount)}`).join(', ');
  document.querySelector<HTMLOutputElement>('#summary')!.value = `${run.summary.outcome === 'victory' ? 'Victory' : 'Defeat'} · ${run.summary.enemiesDefeated} enemies · ${run.summary.tokens} tokens · ${run.summary.gold} gold · Damage ${damage || 'none'}`;
  const runId = `demo-${Date.now()}-${progress.runCount}`;
  if (!progress.completedRunIds.includes(runId)) progress = { ...progress, gold: progress.gold + run.summary.gold, runCount: progress.runCount + 1, totalTokens: progress.totalTokens + run.summary.tokens, completedRunIds: [...progress.completedRunIds, runId] };
  vscodeApi?.postMessage({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId, gold: run.summary.gold, tokens: run.summary.tokens } });
}

function startRun(): void {
  run = createRun(heroSelect.value as HeroId, 0xdecafbad, progress.upgrades);
  previousPhase = 'guild';
  audioManager.playTone(440, 100);
  tokenBus = new TokenBus((event) => { if (run) applyTokenInput(run, event); });
  vscodeApi?.postMessage({ version: 1, type: 'START_RUN', payload: { heroId: run.heroId } });
  show(guildScreen, false); show(summaryScreen, false); show(runScreen, true); renderRun();
  loop = window.setInterval(() => {
    if (!run || run.phase !== 'dungeon') { renderRun(); return; }
    const direction = { x: 0, y: 0 };
    if (keys.has('arrowleft') || keys.has('a')) direction.x -= 1;
    if (keys.has('arrowright') || keys.has('d')) direction.x += 1;
    if (keys.has('arrowup') || keys.has('w')) direction.y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) direction.y += 1;
    const length = Math.hypot(direction.x, direction.y) || 1;
    run.hero.x += (direction.x / length) * run.hero.stats.moveSpeed * 0.25;
    run.hero.y += (direction.y / length) * run.hero.stats.moveSpeed * 0.25;
    tokenBus?.ingest({ source: 'synthetic', accuracy: 'exact', timestampMs: Math.round((run.elapsedSeconds + 0.25) * 1000), count: 3, tokensPerSecond: 12, confidence: 1, runId: 'demo-run' });
    tokenBus?.flush(Math.round((run.elapsedSeconds + 0.25) * 1000));
    tick(run, 0.25, 12);
    renderRun();
    if (run.summary) finishRun();
  }, 250);
}

document.querySelector<HTMLButtonElement>('#start-run')!.addEventListener('click', startRun);
document.querySelector<HTMLButtonElement>('#buy-might')!.addEventListener('click', () => {
  if (progress.gold < 100) return;
  progress = { ...progress, gold: progress.gold - 100, upgrades: { ...progress.upgrades, might: (progress.upgrades.might ?? 0) + 1 } };
  renderGuildStatus();
  vscodeApi?.postMessage({ version: 1, type: 'SAVE_PROGRESS', payload: progress });
});
document.querySelector<HTMLButtonElement>('#mute')!.addEventListener('click', (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const muted = !progress.settings.muted;
  progress = { ...progress, settings: { ...progress.settings, muted } };
  audioManager.setSettings(progress.settings); button.setAttribute('aria-pressed', String(muted)); button.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound'); button.title = muted ? 'Unmute sound' : 'Mute sound'; button.innerHTML = muted ? icons.soundOff : icons.soundOn;
  vscodeApi?.postMessage({ version: 1, type: 'SAVE_PROGRESS', payload: progress });
});
document.querySelector<HTMLButtonElement>('#return-guild')!.addEventListener('click', () => { show(summaryScreen, false); show(guildScreen, true); renderGuildStatus(); });
document.addEventListener('keydown', (event) => { keys.add(event.key.toLowerCase()); });
document.addEventListener('keyup', (event) => { keys.delete(event.key.toLowerCase()); });
document.querySelector<HTMLButtonElement>('#stealth')!.addEventListener('click', (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const enabled = button.getAttribute('aria-pressed') !== 'true';
  button.setAttribute('aria-pressed', String(enabled)); document.body.classList.toggle('stealth', enabled);
});

window.addEventListener('message', (event: MessageEvent<HostToWebviewMessage>) => {
  const message = event.data;
  if (message?.version !== 1) return;
  if (message.type === 'LOAD_PROGRESS') {
    progress = message.payload;
    audioManager.setSettings(progress.settings);
    const mute = document.querySelector<HTMLButtonElement>('#mute')!; mute.setAttribute('aria-pressed', String(progress.settings.muted)); mute.setAttribute('aria-label', progress.settings.muted ? 'Unmute sound' : 'Mute sound'); mute.title = progress.settings.muted ? 'Unmute sound' : 'Mute sound'; mute.innerHTML = progress.settings.muted ? icons.soundOff : icons.soundOn;
    renderGuildStatus();
    for (const option of Array.from(heroSelect.options)) option.disabled = !progress.unlockedHeroes.includes(option.value);
  }
});
document.querySelector<HTMLButtonElement>('#share-card')!.addEventListener('click', () => {
  if (run?.summary) downloadShareCard(run.summary);
});
renderGuildStatus();
vscodeApi?.postMessage({ version: 1, type: 'READY' });
