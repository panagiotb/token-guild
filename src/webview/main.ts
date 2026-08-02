import './style.css';
import { applyTokenInput, banishLevelUpCard, chooseUpgrade, createRun, declineRevival, finishRun as finishSimulationRun, rerollLevelUp, reviveRun, skipLevelUp, tick } from '../game/simulation';
import { BatteryEngine } from '../shared/battery';
import { getXpRequiredForLevel } from '../game/math';
import { META_UPGRADES, metaUpgradeCost, metaUpgradeRefund } from '../game/meta';
import { TokenBus } from '../telemetry/tokenBus';
import { AudioManager } from './audio';
import { downloadShareCard } from './shareCard';
import { formatHeroOptionDescription, formatHeroOptionLabel, formatHeroTrait, formatHeroUnlockReason } from './heroProgress';
import { buildSummaryViewModel } from './summaryModel';
import { formatPauseTitle } from './pause';
import { batteryFillPercent, formatBatteryTooltip } from './batteryView';
import { activeFeedbackCues, addFeedbackCue, type FeedbackCue } from './feedback';
import { normalizeKeyboardKey, isEditableKeyboardTarget, isMovementKey } from './keyboard';
import { formatDisplayNumber, formatElapsedTime } from './time';
import { hasEligibleWeaponOrPassive, isBanishableUpgradeCard } from '../game/upgradeEligibility';
import { describeUpgrade } from './upgradeCopy';
import { characterStatRows } from './statPresentation';
import { formatStageOptionDescription, formatStageOptionLabel, stageDefinitions, stageUnlockReason } from './stageProgress';
import { cameraForHero, projectWorld, repeatingTileOffset } from './camera';
import { isRunSnapshot, shouldAcceptRunSnapshot } from './snapshot';
import { slashVisualGeometry } from './combatVisuals';
import type { HeroId, RunState, RunSummary } from '../game/types';
import classes from '../game/data/classes.json';
import { MVP_REGISTRY } from '../game/content';
import type { HostToWebviewMessage, PersistedProgress, RunSnapshot } from '../shared/types';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };
const vscodeApi = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
// The Extension Development Host and the token-free jsdom harness both expose
// a VS Code API shim, but only the real extension should make the host snapshot
// the sole simulation/render authority. The explicit test seam keeps those
// deterministic interaction tests fast without weakening production ownership.
const localSimulationEnabled = !vscodeApi || document.documentElement.dataset.tokenGuildTest === 'true';

const heroes: readonly HeroId[] = classes.map((hero) => hero.id as HeroId);
const heroNames: Record<HeroId, string> = Object.fromEntries(classes.map((hero) => [hero.id, hero.name])) as Record<HeroId, string>;
const slashWeaponIds = new Set(MVP_REGISTRY.weapons.filter((weapon) => weapon.pattern === 'slash').map((weapon) => weapon.id));
const poolWeaponIds = new Set(MVP_REGISTRY.weapons.filter((weapon) => weapon.pattern === 'pool').map((weapon) => weapon.id));
const icons = {
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12.5 0a5 5 0 0 1 0 6m2.5-8.5a8.5 8.5 0 0 1 0 11"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M4 9v6h4l5 4V5L8 9H4Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M17 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>',
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
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>',
  battery: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="16" height="12" rx="2"/><path d="M21 10v4"/><rect class="battery-liquid" x="5" y="8" width="12" height="8" rx="1"/><path class="battery-lightning" d="m13 7-4 6h3l-1 4 4-6h-3l1-4Z"/></svg>'
} as const;
const upgradeIcons: Record<string, string> = { 'weapon-upgrade': icons.weapon, 'power-gauntlets': icons.power, heal: icons.heal };
const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Token Guild root element is missing');

