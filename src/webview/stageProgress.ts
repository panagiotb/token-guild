import { MVP_REGISTRY } from '../game/content';
import type { RegistryStage } from '../game/registry';

export function stageDefinitions(): readonly RegistryStage[] {
  return MVP_REGISTRY.stages;
}

export function formatStageOptionLabel(stage: RegistryStage): string {
  return stage.name;
}

export function formatStageOptionDescription(stage: RegistryStage): string {
  const minutes = Math.floor(stage.durationSeconds / 60);
  const duration = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const topology = stage.topology === 'open' ? 'Open scrolling map' : stage.topology === 'corridor' ? 'Corridor map' : 'Bounded map';
  const modifiers = stage.modifiers.length > 0 ? stage.modifiers.join(', ') : 'No modifiers';
  return `${duration} · ${topology} · ${modifiers}`;
}

export function stageUnlockReason(stageId: string, unlockedStages: readonly string[]): string {
  if (unlockedStages.includes(stageId)) return 'Unlocked';
  return 'Complete the required challenge to unlock this stage';
}
