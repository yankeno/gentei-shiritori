import { createNextConstraint, describeConstraint } from './constraints';
import { getComparableWord, normalizeWordInput } from './text';
import type { GameAction, GameState } from './types';
import { validateWordSubmission } from './validation';

export const CONSTRAINT_INTERVAL_OPTIONS = [3, 5, 7] as const;
export const MAX_CONSTRAINT_OPTIONS = [1, 3, 5] as const;
export const DEFAULT_CONSTRAINT_INTERVAL = 5;
export const DEFAULT_MAX_CONSTRAINTS = 5;

export const initialGameState: GameState = {
  status: 'setup',
  players: [],
  eliminatedPlayerIndexes: [],
  currentPlayerIndex: 0,
  words: [],
  homophoneReadings: [],
  activeConstraints: [],
  constraintInterval: DEFAULT_CONSTRAINT_INTERVAL,
  maxActiveConstraints: DEFAULT_MAX_CONSTRAINTS,
  pendingConstraintCount: 0,
  turnCount: 0,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const name = action.name.trim();

      if (!name || state.players.includes(name)) {
        return state;
      }

      return {
        ...state,
        players: [...state.players, name],
        lastResult: undefined,
      };
    }

    case 'REMOVE_PLAYER': {
      if (state.status !== 'setup') {
        return state;
      }

      return {
        ...state,
        players: state.players.filter((_, index) => index !== action.index),
        lastResult: undefined,
      };
    }

    case 'SET_CONSTRAINT_INTERVAL': {
      if (state.status !== 'setup') {
        return state;
      }

      if (!CONSTRAINT_INTERVAL_OPTIONS.some((interval) => interval === action.interval)) {
        return state;
      }

      return {
        ...state,
        constraintInterval: action.interval,
        lastResult: undefined,
      };
    }

    case 'SET_MAX_CONSTRAINTS': {
      if (state.status !== 'setup') {
        return state;
      }

      if (!MAX_CONSTRAINT_OPTIONS.some((count) => count === action.count)) {
        return state;
      }

      return {
        ...state,
        maxActiveConstraints: action.count,
        lastResult: undefined,
      };
    }

    case 'START_GAME': {
      if (state.players.length < 2) {
        return {
          ...state,
          lastResult: {
            kind: 'failure',
            message: 'プレイヤーは2人以上登録してください。',
          },
        };
      }

      return {
        ...state,
        status: 'playing',
        eliminatedPlayerIndexes: [],
        currentPlayerIndex: 0,
        words: [],
        homophoneReadings: [],
        activeConstraints: [],
        pendingConstraintCount: 0,
        turnCount: 0,
        lastResult: {
          kind: 'success',
          message: 'ゲームを開始しました。',
        },
      };
    }

    case 'SUBMIT_WORD': {
      if (state.status !== 'playing') {
        return state;
      }

      const result = validateWordSubmission({
        word: action.word,
        previousWords: state.words,
        activeConstraints: state.activeConstraints,
        allowUsedWord: action.allowDuplicate,
      });

      if (!result.ok) {
        return {
          ...state,
          lastResult: {
            kind: 'failure',
            message: result.reason,
          },
        };
      }

      const turnCount = state.turnCount + 1;
      const word = normalizeWordInput(result.word);
      const comparableWord = getComparableWord(word);
      const isApprovedHomophone =
        action.allowDuplicate === true &&
        state.words.some((usedWord) => getComparableWord(usedWord) === comparableWord);
      const isConstraintTurn = turnCount % state.constraintInterval === 0;
      const canAddConstraint = state.activeConstraints.length < state.maxActiveConstraints;
      const shouldAddConstraint =
        canAddConstraint && (state.pendingConstraintCount > 0 || isConstraintTurn);
      const addedConstraint = shouldAddConstraint
        ? createNextConstraint(state.activeConstraints, result.word, action.random)
        : undefined;
      const activeConstraints = addedConstraint
        ? [...state.activeConstraints, addedConstraint]
        : state.activeConstraints;
      const pendingConstraintCount =
        shouldAddConstraint &&
        !addedConstraint &&
        activeConstraints.length < state.maxActiveConstraints
          ? 1
          : 0;
      const addedConstraintTitle = addedConstraint
        ? describeConstraint(addedConstraint).title
        : undefined;
      const player = state.players[state.currentPlayerIndex];
      const nextPlayerIndex = getNextActivePlayerIndex(
        state.players.length,
        state.eliminatedPlayerIndexes,
        state.currentPlayerIndex,
      );
      const message = getSuccessMessage({
        player,
        word,
        shouldAddConstraint,
        addedConstraintTitle,
        isApprovedHomophone,
      });

      return {
        ...state,
        words: [...state.words, word],
        homophoneReadings: isApprovedHomophone
          ? [...new Set([...state.homophoneReadings, comparableWord])]
          : state.homophoneReadings,
        activeConstraints,
        pendingConstraintCount,
        currentPlayerIndex: nextPlayerIndex,
        turnCount,
        lastResult: {
          kind: 'success',
          message,
          addedConstraints: addedConstraint ? [addedConstraint] : undefined,
        },
      };
    }

    case 'GIVE_UP': {
      if (state.status !== 'playing') {
        return state;
      }

      const eliminatedPlayerIndexes = [
        ...state.eliminatedPlayerIndexes,
        state.currentPlayerIndex,
      ];
      const remainingPlayerIndexes = state.players
        .map((_, index) => index)
        .filter((index) => !eliminatedPlayerIndexes.includes(index));
      const player = state.players[state.currentPlayerIndex];

      if (remainingPlayerIndexes.length === 1) {
        const winnerIndex = remainingPlayerIndexes[0];
        const winner = state.players[winnerIndex];

        return {
          ...state,
          status: 'finished',
          eliminatedPlayerIndexes,
          currentPlayerIndex: winnerIndex,
          lastResult: {
            kind: 'success',
            message: `${player}がギブアップしました。${winner}の勝利です。`,
          },
        };
      }

      return {
        ...state,
        eliminatedPlayerIndexes,
        currentPlayerIndex: getNextActivePlayerIndex(
          state.players.length,
          eliminatedPlayerIndexes,
          state.currentPlayerIndex,
        ),
        lastResult: {
          kind: 'success',
          message: `${player}がギブアップしました。以降の順番をスキップします。`,
        },
      };
    }

    case 'FINISH_GAME':
      return {
        ...state,
        status: 'finished',
        lastResult: {
          kind: 'success',
          message: 'ゲームを終了しました。',
        },
      };

    case 'RESET_GAME':
      return initialGameState;

    default:
      return state;
  }
}

function getNextActivePlayerIndex(
  playerCount: number,
  eliminatedPlayerIndexes: number[],
  currentPlayerIndex: number,
): number {
  for (let offset = 1; offset <= playerCount; offset += 1) {
    const candidateIndex = (currentPlayerIndex + offset) % playerCount;

    if (!eliminatedPlayerIndexes.includes(candidateIndex)) {
      return candidateIndex;
    }
  }

  return currentPlayerIndex;
}

function getSuccessMessage({
  player,
  word,
  shouldAddConstraint,
  addedConstraintTitle,
  isApprovedHomophone,
}: {
  player: string;
  word: string;
  shouldAddConstraint: boolean;
  addedConstraintTitle?: string;
  isApprovedHomophone: boolean;
}): string {
  const successMessage = isApprovedHomophone
    ? `${player} の「${word}」は同音異義語として成立しました。`
    : `${player} の「${word}」は成立しました。`;

  if (addedConstraintTitle) {
    return `${successMessage}\n新しい制約が追加されました。\n「${addedConstraintTitle}」`;
  }

  if (shouldAddConstraint) {
    return `${successMessage}\n追加できる制約がなかったため、今回は制約追加なしです。`;
  }

  return successMessage;
}