app.innerHTML = `
  <section class="guild-shell" aria-labelledby="title">
    <header class="guild-header"><h1 id="title">Token Guild</h1><div class="header-actions" aria-label="Audio and run controls"><button class="icon-button" type="button" id="mute" title="Mute sound" aria-label="Mute sound" aria-pressed="false">${icons.soundOn}</button><button class="icon-button" type="button" id="pause-toggle" title="Pause Token Guild" aria-label="Pause Token Guild">${icons.pause}</button></div></header>
    <div id="guild-content">
    <section id="guild-screen" class="screen" aria-labelledby="guild-title">
      <h2 id="guild-title">Guild Hall</h2><p>Choose a hero for the Code Dungeon.</p>
      <label for="hero-select">Hero</label><select id="hero-select"></select><small id="hero-description" class="selection-description">Choose an unlocked hero.</small>
      <label for="stage-select">Stage</label><select id="stage-select"></select><small id="stage-description" class="selection-description">Choose an unlocked stage.</small>
      <div class="guild-actions"><button class="primary-action" type="button" id="start-run">${icons.run}<span>Start dungeon run</span></button><div id="meta-shop" class="meta-shop" aria-label="Guild PowerUps"></div></div>
      <button class="secondary-action" type="button" id="buy-battery">Upgrade token battery</button><button class="info-link" type="button" id="might-info">What is Guild Might?</button><output id="guild-status" role="status">Ready.</output>
      <dialog id="might-dialog" class="token-dialog"><form method="dialog"><h3>Guild Might</h3><p>Guild Might is a permanent between-run upgrade. Each rank costs 100 gold and adds 5% weapon damage to every future run.</p><ul><li>It persists when you return to the Guild or restart VS Code.</li><li>It affects weapon damage, not token counting or XP.</li><li>It is this MVP's simplified equivalent of a permanent meta-progression PowerUp.</li></ul><button class="dialog-close" type="submit">Close</button></form></dialog>
    </section>
    <section id="run-screen" class="screen hidden" aria-labelledby="run-title">
      <div class="map-shell"><div class="map-toolbar" aria-label="Dungeon counters"><span class="map-counter" id="clock-counter"><span class="counter-icon">${icons.clock}</span><strong id="clock-hud">00:00</strong></span><h2 id="run-title">Code Dungeon</h2><button class="map-counter icon-control" type="button" id="token-info" title="Explain token flow" aria-label="Explain token flow">${icons.tokens}<strong id="token-hud">0</strong></button><span class="battery-widget has-tooltip" id="battery-widget" tabindex="0" role="img" aria-label="Token battery"><span class="battery-icon" aria-hidden="true">${icons.battery}</span></span></div><div class="battery-strip"><span id="battery-lockout" class="battery-lockout hidden" role="status">Battery depleted · run an active prompt to recharge to 15%.</span></div><div class="map-frame"><canvas id="game-canvas" width="320" height="200" tabindex="0" aria-label="Token Guild dungeon map"></canvas><div id="run-event-banner" class="run-event-banner" role="status" aria-live="polite"></div><div id="finale-status" class="finale-status hidden" role="status" aria-live="polite">Final threat active · survive the end sequence</div><div id="game-announce" class="sr-only" role="status" aria-live="polite"></div><div id="cards" class="cards map-upgrade-overlay hidden" aria-live="polite"></div><section id="revival-overlay" class="revival-overlay hidden" aria-labelledby="revival-title" aria-live="assertive"><div class="revival-panel"><p class="revival-kicker">The hero has fallen</p><h3 id="revival-title">Revive and continue?</h3><p id="revival-copy">An Ankh Revival restores 50% health and grants 2 seconds of invulnerability.</p><p id="revival-count" class="revival-count">1 revival remaining</p><div class="revival-actions"><button class="primary-action" type="button" id="revive-run">${icons.play}<span>Revive</span></button><button class="secondary-action" type="button" id="quit-run">End run</button></div></div></section></div></div>
      <section class="character-panel" aria-labelledby="character-title">
        <div class="character-heading"><div class="character-portrait">${icons.hero}</div><div><h3 id="character-title">Character</h3><p id="character-role">Starting class</p></div><strong id="character-level">Lvl 1</strong></div>
        <div class="character-bars"><div class="bar-row"><span>HP</span><div id="hp-bar" class="stat-bar" role="progressbar" aria-label="Health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span></span></div><output id="hp-value">100/100</output></div><div class="bar-row"><span>XP</span><div id="xp-bar" class="stat-bar xp" role="progressbar" aria-label="Experience" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><output id="xp-value">0 / 5</output></div></div>
        <div class="character-loadout"><span id="weapon-detail">Weapon</span><span id="passive-detail">Passive</span></div><div id="character-attributes" class="character-attributes" aria-label="Character attributes"></div><div id="character-upgrades" class="character-upgrades" aria-label="Run upgrades"></div>
      </section>
      <div class="run-meta" id="run-meta" aria-live="polite"><div class="enemy-counters" aria-label="Enemy counters"><span class="enemy-counter has-tooltip" id="enemy-spawned" tabindex="0"><span class="counter-icon">${icons.spawned}</span><strong id="enemy-spawned-count">0</strong></span><span class="enemy-counter has-tooltip" id="enemy-defeated" tabindex="0"><span class="counter-icon">${icons.defeated}</span><strong id="enemy-defeated-count">0</strong></span><span class="enemy-counter has-tooltip" id="enemy-active" tabindex="0"><span class="counter-icon">${icons.active}</span><strong id="enemy-active-count">0</strong></span></div><button class="gold-info" type="button" id="gold-info" title="Explain the gold ledger">${icons.gold}<span>Gold <strong id="gold-hud">0</strong></span></button></div>
      <p class="controls" id="controls-copy">Move with arrow keys or WASD. Tokens flow while the run is active.</p><button class="telemetry-toggle" type="button" id="synthetic-toggle" aria-pressed="true">Synthetic income: on</button><small id="telemetry-health" class="telemetry-health has-tooltip" tabindex="0" role="status">Synthetic fixture active</small>
      <dialog id="token-dialog" class="token-dialog"><form method="dialog"><h3 id="token-dialog-title">Synthetic tokens</h3><p id="token-dialog-copy">This MVP uses a local deterministic fixture, not an LLM connection. While the run is active it emits 25 synthetic tokens every 250 ms, displayed as 100 tokens per second.</p><ul><li>Tokens charge the Token Guild battery only; they do not grant XP, gold, or alter combat.</li><li>XP comes from collected gems; gold comes from collected light-source, elite, and chest rewards.</li><li>No prompt, response, API key, or external content is collected.</li></ul><button class="dialog-close" type="submit">Close</button></form></dialog>
      <dialog id="gold-dialog" class="token-dialog"><form method="dialog"><h3>Gold ledger</h3><p>Run gold is earned from authored map rewards and added to the Guild wallet only once when the run reward is recorded.</p><ul><li>XP gems grant XP only.</li><li>Light sources, elite drops, and boss chests pay gold when collected; battery overflow never creates gold.</li><li>Completing the stage adds 500 base gold, 100 per unused revival, and an escalating 100/200/300/400… finale-revival bonus.</li><li>When inventory is fully maxed, a level-up Coin Bag pays 10 base gold.</li><li>Run gold and Guild wallet totals are shown separately on the result screen.</li></ul><p id="gold-breakdown-dialog">No gold earned yet.</p><button class="dialog-close" type="submit">Close</button></form></dialog>
    </section>
    <section id="summary-screen" class="screen hidden" aria-labelledby="summary-title">
      <h2 id="summary-title">Run Summary</h2><output id="summary" class="sr-only" role="status"></output>
      <section class="summary-panel" aria-labelledby="summary-outcome"><div class="summary-outcome-row"><div><p class="summary-kicker">Run result</p><h3 id="summary-outcome">Victory</h3><p id="summary-hero">Hero · Level 1</p></div><span id="summary-badge" class="summary-badge">Victory</span></div>
        <div class="summary-stats"><div class="summary-stat"><span>Duration</span><strong id="summary-duration">0s</strong></div><div class="summary-stat"><span>Tokens</span><strong id="summary-tokens">0</strong><small id="summary-token-source">synthetic / exact</small></div><div class="summary-stat"><span>Run gold</span><strong id="summary-gold">0</strong><small>earned this run</small></div><div class="summary-stat"><span>Guild wallet</span><strong id="summary-wallet">0</strong><small>after save</small></div><div class="summary-stat"><span>Enemies</span><strong id="summary-enemies">0 / 0</strong><small>spawned / defeated</small></div><div class="summary-stat"><span>Revival</span><strong id="summary-revival">0 used</strong><small>run end-state</small></div><div class="summary-stat"><span>Finale</span><strong id="summary-finale">Not reached</strong><small>end sequence</small></div></div>
        <section class="summary-section" aria-labelledby="summary-rewards-title"><h4 id="summary-rewards-title">Rewards</h4><p id="summary-gold-breakdown">No gold earned.</p></section>
        <section class="summary-section" aria-labelledby="summary-build-title"><h4 id="summary-build-title">Selected upgrades</h4><div id="summary-upgrades" class="summary-chips"></div></section>
        <section class="summary-section" aria-labelledby="summary-treasure-title"><h4 id="summary-treasure-title">Treasure rewards</h4><div id="summary-treasure" class="summary-chips"></div></section>
        <section class="summary-section" aria-labelledby="summary-damage-title"><h4 id="summary-damage-title">Damage by weapon</h4><div id="summary-damage" class="summary-rows"></div></section>
      </section>
      <div class="summary-actions"><button class="secondary-action export-action" type="button" id="share-card">${icons.download}<span>Export summary PNG</span></button><button class="primary-action" type="button" id="return-guild">Return to Guild</button></div>
    </section>
    </div>
    <section id="pause-screen" class="pause-screen hidden" aria-live="polite"><h1 id="pause-title">Paused · Synthetic tokens spent: 0</h1></section>
  </section>
`;

const heroSelect = document.querySelector<HTMLSelectElement>('#hero-select')!;
const stageSelect = document.querySelector<HTMLSelectElement>('#stage-select')!;
const buyBatteryButton = document.querySelector<HTMLButtonElement>('#buy-battery')!;
const metaShop = document.querySelector<HTMLElement>('#meta-shop')!;
const guildScreen = document.querySelector<HTMLElement>('#guild-screen')!;
const runScreen = document.querySelector<HTMLElement>('#run-screen')!;
const summaryScreen = document.querySelector<HTMLElement>('#summary-screen')!;
const guildContent = document.querySelector<HTMLElement>('#guild-content')!;
const pauseScreen = document.querySelector<HTMLElement>('#pause-screen')!;
const pauseTitle = document.querySelector<HTMLElement>('#pause-title')!;
const pauseToggle = document.querySelector<HTMLButtonElement>('#pause-toggle')!;
const cards = document.querySelector<HTMLElement>('#cards')!;
const revivalOverlay = document.querySelector<HTMLElement>('#revival-overlay')!;
const reviveButton = document.querySelector<HTMLButtonElement>('#revive-run')!;
const quitRunButton = document.querySelector<HTMLButtonElement>('#quit-run')!;
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const hostSyncStatus = document.createElement('div');
hostSyncStatus.id = 'host-sync-status';
hostSyncStatus.className = 'host-sync-status hidden';
hostSyncStatus.setAttribute('role', 'status');
hostSyncStatus.setAttribute('aria-live', 'polite');
document.querySelector<HTMLElement>('.map-frame')?.prepend(hostSyncStatus);
const drawingContext = canvas.getContext('2d');
if (!drawingContext) throw new Error('Canvas rendering is unavailable');
const context: CanvasRenderingContext2D = drawingContext;

function defaultProgress(): PersistedProgress {
  return { schemaVersion: 3, gold: 0, unlockedHeroes: ['warrior'], unlockedStages: ['code-dungeon'], relics: [], upgrades: {}, heroRecords: Object.fromEntries(heroes.map((hero) => [hero, { highestLevel: 1 }])), runCount: 0, totalTokens: 0, batteryLevel: 1, completedRunIds: [], settings: { muted: false, volume: 0.08 } };
}

