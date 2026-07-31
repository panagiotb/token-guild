import './style.css';
import { applyTokenInput, chooseUpgrade, createRun, tick } from '../game/simulation';
import { getXpRequiredForLevel } from '../game/math';
import { TokenBus } from '../telemetry/tokenBus';
import { AudioManager } from './audio';
import { downloadShareCard } from './shareCard';
import { formatHeroOptionDescription, formatHeroOptionLabel } from './heroProgress';
import { buildSummaryViewModel } from './summaryModel';
import type { HeroId, RunState, RunSummary } from '../game/types';
import classes from '../game/data/classes.json';
import type { HostToWebviewMessage, PersistedProgress } from '../shared/types';

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
  hero: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.6-4.2 2.9-6.5 7-6.5s6.4 2.3 7 6.5"/></svg>',
  gold: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M9.5 9.5c.4-.8 1.2-1.2 2.5-1.2 1.5 0 2.4.6 2.4 1.6 0 .9-.7 1.3-2.1 1.6-1.5.3-2.3.7-2.3 1.7 0 1.1 1 1.7 2.5 1.7 1.2 0 2.1-.4 2.6-1.2M12 7v10"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
  tokens: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z"/><path d="m5 7 7 4 7-4M12 11v10"/></svg>',
  enemy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5a6 6 0 0 1 12 0v5.5l-3 2-3-1-3 1-3-2V9.5Z"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/><path d="M9 15h6"/></svg>',
  spawned: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></svg>',
  defeated: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 19 6-6m-3-3 3 3m2-8 6 6m-3 3-3-3"/><path d="m4 20 4-1 9-9a2.8 2.8 0 0 0-4-4l-9 9-1 4Z"/></svg>',
  active: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>'
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
      <div class="guild-actions"><button class="primary-action" type="button" id="start-run">${icons.run}<span>Start dungeon run</span></button><button type="button" id="buy-might">Buy Guild Might · 100 gold</button></div>
      <button class="info-link" type="button" id="might-info">What is Guild Might?</button><output id="guild-status" role="status">Ready.</output>
      <dialog id="might-dialog" class="token-dialog"><form method="dialog"><h3>Guild Might</h3><p>Guild Might is a permanent between-run upgrade. Each rank costs 100 gold and adds 5% weapon damage to every future run.</p><ul><li>It persists when you return to the Guild or restart VS Code.</li><li>It affects weapon damage, not token counting or XP.</li><li>It is this MVP's simplified equivalent of a permanent meta-progression PowerUp.</li></ul><button class="dialog-close" type="submit">Close</button></form></dialog>
    </section>
    <section id="run-screen" class="screen hidden" aria-labelledby="run-title">
      <div class="map-shell"><div class="map-toolbar" aria-label="Dungeon counters"><span class="map-counter" id="clock-counter" title="Elapsed time"><span class="counter-icon">${icons.clock}</span><strong id="clock-hud">0s</strong></span><h2 id="run-title">Code Dungeon</h2><button class="map-counter icon-control" type="button" id="token-info" title="Explain synthetic token flow" aria-label="Explain synthetic token flow">${icons.tokens}<strong id="token-hud">0</strong></button></div><div class="map-frame"><canvas id="game-canvas" width="320" height="200" aria-label="Token Guild dungeon map"></canvas><div id="cards" class="cards map-upgrade-overlay hidden" aria-live="polite"></div></div></div>
      <section class="character-panel" aria-labelledby="character-title">
        <div class="character-heading"><div class="character-portrait">${icons.hero}</div><div><h3 id="character-title">Character</h3><p id="character-role">Starting class</p></div><strong id="character-level">Lvl 1</strong></div>
        <div class="character-bars"><div class="bar-row"><span>HP</span><div id="hp-bar" class="stat-bar" role="progressbar" aria-label="Health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span></span></div><output id="hp-value">100/100</output></div><div class="bar-row"><span>XP</span><div id="xp-bar" class="stat-bar xp" role="progressbar" aria-label="Experience" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><output id="xp-value">0 / 5</output></div></div>
        <div class="character-loadout"><span id="weapon-detail">Weapon</span><span id="passive-detail">Passive</span></div><div id="character-attributes" class="character-attributes" aria-label="Character attributes"></div><div id="character-upgrades" class="character-upgrades" aria-label="Run upgrades"></div>
      </section>
      <div class="run-meta" id="run-meta" aria-live="polite"><div class="enemy-counters" aria-label="Enemy counters"><span class="enemy-counter" id="enemy-spawned" tabindex="0"><span class="counter-icon">${icons.spawned}</span><strong id="enemy-spawned-count">0</strong></span><span class="enemy-counter" id="enemy-defeated" tabindex="0"><span class="counter-icon">${icons.defeated}</span><strong id="enemy-defeated-count">0</strong></span><span class="enemy-counter" id="enemy-active" tabindex="0"><span class="counter-icon">${icons.active}</span><strong id="enemy-active-count">0</strong></span></div><button class="gold-info" type="button" id="gold-info" title="Explain the gold ledger">${icons.gold}<span>Gold <strong id="gold-hud">0</strong></span></button></div>
      <p class="controls">Move with arrow keys or WASD. Synthetic tokens flow while the run is active.</p>
      <dialog id="token-dialog" class="token-dialog"><form method="dialog"><h3>Synthetic tokens</h3><p>This MVP uses a local deterministic fixture, not an LLM connection. While the run is active it emits 3 synthetic tokens every 250 ms, displayed as 12 tokens per second.</p><ul><li>Tokens are counted for telemetry and combat throughput.</li><li>Collected gem pickups grant 1 XP and 1 gold in this first pass.</li><li>The HUD labels this source <strong>synthetic / exact</strong>.</li><li>No prompt, response, API key, or external content is collected.</li></ul><p>Real telemetry adapters are future opt-in work and are not needed to play or test this build.</p><button class="dialog-close" type="submit">Close</button></form></dialog>
      <dialog id="gold-dialog" class="token-dialog"><form method="dialog"><h3>Gold ledger</h3><p>Run gold is earned when the hero collects a map pickup and is added to the Guild wallet only once when the run reward is recorded.</p><ul><li>Enemy gem: +1 XP and +1 gold on collection.</li><li>Boss chest: +100 gold on collection. The yellow map marker remains pending until the hero reaches it.</li><li>Run gold and Guild wallet totals are shown separately on the result screen.</li></ul><p id="gold-breakdown-dialog">No gold earned yet.</p><button class="dialog-close" type="submit">Close</button></form></dialog>
    </section>
    <section id="summary-screen" class="screen hidden" aria-labelledby="summary-title">
      <h2 id="summary-title">Run Summary</h2><output id="summary" class="sr-only" role="status"></output>
      <section class="summary-panel" aria-labelledby="summary-outcome"><div class="summary-outcome-row"><div><p class="summary-kicker">Run result</p><h3 id="summary-outcome">Victory</h3><p id="summary-hero">Hero · Level 1</p></div><span id="summary-badge" class="summary-badge">Victory</span></div>
        <div class="summary-stats"><div class="summary-stat"><span>Duration</span><strong id="summary-duration">0s</strong></div><div class="summary-stat"><span>Tokens</span><strong id="summary-tokens">0</strong><small id="summary-token-source">synthetic / exact</small></div><div class="summary-stat"><span>Run gold</span><strong id="summary-gold">0</strong><small>earned this run</small></div><div class="summary-stat"><span>Guild wallet</span><strong id="summary-wallet">0</strong><small>after save</small></div><div class="summary-stat"><span>Enemies</span><strong id="summary-enemies">0 / 0</strong><small>spawned / defeated</small></div></div>
        <section class="summary-section" aria-labelledby="summary-rewards-title"><h4 id="summary-rewards-title">Rewards</h4><p id="summary-gold-breakdown">No gold earned.</p></section>
        <section class="summary-section" aria-labelledby="summary-build-title"><h4 id="summary-build-title">Selected upgrades</h4><div id="summary-upgrades" class="summary-chips"></div></section>
        <section class="summary-section" aria-labelledby="summary-damage-title"><h4 id="summary-damage-title">Damage by weapon</h4><div id="summary-damage" class="summary-rows"></div></section>
      </section>
      <div class="summary-actions"><button class="secondary-action export-action" type="button" id="share-card">${icons.download}<span>Export summary PNG</span></button><button class="primary-action" type="button" id="return-guild">Return to Guild</button></div>
    </section>
  </section>
