export type GameStatus = 'setup' | 'playing' | 'finished';

export type ConstraintKind =
  | 'min-length'
  | 'no-katakana'
  | 'no-dakuten'
  | 'no-small-kana'
  | 'max-length'
  | 'require-long-vowel'
  | 'require-repeated-character'
  | 'require-specific-kana';

export type ActiveConstraint = {
  id: string;
  kind: ConstraintKind;
  minLength?: number;
  maxLength?: number;
  requiredKana?: string;
};

export type ConstraintDefinition = {
  id: string;
  kind: ConstraintKind;
  minLength?: number;
  maxLength?: number;
  requiredKana?: string;
  title: string;
  description: string;
  failureMessage: string;
  validate: (word: string) => boolean;
};

export type GameResult =
  | {
      kind: 'success';
      message: string;
      addedConstraints?: ActiveConstraint[];
    }
  | {
      kind: 'failure';
      message: string;
    };

export type GameState = {
  status: GameStatus;
  players: string[];
  eliminatedPlayerIndexes: number[];
  currentPlayerIndex: number;
  words: string[];
  homophoneReadings: string[];
  activeConstraints: ActiveConstraint[];
  constraintInterval: number;
  maxActiveConstraints: number;
  pendingConstraintCount: number;
  turnCount: number;
  lastResult?: GameResult;
};

export type GameAction =
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; index: number }
  | { type: 'SET_CONSTRAINT_INTERVAL'; interval: number }
  | { type: 'SET_MAX_CONSTRAINTS'; count: number }
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_WORD'; word: string; allowDuplicate?: boolean; random?: () => number }
  | { type: 'GIVE_UP' }
  | { type: 'FINISH_GAME' }
  | { type: 'RESET_GAME' };

export type ValidationResult =
  | { ok: true; word: string }
  | { ok: false; word: string; reason: string };
