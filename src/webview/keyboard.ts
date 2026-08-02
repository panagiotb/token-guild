const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);

export function normalizeKeyboardKey(key: string): string {
  return key.toLowerCase();
}

export function isMovementKey(key: string): boolean {
  return MOVEMENT_KEYS.has(normalizeKeyboardKey(key));
}

/** Editable controls own their keystrokes; the game owns movement everywhere else. */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as { closest?: unknown }).closest !== 'function') return false;
  return Boolean((target as Element).closest('input, select, textarea, button, dialog, [contenteditable="true"]'));
}
