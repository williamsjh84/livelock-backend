/**
 * LiveLock — Word Pair Generator
 *
 * Generates cryptographically random, phonetically distinct word pairs for
 * verification sessions. The initiator says wordA aloud; the responder must
 * pick it from a set that includes wordA + decoys (wordB, wordC).
 *
 * Design constraints:
 *  - Words must be easy to say and hear clearly over a phone call
 *  - Pairs must be phonetically distinct (no rhyming, no similar vowel sounds)
 *  - Words are single-syllable or two-syllable max for speed
 *  - No words that sound like common commands or numbers
 */
import { randomInt } from "crypto";

// 240 phonetically diverse, easy-to-pronounce words
const WORD_POOL: string[] = [
  // Nature
  "oak", "pine", "fern", "moss", "cliff", "dune", "reef", "mist", "frost", "gale",
  "brook", "grove", "marsh", "ridge", "vale", "crest", "bluff", "cove", "fjord", "glen",
  "heath", "knoll", "moor", "peak", "rift", "shoal", "silt", "spire", "tor", "weald",
  // Animals
  "hawk", "wolf", "bear", "lynx", "crane", "dove", "elk", "finch", "grouse", "heron",
  "ibis", "jay", "kite", "lark", "mink", "newt", "orca", "puma", "quail", "raven",
  "swift", "teal", "vole", "wren", "yak", "bison", "cobra", "dingo", "egret", "ferret",
  // Colors / Materials
  "jade", "teal", "rust", "slate", "bronze", "ivory", "onyx", "pearl", "amber", "cobalt",
  "crimson", "ebony", "flint", "garnet", "indigo", "jasper", "khaki", "lapis", "mauve", "ochre",
  // Shapes / Geometry
  "arc", "cube", "disk", "edge", "grid", "helix", "knot", "loop", "mesh", "node",
  "orb", "prism", "ring", "shaft", "slab", "spoke", "strut", "truss", "vault", "wedge",
  // Actions (past tense, easy to say)
  "carved", "drifted", "forged", "glided", "hauled", "inked", "jumped", "knelt", "launched", "mined",
  "notched", "orbited", "paved", "quilted", "rafted", "scaled", "trekked", "urged", "vaulted", "waded",
  // Abstract / Concepts
  "anchor", "beacon", "cipher", "delta", "epoch", "flare", "glyph", "haven", "icon", "jolt",
  "keystone", "lantern", "mantle", "nexus", "omen", "pillar", "quorum", "relic", "signal", "token",
  "umbra", "vector", "ward", "zenith", "atlas", "bastion", "canopy", "datum", "emblem", "forge",
  // Textures / Qualities
  "bold", "calm", "deep", "firm", "grand", "harsh", "keen", "lean", "mild", "noble",
  "open", "plain", "quiet", "raw", "sharp", "taut", "vast", "warm", "young", "zeal",
  // Objects
  "anvil", "barrel", "chisel", "dowel", "easel", "flange", "gasket", "hammer", "ingot", "joist",
  "keel", "lathe", "mallet", "nozzle", "oar", "plank", "quiver", "rudder", "saddle", "trowel",
  // Places / Structures
  "arch", "barn", "cairn", "dock", "fort", "gate", "hall", "inn", "jetty", "keep",
  "lodge", "mill", "nave", "outpost", "pier", "quay", "rampart", "silo", "tower", "wall",
];

/**
 * Phonetic distance heuristic.
 * Returns true if two words are phonetically similar enough to be confusable.
 * Simple approach: same first letter, same last letter, or edit distance ≤ 2.
 */
function arePhoneticallySimilar(a: string, b: string): boolean {
  if (a === b) return true;
  // Same first consonant sound
  if (a[0] === b[0]) return true;
  // Same ending sound (last 2 chars)
  if (a.length >= 2 && b.length >= 2 && a.slice(-2) === b.slice(-2)) return true;
  // Levenshtein distance ≤ 2
  if (levenshtein(a, b) <= 2) return true;
  return false;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Pick `count` phonetically distinct words from the pool.
 * Uses crypto.randomInt for unpredictability.
 */
function pickDistinctWords(count: number): string[] {
  const picked: string[] = [];
  const pool = [...WORD_POOL];
  let attempts = 0;

  while (picked.length < count && attempts < 1000) {
    attempts++;
    const idx = randomInt(0, pool.length);
    const candidate = pool[idx];
    const isSimilar = picked.some(w => arePhoneticallySimilar(w, candidate));
    if (!isSimilar) {
      picked.push(candidate);
      pool.splice(idx, 1); // remove to avoid duplicates
    }
  }

  if (picked.length < count) {
    throw new Error(`Could not pick ${count} phonetically distinct words after ${attempts} attempts`);
  }

  return picked;
}

export interface WordPair {
  /** The word the initiator will say aloud */
  wordA: string;
  /** A decoy word shown to the responder alongside wordA */
  wordB: string;
  /** A second decoy word for a 3-option challenge */
  wordC: string;
}

/**
 * Generate a fresh word pair for a verification session.
 * Returns wordA (the real word) and two decoys (wordB, wordC).
 * The caller should shuffle [wordA, wordB, wordC] before showing to the responder.
 */
export function generateWordPair(): WordPair {
  const [wordA, wordB, wordC] = pickDistinctWords(3);
  return { wordA, wordB, wordC };
}

/**
 * Shuffle an array using Fisher-Yates with crypto.randomInt.
 */
export function cryptoShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export { WORD_POOL, arePhoneticallySimilar, levenshtein };