`;

const heroSelect = document.querySelector<HTMLSelectElement>('#hero-select')!;
const buyMightButton = document.querySelector<HTMLButtonElement>('#buy-might')!;
const guildScreen = document.querySelector<HTMLElement>('#guild-screen')!;
const runScreen = document.querySelector<HTMLElement>('#run-screen')!;
const summaryScreen = document.querySelector<HTMLElement>('#summary-screen')!;
const cards = document.querySelector<HTMLElement>('#cards')!;
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const drawingContext = canvas.getContext('2d');
if (!drawingContext) throw new Error('Canvas rendering is unavailable');
const context: CanvasRenderingContext2D = drawingContext;

function defaultProgress(): PersistedProgress {
  return { schemaVersion: 2, gold: 0, unlockedHeroes: [...heroes], upgrades: {}, heroRecords: Object.fromEntries(heroes.map((hero) => [hero, { highestLevel: 1 }])), runCount: 0, totalTokens: 0, completedRunIds: [], settings: { muted: false, volume: 0.08 } };
}

let progress: PersistedProgress = defaultProgress();
const audioManager = new AudioManager(progress.settings);
let run: RunState | undefined;
let loop: number | undefined;
let tokenBus: TokenBus | undefined;
let activeRunId: string | undefined;
const keys = new Set<string>();
let previousPhase = 'guild';
let renderedUpgradeSignature = '';

function labelForId(value: string | undefined): string {
  return value ? value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : 'Unknown';
}

function setText(id: string, value: string): void {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (element) element.textContent = value;
}

function setCounter(id: string, value: number, label: string): void {
  setText(`${id}-count`, String(value));
  const counter = document.querySelector<HTMLElement>(`#${id}`);
  if (counter) {
    counter.dataset.tooltip = `${label}: ${value}`;
    counter.removeAttribute('title');
    counter.setAttribute('aria-label', `${label}: ${value}`);
  }
}

