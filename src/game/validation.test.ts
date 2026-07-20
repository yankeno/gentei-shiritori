import { describe, expect, it } from 'vitest';
import { getTailKana } from './text';
import { validateWordSubmission } from './validation';

describe('validateWordSubmission', () => {
  it('accepts the first valid word', () => {
    expect(
      validateWordSubmission({
        word: 'りす',
        previousWords: [],
        activeConstraints: [],
      }),
    ).toEqual({ ok: true, word: 'りす' });
  });

  it('connects hiragana and katakana by comparable kana', () => {
    expect(
      validateWordSubmission({
        word: 'ゴリラ',
        previousWords: ['りんご'],
        activeConstraints: [],
      }),
    ).toEqual({ ok: true, word: 'ゴリラ' });
  });

  it('rejects a word that does not connect to the previous word', () => {
    const result = validateWordSubmission({
      word: 'らっぱ',
      previousWords: ['りす'],
      activeConstraints: [],
    });

    expect(result.ok).toBe(false);
    expect(result.word).toBe('らっぱ');
  });

  it('rejects a used word even when the script differs', () => {
    const result = validateWordSubmission({
      word: 'リス',
      previousWords: ['りす', 'すいか', 'かり'],
      activeConstraints: [],
    });

    expect(result.ok).toBe(false);
    expect(result.word).toBe('リス');
    if (result.ok) {
      throw new Error('Expected duplicate word to be rejected');
    }
    expect(result.reason).toBe('その単語はすでに使われています。');
  });

  it('accepts a used reading when it is explicitly allowed as a homophone', () => {
    expect(
      validateWordSubmission({
        word: 'リス',
        previousWords: ['りす', 'すいか', 'かり'],
        activeConstraints: [],
        allowUsedWord: true,
      }),
    ).toEqual({ ok: true, word: 'リス' });
  });

  it('rejects words ending with ん', () => {
    const result = validateWordSubmission({
      word: 'みかん',
      previousWords: [],
      activeConstraints: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected word ending with ん to be rejected');
    }
    expect(result.reason).toBe('「ん」で終わる単語は使えません。');
  });

  it('applies active constraints', () => {
    const result = validateWordSubmission({
      word: 'めし',
      previousWords: [],
      activeConstraints: [{ id: 'min-length-5', kind: 'min-length', minLength: 5 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected min-length constraint to reject the word');
    }
    expect(result.reason).toBe('5文字以上の単語にしてください。');
  });

  it('uses the kana before a trailing long mark as the tail', () => {
    expect(getTailKana('カレー')).toBe('れ');
    expect(
      validateWordSubmission({
        word: 'れんげ',
        previousWords: ['カレー'],
        activeConstraints: [],
      }),
    ).toEqual({ ok: true, word: 'れんげ' });
  });

  it('applies max-length constraints', () => {
    const result = validateWordSubmission({
      word: 'あいうえおか',
      previousWords: [],
      activeConstraints: [{ id: 'max-length-5', kind: 'max-length', maxLength: 5 }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected max-length constraint to reject the word');
    }
    expect(result.reason).toBe('5文字以内の単語にしてください。');
  });

  it('applies require-long-vowel constraints', () => {
    const result = validateWordSubmission({
      word: 'あいうえお',
      previousWords: [],
      activeConstraints: [{ id: 'require-long-vowel', kind: 'require-long-vowel' }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected long-vowel constraint to reject the word');
    }
    expect(result.reason).toBe('長音符「ー」を含めてください。');
  });

  it('applies repeated-character constraints', () => {
    const result = validateWordSubmission({
      word: 'あかさたな',
      previousWords: [],
      activeConstraints: [
        { id: 'require-repeated-character', kind: 'require-repeated-character' },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected repeated-character constraint to reject the word');
    }
    expect(result.reason).toBe('同じ文字を2回以上含めてください。');
  });

  it('applies specific-kana constraints with comparable kana', () => {
    expect(
      validateWordSubmission({
        word: 'サラサラ',
        previousWords: [],
        activeConstraints: [
          { id: 'require-specific-kana-さ', kind: 'require-specific-kana', requiredKana: 'さ' },
        ],
      }),
    ).toEqual({ ok: true, word: 'サラサラ' });
  });
});
