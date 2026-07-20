import { getActiveConstraintDefinitions } from './constraints';
import { getComparableWord, getHeadKana, getTailKana, normalizeWordInput } from './text';
import type { ActiveConstraint, ValidationResult } from './types';

type ValidateWordParams = {
  word: string;
  previousWords: string[];
  activeConstraints: ActiveConstraint[];
  allowUsedWord?: boolean;
};

export function validateWordSubmission({
  word,
  previousWords,
  activeConstraints,
  allowUsedWord = false,
}: ValidateWordParams): ValidationResult {
  const normalizedWord = normalizeWordInput(word);

  if (!normalizedWord) {
    return { ok: false, word: normalizedWord, reason: '単語を入力してください。' };
  }

  const currentHead = getHeadKana(normalizedWord);
  const currentTail = getTailKana(normalizedWord);

  if (!currentHead || !currentTail) {
    return { ok: false, word: normalizedWord, reason: '先頭と末尾の文字を判定できません。' };
  }

  const previousWord = previousWords[previousWords.length - 1];
  if (previousWord) {
    const previousTail = getTailKana(previousWord);
    if (previousTail !== currentHead) {
      return {
        ok: false,
        word: normalizedWord,
        reason: `前の単語は「${previousTail}」で終わっています。「${previousTail}」から始めてください。`,
      };
    }
  }

  const comparableWord = getComparableWord(normalizedWord);
  const usedWords = new Set(previousWords.map(getComparableWord));
  if (!allowUsedWord && usedWords.has(comparableWord)) {
    return { ok: false, word: normalizedWord, reason: 'その単語はすでに使われています。' };
  }

  if (currentTail === 'ん') {
    return { ok: false, word: normalizedWord, reason: '「ん」で終わる単語は使えません。' };
  }

  for (const constraint of getActiveConstraintDefinitions(activeConstraints)) {
    if (!constraint.validate(normalizedWord)) {
      return { ok: false, word: normalizedWord, reason: constraint.failureMessage };
    }
  }

  return { ok: true, word: normalizedWord };
}