function show(element: HTMLElement, visible: boolean): void { element.classList.toggle('hidden', !visible); }

function openDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function highestLevel(hero: HeroId): number {
  return progress.heroRecords[hero]?.highestLevel ?? 1;
}

function renderHeroOptions(): void {
  const selected = heroSelect.value;
  heroSelect.replaceChildren();
  for (const hero of heroes) {
    const option = new Option(formatHeroOptionLabel(heroNames[hero], highestLevel(hero)), hero);
    option.disabled = !progress.unlockedHeroes.includes(hero);
    option.title = formatHeroOptionDescription(heroNames[hero], highestLevel(hero));
    option.setAttribute('aria-label', formatHeroOptionDescription(heroNames[hero], highestLevel(hero)));
    heroSelect.add(option);
  }
  if (heroes.includes(selected as HeroId) && progress.unlockedHeroes.includes(selected)) heroSelect.value = selected;
}

function renderGuildStatus(): void {
  const status = document.querySelector<HTMLOutputElement>('#guild-status');
  if (status) status.value = `Gold ${progress.gold} · Runs ${progress.runCount} · Tokens ${progress.totalTokens} · Might rank ${progress.upgrades.might ?? 0}`;
  buyMightButton.disabled = progress.gold < 100;
  renderHeroOptions();
}

function renderWorld(): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#10131c'; context.fillRect(0, 0, canvas.width, canvas.height);
  if (!run) return;
  const screenX = (x: number) => canvas.width / 2 + x;
  const screenY = (y: number) => canvas.height / 2 + y;
  for (const pickup of run.pickups) {
    const isGold = pickup.kind === 'gold-chest';
    const size = isGold ? 6 : 4;
    context.fillStyle = isGold ? '#f0c94b' : '#70c8ff';
    context.fillRect(screenX(pickup.x) - size / 2, screenY(pickup.y) - size / 2, size, size);
  }
  for (const enemy of run.enemies) { context.fillStyle = enemy.isBoss ? '#e06c75' : '#a66cff'; context.beginPath(); context.arc(screenX(enemy.x), screenY(enemy.y), enemy.isBoss ? 9 : 4, 0, Math.PI * 2); context.fill(); }
  context.fillStyle = '#64d98b'; context.beginPath(); context.arc(screenX(run.hero.x), screenY(run.hero.y), 7, 0, Math.PI * 2); context.fill();
}