let progress: PersistedProgress = defaultProgress();
const audioManager = new AudioManager(progress.settings);
let run: RunState | undefined;
let loop: number | undefined;
let tokenBus: TokenBus | undefined;
let activeRunId: string | undefined;
let lastSnapshotSequence = -1;
const keys = new Set<string>();
let previousPhase = 'guild';
let renderedUpgradeSignature = '';
let paused = false;
let telemetryMode: { syntheticEnabled: boolean; otlpEnabled: boolean; health: 'disabled' | 'waiting' | 'receiving' | 'error'; acceptedEvents: number; lastEventAt?: number; endpoint?: string; error?: string } = { syntheticEnabled: true, otlpEnabled: false, health: 'disabled', acceptedEvents: 0 };
let feedbackCues: FeedbackCue[] = [];
let lastDefeated = 0;
let lastGold = 0;
let lastTreasureCount = 0;
let lastLockout = false;
let lastFinale = false;
let hostActionInFlight = false;
let nextIntentSequence = 0;
let treasureBannerTimer: number | undefined;

function nextRunIntentSequence(): number {
  nextIntentSequence += 1;
  return nextIntentSequence;
}

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

function renderPauseControl(): void {
  pauseToggle.setAttribute('aria-pressed', String(paused));
  pauseToggle.setAttribute('aria-label', paused ? 'Resume Token Guild' : 'Pause Token Guild');
  pauseToggle.title = paused ? 'Resume Token Guild' : 'Pause Token Guild';
  pauseToggle.innerHTML = paused ? icons.play : icons.pause;
  pauseToggle.disabled = (!run || (run.phase !== 'dungeon' && !paused)) || (!!vscodeApi && hostActionInFlight);
}

function renderPauseScreen(): void {
  pauseTitle.textContent = formatPauseTitle(run?.tokenSource ?? 'synthetic', run?.totalTokens ?? progress.totalTokens);
}

function renderTelemetryStatus(): void {
  const source = telemetryMode.otlpEnabled ? (telemetryMode.syntheticEnabled ? 'synthetic + live OTLP' : 'live OTLP') : telemetryMode.syntheticEnabled ? 'synthetic / exact' : 'no token source';
  const health = document.querySelector<HTMLElement>('#telemetry-health');
  const healthLabel = telemetryMode.health === 'receiving' ? 'Live telemetry receiving' : telemetryMode.health === 'waiting' ? 'Live telemetry waiting for events' : telemetryMode.health === 'error' ? 'Live telemetry unavailable' : telemetryMode.syntheticEnabled ? 'Synthetic fixture active' : 'Telemetry disabled';
  const lastEvent = telemetryMode.lastEventAt ? ` · last event ${new Date(telemetryMode.lastEventAt).toLocaleTimeString()}` : '';
  if (health) {
    health.textContent = `${healthLabel}${telemetryMode.otlpEnabled ? ` · ${telemetryMode.acceptedEvents} accepted${lastEvent}` : ''}`;
    health.dataset.tooltip = telemetryMode.error ?? (telemetryMode.otlpEnabled ? `${healthLabel}. Endpoint: ${telemetryMode.endpoint ?? 'not reported'}` : 'Synthetic income is a deterministic test source.');
  }
  const title = document.querySelector<HTMLElement>('#token-dialog-title');
  const copy = document.querySelector<HTMLElement>('#token-dialog-copy');
  const controls = document.querySelector<HTMLElement>('#controls-copy');
  if (title) title.textContent = telemetryMode.otlpEnabled && !telemetryMode.syntheticEnabled ? 'Live telemetry' : telemetryMode.syntheticEnabled ? 'Token flow' : 'Telemetry disabled';
  if (copy) copy.textContent = telemetryMode.otlpEnabled && !telemetryMode.syntheticEnabled
    ? 'The opt-in loopback OTLP adapter accepts exact JSON or protobuf trace/log usage from localhost. Only numeric token counts and timing are used by the run.'
    : telemetryMode.syntheticEnabled
      ? 'This MVP uses a local deterministic fixture, not an LLM connection. It emits 25 synthetic tokens every 250 ms, displayed as 100 tokens per second.'
      : 'No token source is enabled. The run can still be inspected, but the battery will not receive token input.';
  if (controls) controls.textContent = `Move with arrow keys or WASD. ${source} flows while the run is active.`;
  const syntheticToggle = document.querySelector<HTMLButtonElement>('#synthetic-toggle');
  if (syntheticToggle) {
    syntheticToggle.textContent = `Synthetic income: ${telemetryMode.syntheticEnabled ? 'on' : 'off'}`;
    syntheticToggle.setAttribute('aria-pressed', String(telemetryMode.syntheticEnabled));
    syntheticToggle.dataset.tooltip = telemetryMode.syntheticEnabled
      ? 'Synthetic income adds 100 test tokens per second on top of live telemetry.'
      : 'Synthetic income is off; live telemetry remains available when configured.';
  }
  const tokenInfo = document.querySelector<HTMLButtonElement>('#token-info');
  if (tokenInfo) tokenInfo.title = `${source} token flow; ${healthLabel.toLowerCase()}; click for details`;
}

function setPaused(next: boolean): void {
  paused = next;
  if (localSimulationEnabled && run?.phase === 'dungeon') run.paused = next;
  show(guildContent, !paused);
  show(pauseScreen, paused);
  renderPauseScreen();
  renderPauseControl();
}

function requestPauseToggle(): void {
  if (!run || run.phase !== 'dungeon' || hostActionInFlight) return;
  const next = !paused;
  if (localSimulationEnabled) {
    setPaused(next);
    return;
  }
  // Production pause is a host-owned, sequenced action. The optimistic view
  // hides the dungeon immediately; the next canonical snapshot confirms it or
  // RUN_ERROR restores the prior state.
  hostActionInFlight = true;
  setPaused(next);
  vscodeApi?.postMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: activeRunId ?? '', intentSequence: nextRunIntentSequence(), action: next ? 'pause' : 'resume' } });
}

function openDialog(dialog: HTMLDialogElement): void {
  for (const other of Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'))) {
    if (other === dialog) continue;
    if (typeof other.close === 'function') other.close();
    other.removeAttribute('open');
  }
  if (typeof dialog.showModal === 'function') {
    try { dialog.showModal(); return; } catch { /* jsdom and nested modal implementations can reject; open non-modally below */ }
  }
  dialog.setAttribute('open', '');
}

function renderHeroOptions(): void {
  const selected = heroSelect.value;
  heroSelect.replaceChildren();
  for (const hero of heroes) {
    const classInfo = classes.find((entry) => entry.id === hero);
    const description = formatHeroOptionDescription(heroNames[hero], labelForId(classInfo?.startingWeaponId), formatHeroTrait(classInfo?.passive));
    const option = new Option(formatHeroOptionLabel(heroNames[hero]), hero);
    option.disabled = !progress.unlockedHeroes.includes(hero);
    const unlockReason = formatHeroUnlockReason(classInfo, progress.unlockedHeroes);
    option.title = `${description}. ${unlockReason}`;
    option.setAttribute('aria-label', `${description}. ${unlockReason}`);
    heroSelect.add(option);
  }
  const fallback: HeroId = heroes.find((hero) => progress.unlockedHeroes.includes(hero)) ?? heroes[0] ?? 'warrior';
  heroSelect.value = heroes.includes(selected as HeroId) && progress.unlockedHeroes.includes(selected) ? selected : fallback;
  const selectedHero = classes.find((entry) => entry.id === heroSelect.value);
  setText('hero-description', selectedHero ? `${formatHeroOptionDescription(selectedHero.name, labelForId(selectedHero.startingWeaponId), formatHeroTrait(selectedHero.passive))}. ${formatHeroUnlockReason(selectedHero, progress.unlockedHeroes)}` : 'No hero is currently unlocked.');
}

function renderStageOptions(): void {
  const selected = stageSelect.value;
  const stages = stageDefinitions();
  stageSelect.replaceChildren();
  for (const stage of stages) {
    const unlocked = progress.unlockedStages.includes(stage.id);
    const description = formatStageOptionDescription(stage);
    const option = new Option(formatStageOptionLabel(stage), stage.id);
    option.disabled = !unlocked;
    option.title = `${description}. ${stageUnlockReason(stage.id, progress.unlockedStages)}`;
    option.setAttribute('aria-label', `${formatStageOptionLabel(stage)}. ${description}. ${stageUnlockReason(stage.id, progress.unlockedStages)}`);
    stageSelect.add(option);
  }
  const fallback = stages.find((stage) => progress.unlockedStages.includes(stage.id))?.id ?? stages[0]?.id ?? '';
  stageSelect.value = stages.some((stage) => stage.id === selected && progress.unlockedStages.includes(stage.id)) ? selected : fallback;
  const current = stages.find((stage) => stage.id === stageSelect.value);
  setText('stage-description', current ? formatStageOptionDescription(current) : 'No stage is currently unlocked.');
}

