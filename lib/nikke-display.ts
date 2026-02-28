const BRACKET_CHARS = ["[", "［", "【", "〔", "〖", "〘", "〚", "⟦"];

export function formatNikkeDisplayName(name: string): string {
  const firstBracketIndex = BRACKET_CHARS.reduce((currentMin, bracket) => {
    const index = name.indexOf(bracket);
    if (index === -1) return currentMin;
    return currentMin === -1 ? index : Math.min(currentMin, index);
  }, -1);

  return (firstBracketIndex === -1 ? name : name.slice(0, firstBracketIndex)).trim();
}

export function formatNikkeDisplayNames(names: string[]): string {
  return names.map(formatNikkeDisplayName).join(" / ");
}