function renderCharacter(): void {
  if (!run) return;
  const classInfo = classes.find((entry) => entry.id === run!.heroId);
  const hp = Math.max(0, Math.ceil(run.hero.stats.hp));
  const hpPercent = Math.max(0, Math.min(100, (hp / run.hero.stats.maxHp) * 100));
  const xpRequired = getXpRequiredForLevel(run.level);
  const xpPercent = Math.max(0, Math.min(100, (run.xp / xpRequired) * 100));
  setText('character-title', heroNames[run.heroId]);
  setText('character-role', `${labelForId(classInfo?.startingWeaponId)} class`);
  setText('character-level', `Lvl ${run.level}`);
  setText('hp-value', `${hp}/${run.hero.stats.maxHp}`);
  setText('xp-value', `${Math.floor(run.xp)} / ${xpRequired}`);
  const hpBar = document.querySelector<HTMLElement>('#hp-bar')!;
  hpBar.style.setProperty('--bar-value', `${hpPercent}%`); hpBar.setAttribute('aria-valuenow', String(hp)); hpBar.setAttribute('aria-valuemax', String(run.hero.stats.maxHp));
  const xpBar = document.querySelector<HTMLElement>('#xp-bar')!;
  xpBar.style.setProperty('--bar-value', `${xpPercent}%`); xpBar.setAttribute('aria-valuenow', String(Math.floor(run.xp))); xpBar.setAttribute('aria-valuemax', String(xpRequired));
  const weapon = run.weapons[0];
  setText('weapon-detail', `Weapon · ${labelForId(weapon?.id)} Lv${weapon?.level ?? 1}`);
  setText('passive-detail', `Class passive · ${labelForId(classInfo?.passive.stat)}`);
  const attributes = document.querySelector<HTMLElement>('#character-attributes')!;
  attributes.replaceChildren(...[
    `Might ${Math.round(run.hero.stats.might * 100)}%`, `Armor ${run.hero.stats.armor}`, `Move ${Math.round(run.hero.stats.moveSpeed)}`, `Cooldown ${Math.round(run.hero.stats.cooldown * 100)}%`
  ].map((value) => { const span = document.createElement('span'); span.textContent = value; return span; }));
  const upgradeEntries = [
    ...(weapon && weapon.level > 1 ? [`${labelForId(weapon.id)} Lv${weapon.level}`] : []),
    ...Object.entries(run.passives).filter(([, rank]) => rank > 0).map(([id, rank]) => `${labelForId(id)} R${rank}`)
  ];
  const upgrades = document.querySelector<HTMLElement>('#character-upgrades')!;
  upgrades.replaceChildren(...(upgradeEntries.length > 0 ? upgradeEntries : ['No run upgrades yet']).map((value) => { const span = document.createElement('span'); span.textContent = value; if (value === 'No run upgrades yet') span.className = 'no-upgrades'; return span; }));
}

function renderUpgradeCards(): void {
  if (!run || run.phase !== 'level-up') return;
  const signature = run.pendingCards.map((card) => `${card.id}:${card.label}:${card.target}`).join('|');
  if (signature === renderedUpgradeSignature) return;
  renderedUpgradeSignature = signature;
  cards.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'level-up-heading';
  const title = document.createElement('h3'); title.textContent = 'Level up';
  const hint = document.createElement('span'); hint.textContent = 'Choose upgrade below to continue:';
  heading.append(title, hint);
  const options = document.createElement('div'); options.className = 'upgrade-options';
  for (const card of run.pendingCards) {
    const hintText = upgradeHints[card.id] ?? 'Improve your run';
    const button = document.createElement('button'); button.className = 'upgrade-card'; button.type = 'button'; button.setAttribute('aria-label', `${card.label}: ${hintText}`); button.innerHTML = `${upgradeIcons[card.id] ?? icons.power}<span class="upgrade-copy"><strong>${card.label}</strong><small>${hintText}</small></span>`;
    button.addEventListener('click', () => { if (run?.phase === 'level-up') { chooseUpgrade(run, card.id); renderRun(); } });
    options.append(button);
  }
  cards.append(heading, options);
}

