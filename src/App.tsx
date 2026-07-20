import { FormEvent, useEffect, useMemo, useReducer, useState } from "react";
import {
  getActiveConstraintDefinitions,
  describeConstraint,
} from "./game/constraints";
import {
  CONSTRAINT_INTERVAL_OPTIONS,
  gameReducer,
  initialGameState,
  MAX_CONSTRAINT_OPTIONS,
} from "./game/reducer";
import {
  getComparableWord,
  getTailKana,
  normalizeWordInput,
} from "./game/text";

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [playerName, setPlayerName] = useState("");
  const [word, setWord] = useState("");

  const activeConstraints = useMemo(
    () => getActiveConstraintDefinitions(state.activeConstraints),
    [state.activeConstraints],
  );
  const currentPlayer = state.players[state.currentPlayerIndex] ?? "";
  const remainingPlayerCount =
    state.players.length - state.eliminatedPlayerIndexes.length;
  const winner =
    state.status === "finished" && remainingPlayerCount === 1
      ? state.players.find(
          (_, index) => !state.eliminatedPlayerIndexes.includes(index),
        )
      : undefined;
  const latestWord = state.words[state.words.length - 1];
  const expectedHead = latestWord ? getTailKana(latestWord) : "";
  const turnsUntilConstraint =
    state.constraintInterval - (state.turnCount % state.constraintInterval);
  const constraintTimingLabel =
    state.activeConstraints.length >= state.maxActiveConstraints
      ? `制約は上限${state.maxActiveConstraints}個に到達`
      : state.pendingConstraintCount > 0
        ? "次の成立で制約追加を再試行"
        : `${turnsUntilConstraint}ターン後に制約追加`;

  useEffect(() => {
    if (state.status !== "playing") {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.status]);

  function handleAddPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "ADD_PLAYER", name: playerName });
    setPlayerName("");
  }

  function handleSubmitWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const comparableWord = getComparableWord(normalizeWordInput(word));
    const isUsedWord = state.words.some(
      (usedWord) => getComparableWord(usedWord) === comparableWord,
    );

    if (comparableWord && isUsedWord) {
      const confirmed = window.confirm(
        `「${normalizeWordInput(word)}」はすでに使われています。\n同音異義語として許可しますか？`,
      );

      if (!confirmed) {
        return;
      }

      dispatch({ type: "SUBMIT_WORD", word, allowDuplicate: true });
      setWord("");
      return;
    }

    dispatch({ type: "SUBMIT_WORD", word });
    setWord("");
  }

  function handleGiveUp() {
    const confirmed = window.confirm(
      `${currentPlayer}さんはギブアップしますか？以降の順番には戻れません。`,
    );

    if (confirmed) {
      setWord("");
      dispatch({ type: "GIVE_UP" });
    }
  }

  return (
    <main className="appShell">
      <section className="appHeader" aria-labelledby="app-title">
        <img
          className="appIcon"
          src="/icon.png"
          alt=""
          width="72"
          height="72"
        />
        <h1 id="app-title">限定しりとり</h1>
      </section>

      {state.status === "setup" && (
        <section className="setupLayout" aria-label="プレイヤー登録">
          <div className="setupPanel">
            <form className="inlineForm" onSubmit={handleAddPlayer}>
              <label className="fieldLabel" htmlFor="player-name">
                プレイヤー名
              </label>
              <div className="inputRow">
                <input
                  id="player-name"
                  type="text"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  autoComplete="off"
                  maxLength={16}
                />
                <button type="submit">追加</button>
              </div>
            </form>

            <div className="playerList" aria-label="登録済みプレイヤー">
              {state.players.length === 0 ? (
                <p className="emptyText">まだ登録されていません。</p>
              ) : (
                state.players.map((player, index) => (
                  <div className="playerItem" key={player}>
                    <span>
                      <strong>{index + 1}</strong>
                      {player}
                    </span>
                    <button
                      className="ghostButton"
                      type="button"
                      onClick={() => dispatch({ type: "REMOVE_PLAYER", index })}
                    >
                      削除
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside className="startPanel">
            <div className="meter">
              <span>登録人数</span>
              <strong>{state.players.length}</strong>
            </div>
            <div className="settingGroup">
              <span className="fieldLabel">制約追加頻度</span>
              <div
                className="segmentedControl"
                role="radiogroup"
                aria-label="制約追加頻度"
              >
                {CONSTRAINT_INTERVAL_OPTIONS.map((interval) => (
                  <button
                    key={interval}
                    className={
                      state.constraintInterval === interval ? "selected" : ""
                    }
                    type="button"
                    role="radio"
                    aria-checked={state.constraintInterval === interval}
                    onClick={() =>
                      dispatch({ type: "SET_CONSTRAINT_INTERVAL", interval })
                    }
                  >
                    {interval}ターン
                  </button>
                ))}
              </div>
            </div>
            <div className="settingGroup">
              <span className="fieldLabel">制約の最大数</span>
              <div
                className="segmentedControl"
                role="radiogroup"
                aria-label="制約の最大数"
              >
                {MAX_CONSTRAINT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    className={
                      state.maxActiveConstraints === count ? "selected" : ""
                    }
                    type="button"
                    role="radio"
                    aria-checked={state.maxActiveConstraints === count}
                    onClick={() =>
                      dispatch({ type: "SET_MAX_CONSTRAINTS", count })
                    }
                  >
                    {count}個
                  </button>
                ))}
              </div>
            </div>
            <button
              className="primaryButton"
              type="button"
              onClick={() => dispatch({ type: "START_GAME" })}
            >
              ゲーム開始
            </button>
            <ResultMessage result={state.lastResult} />
          </aside>
        </section>
      )}

      {state.status === "playing" && (
        <section className="gameLayout" aria-label="ゲーム画面">
          <div className="turnPanel">
            <div className="turnTopline">
              <span>TURN {state.turnCount + 1}</span>
              <span>残り{remainingPlayerCount}人</span>
            </div>
            <h2>{currentPlayer}</h2>
            <p className="nextLetter">
              {expectedHead ? `「${expectedHead}」から` : "最初の単語"}
            </p>
            <p className="constraintTiming">{constraintTimingLabel}</p>

            <form className="wordForm" onSubmit={handleSubmitWord}>
              <label className="fieldLabel" htmlFor="word">
                単語
              </label>
              <div className="inputRow">
                <input
                  id="word"
                  type="text"
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                  autoComplete="off"
                  autoFocus
                />
                <button type="submit">判定</button>
              </div>
            </form>

            <button
              className="giveUpButton"
              type="button"
              onClick={handleGiveUp}
            >
              ギブアップ
            </button>

            <ResultMessage result={state.lastResult} />

            <div className="playerStatusList" aria-label="プレイヤー状況">
              {state.players.map((player, index) => {
                const isEliminated = state.eliminatedPlayerIndexes.includes(index);
                const isCurrent = index === state.currentPlayerIndex;

                return (
                  <span
                    className={[
                      isEliminated ? "eliminated" : "",
                      isCurrent ? "current" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={player}
                  >
                    {player}
                    {isEliminated && <small>脱落</small>}
                  </span>
                );
              })}
            </div>
          </div>

          <aside className="rulesPanel" aria-label="有効な制約">
            <div className="panelHeading">
              <span>制約</span>
              <strong>
                {activeConstraints.length}/{state.maxActiveConstraints}
              </strong>
            </div>
            {activeConstraints.length === 0 ? (
              <p className="emptyText">現在の制約はありません。</p>
            ) : (
              <ul className="constraintList">
                {activeConstraints.map((constraint) => (
                  <li key={constraint.id}>
                    <strong>{constraint.title}</strong>
                    <span>{constraint.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="historyPanel" aria-label="単語履歴">
            <div className="panelHeading">
              <span>履歴</span>
              <strong>{state.words.length}</strong>
            </div>
            {state.words.length === 0 ? (
              <p className="emptyText">まだ単語はありません。</p>
            ) : (
              <ol className="wordHistory">
                {state.words.map((usedWord, index) => {
                  const isHomophone = state.homophoneReadings.includes(
                    getComparableWord(usedWord),
                  );

                  return (
                    <li
                      className={isHomophone ? "homophone" : undefined}
                      key={`${usedWord}-${index}`}
                    >
                      <span>{usedWord}</span>
                      {isHomophone && <em>同音異義語</em>}
                      {index < state.words.length - 1 && (
                        <small>{getTailKana(usedWord)}</small>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            <button
              className="ghostButton wideButton"
              type="button"
              onClick={() => dispatch({ type: "FINISH_GAME" })}
            >
              終了
            </button>
          </section>
        </section>
      )}

      {state.status === "finished" && (
        <section className="finishPanel" aria-label="結果">
          <p className="eyebrow">Result</p>
          <h2>{winner ? `${winner}の勝利` : `${state.turnCount}ターン成立`}</h2>
          <ResultMessage result={state.lastResult} />
          <p>最後の単語: {latestWord ?? "なし"}</p>
          <div className="finalConstraints">
            {state.activeConstraints.map((constraint) => (
              <span key={constraint.id}>
                {describeConstraint(constraint).title}
              </span>
            ))}
          </div>
          <button
            className="primaryButton"
            type="button"
            onClick={() => dispatch({ type: "RESET_GAME" })}
          >
            もう一度
          </button>
        </section>
      )}
    </main>
  );
}

function ResultMessage({
  result,
}: {
  result: ReturnType<typeof gameReducer>["lastResult"];
}) {
  if (!result) {
    return null;
  }

  return <p className={`resultMessage ${result.kind}`}>{result.message}</p>;
}

export default App;
