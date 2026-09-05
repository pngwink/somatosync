import type { MemoryRecallScore, MemoryWordList } from "./memoryTypes";

// Original neutral word banks written for SomatoSync. They do not reproduce
// the word lists printed in SCAT6 or SCOAT6 materials.
export const memoryWordLists: MemoryWordList[] = [
  { id: "river", words: ["river", "candle", "garden", "silver", "window", "basket", "planet", "orange", "button", "meadow"] },
  { id: "anchor", words: ["anchor", "velvet", "forest", "lemon", "pocket", "bridge", "marble", "ticket", "cloud", "pencil"] },
  { id: "harbor", words: ["harbor", "copper", "ladder", "violet", "acorn", "mirror", "jacket", "circle", "pepper", "tunnel"] },
  { id: "lantern", words: ["lantern", "island", "ribbon", "cherry", "blanket", "compass", "bottle", "rabbit", "winter", "key"] },
  { id: "maple", words: ["maple", "camera", "desert", "feather", "guitar", "magnet", "ocean", "pillow", "rocket", "spoon"] },
  { id: "castle", words: ["castle", "denim", "flower", "helmet", "kiwi", "notebook", "paint", "shell", "train", "umbrella"] },
];

export const MEMORY_WORD_COUNT = 10;
export const MEMORY_DELAY_SECONDS = 5 * 60;
export const MEMORY_DEMO_DELAY_SECONDS = 15;

function normalizeWord(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z]/g, "");
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  if (a.length === b.length) {
    const differences: number[] = [];
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) differences.push(index);
    }
    if (differences.length === 1) return true;
    if (
      differences.length === 2 &&
      differences[1] === differences[0] + 1 &&
      a[differences[0]] === b[differences[1]] &&
      a[differences[1]] === b[differences[0]]
    ) {
      return true;
    }
  }

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  if (i < a.length || j < b.length) edits += 1;
  return edits <= 1;
}

export function parseRecallInput(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map(normalizeWord)
    .filter(Boolean);
}

export function scoreRecall(input: string, targetWords: string[]): MemoryRecallScore {
  const responses = Array.from(new Set(parseRecallInput(input)));
  const unusedTargets = targetWords.map(normalizeWord);
  const matchedWords: string[] = [];
  let intrusionCount = 0;

  for (const response of responses) {
    const matchIndex = unusedTargets.findIndex(
      (target) => response === target || (target.length >= 5 && response.length >= 5 && editDistanceAtMostOne(response, target))
    );
    if (matchIndex >= 0) {
      matchedWords.push(unusedTargets[matchIndex]);
      unusedTargets.splice(matchIndex, 1);
    } else {
      intrusionCount += 1;
    }
  }

  return { correctCount: matchedWords.length, matchedWords, intrusionCount };
}

export function pickMemoryWordList(previousListIds: string[], randomValue = Math.random()): MemoryWordList {
  const recentIds = new Set(previousListIds.slice(0, 3));
  const available = memoryWordLists.filter((list) => !recentIds.has(list.id));
  const pool = available.length > 0 ? available : memoryWordLists;
  return pool[Math.floor(randomValue * pool.length)] ?? memoryWordLists[0];
}