function renderRun(): void {
  if (!run) return;
  renderCharacter();
  setText('clock-hud', `${Math.floor(run.elapsedSeconds)}s`);
  setText('token-hud', String(run.totalTokens));
  const clockCounter = document.querySelector<HTMLElement>('#clock-counter');
  if (clockCounter) { clockCounter.title = `Elapsed time: ${Math.floor(run.elapsedSeconds)} seconds`; clockCounter.setAttribute('aria-label', `Elapsed time: ${Math.floor(run.elapsedSeconds)} seconds`); }
  const tokenInfo = document.querySelector<HTMLButtonElement>('#token-info');
  if (tokenInfo) tokenInfo.title = `Synthetic tokens, exact count: ${run.totalTokens}; click for details`;
  setCounter('enemy-spawned', run.enemiesSpawned, 'Enemies spawned');
  setCounter('enemy-defeated', run.enemiesDefeated, 'Enemies defeated');
  setCounter('enemy-active', run.enemies.length, 'Enemies currently active');
  setText('gold-hud', String(run.gold));
  setText('gold-breakdown-dialog', `Current run: ${run.gold} gold · Enemy gems ${run.goldBreakdown.enemyKills} · Boss chest ${run.goldBreakdown.bossChest}`);
  const goldInfo = document.querySelector<HTMLButtonElement>('#gold-info');
  if (goldInfo) goldInfo.title = `Gold ${run.gold}: enemy gems ${run.goldBreakdown.enemyKills}, boss chest ${run.goldBreakdown.bossChest}`;
  if (run.phase !== previousPhase) {
    if (run.phase === 'level-up') audioManager.playTone(660, 140);
    if (run.phase === 'summary') audioManager.playTone(run.outcome === 'victory' ? 880 : 180, 240);
    previousPhase = run.phase;
  }
  renderWorld();
  show(cards, run.phase === 'level-up');
  if (run.phase === 'level-up') renderUpgradeCards();
  else renderedUpgradeSignature = '';
}

function formatUpgrade(id: string): string {
  const levelMatch = id.match(/^(.+):level-(\d+)$/);
  return levelMatch ? `${labelForId(levelMatch[1])} · Level ${levelMatch[2]}` : labelForId(id);
}

function renderSummary(summary: RunSummary, guildGold: number): void {
  const view = buildSummaryViewModel(summary, guildGold);
  setText('summary-outcome', view.outcome);
  setText('summary-badge', view.outcome);
  setText('summary-hero', view.hero);
  setText('summary-duration', view.duration);
  setText('summary-tokens', view.tokens);
  setText('summary-token-source', view.tokenSource);
  setText('summary-gold', view.gold);
  setText('summary-wallet', view.guildWallet);
  setText('summary-enemies', view.enemies);
  setText('summary-gold-breakdown', view.goldBreakdown);
  const upgrades = document.querySelector<HTMLElement>('#summary-upgrades')!;
  upgrades.replaceChildren(...view.upgrades.map((value) => { const chip = document.createElement('span'); chip.textContent = formatUpgrade(value); if (value === 'No upgrades selected') chip.className = 'empty-state'; return chip; }));
  const damage = document.querySelector<HTMLElement>('#summary-damage')!;
  const damageRows = view.damage.length > 0 ? view.damage.map(({ weapon, amount }) => `${labelForId(weapon)} · ${Math.round(amount)} damage`) : ['No weapon damage recorded'];
  damage.replaceChildren(...damageRows.map((value) => { const row = document.createElement('span'); row.textContent = value; if (value === 'No weapon damage recorded') row.className = 'empty-state'; return row; }));
  const announce = document.querySelector<HTMLOutputElement>('#summary')!;
  announce.value = view.announcement;
  const badge = document.querySelector<HTMLElement>('#summary-badge')!;
  badge.dataset.outcome = summary.outcome;
}