function renderGuildStatus(): void {
  const status = document.querySelector<HTMLOutputElement>('#guild-status');
  if (status) status.value = `Gold ${progress.gold} · Runs ${progress.runCount} · Tokens ${progress.totalTokens} · Might rank ${progress.upgrades.might ?? 0}`;
  renderMetaShop();
  const nextBatteryLevel = progress.batteryLevel + 1;
  const batteryCost = BatteryEngine.upgradeCost(nextBatteryLevel);
  buyBatteryButton.disabled = nextBatteryLevel > BatteryEngine.MAX_LEVEL || progress.gold < batteryCost;
  buyBatteryButton.textContent = nextBatteryLevel > BatteryEngine.MAX_LEVEL ? 'Token battery maxed' : `Upgrade token battery · ${batteryCost} gold`;
  renderHeroOptions();
  renderStageOptions();
}

function metaUpgradeEffect(id: string, valuePerRank: number): string {
  const effects: Record<string, string> = { might: `+${Math.round(valuePerRank * 100)}% weapon damage`, armor: `+${valuePerRank} armor`, vitality: `×${(1 + valuePerRank).toFixed(2)} max HP per rank`, recovery: `+${valuePerRank} HP recovery`, haste: `-${Math.round(valuePerRank * 100)}% cooldown`, expansion: `+${Math.round(valuePerRank * 100)}% area`, swiftness: `+${Math.round(valuePerRank * 100)}% projectile speed`, duration: `+${Math.round(valuePerRank * 100)}% projectile duration`, duplication: `+${valuePerRank} projectile`, agility: `+${Math.round(valuePerRank * 100)}% move speed`, magnet: `+${Math.round(valuePerRank * 100)}% pickup range`, fortune: `+${Math.round(valuePerRank * 100)}% luck`, growth: `+${Math.round(valuePerRank * 100)}% XP growth`, greed: `+${Math.round(valuePerRank * 100)}% gold`, curse: `+${Math.round(valuePerRank * 100)}% enemy difficulty`, revival: `+${valuePerRank} revival` };
  return effects[id] ?? `+${valuePerRank} effect`;
}

function renderMetaShop(): void {
  metaShop.replaceChildren();
  // META_UPGRADES is the canonical capability registry. Do not maintain a
  // second UI allowlist: a registered, behavior-tested PowerUp must be
  // reachable from the Guild shop or deliberately removed from the registry.
  const totalBought = META_UPGRADES.reduce((total, entry) => total + Math.max(0, Math.min(entry.maxRank, Math.floor(progress.upgrades[entry.id] ?? 0))), 0);
  for (const definition of META_UPGRADES) {
    const rank = progress.upgrades[definition.id] ?? 0;
    const cost = metaUpgradeCost(definition.id, rank, totalBought + 1);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'meta-upgrade';
    button.disabled = rank >= definition.maxRank || progress.gold < cost;
    button.setAttribute('aria-label', `${definition.label}, rank ${rank} of ${definition.maxRank}. ${metaUpgradeEffect(definition.id, definition.valuePerRank)}`);
    button.innerHTML = `<strong>${definition.label}</strong><small>Rank ${rank}/${definition.maxRank} · ${rank >= definition.maxRank ? 'Max rank' : `${cost} gold`}</small><small>${metaUpgradeEffect(definition.id, definition.valuePerRank)}</small>`;
    button.addEventListener('click', () => {
      if (button.disabled) return;
      if (!vscodeApi) progress = { ...progress, gold: progress.gold - cost, upgrades: { ...progress.upgrades, [definition.id]: rank + 1 } };
      renderGuildStatus();
      vscodeApi?.postMessage({ version: 1, type: 'PURCHASE_UPGRADE', payload: { upgradeId: definition.id } });
    });
    metaShop.append(button);
  }
  const refund = document.createElement('button');
  refund.type = 'button'; refund.className = 'meta-refund'; refund.textContent = `Refund PowerUps · +${metaUpgradeRefund(progress.upgrades)} gold`;
  refund.disabled = metaUpgradeRefund(progress.upgrades) <= 0;
  refund.addEventListener('click', () => {
    if (refund.disabled) return;
    if (!vscodeApi) { const refunded = metaUpgradeRefund(progress.upgrades); progress = { ...progress, gold: progress.gold + refunded, upgrades: Object.fromEntries(Object.entries(progress.upgrades).filter(([id]) => !META_UPGRADES.some((definition) => definition.id === id))) }; }
    renderGuildStatus();
    vscodeApi?.postMessage({ version: 1, type: 'REFUND_UPGRADES' });
  });
  metaShop.append(refund);
}

function polygon(x: number, y: number, radius: number, sides: number, rotation = 0): void {
  context.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (Math.PI * 2 * index) / sides;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py); else context.lineTo(px, py);
  }
  context.closePath(); context.fill();
}

function drawPickup(x: number, y: number, kind: string): void {
  const isGold = kind.startsWith('gold-');
  const isLightSource = kind === 'light-source';
  const isTactical = ['mana-roast', 'mana-magnet', 'chrono-stasis', 'arcane-cleanser'].includes(kind);
  const radius = isGold || isLightSource ? 6 : isTactical ? 5 : kind === 'token-core' || kind === 'xp-orb' ? 7 : kind === 'xp-crystal' ? 5 : 4;
  context.fillStyle = isGold || isLightSource ? '#f0c94b' : isTactical ? '#e5a8b3' : kind === 'token-core' || kind === 'xp-orb' ? '#c17cff' : kind === 'xp-crystal' ? '#65e0ae' : '#70c8ff';
  if (kind === 'gold-chest') { context.fillRect(x - 7, y - 4, 14, 9); context.fillStyle = '#8d6320'; context.fillRect(x - 1, y - 4, 2, 9); context.strokeStyle = '#ffe28a'; context.strokeRect(x - 7, y - 4, 14, 9); return; }
  if (isLightSource) { context.fillRect(x - 4, y - 5, 8, 10); context.fillStyle = '#fff1a8'; context.fillRect(x - 2, y - 3, 4, 5); context.strokeStyle = '#ffe28a'; context.strokeRect(x - 5, y - 6, 10, 12); return; }
  if (isTactical) { polygon(x, y, radius, 6, Math.PI / 6); return; }
  polygon(x, y, radius, 4, Math.PI / 4);
  context.fillStyle = 'rgb(255 255 255 / 55%)'; polygon(x - radius * .25, y - radius * .25, Math.max(1, radius * .25), 3, -Math.PI / 2);
}

function drawProjectile(x: number, y: number, weaponId: string, area: number): void {
  if (poolWeaponIds.has(weaponId)) {
    context.fillStyle = weaponId === 'philosophers_potion' ? 'rgb(219 119 202 / 35%)' : 'rgb(109 202 226 / 32%)';
    context.strokeStyle = weaponId === 'philosophers_potion' ? '#df8ed2' : '#8fd7ff';
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(x, y, Math.max(6, Math.min(22, area * 0.7)), 0, Math.PI * 2);
    context.fill();
    context.stroke();
    return;
  }
  context.fillStyle = weaponId === 'aegis_barrier' ? '#f3d36b' : '#8fd7ff';
  if (weaponId === 'aegis_barrier') { context.strokeStyle = context.fillStyle; context.lineWidth = 2; context.beginPath(); context.arc(x, y, Math.max(3, Math.min(7, area)), 0, Math.PI * 2); context.stroke(); return; }
  polygon(x, y, Math.max(3, Math.min(7, area / 2)), 3, -Math.PI / 2);
}

