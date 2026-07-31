export function formatHeroOptionLabel(heroName: string, highestLevel: number): string {
  const level = Number.isInteger(highestLevel) && highestLevel >= 1 ? highestLevel : 1;
  return `${heroName} - Level ${level}`;
}

export function formatHeroOptionDescription(heroName: string, highestLevel: number): string {
  const level = Number.isInteger(highestLevel) && highestLevel >= 1 ? highestLevel : 1;
  return `${heroName}, best run level ${level}; new runs start at Level 1`;
}
