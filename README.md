# 限定しりとり

1台のブラウザを複数人で囲んで遊ぶ、制約付きしりとりゲームです。

## 開発

Docker を使って起動します。

```bash
docker compose up --build app
```

ブラウザで `http://localhost:5173` を開きます。

## エディタ

ローカルに `node_modules` を作らずに型定義を認識させるため、VS Code / Cursor では Dev Container で開きます。

1. Docker Desktop を起動する
2. コマンドパレットから `Dev Containers: Reopen in Container` を実行する
3. エディタがコンテナ内の `/app/node_modules` を使う状態になる

## テスト

```bash
docker compose run --rm app npm test
```

## MVP の範囲

- プレイヤー名の登録
- 順番制の単語入力
- しりとり判定
- 使用済み単語の拒否
- 「ん」で終わる単語の拒否
- 設定した頻度ごとの制約追加
- 文字数、表記、長音、重複文字、指定かなを使った制約
- 辞書/API/バックエンドなし