function drawSlash(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
  // The token-free DOM harness supplies a deliberately minimal 2D context;
  // keep the visual optional state operations defensive while preserving the
  // richer glow in a real CanvasRenderingContext2D.
  const canSave = typeof context.save === 'function';
  if (canSave) context.save();
  context.globalAlpha = 0.82;
  context.strokeStyle = '#d8788b';
  context.shadowColor = '#8f3d58';
  context.shadowBlur = 5;
  context.lineWidth = Math.max(2, Math.min(4, radius / 6));
  context.beginPath();
  context.arc(x, y, radius, startAngle, endAngle);
  context.stroke();
  context.globalAlpha = 0.2;
  context.lineWidth = Math.max(4, Math.min(8, radius / 2));
  context.stroke();
  if (canSave && typeof context.restore === 'function') context.restore();
  else context.globalAlpha = 1;
}

function drawEnemy(x: number, y: number, boss: boolean, kind: string): void {
  context.fillStyle = boss ? '#e06c75' : kind.includes('zombie') ? '#d78d9d' : kind.includes('bat') ? '#a66cff' : '#8b80e8';
  if (boss) { polygon(x, y, 10, 6, Math.PI / 6); context.fillStyle = '#2a1620'; context.fillRect(x - 4, y - 2, 2, 2); context.fillRect(x + 2, y - 2, 2, 2); return; }
  polygon(x, y, 5, kind.includes('golem') ? 6 : 4, Math.PI / 4);
  context.fillStyle = '#17131c'; context.fillRect(x - 2, y - 1, 1, 1); context.fillRect(x + 1, y - 1, 1, 1);
}

function drawVisualEffect(x: number, y: number, radius: number, progress: number): void {
  const clamped = Math.max(0, Math.min(1, progress));
  const fade = 1 - clamped;
  context.save();
  context.globalAlpha = fade;
  context.strokeStyle = '#f2b36b';
  context.fillStyle = '#e06c75';
  context.lineWidth = 2;
  context.beginPath(); context.arc(x, y, Math.max(4, radius * (0.55 + clamped * 0.45)), 0, Math.PI * 2); context.stroke();
  context.globalAlpha = fade * 0.22;
  context.beginPath(); context.arc(x, y, Math.max(3, radius * (0.35 + clamped * 0.25)), 0, Math.PI * 2); context.fill();
  context.restore();
}

function drawHero(x: number, y: number): void {
  context.fillStyle = '#2c755c'; context.beginPath(); context.moveTo(x - 6, y + 6); context.lineTo(x, y - 8); context.lineTo(x + 6, y + 6); context.closePath(); context.fill();
  context.fillStyle = '#64d98b'; polygon(x, y - 3, 5, 6, Math.PI / 6);
  context.fillStyle = '#17352a'; context.fillRect(x - 2, y - 4, 1, 1); context.fillRect(x + 1, y - 4, 1, 1);
}

function renderWorld(): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#10131c'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgb(255 255 255 / 4%)'; context.lineWidth = 1;
  if (!run) return;
  const camera = cameraForHero(run.hero);
  const project = (point: { x: number; y: number }) => projectWorld(point, camera, { width: canvas.width, height: canvas.height });
  const tileSize = 24;
  const tileX = repeatingTileOffset(camera.x, tileSize);
  const tileY = repeatingTileOffset(camera.y, tileSize);
  for (let x = tileX - tileSize; x <= canvas.width + tileSize; x += tileSize) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke(); }
  for (let y = tileY - tileSize; y <= canvas.height + tileSize; y += tileSize) { context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke(); }
  for (const source of run.lightSources) { const point = project(source); drawPickup(point.x, point.y, 'light-source'); }
  for (const pickup of run.pickups) { const point = project(pickup); drawPickup(point.x, point.y, pickup.kind); }
  const heroPoint = project(run.hero);
  for (const projectile of run.projectiles) {
    if (slashWeaponIds.has(projectile.weaponId)) {
      const slash = slashVisualGeometry(projectile, run.hero);
      if (slash) {
        const center = project(slash);
        drawSlash(center.x, center.y, slash.radius, slash.startAngle, slash.endAngle);
        continue;
      }
    }
    const point = project(projectile);
    drawProjectile(point.x, point.y, projectile.weaponId, projectile.area);
  }
  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) for (const effect of run.visualEffects ?? []) {
    if (effect.kind !== 'explosion' || effect.durationSeconds <= 0) continue;
    const point = project(effect); drawVisualEffect(point.x, point.y, effect.radius, 1 - effect.remainingSeconds / effect.durationSeconds);
  }
  for (const enemy of run.enemies) { const point = project(enemy); drawEnemy(point.x, point.y, enemy.isBoss, enemy.kind); }
  drawHero(heroPoint.x, heroPoint.y);
  if (!reducedMotion) {
    const now = performance.now();
    for (const cue of activeFeedbackCues(feedbackCues, now)) {
      const progress = Math.max(0, Math.min(1, (now - cue.startedAtMs) / cue.durationMs));
      context.strokeStyle = cue.kind === 'defeat' ? `rgb(224 108 117 / ${1 - progress})` : `rgb(229 168 179 / ${1 - progress})`;
      const cuePoint = project(cue); context.lineWidth = 2; context.beginPath(); context.arc(cuePoint.x, cuePoint.y, 6 + progress * 12, 0, Math.PI * 2); context.stroke();
    }
  }
}

function renderCharacter(): void {
  if (!run) return;
  const classInfo = classes.find((entry) => entry.id === run!.heroId);
  const maxHp = Math.max(1, Math.round(run.hero.stats.maxHp));
  const hp = Math.min(maxHp, Math.max(0, Math.ceil(run.hero.stats.hp)));
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const xpRequired = getXpRequiredForLevel(run.level);
  const xpPercent = Math.max(0, Math.min(100, (run.xp / xpRequired) * 100));
  setText('character-title', heroNames[run.heroId]);
  setText('character-role', `${labelForId(classInfo?.startingWeaponId)} class`);
  setText('character-level', `Lvl ${run.level}`);
  setText('hp-value', `${formatDisplayNumber(hp)}/${formatDisplayNumber(maxHp)}`);
  setText('xp-value', `${Math.floor(run.xp)} / ${xpRequired}`);
  const hpBar = document.querySelector<HTMLElement>('#hp-bar')!;
  hpBar.style.setProperty('--bar-value', `${hpPercent}%`); hpBar.setAttribute('aria-valuenow', formatDisplayNumber(hp)); hpBar.setAttribute('aria-valuemax', formatDisplayNumber(maxHp));
  const xpBar = document.querySelector<HTMLElement>('#xp-bar')!;
  xpBar.style.setProperty('--bar-value', `${xpPercent}%`); xpBar.setAttribute('aria-valuenow', String(Math.floor(run.xp))); xpBar.setAttribute('aria-valuemax', String(xpRequired));
  setText('weapon-detail', run.weapons.length > 0 ? run.weapons.map((entry) => `${labelForId(entry.id)} Lv${entry.level}`).join(' · ') : 'No weapons equipped');
  setText('passive-detail', `Class passive · ${labelForId(classInfo?.passive.stat)}`);
  const attributes = document.querySelector<HTMLElement>('#character-attributes')!;
  attributes.replaceChildren(...characterStatRows(run.hero.stats).map((stat) => {
    const span = document.createElement('span');
    span.className = 'character-stat has-tooltip';
    span.dataset.stat = stat.key;
    span.dataset.tooltip = `${stat.label}: ${stat.value}. ${stat.description}`;
    span.tabIndex = 0;
    span.setAttribute('aria-label', `${stat.label}: ${stat.value}. ${stat.description}`);
    span.textContent = `${stat.label} ${stat.value}`;
    return span;
  }));
  const upgradeEntries = [
    ...run.weapons.filter((entry) => entry.level > 1).map((entry) => `${labelForId(entry.id)} Lv${entry.level}`),
    ...Object.entries(run.passives).filter(([, rank]) => rank > 0).map(([id, rank]) => `${labelForId(id)} R${rank}`)
  ];
  const upgrades = document.querySelector<HTMLElement>('#character-upgrades')!;
  upgrades.replaceChildren(...(upgradeEntries.length > 0 ? upgradeEntries : ['No run upgrades yet']).map((value) => { const span = document.createElement('span'); span.textContent = value; if (value === 'No run upgrades yet') span.className = 'no-upgrades'; return span; }));
}

