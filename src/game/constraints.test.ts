import { describe, expect, it } from 'vitest';
import { createNextConstraint, describeConstraint } from './constraints';
import type { ActiveConstraint } from './types';

describe('constraints', () => {
  it('does not include a food constraint', () => {
    const activeConstraints: ActiveConstraint[] = [
      { id: 'min-length-5', kind: 'min-length', minLength: 5 },
      { id: 'no-katakana', kind: 'no-katakana' },
      { id: 'no-dakuten', kind: 'no-dakuten' },
      { id: 'no-small-kana', kind: 'no-small-kana' },
      { id: 'require-long-vowel', kind: 'require-long-vowel' },
      { id: 'require-repeated-character', kind: 'require-repeated-character' },
    ];

    const nextConstraint = createNextConstraint(activeConstraints, 'あめ', () => 0);

    expect(nextConstraint?.kind).toBe('require-specific-kana');
  });

  it('creates min-length constraints only from thresholds satisfied by the current word', () => {
    const activeConstraints: ActiveConstraint[] = [
      { id: 'no-katakana', kind: 'no-katakana' },
      { id: 'no-dakuten', kind: 'no-dakuten' },
      { id: 'no-small-kana', kind: 'no-small-kana' },
      { id: 'max-length-5', kind: 'max-length', maxLength: 5 },
      { id: 'require-long-vowel', kind: 'require-long-vowel' },
      { id: 'require-repeated-character', kind: 'require-repeated-character' },
      { id: 'require-specific-kana-あ', kind: 'require-specific-kana', requiredKana: 'あ' },
    ];

    const nextConstraint = createNextConstraint(activeConstraints, 'あいうえお', () => 0.99);

    expect(nextConstraint).toEqual({
      id: 'min-length-5',
      kind: 'min-length',
      minLength: 5,
    });
    expect(describeConstraint(nextConstraint!).title).toBe('5文字以上');
  });

  it('creates max-length constraints only from thresholds satisfied by the current word', () => {
    const activeConstraints: ActiveConstraint[] = [
      { id: 'no-katakana', kind: 'no-katakana' },
      { id: 'no-dakuten', kind: 'no-dakuten' },
      { id: 'no-small-kana', kind: 'no-small-kana' },
      { id: 'require-long-vowel', kind: 'require-long-vowel' },
      { id: 'require-repeated-character', kind: 'require-repeated-character' },
      { id: 'require-specific-kana-あ', kind: 'require-specific-kana', requiredKana: 'あ' },
    ];

    const nextConstraint = createNextConstraint(activeConstraints, 'あいうえおか', sequence([0.5, 0]));

    expect(nextConstraint).toEqual({ id: 'max-length-6', kind: 'max-length', maxLength: 6 });
    expect(describeConstraint(nextConstraint!).title).toBe('6文字以内');
  });

  it('does not add max-length constraints when min-length is already active', () => {
    const activeConstraints: ActiveConstraint[] = [
      { id: 'min-length-3', kind: 'min-length', minLength: 3 },
      { id: 'no-katakana', kind: 'no-katakana' },
      { id: 'no-dakuten', kind: 'no-dakuten' },
      { id: 'no-small-kana', kind: 'no-small-kana' },
      { id: 'require-long-vowel', kind: 'require-long-vowel' },
      { id: 'require-repeated-character', kind: 'require-repeated-character' },
    ];

    const nextConstraint = createNextConstraint(activeConstraints, 'あめ', () => 0);

    expect(nextConstraint?.kind).toBe('require-specific-kana');
  });

  it('creates specific-kana constraints only from kana in the current word', () => {
    const activeConstraints: ActiveConstraint[] = [
      { id: 'min-length-3', kind: 'min-length', minLength: 3 },
      { id: 'no-katakana', kind: 'no-katakana' },
      { id: 'no-dakuten', kind: 'no-dakuten' },
      { id: 'no-small-kana', kind: 'no-small-kana' },
      { id: 'max-length-5', kind: 'max-length', maxLength: 5 },
      { id: 'require-long-vowel', kind: 'require-long-vowel' },
      { id: 'require-repeated-character', kind: 'require-repeated-character' },
    ];

    const nextConstraint = createNextConstraint(activeConstraints, 'すいか', () => 0);

    expect(nextConstraint).toEqual({
      id: 'require-specific-kana-い',
      kind: 'require-specific-kana',
      requiredKana: 'い',
    });
    expect(describeConstraint(nextConstraint!).title).toBe('「い」必須');
  });

  it('skips no-dakuten constraints when the current word ends with dakuten', () => {
    const activeConstraints: ActiveConstraint[] = [
      { id: 'min-length-3', kind: 'min-length', minLength: 3 },
      { id: 'no-katakana', kind: 'no-katakana' },
    ];

    const nextConstraint = createNextConstraint(activeConstraints, 'からすが', () => 0);

    expect(nextConstraint?.kind).toBe('no-small-kana');
  });

  it('skips constraints that the current word cannot satisfy', () => {
    const activeConstraints: ActiveConstraint[] = [
      { id: 'min-length-3', kind: 'min-length', minLength: 3 },
      { id: 'no-katakana', kind: 'no-katakana' },
      { id: 'no-dakuten', kind: 'no-dakuten' },
      { id: 'no-small-kana', kind: 'no-small-kana' },
    ];

    const nextConstraint = createNextConstraint(
      activeConstraints,
      'あいうえおかきく',
      () => 0,
    );

    expect(nextConstraint).toEqual({
      id: 'require-specific-kana-あ',
      kind: 'require-specific-kana',
      requiredKana: 'あ',
    });
  });
});

function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}
