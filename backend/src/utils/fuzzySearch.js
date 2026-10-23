/**
 * Utility for typo-tolerant fuzzy searching with Damerau-Levenshtein distance.
 * @author = kruthinraj
 * @date = 2026-10-15
 */

export function damerauLevenshtein(a, b) {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return matrix[al][bl];
}

export function wordSimilarity(qWord, tWord) {
  if (!qWord || !tWord) return 0;
  if (qWord === tWord) return 1.0;
  if (tWord.startsWith(qWord)) return 0.95;
  if (tWord.includes(qWord)) return 0.85;

  const qLen = qWord.length;
  const tLen = tWord.length;
  if (qLen <= 2) return 0;

  const maxDist = qLen <= 4 ? 1 : 2;
  const dist = damerauLevenshtein(qWord, tWord);
  if (dist <= maxDist) {
    return Math.max(0, 1 - dist / Math.max(qLen, tLen));
  }

  // Sliding window sub-word check
  if (tLen > qLen) {
    let bestSubSim = 0;
    for (let i = 0; i <= tLen - qLen; i++) {
      const sub = tWord.substring(i, i + qLen);
      const subDist = damerauLevenshtein(qWord, sub);
      if (subDist <= maxDist) {
        const sim = 1 - subDist / qLen;
        if (sim > bestSubSim) bestSubSim = sim;
      }
    }
    if (bestSubSim >= 0.7) return bestSubSim * 0.9;
  }

  return 0;
}

export function scoreFuzzyMatch(query, targetText) {
  if (!query || !targetText) return 0;
  const cleanQ = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const cleanT = targetText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  if (!cleanQ || !cleanT) return 0;

  // Exact whole query substring match gets full score
  if (cleanT.includes(cleanQ)) return 1.0;

  const qTokens = cleanQ.split(/\s+/).filter(Boolean);
  const tTokens = cleanT.split(/\s+/).filter(Boolean);

  if (qTokens.length === 0 || tTokens.length === 0) return 0;

  let totalScore = 0;
  for (const qWord of qTokens) {
    let bestWordScore = 0;
    for (const tWord of tTokens) {
      const sim = wordSimilarity(qWord, tWord);
      if (sim > bestWordScore) {
        bestWordScore = sim;
      }
    }
    // Require every query token to have a reasonable match (>= 0.55 similarity)
    if (bestWordScore < 0.55) {
      return 0;
    }
    totalScore += bestWordScore;
  }

  return totalScore / qTokens.length;
}

export function fuzzyFilterAndSort(items, query, extractTextFn, minScore = 0.55) {
  if (!query || !query.trim()) return items;
  const scored = [];
  for (const item of items) {
    const text = extractTextFn(item);
    const score = scoreFuzzyMatch(query, text);
    if (score >= minScore) {
      scored.push({ item, score });
    }
  }
  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