function renderUpgradeCards(): void {
  if (!run || run.phase !== 'level-up') return;
  const signature = run.pendingCards.map((card) => `${card.id}:${card.label}:${card.target}`).join('|');
  if (signature === renderedUpgradeSignature) {
    for (const control of Array.from(cards.querySelectorAll<HTMLButtonElement>('button'))) control.disabled = hostActionInFlight;
    return;
  }
  renderedUpgradeSignature = signature;
  cards.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'level-up-heading';
  const title = document.createElement('h3'); title.textContent = 'Level up';
  const hint = document.createElement('span'); hint.textContent = 'Choose upgrade below to continue:';
  heading.append(title, hint);
  const options = document.createElement('div'); options.className = 'upgrade-options';
  for (const card of run.pendingCards) {
    const hintText = describeUpgrade(card, run);
    const wrapper = document.createElement('div'); wrapper.className = 'upgrade-card-wrap';
    const button = document.createElement('button'); button.className = 'upgrade-card'; button.type = 'button'; button.setAttribute('aria-label', `${card.label}: ${hintText}`); button.innerHTML = `${upgradeIcons[card.id] ?? icons.power}<span class="upgrade-copy"><strong>${card.label}</strong><small>${hintText}</small></span>`;
    button.addEventListener('click', () => {
      if (run?.phase !== 'level-up' || hostActionInFlight) return;
      if (localSimulationEnabled) chooseUpgrade(run, card.id);
      else hostActionInFlight = true;
      vscodeApi?.postMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: activeRunId ?? '', intentSequence: nextRunIntentSequence(), action: 'upgrade', cardId: card.id } });
      lockHostUpgradeControls();
      renderRun();
    });
    wrapper.append(button);
    if (run.banishesRemaining > 0 && isBanishableUpgradeCard(card)) {
      const banish = document.createElement('button'); banish.type = 'button'; banish.className = 'card-action'; banish.textContent = `Banish (${run.banishesRemaining})`; banish.title = 'Remove this card from future level-up choices this run';
      banish.addEventListener('click', () => {
        if (run?.phase !== 'level-up' || hostActionInFlight) return;
        if (localSimulationEnabled) banishLevelUpCard(run, card.id);
        else hostActionInFlight = true;
        vscodeApi?.postMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: activeRunId ?? '', intentSequence: nextRunIntentSequence(), action: 'banish', cardId: card.id } });
        lockHostUpgradeControls();
        renderRun();
      });
      wrapper.append(banish);
    }
    options.append(wrapper);
  }
  const actions = document.createElement('div'); actions.className = 'level-up-actions';
  const hasItemChoices = hasEligibleWeaponOrPassive(run);
  if (run.rerollsRemaining > 0 && hasItemChoices) {
    const reroll = document.createElement('button'); reroll.type = 'button'; reroll.textContent = `Reroll (${run.rerollsRemaining})`; reroll.title = 'Replace the three current cards';
    reroll.addEventListener('click', () => {
      if (run?.phase !== 'level-up' || hostActionInFlight) return;
      if (localSimulationEnabled) rerollLevelUp(run); else hostActionInFlight = true;
      vscodeApi?.postMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: activeRunId ?? '', intentSequence: nextRunIntentSequence(), action: 'reroll' } });
      lockHostUpgradeControls();
      renderRun();
    });
    actions.append(reroll);
  }
  if (run.skipsRemaining > 0 && hasItemChoices) {
    const skip = document.createElement('button'); skip.type = 'button'; skip.textContent = `Skip (${run.skipsRemaining})`; skip.title = 'Skip this level-up and gain 20% of the XP required for the next level';
    skip.addEventListener('click', () => {
      if (run?.phase !== 'level-up' || hostActionInFlight) return;
      if (localSimulationEnabled) skipLevelUp(run); else hostActionInFlight = true;
      vscodeApi?.postMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: activeRunId ?? '', intentSequence: nextRunIntentSequence(), action: 'skip' } });
      lockHostUpgradeControls();
      renderRun();
    });
    actions.append(skip);
  }
  cards.append(heading, options, actions);
  queueMicrotask(() => options.querySelector<HTMLButtonElement>('button')?.focus());
}

function lockHostUpgradeControls(): void {
  if (!hostActionInFlight) return;
  for (const control of Array.from(cards.querySelectorAll<HTMLButtonElement>('button'))) control.disabled = true;
}

function submitRevivalAction(action: 'revive' | 'quit'): void {
  if (!run || run.phase !== 'revival' || hostActionInFlight) return;
  if (localSimulationEnabled) {
    if (action === 'revive') reviveRun(run);
    else declineRevival(run);
  } else hostActionInFlight = true;
  vscodeApi?.postMessage({ version: 1, type: 'RUN_ACTION', payload: { runId: activeRunId ?? '', intentSequence: nextRunIntentSequence(), action } });
  renderRun();
  if (run.summary && !vscodeApi) finishRun();
}

function announce(message: string, kind: FeedbackCue['kind'], x = 0, y = 0): void {
  setText('game-announce', message);
  feedbackCues = addFeedbackCue(feedbackCues, { kind, x, y, startedAtMs: performance.now(), durationMs: 700, message });
}

