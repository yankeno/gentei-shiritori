const SMALL_KANA: Record<string, string> = {
  ぁ: 'あ',
  ぃ: 'い',
  ぅ: 'う',
  ぇ: 'え',
  ぉ: 'お',
  ゃ: 'や',
  ゅ: 'ゆ',
  ょ: 'よ',
  っ: 'つ',
  ゎ: 'わ',
};

export function normalizeWordInput(input: string): string {
  return input.normalize('NFKC').trim();
}

export function toHiragana(input: string): string {
  return [...normalizeWordInput(input)]
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60);
      }
      return char;
    })
    .join('');
}

export function getComparableWord(input: string): string {
  return toHiragana(input).replace(/\s+/g, '');
}

export function getWordLength(input: string): number {
  return [...normalizeWordInput(input).replace(/\s+/g, '')].length;
}

export function getHeadKana(input: string): string {
  const [firstChar] = [...getComparableWord(input)];
  return firstChar ? normalizeSmallKana(firstChar) : '';
}

export function getTailKana(input: string): string {
  const chars = [...getComparableWord(input)];

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const char = chars[index];

    if (char === 'ー') {
      return getKanaBeforeLongMark(chars, index);
    }

    return normalizeSmallKana(char);
  }

  return '';
}

function normalizeSmallKana(char: string): string {
  return SMALL_KANA[char] ?? char;
}

function getKanaBeforeLongMark(chars: string[], longMarkIndex: number): string {
  // Trailing long vowel marks continue the previous kana for shiritori purposes.
  for (let index = longMarkIndex - 1; index >= 0; index -= 1) {
    const char = chars[index];
    if (char !== 'ー') {
      return normalizeSmallKana(char);
    }
  }

  return '';
}
