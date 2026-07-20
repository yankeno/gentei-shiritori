import type {
  ActiveConstraint,
  ConstraintDefinition,
  ConstraintKind,
} from "./types";
import { getComparableWord, getWordLength, normalizeWordInput } from "./text";

const CONSTRAINT_KINDS: ConstraintKind[] = [
  "min-length",
  "no-katakana",
  "no-dakuten",
  "no-small-kana",
  "max-length",
  "require-long-vowel",
  "require-repeated-character",
  "require-specific-kana",
];

const MIN_LENGTH_OPTIONS = [3, 5, 7];
const MAX_LENGTH_OPTIONS = [5, 6, 7];

const REQUIRED_KANA_OPTIONS = [
  "あ",
  "い",
  "う",
  "え",
  "お",
  "か",
  "き",
  "く",
  "け",
  "こ",
  "さ",
  "し",
  "す",
  "せ",
  "そ",
  "た",
  "ち",
  "つ",
  "て",
  "と",
  "な",
  "に",
  "ぬ",
  "ね",
  "の",
  "は",
  "ひ",
  "ふ",
  "へ",
  "ほ",
  "ま",
  "み",
  "む",
  "め",
  "も",
  "や",
  "ゆ",
  "よ",
  "ら",
  "り",
  "る",
  "れ",
  "ろ",
  "わ",
];

export function createNextConstraint(
  activeConstraints: ActiveConstraint[],
  word: string,
  random = Math.random,
): ActiveConstraint | undefined {
  const activeKinds = new Set(
    activeConstraints.map((constraint) => constraint.kind),
  );
  const candidateKinds = CONSTRAINT_KINDS.filter(
    (kind) =>
      !activeKinds.has(kind) &&
      canAddConstraintKind(kind, activeConstraints, word),
  );

  while (candidateKinds.length > 0) {
    const index = getRandomIndex(candidateKinds.length, random);
    const [kind] = candidateKinds.splice(index, 1);
    const constraint = createConstraint(kind, random);

    if (describeConstraint(constraint).validate(word)) {
      return constraint;
    }
  }

  return undefined;
}

export function describeConstraint(
  activeConstraint: ActiveConstraint,
): ConstraintDefinition {
  switch (activeConstraint.kind) {
    case "min-length": {
      const minLength = activeConstraint.minLength ?? MIN_LENGTH_OPTIONS[1];

      return {
        ...activeConstraint,
        minLength,
        title: `${minLength}文字以上`,
        description: `単語は${minLength}文字以上`,
        failureMessage: `${minLength}文字以上の単語にしてください。`,
        validate: (word) => getWordLength(word) >= minLength,
      };
    }

    case "no-katakana":
      return {
        ...activeConstraint,
        title: "カタカナ禁止",
        description: "カタカナ文字を含めない",
        failureMessage: "カタカナは使えません。",
        validate: (word) => !/[\u30a1-\u30fa]/u.test(normalizeWordInput(word)),
      };

    case "no-dakuten":
      return {
        ...activeConstraint,
        title: "濁点禁止",
        description: "濁点・半濁点を含めない",
        failureMessage: "濁点・半濁点は使えません。",
        validate: (word) =>
          !/[\u3099\u309a]/u.test(normalizeWordInput(word).normalize("NFD")),
      };

    case "no-small-kana":
      return {
        ...activeConstraint,
        title: "小さいかな禁止",
        description: "「ゃゅょっ」等を含めない",
        failureMessage: "小さいかなは使えません。",
        validate: (word) =>
          !/[ぁぃぅぇぉゃゅょっゎァィゥェォャュョッヮ]/u.test(
            normalizeWordInput(word),
          ),
      };

    case "max-length": {
      const maxLength = activeConstraint.maxLength ?? MAX_LENGTH_OPTIONS[1];

      return {
        ...activeConstraint,
        maxLength,
        title: `${maxLength}文字以内`,
        description: `単語は${maxLength}文字以内`,
        failureMessage: `${maxLength}文字以内の単語にしてください。`,
        validate: (word) => getWordLength(word) <= maxLength,
      };
    }

    case "require-long-vowel":
      return {
        ...activeConstraint,
        title: "長音必須",
        description: "長音符「ー」を含める",
        failureMessage: "長音符「ー」を含めてください。",
        validate: (word) => normalizeWordInput(word).includes("ー"),
      };

    case "require-repeated-character":
      return {
        ...activeConstraint,
        title: "同じ文字必須",
        description: "同じ文字を2回以上含める",
        failureMessage: "同じ文字を2回以上含めてください。",
        validate: (word) => hasRepeatedCharacter(word),
      };

    case "require-specific-kana": {
      const requiredKana =
        activeConstraint.requiredKana ?? REQUIRED_KANA_OPTIONS[0];

      return {
        ...activeConstraint,
        requiredKana,
        title: `「${requiredKana}」必須`,
        description: `単語に「${requiredKana}」を含める`,
        failureMessage: `「${requiredKana}」を含めてください。`,
        validate: (word) => getComparableWord(word).includes(requiredKana),
      };
    }

    default: {
      const unknownConstraint: never = activeConstraint.kind;
      throw new Error(`Unknown constraint: ${unknownConstraint}`);
    }
  }
}

export function getActiveConstraintDefinitions(
  activeConstraints: ActiveConstraint[],
): ConstraintDefinition[] {
  return activeConstraints.map(describeConstraint);
}

function createConstraint(
  kind: ConstraintKind,
  random: () => number,
): ActiveConstraint {
  switch (kind) {
    case "min-length": {
      const minLength = pickRandom(MIN_LENGTH_OPTIONS, random);
      return {
        id: `${kind}-${minLength}`,
        kind,
        minLength,
      };
    }

    case "max-length": {
      const maxLength = pickRandom(MAX_LENGTH_OPTIONS, random);
      return {
        id: `${kind}-${maxLength}`,
        kind,
        maxLength,
      };
    }

    case "require-specific-kana": {
      const requiredKana = pickRandom(REQUIRED_KANA_OPTIONS, random);
      return {
        id: `${kind}-${requiredKana}`,
        kind,
        requiredKana,
      };
    }

    default:
      return {
        id: kind,
        kind,
      };
  }
}

function pickRandom<T>(items: T[], random: () => number): T {
  const index = getRandomIndex(items.length, random);
  return items[index];
}

function getRandomIndex(length: number, random: () => number): number {
  return Math.min(Math.floor(random() * length), length - 1);
}

function canAddConstraintKind(
  kind: ConstraintKind,
  activeConstraints: ActiveConstraint[],
  word: string,
): boolean {
  if (kind === "no-dakuten" && endsWithDakuten(word)) {
    return false;
  }

  if (
    kind === "max-length" &&
    activeConstraints.some((constraint) => constraint.kind === "min-length")
  ) {
    return false;
  }

  return true;
}

function endsWithDakuten(word: string): boolean {
  const chars = [...normalizeWordInput(word).replace(/\s+/g, "")];

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const char = chars[index];
    if (char === "ー") {
      continue;
    }

    return /[\u3099]/u.test(char.normalize("NFD"));
  }

  return false;
}

function hasRepeatedCharacter(word: string): boolean {
  const chars = [...getComparableWord(word)].filter((char) => char !== "ー");
  return new Set(chars).size < chars.length;
}