function renderRun(): void {
  if (!run) return;
  renderPauseControl();
  hostSyncStatus.classList.add('hidden');
  if (run.enemiesDefeated > lastDefeated) {
    const defeated = run.enemiesDefeated - lastDefeated;
    announce(`${defeated} ${defeated === 1 ? 'enemy' : 'enemies'} defeated.`, 'defeat', run.hero.x, run.hero.y);
    audioManager.playTone(320, 35);
  }
  if (run.gold > lastGold) {
    announce(`Gold collected. Run gold ${run.gold}.`, 'pickup', run.hero.x, run.hero.y);
    audioManager.playTone(760, 35);
  }
  if (run.treasureHistory.length > lastTreasureCount) {
    const rewards = run.treasureHistory.slice(lastTreasureCount).map(formatUpgrade).join(' · ');
    const banner = document.querySelector<HTMLElement>('#run-event-banner');
    if (banner) {
      banner.textContent = `Treasure opened · ${rewards}`;
      banner.classList.add('visible');
      if (treasureBannerTimer !== undefined) window.clearTimeout(treasureBannerTimer);
      // Keep the presentation aligned with the simulation-owned chest pause;
      // gameplay resumes only after this reward cue has completed.
      treasureBannerTimer = window.setTimeout(() => { banner.classList.remove('visible'); treasureBannerTimer = undefined; }, 1500);
    }
  }
  lastTreasureCount = run.treasureHistory.length;
  if (run.battery.isLockedOut && !lastLockout) announce('Token battery depleted. Combat is paused until it recharges.', 'lockout');
  lastDefeated = run.enemiesDefeated;
  lastGold = run.gold;
  lastLockout = run.battery.isLockedOut;
  renderCharacter();
  const elapsed = formatElapsedTime(run.elapsedSeconds);
  setText('clock-hud', elapsed);
  setText('token-hud', String(run.totalTokens));
  const batteryWidget = document.querySelector<HTMLElement>('#battery-widget');
  const batteryTooltip = formatBatteryTooltip(run.battery.currentCapacity, run.battery.maxCapacity);
  const batteryStatus = run.battery.isLockedOut ? 'Locked out' : run.batteryCharging ? 'Charging' : 'Draining';
  if (batteryWidget) {
    batteryWidget.classList.toggle('charging', run.batteryCharging);
    batteryWidget.classList.toggle('locked', run.battery.isLockedOut);
    const batteryDescription = `${batteryTooltip} · Level ${run.battery.level} · ${batteryStatus}`;
    batteryWidget.dataset.tooltip = batteryDescription;
    batteryWidget.removeAttribute('title');
    batteryWidget.setAttribute('aria-label', `${batteryDescription}.`);
    batteryWidget.style.setProperty('--battery-fill', String(batteryFillPercent(run.battery.currentCapacity, run.battery.maxCapacity) / 100));
  }
  const lockout = document.querySelector<HTMLElement>('#battery-lockout');
  if (lockout) {
    lockout.classList.toggle('hidden', !run.battery.isLockedOut);
    lockout.textContent = `Battery depleted · recharge to ${Math.ceil(run.battery.maxCapacity * 0.15)} tokens before the run resumes.`;
  }
  const finaleStatus = document.querySelector<HTMLElement>('#finale-status');
  if (finaleStatus) {
    finaleStatus.classList.toggle('hidden', !run.stageFinaleStarted || run.phase === 'summary');
    const finaleRemaining = run.stageFinaleDeadline === undefined ? undefined : Math.max(0, run.stageFinaleDeadline - run.elapsedSeconds);
    finaleStatus.textContent = run.stageFinaleStarted
      ? `Final threat active · ${finaleRemaining === undefined ? 'survive the end sequence' : `${formatElapsedTime(finaleRemaining)} remaining`}`
      : '';
  }
  const clockCounter = document.querySelector<HTMLElement>('#clock-counter');
  if (clockCounter) { clockCounter.dataset.tooltip = `Elapsed time: ${elapsed}`; clockCounter.removeAttribute('title'); clockCounter.setAttribute('aria-label', `Elapsed time: ${elapsed}`); }
  const tokenInfo = document.querySelector<HTMLButtonElement>('#token-info');
  if (tokenInfo) tokenInfo.title = `${run.tokenSource} tokens, ${run.tokenAccuracy} count: ${run.totalTokens}; click for details`;
  setCounter('enemy-spawned', run.enemiesSpawned, 'Enemies spawned');
  setCounter('enemy-defeated', run.enemiesDefeated, 'Enemies defeated');
  setCounter('enemy-active', run.enemies.length, 'Enemies currently active');
  setText('gold-hud', String(run.gold));
  const goldInfo = document.querySelector<HTMLButtonElement>('#gold-info');
  setText('gold-breakdown-dialog', `Current run: ${run.gold} gold · Light sources ${run.goldBreakdown.lightSources ?? 0} · Elite drops ${run.goldBreakdown.eliteDrops ?? 0} · Boss chest ${run.goldBreakdown.bossChest} · Stage ${run.goldBreakdown.stageCompletion ?? 0} · Level-up ${run.goldBreakdown.levelUp ?? 0} · Overflow ${run.goldBreakdown.overflow}`);
  if (goldInfo) goldInfo.title = `Gold ${run.gold}: light sources ${run.goldBreakdown.lightSources ?? 0}, elite drops ${run.goldBreakdown.eliteDrops ?? 0}, boss chest ${run.goldBreakdown.bossChest}, stage ${run.goldBreakdown.stageCompletion ?? 0}, level-up ${run.goldBreakdown.levelUp ?? 0}, overflow ${run.goldBreakdown.overflow}`;
  if (run.phase !== previousPhase) {
    if (run.phase === 'level-up') { audioManager.playTone(660, 140); announce('Level up. Choose an upgrade to continue.', 'level-up'); }
    if (run.phase === 'revival') { audioManager.playTone(180, 180); announce('The hero has fallen. Choose whether to revive or end the run.', 'defeat-run'); }
    if (run.phase === 'summary') { audioManager.playTone(run.outcome === 'victory' ? 880 : 180, 240); announce(run.outcome === 'victory' ? 'Dungeon cleared. Victory.' : 'The hero fell. Defeat.', run.outcome === 'victory' ? 'victory' : 'defeat-run'); }
    previousPhase = run.phase;
  }
  if (run.stageFinaleStarted && !lastFinale) { announce('Final threat spawned.', 'finale'); audioManager.playTone(520, 120); }
  lastFinale = run.stageFinaleStarted;
  renderWorld();
  show(cards, run.phase === 'level-up');
  if (run.phase === 'level-up') renderUpgradeCards();
  else renderedUpgradeSignature = '';
  show(revivalOverlay, run.phase === 'revival');
  if (run.phase === 'revival') {
    setText('revival-count', `${run.revivalsRemaining} ${run.revivalsRemaining === 1 ? 'revival' : 'revivals'} remaining`);
    reviveButton.disabled = hostActionInFlight;
    quitRunButton.disabled = hostActionInFlight;
    if (previousPhase === 'revival') queueMicrotask(() => { if (document.activeElement !== reviveButton && !hostActionInFlight) reviveButton.focus(); });
  }
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
  setText('summary-revival', view.revival);
  setText('summary-finale', view.finale);
  setText('summary-gold-breakdown', view.goldBreakdown);
  const upgrades = document.querySelector<HTMLElement>('#summary-upgrades')!;
  upgrades.replaceChildren(...view.upgrades.map((value) => { const chip = document.createElement('span'); chip.textContent = formatUpgrade(value); if (value === 'No upgrades selected') chip.className = 'empty-state'; return chip; }));
  const treasure = document.querySelector<HTMLElement>('#summary-treasure')!;
  treasure.replaceChildren(...view.treasureRewards.map((value) => { const chip = document.createElement('span'); chip.textContent = formatUpgrade(value); if (value === 'No treasure rewards') chip.className = 'empty-state'; return chip; }));
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
  setPaused(false);
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
  document.querySelector<HTMLButtonElement>('#share-card')?.focus();
  vscodeApi?.postMessage({ version: 1, type: 'RECORD_RUN_REWARD', payload: { runId: activeRunId } });
}

function createTokenBus(): void {
  tokenBus = new TokenBus((event) => {
    if (localSimulationEnabled && run) applyTokenInput(run, event);
  });
}

function runStep(): void {
  if (paused) { renderPauseScreen(); return; }
  if (!run || run.phase !== 'dungeon') { renderRun(); return; }
  if (localSimulationEnabled && telemetryMode.syntheticEnabled) {
    tokenBus?.ingest({ source: 'synthetic', accuracy: 'exact', timestampMs: Math.round((run.elapsedSeconds + 0.25) * 1000), count: 25, outputTokens: 25, inputTokens: 0, cacheTokens: 0, isAgentActive: true, tokensPerSecond: 100, confidence: 1, runId: activeRunId });
    tokenBus?.flush(Math.round((run.elapsedSeconds + 0.25) * 1000));
  }
  const input = {
    up: keys.has('arrowup') || keys.has('w'),
    down: keys.has('arrowdown') || keys.has('s'),
    left: keys.has('arrowleft') || keys.has('a'),
    right: keys.has('arrowright') || keys.has('d')
  };
  if (localSimulationEnabled) tick(run, 0.25, 12, input);
  if (activeRunId && vscodeApi) vscodeApi.postMessage({ version: 1, type: 'RUN_STEP', payload: { runId: activeRunId, intentSequence: nextRunIntentSequence(), deltaSeconds: 0.25, input } });
  renderRun();
  // In the extension, the host snapshot is the completion authority. Keep a
  // local fallback for the token-free standalone webview harness only.
  if (run.summary && !vscodeApi) finishRun();
}

function startRunLoop(): void {
  if (loop === undefined) loop = window.setInterval(runStep, 250);
}

function applyRunSnapshot(snapshot: RunSnapshot): void {
  if (!isRunSnapshot(snapshot) || !shouldAcceptRunSnapshot(activeRunId, lastSnapshotSequence, snapshot)) return;
  if (!activeRunId) {
    activeRunId = snapshot.runId;
    createTokenBus();
    previousPhase = 'guild';
    feedbackCues = [];
    lastDefeated = 0;
    lastGold = 0;
    lastTreasureCount = 0;
    lastLockout = false;
    lastFinale = false;
    show(guildScreen, false); show(summaryScreen, false); show(runScreen, true);
  }
  lastSnapshotSequence = snapshot.sequence;
  nextIntentSequence = Math.max(nextIntentSequence, snapshot.nextIntentSequence - 1);
  hostActionInFlight = false;
  run = snapshot.state;
  if (paused !== (run.paused === true)) setPaused(run.paused === true);
  else renderPauseControl();
  hostSyncStatus.classList.add('hidden');
  renderRun();
  if (run.summary) finishRun();
  else { if (run.phase === 'dungeon') startRunLoop(); canvas.focus(); }
}