function finishRun(): void {
  if (!run?.summary || !activeRunId) return;
  if (loop !== undefined) { window.clearInterval(loop); loop = undefined; }
  show(runScreen, false); show(summaryScreen, true);
  const summary = run.summary;
  if (!progress.completedRunIds.includes(activeRunId)) {
    const previous = progress.heroRecords[summary.heroId]?.highestLevel ?? 1;
    progress = {
      ...progress,
      gold: progress.gold + summary.gold,
      runCount: progress.runCount + 1,
      totalTokens: progress.totalTokens + summary.tokens,
      completedRunIds: [...progress.completedRunIds, activeRunId],
      heroRecords: { ...progress.heroRecords, [summary.heroId]: { highestLevel: Math.max(previous, summary.level) } }
    };
  }
  renderSummary(summary, progress.gold);
  vscodeApi?.postMessage({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: activeRunId, gold: summary.gold, tokens: summary.tokens, heroId: summary.heroId, level: summary.level } });
}

function startRun(): void {
  run = createRun(heroSelect.value as HeroId, 0xdecafbad, progress.upgrades);
  activeRunId = `demo-${Date.now()}-${progress.runCount}`;
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
    tokenBus?.ingest({ source: 'synthetic', accuracy: 'exact', timestampMs: Math.round((run.elapsedSeconds + 0.25) * 1000), count: 3, tokensPerSecond: 12, confidence: 1, runId: activeRunId });
    tokenBus?.flush(Math.round((run.elapsedSeconds + 0.25) * 1000));
    tick(run, 0.25, 12);
    renderRun();
    if (run.summary) finishRun();
  }, 250);
}

document.querySelector<HTMLButtonElement>('#start-run')!.addEventListener('click', startRun);
buyMightButton.className = 'secondary-action';
buyMightButton.title = 'Guild Might: permanent +5% damage per rank';
buyMightButton.innerHTML = `${icons.might}<span>Guild Might</span><small>100 gold · +5% damage</small>`;
document.querySelector<HTMLButtonElement>('#buy-might')!.addEventListener('click', () => {
  if (progress.gold < 100) return;
  progress = { ...progress, gold: progress.gold - 100, upgrades: { ...progress.upgrades, might: (progress.upgrades.might ?? 0) + 1 } };
  renderGuildStatus();
  vscodeApi?.postMessage({ version: 1, type: 'SAVE_PROGRESS', payload: progress });
});
const tokenDialog = document.querySelector<HTMLDialogElement>('#token-dialog')!;
const mightDialog = document.querySelector<HTMLDialogElement>('#might-dialog')!;
const goldDialog = document.querySelector<HTMLDialogElement>('#gold-dialog')!;
document.querySelector<HTMLButtonElement>('#token-info')!.addEventListener('click', () => openDialog(tokenDialog));
document.querySelector<HTMLButtonElement>('#might-info')!.addEventListener('click', () => openDialog(mightDialog));
document.querySelector<HTMLButtonElement>('#gold-info')!.addEventListener('click', () => openDialog(goldDialog));
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
    const mute = document.querySelector<HTMLButtonElement>('#mute')!;
    mute.setAttribute('aria-pressed', String(progress.settings.muted)); mute.setAttribute('aria-label', progress.settings.muted ? 'Unmute sound' : 'Mute sound'); mute.title = progress.settings.muted ? 'Unmute sound' : 'Mute sound'; mute.innerHTML = progress.settings.muted ? icons.soundOff : icons.soundOn;
    renderGuildStatus();
    if (run?.summary && !summaryScreen.classList.contains('hidden')) renderSummary(run.summary, progress.gold);
  }
});
document.querySelector<HTMLButtonElement>('#share-card')!.addEventListener('click', () => { if (run?.summary) downloadShareCard(run.summary, progress.gold); });
renderGuildStatus();
vscodeApi?.postMessage({ version: 1, type: 'READY' });
