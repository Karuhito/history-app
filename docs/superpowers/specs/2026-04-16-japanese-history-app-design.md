# 日本史人物解説アプリ 設計ドキュメント

**作成日:** 2026-04-16

---

## 概要

Gemini APIを使って日本史の人物について質問できるアプリ。Web（ブラウザ）とiOS（Expo Go / EAS Build）の両プラットフォームで動作する。

---

## アーキテクチャ

```
[Expo App (Web / iOS)]
        │
        │ Firebase Auth (認証済みリクエスト)
        ▼
[Firebase Cloud Functions]
        │
        ├─ Gemini API 呼び出し（日本史プロンプト付き）
        │
        └─ Firestore への検索履歴保存

[Firestore]
  └─ users/{userId}/history/{historyId}
       - query: string
       - response: string
       - createdAt: timestamp
```

- Expo アプリは Firebase Auth トークンを付けて Cloud Functions を呼び出す（未認証リクエストは拒否）
- Gemini API キーは Cloud Functions の環境変数にのみ存在し、クライアントには露出しない
- Firestore への書き込みは Cloud Functions 内で行うため、クライアントに書き込み権限は不要

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | Expo (React Native + Web)、TypeScript |
| スタイリング | NativeWind（Tailwind CSS for React Native）|
| 認証 | Firebase Authentication（メール/パスワード、Googleログイン）|
| DB | Firestore |
| バックエンド | Firebase Cloud Functions（Node.js / TypeScript）|
| AI | Gemini API（`gemini-2.5-flash`）|
| iOSビルド | EAS Build（クラウドビルド、Xcode不要）|

---

## 画面構成

```
[ログイン / サインアップ画面]
        │ 認証成功
        ▼
[検索画面] ◀────────────────────┐
  ・テキスト入力欄                │
  ・「検索」ボタン                │
  ・結果カード（回答表示）        │
        │                       │
        │ 履歴ボタン            │ 戻る
        ▼                       │
[履歴一覧画面]                   │
  ・過去の検索クエリ一覧          │
        │ タップ                 │
        ▼                       │
[履歴詳細画面] ─────────────────┘
  ・過去のクエリと回答カードを表示
```

---

## データフロー（検索時）

1. ユーザーが検索欄にクエリを入力し送信
2. Firebase Auth トークンを付けて Cloud Functions を呼び出す
3. Cloud Functions が Gemini API へ送信するプロンプト：
   - **システムプロンプト：** 「あなたは日本史の専門家です。日本史の人物についてのみ回答してください。関係のない質問には『日本史の人物に関する質問をしてください』と返してください。」
   - **ユーザー入力：** そのまま渡す
4. Gemini の回答を Firestore（`users/{userId}/history/{historyId}`）に保存
5. 回答をアプリへ返し、検索画面に結果カードとして表示

---

## エラーハンドリング

| ケース | 対応 |
|--------|------|
| 日本史以外の質問 | Gemini のシステムプロンプトで弾き、「日本史の人物に関する質問をしてください」とカード表示 |
| API タイムアウト / エラー | 「回答を取得できませんでした。再試行してください。」と表示 |
| 未認証アクセス | Cloud Functions が Firebase Auth トークンを検証し、無効なリクエストは 401 で拒否 |

---

## 開発・動作確認方針

- 開発中の動作確認：**Expo Go アプリ**（実機）＋ **Webブラウザ**（Xcode不要）
- Cloud Functions のローカル確認：**Firebase Emulator Suite**
- iOS 配布ビルド：**EAS Build**（クラウドビルド、Xcode不要）