function startRun(): void {
  if (treasureBannerTimer !== undefined) { window.clearTimeout(treasureBannerTimer); treasureBannerTimer = undefined; }
  const heroId = heroSelect.value as HeroId;
  const stageId = stageSelect.value;
  if (!stageDefinitions().some((stage) => stage.id === stageId) || !progress.unlockedStages.includes(stageId)) return;
  // In production the extension host owns the run from the first intent. The
  // local simulation is retained only for the explicit token-free harness,
  // preventing a disconnected/reloaded webview from rendering or advancing a
  // client prediction before a canonical snapshot arrives.
  run = localSimulationEnabled ? createRun(heroId, 0xdecafbad, { ...progress.upgrades, batteryLevel: progress.batteryLevel }, { stageId }) : undefined;
  activeRunId = `demo-${Date.now()}-${progress.runCount}`;
  lastSnapshotSequence = -1;
  nextIntentSequence = 0;
  previousPhase = 'guild';
  feedbackCues = [];
  lastDefeated = 0;
  lastGold = 0;
  lastTreasureCount = 0;
  lastLockout = false;
  lastFinale = false;
  hostActionInFlight = false;
  setPaused(false);
  audioManager.playTone(440, 100);
  createTokenBus();
  vscodeApi?.postMessage({ version: 1, type: 'START_RUN', payload: { heroId, stageId, runId: activeRunId } });
  show(guildScreen, false); show(summaryScreen, false); show(runScreen, true);
  if (run) {
    renderRun();
    canvas.focus();
    startRunLoop();
  } else {
    hostSyncStatus.textContent = 'Connecting to the dungeon host…';
    hostSyncStatus.classList.remove('hidden');
  }
}

document.querySelector<HTMLButtonElement>('#start-run')!.addEventListener('click', startRun);
heroSelect.addEventListener('change', renderHeroOptions);
stageSelect.addEventListener('change', renderStageOptions);
buyBatteryButton.addEventListener('click', () => {
  const nextLevel = progress.batteryLevel + 1;
  const cost = BatteryEngine.upgradeCost(nextLevel);
  if (nextLevel > BatteryEngine.MAX_LEVEL || progress.gold < cost) return;
  if (!vscodeApi) progress = { ...progress, gold: progress.gold - cost, batteryLevel: nextLevel };
  renderGuildStatus();
  vscodeApi?.postMessage({ version: 1, type: 'PURCHASE_BATTERY' });
});
const tokenDialog = document.querySelector<HTMLDialogElement>('#token-dialog')!;
const mightDialog = document.querySelector<HTMLDialogElement>('#might-dialog')!;
const goldDialog = document.querySelector<HTMLDialogElement>('#gold-dialog')!;
document.querySelector<HTMLButtonElement>('#token-info')!.addEventListener('click', () => openDialog(tokenDialog));
document.querySelector<HTMLButtonElement>('#might-info')!.addEventListener('click', () => openDialog(mightDialog));
document.querySelector<HTMLButtonElement>('#gold-info')!.addEventListener('click', () => openDialog(goldDialog));
document.querySelector<HTMLButtonElement>('#synthetic-toggle')!.addEventListener('click', () => {
  const syntheticEnabled = !telemetryMode.syntheticEnabled;
  telemetryMode = { ...telemetryMode, syntheticEnabled };
  renderTelemetryStatus();
  vscodeApi?.postMessage({ version: 1, type: 'UPDATE_TELEMETRY_SETTINGS', payload: { syntheticEnabled } });
});
reviveButton.addEventListener('click', () => submitRevivalAction('revive'));
quitRunButton.addEventListener('click', () => submitRevivalAction('quit'));
document.querySelector<HTMLButtonElement>('#mute')!.addEventListener('click', (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const muted = !progress.settings.muted;
  progress = { ...progress, settings: { ...progress.settings, muted } };
  audioManager.setSettings(progress.settings); button.setAttribute('aria-pressed', String(muted)); button.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound'); button.title = muted ? 'Unmute sound' : 'Mute sound'; button.innerHTML = muted ? icons.soundOff : icons.soundOn;
  vscodeApi?.postMessage({ version: 1, type: 'UPDATE_SETTINGS', payload: progress.settings });
});
pauseToggle.addEventListener('click', requestPauseToggle);
document.querySelector<HTMLButtonElement>('#return-guild')!.addEventListener('click', () => { setPaused(false); show(summaryScreen, false); show(guildScreen, true); renderGuildStatus(); document.querySelector<HTMLSelectElement>('#hero-select')?.focus(); });
function handleKeyDown(event: KeyboardEvent): void {
  const key = normalizeKeyboardKey(event.key);
  if (!isMovementKey(key) || isEditableKeyboardTarget(event.target)) return;
  if (!run || paused || run.phase !== 'dungeon') return;
  event.preventDefault();
  keys.add(key);
}

function handleKeyUp(event: KeyboardEvent): void {
  const key = normalizeKeyboardKey(event.key);
  if (!isMovementKey(key)) return;
  keys.delete(key);
  if (!isEditableKeyboardTarget(event.target)) event.preventDefault();
}

function clearMovementKeys(): void { keys.clear(); }

window.addEventListener('keydown', handleKeyDown, true);
window.addEventListener('keyup', handleKeyUp, true);
window.addEventListener('blur', clearMovementKeys);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearMovementKeys(); });
window.addEventListener('resize', () => { if (run) renderWorld(); });
const suppressCanvasSelection = (event: Event): void => { event.preventDefault(); };
canvas.addEventListener('pointerdown', (event) => { event.preventDefault(); canvas.focus({ preventScroll: true }); });
canvas.addEventListener('selectstart', suppressCanvasSelection);
canvas.addEventListener('dragstart', suppressCanvasSelection);

window.addEventListener('message', (event: MessageEvent<HostToWebviewMessage>) => {
  const message = event.data;
  if (message?.version !== 1) return;
  if (message.type === 'LOAD_PROGRESS') {
    progress = message.payload;
    audioManager.setSettings(progress.settings);
    const mute = document.querySelector<HTMLButtonElement>('#mute')!;
    mute.setAttribute('aria-pressed', String(progress.settings.muted)); mute.setAttribute('aria-label', progress.settings.muted ? 'Unmute sound' : 'Mute sound'); mute.title = progress.settings.muted ? 'Unmute sound' : 'Mute sound'; mute.innerHTML = progress.settings.muted ? icons.soundOff : icons.soundOn;
    renderGuildStatus();
    if (paused) renderPauseScreen();
    if (run?.summary && !summaryScreen.classList.contains('hidden')) renderSummary(run.summary, progress.gold);
  } else if (message.type === 'TELEMETRY_STATUS') {
    telemetryMode = { ...message.payload };
    renderTelemetryStatus();
  } else if (message.type === 'RUN_SNAPSHOT') {
    applyRunSnapshot(message.payload);
  } else if (message.type === 'RUN_ERROR') {
    if (message.payload.runId === activeRunId) {
      if (message.payload.nextIntentSequence !== undefined && Number.isSafeInteger(message.payload.nextIntentSequence) && message.payload.nextIntentSequence >= 1) nextIntentSequence = message.payload.nextIntentSequence - 1;
      hostActionInFlight = false;
      if (run?.paused !== undefined) setPaused(run.paused);
      announce(`Run action failed: ${message.payload.message}`, 'lockout');
      renderRun();
    }
  } else if (message.type === 'TOKEN_STREAM') {
    if (localSimulationEnabled && run?.phase === 'dungeon' && tokenBus) {
      const timestampMs = Date.now();
      tokenBus.ingest({ ...message.payload, timestampMs, runId: activeRunId });
      tokenBus.flush(timestampMs);
      renderRun();
    }
  }
});
document.querySelector<HTMLButtonElement>('#share-card')!.addEventListener('click', () => { if (run?.summary) downloadShareCard(run.summary, progress.gold); });
renderGuildStatus();
renderPauseControl();
renderTelemetryStatus();
if (document.documentElement.dataset.tokenGuildTest === 'true') {
  (globalThis as unknown as { __tokenGuildTest?: { finishRun: () => void } }).__tokenGuildTest = {
    finishRun: () => { if (run && !run.summary) finishSimulationRun(run, 'victory'); if (run?.summary) finishRun(); }
  };
}
vscodeApi?.postMessage({ version: 1, type: 'READY' });
