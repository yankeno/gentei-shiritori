import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONSTRAINT_INTERVAL,
  gameReducer,
  initialGameState,
} from './reducer';
import type { GameState } from './types';

function addPlayers(state: GameState): GameState {
  return ['春', '夏'].reduce(
    (currentState, name) => gameReducer(currentState, { type: 'ADD_PLAYER', name }),
    state,
  );
}

describe('gameReducer', () => {
  it('requires at least two players to start', () => {
    const state = gameReducer(initialGameState, { type: 'START_GAME' });

    expect(state.status).toBe('setup');
    expect(state.lastResult?.kind).toBe('failure');
  });

  it('starts a game with registered players', () => {
    const state = gameReducer(addPlayers(initialGameState), { type: 'START_GAME' });

    expect(state.status).toBe('playing');
    expect(state.players).toEqual(['春', '夏']);
    expect(state.currentPlayerIndex).toBe(0);
  });

  it('updates the constraint interval before starting the game', () => {
    const state = gameReducer(initialGameState, {
      type: 'SET_CONSTRAINT_INTERVAL',
      interval: 3,
    });

    expect(state.constraintInterval).toBe(3);
  });

  it('updates the maximum number of active constraints before starting the game', () => {
    const state = gameReducer(initialGameState, {
      type: 'SET_MAX_CONSTRAINTS',
      count: 3,
    });

    expect(state.maxActiveConstraints).toBe(3);
  });

  it('records a valid word and advances the player', () => {
    const playingState = gameReducer(addPlayers(initialGameState), { type: 'START_GAME' });
    const state = gameReducer(playingState, { type: 'SUBMIT_WORD', word: 'りす' });

    expect(state.words).toEqual(['りす']);
    expect(state.turnCount).toBe(1);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.lastResult?.kind).toBe('success');
  });

  it('keeps the same player when the word is invalid', () => {
    const playingState = gameReducer(addPlayers(initialGameState), { type: 'START_GAME' });
    const acceptedState = gameReducer(playingState, { type: 'SUBMIT_WORD', word: 'りす' });
    const rejectedState = gameReducer(acceptedState, { type: 'SUBMIT_WORD', word: 'まくら' });

    expect(rejectedState.words).toEqual(['りす']);
    expect(rejectedState.turnCount).toBe(1);
    expect(rejectedState.currentPlayerIndex).toBe(1);
    expect(rejectedState.lastResult?.kind).toBe('failure');
  });

  it('records an approved duplicate reading as a homophone', () => {
    const playingState = gameReducer(addPlayers(initialGameState), { type: 'START_GAME' });
    const firstWordState = gameReducer(playingState, { type: 'SUBMIT_WORD', word: 'はし' });
    const bridgeWordState = gameReducer(firstWordState, {
      type: 'SUBMIT_WORD',
      word: 'しらは',
    });
    const homophoneState = gameReducer(bridgeWordState, {
      type: 'SUBMIT_WORD',
      word: 'ハシ',
      allowDuplicate: true,
    });

    expect(homophoneState.words).toEqual(['はし', 'しらは', 'ハシ']);
    expect(homophoneState.homophoneReadings).toEqual(['はし']);
    expect(homophoneState.lastResult?.message).toContain('同音異義語として成立しました。');
  });

  it('skips a player after they give up', () => {
    const setupState = ['春', '夏', '秋'].reduce(
      (currentState, name) => gameReducer(currentState, { type: 'ADD_PLAYER', name }),
      initialGameState,
    );
    const playingState = gameReducer(setupState, { type: 'START_GAME' });
    const afterSpringGivesUp = gameReducer(playingState, { type: 'GIVE_UP' });
    const afterSummerPlays = gameReducer(afterSpringGivesUp, {
      type: 'SUBMIT_WORD',
      word: 'りす',
    });
    const afterAutumnPlays = gameReducer(afterSummerPlays, {
      type: 'SUBMIT_WORD',
      word: 'すいか',
    });

    expect(afterSpringGivesUp.eliminatedPlayerIndexes).toEqual([0]);
    expect(afterSpringGivesUp.currentPlayerIndex).toBe(1);
    expect(afterSummerPlays.currentPlayerIndex).toBe(2);
    expect(afterAutumnPlays.currentPlayerIndex).toBe(1);
  });

  it('finishes the game when only one player remains', () => {
    const playingState = gameReducer(addPlayers(initialGameState), { type: 'START_GAME' });
    const state = gameReducer(playingState, { type: 'GIVE_UP' });

    expect(state.status).toBe('finished');
    expect(state.eliminatedPlayerIndexes).toEqual([0]);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.lastResult).toEqual({
      kind: 'success',
      message: '春がギブアップしました。夏の勝利です。',
    });
  });

  it(`adds a new constraint every ${DEFAULT_CONSTRAINT_INTERVAL} valid turns`, () => {
    const words = ['あり', 'りす', 'すずめ', 'めだか', 'かたつむり'];
    const playingState = gameReducer(addPlayers(initialGameState), { type: 'START_GAME' });
    const state = words.reduce(
      (currentState, word) =>
        gameReducer(currentState, { type: 'SUBMIT_WORD', word, random: () => 0 }),
      playingState,
    );

    expect(state.turnCount).toBe(DEFAULT_CONSTRAINT_INTERVAL);
    expect(state.activeConstraints).toEqual([
      { id: 'min-length-3', kind: 'min-length', minLength: 3 },
    ]);
    expect(state.lastResult?.kind).toBe('success');
    if (state.lastResult?.kind !== 'success') {
      throw new Error('Expected a successful turn');
    }
    expect(state.lastResult?.addedConstraints).toEqual([
      {
        id: 'min-length-3',
        kind: 'min-length',
        minLength: 3,
      },
    ]);
    expect(state.lastResult?.message).toContain(
      '成立しました。\n新しい制約が追加されました。',
    );
  });

  it('uses the configured constraint interval while playing', () => {
    const configuredState = gameReducer(addPlayers(initialGameState), {
      type: 'SET_CONSTRAINT_INTERVAL',
      interval: 3,
    });
    const playingState = gameReducer(configuredState, { type: 'START_GAME' });
    const state = ['あり', 'りす', 'すいせいか'].reduce(
      (currentState, word) =>
        gameReducer(currentState, { type: 'SUBMIT_WORD', word, random: () => 0 }),
      playingState,
    );

    expect(state.turnCount).toBe(3);
    expect(state.activeConstraints).toEqual([
      { id: 'min-length-3', kind: 'min-length', minLength: 3 },
    ]);
  });

  it('retries constraint addition on the next valid turn when no constraint could be added', () => {
    const almostFullConstraintState: GameState = {
      ...initialGameState,
      status: 'playing',
      players: ['春', '夏'],
      words: ['あり', 'りす'],
      activeConstraints: [
        { id: 'min-length-3', kind: 'min-length', minLength: 3 },
        { id: 'no-katakana', kind: 'no-katakana' },
        { id: 'no-dakuten', kind: 'no-dakuten' },
        { id: 'no-small-kana', kind: 'no-small-kana' },
      ],
      constraintInterval: 3,
      turnCount: 2,
    };

    const noConstraintAddedState = gameReducer(almostFullConstraintState, {
      type: 'SUBMIT_WORD',
      word: 'すいか',
      random: sequence([0, 0, 0, 0]),
    });

    expect(noConstraintAddedState.turnCount).toBe(3);
    expect(noConstraintAddedState.activeConstraints).toHaveLength(4);
    expect(noConstraintAddedState.pendingConstraintCount).toBe(1);

    const retriedState = gameReducer(noConstraintAddedState, {
      type: 'SUBMIT_WORD',
      word: 'かーか',
      random: () => 0,
    });

    expect(retriedState.turnCount).toBe(4);
    expect(retriedState.pendingConstraintCount).toBe(0);
    expect(retriedState.lastResult?.kind).toBe('success');
    if (retriedState.lastResult?.kind !== 'success') {
      throw new Error('Expected a successful retried constraint addition');
    }
    expect(retriedState.lastResult.addedConstraints).toEqual([
      {
        id: 'require-long-vowel',
        kind: 'require-long-vowel',
      },
    ]);
  });

  it('does not add more than the configured maximum number of constraints', () => {
    const fullConstraintState: GameState = {
      ...initialGameState,
      status: 'playing',
      players: ['春', '夏'],
      words: ['あり'],
      activeConstraints: [
        { id: 'min-length-3', kind: 'min-length', minLength: 3 },
        { id: 'no-katakana', kind: 'no-katakana' },
        { id: 'no-dakuten', kind: 'no-dakuten' },
      ],
      constraintInterval: 3,
      maxActiveConstraints: 3,
      turnCount: 2,
    };

    const state = gameReducer(fullConstraintState, {
      type: 'SUBMIT_WORD',
      word: 'りすり',
      random: () => 0,
    });

    expect(state.activeConstraints).toHaveLength(3);
    expect(state.pendingConstraintCount).toBe(0);
    expect(state.lastResult?.kind).toBe('success');
    if (state.lastResult?.kind !== 'success') {
      throw new Error('Expected a successful turn at the constraint limit');
    }
    expect(state.lastResult.addedConstraints).toBeUndefined();
  });

  it('resets to the initial state', () => {
    const playingState = gameReducer(addPlayers(initialGameState), { type: 'START_GAME' });
    const state = gameReducer(playingState, { type: 'RESET_GAME' });

    expect(state).toEqual(initialGameState);
  });
});

function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}
