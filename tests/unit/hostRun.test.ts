import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS } from '../../src/extension/stateManager';
import { advanceHostRun, applyHostAction, applyHostTelemetry, checkpointHostRun, createHostRun, createHostSnapshot, getHostRunResult, restoreHostRun } from '../../src/extension/hostRun';
import { SIMULATION_POLICIES } from '../../src/game/policies';

describe('host-owned run session', () => {
  it('mirrors input and telemetry without trusting a client reward summary', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'run-1');
    applyHostTelemetry(session, { source: 'synthetic', accuracy: 'exact', timestampMs: 1, count: 25, outputTokens: 25, tokensPerSecond: 100, confidence: 1, isAgentActive: true, runId: 'run-1' });
    advanceHostRun(session, 0.25, { up: false, down: false, left: true, right: false });
    expect(session.state.totalTokens).toBe(25);
    expect(session.state.hero.x).toBeLessThan(0);
    expect(() => getHostRunResult(session)).toThrow('Run result is not complete');
  });

  it('generates synthetic income inside the host step and keeps it additive', () => {
    const synthetic = createHostRun(DEFAULT_PROGRESS, 'warrior', 'synthetic-host');
    const liveOnly = createHostRun(DEFAULT_PROGRESS, 'warrior', 'live-host');
    expect(advanceHostRun(synthetic, 0.25, { up: false, down: false, left: false, right: false }, 1, true)).toBe(true);
    expect(advanceHostRun(liveOnly, 0.25, { up: false, down: false, left: false, right: false }, 1, false)).toBe(true);
    expect(synthetic.state.totalTokens).toBe(25);
    expect(liveOnly.state.totalTokens).toBe(0);
    expect(synthetic.state.tokenLedger.synthetic.outputTokens).toBe(25);
  });

  it('owns pause/resume through sequenced actions and preserves it across checkpoints', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'pause-host');
    expect(applyHostAction(session, 'pause', undefined, 1)).toBe(true);
    const paused = createHostSnapshot(session);
    expect(paused.state.paused).toBe(true);
    const elapsed = session.state.elapsedSeconds;
    expect(advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: true }, 2, true)).toBe(true);
    expect(session.state.elapsedSeconds).toBe(elapsed);
    expect(session.state.totalTokens).toBe(0);
    const restored = restoreHostRun(checkpointHostRun(session));
    expect(restored.state.paused).toBe(true);
    expect(applyHostAction(restored, 'resume', undefined, 3)).toBe(true);
    expect(restored.state.paused).toBe(false);
    expect(advanceHostRun(restored, 0.25, { up: false, down: false, left: false, right: true }, 4, true)).toBe(true);
    expect(restored.state.elapsedSeconds).toBeGreaterThan(elapsed);
    expect(restored.state.totalTokens).toBe(25);
  });

  it('rejects forged or oversized adapter events before mutating the run', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'bounded-telemetry');
    expect(applyHostTelemetry(session, { source: 'otlp', accuracy: 'exact', timestampMs: 1, count: 1_000_001, outputTokens: 1_000_001, tokensPerSecond: 1, confidence: 1 })).toBe(false);
    expect(session.state.totalTokens).toBe(0);
    session.state.phase = 'summary';
    expect(applyHostTelemetry(session, { source: 'otlp', accuracy: 'exact', timestampMs: 2, count: 1, outputTokens: 1, tokensPerSecond: 1, confidence: 1 })).toBe(false);
    expect(session.state.totalTokens).toBe(0);
    session.state.phase = 'dungeon';
    session.state.totalTokens = 100_000_000;
    expect(applyHostTelemetry(session, { source: 'otlp', accuracy: 'exact', timestampMs: 3, count: 1, outputTokens: 1, tokensPerSecond: 1, confidence: 1 })).toBe(false);
    expect(session.state.totalTokens).toBe(100_000_000);
  });

  it('rejects non-canonical or extreme checkpoint combat stats before restore', () => {
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'stat-boundary'));
    expect(() => restoreHostRun({
      ...checkpoint,
      state: { ...checkpoint.state, hero: { ...checkpoint.state.hero, baseStats: { ...checkpoint.state.hero.baseStats, maxHp: 101 } } }
    })).toThrow('Invalid checkpoint hero stats');
    expect(() => restoreHostRun({
      ...checkpoint,
      state: { ...checkpoint.state, hero: { ...checkpoint.state.hero, stats: { ...checkpoint.state.hero.stats, amount: 1001 } } }
    })).toThrow('Invalid checkpoint hero stats');
    expect(() => restoreHostRun({
      ...checkpoint,
      state: { ...checkpoint.state, hero: { ...checkpoint.state.hero, stats: { ...checkpoint.state.hero.stats, amount: 12 } } }
    })).toThrow('Invalid checkpoint hero stats');
    expect(() => restoreHostRun({
      ...checkpoint,
      state: { ...checkpoint.state, hero: { ...checkpoint.state.hero, stats: { ...checkpoint.state.hero.stats, might: 10 } } }
    })).toThrow('Invalid checkpoint hero stats');
    for (const [key, value] of [['area', 10], ['speed', 5], ['duration', 5] ] as const) {
      expect(() => restoreHostRun({
        ...checkpoint,
        state: { ...checkpoint.state, hero: { ...checkpoint.state.hero, stats: { ...checkpoint.state.hero.stats, [key]: value } } }
      })).toThrow('Invalid checkpoint hero stats');
    }
    expect(restoreHostRun({
      ...checkpoint,
      state: { ...checkpoint.state, hero: { ...checkpoint.state.hero, stats: { ...checkpoint.state.hero.stats, amount: 11 } } }
    }).state.hero.stats.amount).toBe(11);
  });

  it('creates a host session for the explicitly selected stage', () => {
    const session = createHostRun({ ...DEFAULT_PROGRESS, unlockedStages: ['code-dungeon'] }, 'warrior', 'stage-run', 123, 'code-dungeon');
    expect(session.state.stageId).toBe('code-dungeon');
    expect(() => createHostRun(DEFAULT_PROGRESS, 'warrior', 'unknown-stage', 123, 'library')).toThrow('Unknown stage');
  });

  it('returns detached, monotonically sequenced snapshots', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'wizard', 'snapshot-run');
    const initial = createHostSnapshot(session);
    expect(initial).toMatchObject({ runId: 'snapshot-run', sequence: 0, nextIntentSequence: 1, state: { heroId: 'wizard', elapsedSeconds: 0 } });
    initial.state.hero.x = 999;
    expect(session.state.hero.x).toBe(0);
    advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: true });
    const next = createHostSnapshot(session);
    expect(next.sequence).toBeGreaterThan(initial.sequence);
    expect(next.state.hero.x).toBeGreaterThan(0);
  });

  it('preserves canonical and legacy banish identities across checkpoints', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'banish-checkpoint');
    session.state.bannedUpgradeIds = ['weapon-upgrade:broadsword', 'item:broadsword'];
    const restored = restoreHostRun(checkpointHostRun(session));
    expect(restored.state.bannedUpgradeIds).toEqual(['weapon-upgrade:broadsword', 'item:broadsword']);
  });

  it('keeps a populated snapshot within the bounded IPC budget', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'paladin', 'bounded-run');
    for (let index = 0; index < 240; index += 1) advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: false });
    session.state.collectedPickupIds = Array.from({ length: 16_384 }, (_, index) => index + 1);
    const bytes = JSON.stringify(createHostSnapshot(session)).length;
    expect(bytes).toBeLessThan(512_000);
    expect(session.state.enemies.length).toBeLessThanOrEqual(SIMULATION_POLICIES.maxEnemies);
    expect(session.state.projectiles.length).toBeLessThanOrEqual(240);
  });

  it('restores mixed XP and authored pickups within the separate transport envelope', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'mixed-pickups');
    session.state.pickups = [
      ...Array.from({ length: 401 }, (_, index) => ({ id: index + 1, kind: 'xp-shard' as const, x: 500, y: 500, value: 1 })),
      ...Array.from({ length: 50 }, (_, index) => ({ id: index + 402, kind: 'gold-coin' as const, x: 500, y: 500, value: 1, goldSource: 'lightSources' as const }))
    ];
    expect(session.state.pickups).toHaveLength(451);
    const restored = restoreHostRun(checkpointHostRun(session));
    expect(restored.state.nextEntityId).toBeGreaterThan(451);
  });

  it('replays the same accepted telemetry and input sequence deterministically', () => {
    const first = createHostRun(DEFAULT_PROGRESS, 'rogue', 'replay-a', 12345);
    const second = createHostRun(DEFAULT_PROGRESS, 'rogue', 'replay-b', 12345);
    const event = { source: 'synthetic' as const, accuracy: 'exact' as const, timestampMs: 250, count: 25, outputTokens: 25, tokensPerSecond: 100, confidence: 1, isAgentActive: true };
    applyHostTelemetry(first, event);
    applyHostTelemetry(second, event);
    advanceHostRun(first, 0.25, { up: true, down: false, left: false, right: true });
    advanceHostRun(second, 0.25, { up: true, down: false, left: false, right: true });
    const firstSnapshot = createHostSnapshot(first);
    const secondSnapshot = createHostSnapshot(second);
    expect(firstSnapshot.state).toEqual(secondSnapshot.state);
    expect(firstSnapshot.sequence).toBe(secondSnapshot.sequence);
  });

  it('does not apply duplicate or future intents and resumes the next sequence', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'intent-run');
    expect(advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: true }, 2)).toBe(false);
    expect(session.state.elapsedSeconds).toBe(0);
    expect(advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: true }, 1)).toBe(true);
    expect(session.state.elapsedSeconds).toBe(0.25);
    expect(advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: true }, 1)).toBe(false);
    expect(session.state.elapsedSeconds).toBe(0.25);
    expect(advanceHostRun(session, 0.25, { up: false, down: false, left: false, right: true }, 2)).toBe(true);
    expect(session.state.elapsedSeconds).toBe(0.5);
    expect(createHostSnapshot(session).nextIntentSequence).toBe(3);
  });

  it('does not consume an intent sequence when a host action is rejected', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'retry-action');
    session.state.phase = 'level-up';
    session.state.pendingLevelUps = 1;
    session.state.pendingCards = [{ id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' }];
    expect(() => applyHostAction(session, 'upgrade', 'missing-card', 1)).toThrow();
    expect(session.lastIntentSequence).toBe(0);
    expect(applyHostAction(session, 'upgrade', 'heal', 1)).toBe(true);
    expect(session.lastIntentSequence).toBe(1);
    expect(session.state.upgradeHistory).toEqual(['heal']);

    const skipSession = createHostRun({ ...DEFAULT_PROGRESS, upgrades: { skip: 1 } }, 'warrior', 'skip-action-run');
    skipSession.state.phase = 'level-up';
    skipSession.state.level = 2;
    skipSession.state.xp = 0;
    skipSession.state.pendingLevelUps = 1;
    skipSession.state.pendingCards = [{ id: 'heal', label: 'Restore 25% health', kind: 'heal', target: 'heal' }];
    expect(applyHostAction(skipSession, 'skip', undefined, 1)).toBe(true);
    expect(skipSession.state.skipsRemaining).toBe(0);
    expect(skipSession.state.xp).toBe(3);
    expect(skipSession.state.totalTokens).toBe(0);
  });

  it('restores a detached checkpoint and preserves long-run replay parity', () => {
    const original = createHostRun(DEFAULT_PROGRESS, 'ranger', 'checkpoint-run', 0x12345678);
    const reference = createHostRun(DEFAULT_PROGRESS, 'ranger', 'reference-run', 0x12345678);
    for (let index = 0; index < 480; index += 1) {
      const input = { up: index % 11 === 0, down: false, left: index % 7 === 0, right: index % 5 === 0 };
      const event = { source: 'synthetic' as const, accuracy: 'exact' as const, timestampMs: index * 250, count: 25, outputTokens: 25, tokensPerSecond: 100, confidence: 1, isAgentActive: true };
      expect(applyHostTelemetry(original, event, index * 2 + 1)).toBe(true);
      expect(advanceHostRun(original, 0.25, input, index * 2 + 2)).toBe(true);
      expect(applyHostTelemetry(reference, event, index * 2 + 1)).toBe(true);
      expect(advanceHostRun(reference, 0.25, input, index * 2 + 2)).toBe(true);
    }
    const checkpoint = checkpointHostRun(original);
    expect(JSON.stringify(checkpoint).length).toBeLessThan(512_000);
    const restored = restoreHostRun(checkpoint);
    for (let index = 480; index < 960; index += 1) {
      const input = { up: index % 11 === 0, down: false, left: index % 7 === 0, right: index % 5 === 0 };
      const event = { source: 'synthetic' as const, accuracy: 'exact' as const, timestampMs: index * 250, count: 25, outputTokens: 25, tokensPerSecond: 100, confidence: 1, isAgentActive: true };
      expect(applyHostTelemetry(restored, event, index * 2 + 1)).toBe(true);
      expect(advanceHostRun(restored, 0.25, input, index * 2 + 2)).toBe(true);
      expect(applyHostTelemetry(reference, event, index * 2 + 1)).toBe(true);
      expect(advanceHostRun(reference, 0.25, input, index * 2 + 2)).toBe(true);
    }
    const restoredSnapshot = createHostSnapshot(restored);
    const referenceSnapshot = createHostSnapshot(reference);
    expect(restoredSnapshot.state).toEqual(referenceSnapshot.state);
    expect(restoredSnapshot.sequence).toBe(referenceSnapshot.sequence);
    expect(restoredSnapshot.nextIntentSequence).toBe(referenceSnapshot.nextIntentSequence);
  });

  it('rejects malformed checkpoints before restoring a host session', () => {
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'safe-checkpoint'));
    expect(() => restoreHostRun({ ...checkpoint, runId: 'bad id' })).toThrow('Invalid checkpoint run ID');
    expect(() => restoreHostRun({ ...checkpoint, heroId: 'not-a-hero' as never })).toThrow('Invalid checkpoint hero');
    expect(() => restoreHostRun({ ...checkpoint, heroId: 'wizard' })).toThrow('Checkpoint hero does not match state');
    expect(() => restoreHostRun({ ...checkpoint, lastIntentSequence: -1 })).toThrow('Invalid checkpoint intent sequence');
    expect(() => restoreHostRun({ ...checkpoint, sequence: 0, lastIntentSequence: 1 })).toThrow('Checkpoint intent sequence is ahead of host sequence');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, phase: 'invalid' as never } })).toThrow('Invalid checkpoint phase');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, stageId: 'missing-stage' } })).toThrow('Invalid checkpoint stage');
  });

  it('fails closed for corrupted numeric state before it can re-enter the host run', () => {
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'numeric-checkpoint'));
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, totalTokens: 100_000_001 } })).toThrow('Invalid checkpoint economy');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, hero: { ...checkpoint.state.hero, stats: { ...checkpoint.state.hero.stats, moveSpeed: Number.NaN } } } })).toThrow('Invalid checkpoint hero stats');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, enemies: [{ id: 1, kind: 'syntax_specter', x: Number.POSITIVE_INFINITY, y: 0, hp: 1, maxHp: 1, speed: 1, damage: 1, isBoss: false, isElite: false }] } })).toThrow('Invalid checkpoint enemy');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, battery: { ...checkpoint.state.battery, currentCapacity: checkpoint.state.battery.maxCapacity + 1 } } })).toThrow('Invalid checkpoint battery');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, chestPresentationRemaining: Number.POSITIVE_INFINITY } })).toThrow('Invalid checkpoint chest presentation');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, visualEffects: [{ kind: 'explosion', x: 0, y: 0, radius: 1, durationSeconds: 1, remainingSeconds: 1 }] } })).toThrow('Invalid checkpoint visual effect');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, collectedPickupIds: Array.from({ length: 16_385 }, (_, index) => index) } })).toThrow('Invalid checkpoint pickup ledger');
  });

  it('fails closed for malformed inventory, entity identity, battery, and ledger shapes', () => {
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'shape-checkpoint'));
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, weapons: [{ id: 'not-registered', level: 1, cooldownRemaining: 0 }] } })).toThrow('Invalid checkpoint weapon');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, enemies: [
      { id: 1, kind: 'syntax_specter', x: 100, y: 0, hp: 1, maxHp: 1, speed: 1, damage: 1, isBoss: false, isElite: false },
      { id: 1, kind: 'bug_bat', x: -100, y: 0, hp: 1, maxHp: 1, speed: 1, damage: 1, isBoss: false, isElite: false }
    ] } })).toThrow('Invalid checkpoint enemy identity');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, battery: { ...checkpoint.state.battery, level: 2 } } })).toThrow('Invalid checkpoint battery');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, tokenLedger: { ...checkpoint.state.tokenLedger, synthetic: { ...checkpoint.state.tokenLedger.synthetic, events: 2, exactEvents: 1, estimatedEvents: 0 } } } })).toThrow('Invalid checkpoint token ledger');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, waveSpawnCounts: Object.fromEntries(Array.from({ length: 4097 }, (_, index) => [`wave-${index}`, 1])) } })).toThrow('Invalid checkpoint wave counters');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, phase: 'dungeon', pendingLevelUps: 1, pendingCards: [] } })).toThrow('Invalid checkpoint pending state');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, pickups: [{ id: 1, kind: 'gold-coin', x: 0, y: 0, value: 1 }], collectedPickupIds: [1] } })).toThrow('Invalid checkpoint pickup ledger');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, nextEntityId: 2, projectiles: [{ id: 1, weaponId: 'bouncing_arrow', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 0, remainingSeconds: 1, knockback: 0, hitEnemyIds: [], hitCooldowns: { '7': Number.NaN } }] } })).toThrow('Invalid checkpoint projectile hit cooldowns');
    const validProjectileState = { ...checkpoint.state, nextEntityId: 2, projectiles: [{ id: 1, weaponId: 'bouncing_arrow', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 0, remainingSeconds: 1, knockback: 0, hitEnemyIds: [], hitCooldowns: { '7': 0.25 } }] };
    expect(restoreHostRun({ ...checkpoint, state: validProjectileState }).state.projectiles[0]?.hitCooldowns).toEqual({ '7': 0.25 });
    const validBoomerangState = { ...checkpoint.state, nextEntityId: 2, projectiles: [{ id: 1, weaponId: 'celestial_cross', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [], boomerangOriginX: 0, boomerangOriginY: 0, boomerangReturning: false }] };
    expect(restoreHostRun({ ...checkpoint, state: validBoomerangState }).state.projectiles[0]).toMatchObject({ boomerangOriginX: 0, boomerangOriginY: 0, boomerangReturning: false });
    expect(() => restoreHostRun({ ...checkpoint, state: { ...validBoomerangState, projectiles: [{ id: 1, weaponId: 'celestial_cross', x: 0, y: 0, vx: 1, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [] }] } })).toThrow('Invalid checkpoint projectile boomerang state');
    const missingBoomerangOrigin = { ...validBoomerangState.projectiles[0]! };
    Reflect.deleteProperty(missingBoomerangOrigin, 'boomerangOriginY');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...validBoomerangState, projectiles: [missingBoomerangOrigin] } })).toThrow('Invalid checkpoint projectile boomerang state');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...validBoomerangState, projectiles: [{ ...validBoomerangState.projectiles[0]!, weaponId: 'bouncing_arrow' }] } })).toThrow('Invalid checkpoint projectile boomerang state');
    const validOrbitState = { ...checkpoint.state, nextEntityId: 2, projectiles: [{ id: 1, weaponId: 'orbiting_grimoire', x: 44, y: 0, vx: 0, vy: 0, damage: 1, area: 1, remainingPierce: 30, remainingSeconds: 1, knockback: 1, hitEnemyIds: [], orbitAngle: 0, orbitRadius: 44, orbitAngularSpeed: 2 }] };
    expect(restoreHostRun({ ...checkpoint, state: validOrbitState }).state.projectiles[0]).toMatchObject({ orbitAngle: 0, orbitRadius: 44, orbitAngularSpeed: 2 });
    expect(() => restoreHostRun({ ...checkpoint, state: { ...validOrbitState, projectiles: [{ ...validOrbitState.projectiles[0]!, orbitRadius: 181 }] } })).toThrow('Invalid checkpoint projectile orbit state');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...validOrbitState, projectiles: [{ ...validOrbitState.projectiles[0]!, weaponId: 'celestial_cross' }] } })).toThrow('Invalid checkpoint projectile orbit state');
    const validPoolState = { ...checkpoint.state, nextEntityId: 2, projectiles: [{ id: 1, weaponId: 'alchemist_fire', x: 0, y: 0, vx: 0, vy: 0, damage: 10, area: 5, remainingPierce: 99, remainingSeconds: 2, knockback: 0, hitEnemyIds: [], hitCooldowns: { '7': 0.5 } }] };
    expect(restoreHostRun({ ...checkpoint, state: validPoolState }).state.projectiles[0]?.hitCooldowns).toEqual({ '7': 0.5 });
    expect(() => restoreHostRun({ ...checkpoint, state: { ...validPoolState, projectiles: [{ ...validPoolState.projectiles[0]!, hitCooldowns: { '7': 5.1 } }] } })).toThrow('Invalid checkpoint projectile hit cooldowns');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...validPoolState, projectiles: [{ ...validPoolState.projectiles[0]!, weaponId: 'celestial_cross' }] } })).toThrow('Invalid checkpoint projectile hit cooldowns');
    const auraCheckpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'paladin', 'aura-checkpoint'));
    expect(() => restoreHostRun({ ...auraCheckpoint, state: { ...auraCheckpoint.state, weapons: [{ id: 'aegis_barrier', level: 1, cooldownRemaining: 0, auraHitCooldowns: { '7': Number.NaN } }] } })).toThrow('Invalid checkpoint aura hit cooldowns');
    expect(() => restoreHostRun({ ...auraCheckpoint, state: { ...auraCheckpoint.state, weapons: [{ id: 'aegis_barrier', level: 1, cooldownRemaining: 0, auraHitCooldowns: Object.fromEntries(Array.from({ length: 71 }, (_, index) => [String(index), 0.25])) }] } })).toThrow('Invalid checkpoint aura hit cooldowns');
    const validAuraState = { ...auraCheckpoint.state, weapons: [{ id: 'aegis_barrier', level: 1, cooldownRemaining: 0, auraHitCooldowns: { '7': 0.25 } }] };
    expect(restoreHostRun({ ...auraCheckpoint, state: validAuraState }).state.weapons[0]?.auraHitCooldowns).toEqual({ '7': 0.25 });
  });

  it('restores sequential targeted-weapon state and rejects unsafe queue fields', () => {
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'wizard', 'weapon-sequence-checkpoint'));
    const queuedWeapon = { id: 'arcane_bolt', level: 2, cooldownRemaining: 0.9, pendingShots: 1, shotIntervalRemaining: 0.1 };
    const state = { ...checkpoint.state, weapons: [queuedWeapon] };
    const restored = restoreHostRun({ ...checkpoint, state });
    expect(restored.state.weapons[0]).toMatchObject({ pendingShots: 1, shotIntervalRemaining: 0.1 });
    expect(() => restoreHostRun({ ...checkpoint, state: { ...state, weapons: [{ ...queuedWeapon, pendingShots: 241 }] } })).toThrow('Invalid checkpoint weapon sequence');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...state, weapons: [{ ...queuedWeapon, shotIntervalRemaining: 11 }] } })).toThrow('Invalid checkpoint weapon sequence');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...state, weapons: [{ id: 'broadsword', level: 1, cooldownRemaining: 0, pendingShots: 1 }] } })).toThrow('Invalid checkpoint weapon sequence');
  });

  it('restores fan-volley direction state and rejects incomplete or mismatched offsets', () => {
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'fan-sequence-checkpoint'));
    const queuedWeapon = { id: 'battle_axe', level: 5, cooldownRemaining: 3.8, pendingShots: 2, shotIntervalRemaining: 0.2, pendingVolleyAngle: 0.25, pendingVolleyTotal: 3 };
    const restored = restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, weapons: [queuedWeapon] } });
    expect(restored.state.weapons[0]).toMatchObject({ pendingShots: 2, pendingVolleyAngle: 0.25, pendingVolleyTotal: 3 });
    const missingAngle = { ...queuedWeapon };
    Reflect.deleteProperty(missingAngle, 'pendingVolleyAngle');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, weapons: [missingAngle] } })).toThrow('Invalid checkpoint weapon sequence');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, weapons: [{ ...queuedWeapon, pendingVolleyTotal: 2 }] } })).toThrow('Invalid checkpoint weapon sequence');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, weapons: [{ ...queuedWeapon, pendingVolleyTotal: SIMULATION_POLICIES.maxProjectiles + 1 }] } })).toThrow('Invalid checkpoint weapon sequence');
    expect(() => restoreHostRun({ ...checkpoint, state: { ...checkpoint.state, weapons: [{ id: 'arcane_bolt', level: 2, cooldownRemaining: 0.9, pendingShots: 1, shotIntervalRemaining: 0.1, pendingVolleyAngle: 0, pendingVolleyTotal: 2 }] } })).toThrow('Invalid checkpoint weapon sequence');
  });

  it('migrates a legacy checkpoint without chest presentation state', () => {
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'legacy-chest-checkpoint'));
    const legacyState = JSON.parse(JSON.stringify(checkpoint.state));
    delete legacyState.chestPresentationRemaining;
    delete legacyState.visualEffects;
    delete legacyState.collectedPickupIds;
    delete legacyState.paused;
    const restored = restoreHostRun({ ...checkpoint, state: legacyState });
    expect(restored.state.chestPresentationRemaining).toBe(0);
    expect(restored.state.collectedPickupIds).toEqual([]);
    expect(restored.state.visualEffects).toEqual([]);
    expect(restored.state.paused).toBe(false);
  });

  it('rejects a checkpoint whose level-up cards bypass the content registry', () => {
    const checkpoint = checkpointHostRun(createHostRun(DEFAULT_PROGRESS, 'warrior', 'unsafe-card-checkpoint'));
    const state = { ...checkpoint.state, phase: 'level-up' as const, pendingLevelUps: 1, pendingCards: [{ id: 'weapon:excalibur', label: 'Excalibur', kind: 'new-weapon' as const, target: 'excalibur' }] };
    expect(() => restoreHostRun({ ...checkpoint, state })).toThrow('Invalid level-up card');
  });

  it('owns revive and end-run choices on the host', () => {
    const session = createHostRun({ ...DEFAULT_PROGRESS, upgrades: { revival: 1 } }, 'warrior', 'revival-run');
    session.state.phase = 'revival';
    session.state.hero.stats.hp = 0;
    expect(applyHostAction(session, 'revive', undefined, 1)).toBe(true);
    expect(session.state.phase).toBe('dungeon');
    expect(session.state.revivalsRemaining).toBe(0);
    expect(session.state.hero.stats.hp).toBeGreaterThan(0);

    session.state.phase = 'revival';
    session.state.revivalsRemaining = 0;
    expect(applyHostAction(session, 'quit', undefined, 2)).toBe(true);
    expect(session.state.phase).toBe('summary');
    expect(session.state.outcome).toBe('defeat');
  });

  it('fails closed for an action that bypasses the validation boundary', () => {
    const session = createHostRun(DEFAULT_PROGRESS, 'warrior', 'unknown-action-run');
    expect(() => applyHostAction(session, 'unknown' as never, undefined, 1)).toThrow('Unknown run action');
    expect(session.lastIntentSequence).toBe(0);
  });
});
