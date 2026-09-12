const HANGUL_INITIALS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ",
  "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

type NikkeSearchable = {
  name: string;
  aliases?: readonly string[] | null;
};

export function normalizeNikkeName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function extractHangulInitials(name: string): string {
  return Array.from(name)
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code < 0xac00 || code > 0xd7a3) return "";
      return HANGUL_INITIALS[Math.floor((code - 0xac00) / 588)];
    })
    .join("");
}

function matchesName(name: string, query: string): boolean {
  const normalizedName = normalizeNikkeName(name);
  return normalizedName.includes(query) || normalizeNikkeName(extractHangulInitials(name)).includes(query);
}

export function matchesNikkeSearch(nikke: NikkeSearchable, search: string): boolean {
  const query = normalizeNikkeName(search);
  if (!query) return true;

  return matchesName(nikke.name, query) || (nikke.aliases ?? []).some((alias) => matchesName(alias, query));
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    for (let index = 0; index <= right.length; index += 1) previous[index] = current[index];
  }

  return previous[right.length];
}

function similarity(left: string, right: string): number {
  const longestLength = Math.max(left.length, right.length);
  return longestLength === 0 ? 1 : 1 - levenshteinDistance(left, right) / longestLength;
}

export type NikkeMatchResult<T extends NikkeSearchable> = {
  nikke: T | null;
  similarity: number;
};

const NIKKE_MATCH_THRESHOLD = 0.78;

export function findBestNikkeMatch<T extends NikkeSearchable>(
  inputName: string,
  nikkeList: readonly T[]
): NikkeMatchResult<T> {
  const input = normalizeNikkeName(inputName);
  if (!input) return { nikke: null, similarity: 0 };

  const candidates = nikkeList.flatMap((nikke) => {
    const names = [nikke.name, ...(nikke.aliases ?? [])];
    return names
      .map((name) => ({ nikke, name: normalizeNikkeName(name) }))
      .filter((candidate) => candidate.name.length > 0);
  });

  const exact = candidates.find((candidate) => candidate.name === input);
  if (exact) return { nikke: exact.nikke, similarity: 1 };

  const canUseShortMatch = input.length >= 3;
  const scored = candidates
    .map((candidate) => {
      const contains = canUseShortMatch && (candidate.name.includes(input) || input.includes(candidate.name));
      return {
        ...candidate,
        similarity: contains ? Math.min(input.length, candidate.name.length) / Math.max(input.length, candidate.name.length) : similarity(input, candidate.name),
      };
    })
    .sort((left, right) => right.similarity - left.similarity);
  const best = scored[0];
  if (!best || best.similarity < NIKKE_MATCH_THRESHOLD || input.length < 3) {
    return { nikke: null, similarity: best?.similarity ?? 0 };
  }

  const tied = scored.find(
    (candidate) => candidate.nikke.name !== best.nikke.name && Math.abs(candidate.similarity - best.similarity) < 0.0001
  );
  if (tied) return { nikke: null, similarity: best.similarity };

  return { nikke: best.nikke, similarity: best.similarity };
}
