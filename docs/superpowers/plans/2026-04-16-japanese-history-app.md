# 日本史人物解説アプリ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gemini APIを使い、日本史の人物について質問・解説を受けられるWeb/iOSアプリを構築する。

**Architecture:** Expo（React Native + Web）をフロントエンドとし、Firebase Cloud Functions が Gemini API のプロキシとして機能する。認証は Firebase Auth（メール/パスワード + Google）、検索履歴は Firestore に保存。

**Tech Stack:** Expo, TypeScript, NativeWind, Firebase Auth, Firestore, Cloud Functions (Node.js/TypeScript), Gemini API (`gemini-2.5-flash`), EAS Build

---

## ファイル構成

```
history-app/
├── app/                          # Expo Router ファイルベースルーティング
│   ├── _layout.tsx               # ルートレイアウト（認証ガード）
│   ├── (auth)/
│   │   ├── _layout.tsx           # 認証画面レイアウト
│   │   └── login.tsx             # ログイン / サインアップ画面
│   └── (main)/
│       ├── _layout.tsx           # メイン画面タブレイアウト
│       ├── index.tsx             # 検索画面
│       ├── history/
│       │   ├── index.tsx         # 履歴一覧画面
│       │   └── [id].tsx          # 履歴詳細画面
├── components/
│   ├── ResultCard.tsx            # 回答カードコンポーネント
│   └── QueryInput.tsx            # 検索入力コンポーネント
├── lib/
│   ├── firebase.ts               # Firebase 初期化
│   ├── auth.ts                   # 認証ヘルパー（Google / メールパスワード）
│   └── api.ts                    # Cloud Functions 呼び出し
├── functions/                    # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts              # Cloud Functions エントリポイント
│   ├── package.json
│   └── tsconfig.json
├── app.json                      # Expo 設定
├── tailwind.config.js            # NativeWind 設定
├── nativewind-env.d.ts           # NativeWind 型定義
├── global.css                    # Tailwind グローバルCSS
├── package.json
├── tsconfig.json
└── .env                          # Firebase クライアント設定（公開鍵のみ）
```

---

## Task 1: Expo プロジェクト初期化

**Files:**
- Create: `history-app/package.json`, `history-app/app.json`, `history-app/tsconfig.json`
- Create: `history-app/app/_layout.tsx`
- Create: `history-app/tailwind.config.js`, `history-app/global.css`, `history-app/nativewind-env.d.ts`

- [ ] **Step 1: Expo プロジェクトを作成**

```bash
cd /Users/kazutoenomoto/workspace/apps
npx create-expo-app@latest history-app --template blank-typescript
cd history-app
```

- [ ] **Step 2: 必要なパッケージをインストール**

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens react-native-web react-dom @expo/metro-runtime
```

- [ ] **Step 3: NativeWind をセットアップ**

```bash
npx expo install nativewind tailwindcss@^3.4 react-native-reanimated
```

`tailwind.config.js` を作成:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

`global.css` を作成:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`nativewind-env.d.ts` を作成:

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 4: Expo Router 用に `app.json` を更新**

`app.json` の `expo` に以下を追加:

```json
{
  "expo": {
    "scheme": "history-app",
    "web": {
      "bundler": "metro",
      "output": "single"
    },
    "plugins": ["expo-router"]
  }
}
```

- [ ] **Step 5: ルートレイアウトを作成**

`app/_layout.tsx`:

```tsx
import "../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 6: 動作確認**

```bash
npx expo start --web
```

ブラウザで空の画面が表示されることを確認。

- [ ] **Step 7: コミット**

```bash
git init
echo "node_modules/\n.expo/\ndist/\n.env" > .gitignore
git add .
git commit -m "feat: initialize Expo project with TypeScript, NativeWind, and Expo Router"
```

---

## Task 2: Firebase プロジェクトセットアップ

**Files:**
- Create: `history-app/lib/firebase.ts`
- Create: `history-app/.env`

- [ ] **Step 1: Firebase パッケージをインストール**

```bash
cd /Users/kazutoenomoto/workspace/apps/history-app
npx expo install @react-native-firebase/app
npm install firebase
```

> 注意: Expo Go で使う場合は Firebase JS SDK (`firebase`) を利用する。`@react-native-firebase` はネイティブビルド時に使用。ここでは Firebase JS SDK をメインで使う。

- [ ] **Step 2: Firebase コンソールでプロジェクトを作成**

1. https://console.firebase.google.com/ でプロジェクトを作成
2. Web アプリを追加し、設定値を取得
3. Authentication を有効化（メール/パスワード + Google プロバイダ）
4. Firestore Database を作成

- [ ] **Step 3: `.env` を作成**

```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

- [ ] **Step 4: Firebase 初期化モジュールを作成**

`lib/firebase.ts`:

```ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const functions = getFunctions(app, "asia-northeast1");
```

- [ ] **Step 5: コミット**

```bash
git add lib/firebase.ts .env
git commit -m "feat: add Firebase initialization with environment variables"
```

---

## Task 3: 認証機能（メール/パスワード + Google）

**Files:**
- Create: `history-app/lib/auth.ts`
- Create: `history-app/app/(auth)/_layout.tsx`
- Create: `history-app/app/(auth)/login.tsx`
- Modify: `history-app/app/_layout.tsx`

- [ ] **Step 1: 認証ヘルパーパッケージをインストール**

```bash
cd /Users/kazutoenomoto/workspace/apps/history-app
npx expo install expo-auth-session expo-crypto expo-web-browser
```

- [ ] **Step 2: 認証ヘルパーを作成**

`lib/auth.ts`:

```ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  const signInWithGoogle = async () => {
    const result = await promptAsync();
    if (result.type === "success") {
      const { id_token } = result.params;
      const credential = GoogleAuthProvider.credential(id_token);
      return signInWithCredential(auth, credential);
    }
    return null;
  };

  return { signInWithGoogle, request };
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
```

- [ ] **Step 3: `.env` に Google OAuth クライアントID を追加**

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
```

> Google Cloud Console で OAuth 2.0 クライアントID（Web用・iOS用）を取得し設定する。

- [ ] **Step 4: 認証画面レイアウトを作成**

`app/(auth)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 5: ログイン画面を作成**

`app/(auth)/login.tsx`:

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { signInWithEmail, signUpWithEmail, useGoogleAuth } from "../../lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const { signInWithGoogle, request } = useGoogleAuth();

  const handleEmailAuth = async () => {
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      Alert.alert("エラー", error.message);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert("エラー", error.message);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white">
      <Text className="text-3xl font-bold text-center mb-8">
        日本史人物解説
      </Text>

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        className="bg-blue-600 rounded-lg py-3 mb-4"
        onPress={handleEmailAuth}
      >
        <Text className="text-white text-center font-semibold text-lg">
          {isSignUp ? "アカウント作成" : "ログイン"}
        </Text>
      </Pressable>

      <Pressable
        className="bg-white border border-gray-300 rounded-lg py-3 mb-6"
        onPress={handleGoogleAuth}
        disabled={!request}
      >
        <Text className="text-center font-semibold text-lg">
          Googleでログイン
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsSignUp(!isSignUp)}>
        <Text className="text-blue-600 text-center">
          {isSignUp
            ? "アカウントをお持ちの方はこちら"
            : "アカウントを作成する"}
        </Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 6: ルートレイアウトに認証ガードを追加**

`app/_layout.tsx` を更新:

```tsx
import "../global.css";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { Stack, useRouter, useSegments } from "expo-router";
import { subscribeToAuthState } from "../lib/auth";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(main)");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 7: 動作確認**

```bash
npx expo start --web
```

ブラウザでログイン画面が表示されることを確認。メール/パスワードで新規アカウント作成→ログインが動作することを確認。

- [ ] **Step 8: コミット**

```bash
git add .
git commit -m "feat: add authentication with email/password and Google sign-in"
```

---

## Task 4: Cloud Functions（Gemini API プロキシ）

**Files:**
- Create: `history-app/functions/package.json`
- Create: `history-app/functions/tsconfig.json`
- Create: `history-app/functions/src/index.ts`
- Create: `history-app/firebase.json`

- [ ] **Step 1: Cloud Functions プロジェクトを初期化**

```bash
cd /Users/kazutoenomoto/workspace/apps/history-app
npm install -g firebase-tools
firebase login
firebase init functions
```

設定:
- 言語: TypeScript
- ESLint: Yes
- npm install: Yes

- [ ] **Step 2: Gemini SDK をインストール**

```bash
cd /Users/kazutoenomoto/workspace/apps/history-app/functions
npm install @google/generative-ai firebase-admin firebase-functions
```

- [ ] **Step 3: Cloud Functions を実装**

`functions/src/index.ts`:

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineSecret } from "firebase-functions/params";

initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const SYSTEM_PROMPT =
  "あなたは日本史の専門家です。日本史の人物についてのみ回答してください。" +
  "関係のない質問には「日本史の人物に関する質問をしてください」とだけ返してください。" +
  "回答は分かりやすく、正確に、適度な長さでお願いします。";

export const askAboutHistory = onCall(
  { region: "asia-northeast1", secrets: [geminiApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "認証が必要です。");
    }

    const query = request.data.query;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new HttpsError("invalid-argument", "質問を入力してください。");
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey.value());
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    try {
      const result = await model.generateContent(query);
      const response = result.response.text();

      const db = getFirestore();
      await db
        .collection("users")
        .doc(request.auth.uid)
        .collection("history")
        .add({
          query: query,
          response: response,
          createdAt: FieldValue.serverTimestamp(),
        });

      return { response };
    } catch (error) {
      throw new HttpsError(
        "internal",
        "回答を取得できませんでした。再試行してください。"
      );
    }
  }
);
```

- [ ] **Step 4: Gemini API キーを設定**

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

プロンプトに Gemini API キー（https://aistudio.google.com/apikey で取得）を入力。

- [ ] **Step 5: `firebase.json` を確認・更新**

`firebase.json` に以下が含まれていることを確認:

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 6: Firestore セキュリティルールを作成**

`firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/history/{historyId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Cloud Functions のみ書き込み可
    }
  }
}
```

- [ ] **Step 7: Firebase Emulator でローカルテスト**

```bash
cd /Users/kazutoenomoto/workspace/apps/history-app
firebase emulators:start --only functions,firestore
```

別ターミナルから:

```bash
curl -X POST http://localhost:5001/YOUR_PROJECT_ID/asia-northeast1/askAboutHistory \
  -H "Content-Type: application/json" \
  -d '{"data": {"query": "織田信長について教えて"}}'
```

> 注意: ローカルエミュレーターでは認証チェックがスキップされるため、テスト時は `request.auth` のモック設定が必要な場合がある。

- [ ] **Step 8: コミット**

```bash
git add functions/ firebase.json firestore.rules
git commit -m "feat: add Cloud Functions with Gemini API proxy and Firestore history"
```

---

## Task 5: 検索画面

**Files:**
- Create: `history-app/lib/api.ts`
- Create: `history-app/components/QueryInput.tsx`
- Create: `history-app/components/ResultCard.tsx`
- Create: `history-app/app/(main)/_layout.tsx`
- Create: `history-app/app/(main)/index.tsx`

- [ ] **Step 1: Cloud Functions 呼び出しヘルパーを作成**

`lib/api.ts`:

```ts
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

type AskResponse = { response: string };

export async function askAboutHistory(query: string): Promise<string> {
  const callable = httpsCallable<{ query: string }, AskResponse>(
    functions,
    "askAboutHistory"
  );
  const result = await callable({ query });
  return result.data.response;
}
```

- [ ] **Step 2: 検索入力コンポーネントを作成**

`components/QueryInput.tsx`:

```tsx
import { useState } from "react";
import { View, TextInput, Pressable, Text } from "react-native";

type Props = {
  onSubmit: (query: string) => void;
  loading: boolean;
};

export function QueryInput({ onSubmit, loading }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  };

  return (
    <View className="flex-row gap-2">
      <TextInput
        className="flex-1 border border-gray-300 rounded-lg px-4 py-3"
        placeholder="例: 織田信長はなぜ天下統一を目指したのか？"
        value={query}
        onChangeText={setQuery}
        editable={!loading}
        onSubmitEditing={handleSubmit}
        returnKeyType="search"
      />
      <Pressable
        className={`rounded-lg px-6 py-3 ${loading ? "bg-gray-400" : "bg-blue-600"}`}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text className="text-white font-semibold">
          {loading ? "..." : "検索"}
        </Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: 回答カードコンポーネントを作成**

`components/ResultCard.tsx`:

```tsx
import { View, Text, ScrollView } from "react-native";

type Props = {
  query: string;
  response: string;
};

export function ResultCard({ query, response }: Props) {
  return (
    <View className="bg-white rounded-2xl shadow-md p-6 mt-4 border border-gray-100">
      <Text className="text-sm text-gray-500 mb-2">質問</Text>
      <Text className="text-base font-semibold mb-4">{query}</Text>
      <View className="h-px bg-gray-200 mb-4" />
      <Text className="text-sm text-gray-500 mb-2">回答</Text>
      <Text className="text-base leading-6">{response}</Text>
    </View>
  );
}
```

- [ ] **Step 4: メイン画面レイアウトを作成**

`app/(main)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function MainLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "検索",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "履歴",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 5: 検索画面を作成**

`app/(main)/index.tsx`:

```tsx
import { useState } from "react";
import { View, ScrollView, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QueryInput } from "../../components/QueryInput";
import { ResultCard } from "../../components/ResultCard";
import { askAboutHistory } from "../../lib/api";

export default function SearchScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    query: string;
    response: string;
  } | null>(null);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await askAboutHistory(query);
      setResult({ query, response });
    } catch (error: any) {
      Alert.alert("エラー", "回答を取得できませんでした。再試行してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <ScrollView className="flex-1 px-4 pt-4">
        <QueryInput onSubmit={handleSearch} loading={loading} />
        {loading && (
          <Text className="text-center text-gray-500 mt-8">
            回答を生成中...
          </Text>
        )}
        {result && (
          <ResultCard query={result.query} response={result.response} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 6: 動作確認**

```bash
npx expo start --web
```

ログイン後、検索画面が表示されることを確認。テキストを入力して検索し、Gemini から回答カードが返されることを確認。

- [ ] **Step 7: コミット**

```bash
git add lib/api.ts components/ app/\(main\)/
git commit -m "feat: add search screen with Gemini API integration and result card"
```

---

## Task 6: 履歴一覧・詳細画面

**Files:**
- Create: `history-app/app/(main)/history/index.tsx`
- Create: `history-app/app/(main)/history/[id].tsx`

- [ ] **Step 1: Firestore クライアント読み取りを `lib/api.ts` に追加**

`lib/api.ts` に以下を追加:

```ts
import {
  collection,
  query as fsQuery,
  orderBy,
  getDocs,
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";
import { auth } from "./firebase";
import { initializeApp, getApps } from "firebase/app";

const db = getFirestore();

export type HistoryItem = {
  id: string;
  query: string;
  response: string;
  createdAt: Date;
};

export async function getHistory(): Promise<HistoryItem[]> {
  const user = auth.currentUser;
  if (!user) throw new Error("認証が必要です");

  const ref = collection(db, "users", user.uid, "history");
  const q = fsQuery(ref, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    query: d.data().query,
    response: d.data().response,
    createdAt: d.data().createdAt?.toDate() ?? new Date(),
  }));
}

export async function getHistoryItem(id: string): Promise<HistoryItem | null> {
  const user = auth.currentUser;
  if (!user) throw new Error("認証が必要です");

  const ref = doc(db, "users", user.uid, "history", id);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    id: snapshot.id,
    query: data.query,
    response: data.response,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}
```

- [ ] **Step 2: Firestore セキュリティルールに読み取り許可を確認**

`firestore.rules` の `allow read` が以下になっていることを確認:

```
allow read: if request.auth != null && request.auth.uid == userId;
```

（Task 4 で設定済み）

- [ ] **Step 3: 履歴一覧画面を作成**

`app/(main)/history/index.tsx`:

```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getHistory, HistoryItem } from "../../../lib/api";

export default function HistoryListScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHistory();
      setItems(data);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 justify-center items-center px-8">
        <Text className="text-gray-500 text-center">
          検索履歴がありません。{"\n"}検索画面から質問してみましょう。
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerClassName="px-4 py-4"
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm"
          onPress={() => router.push(`/history/${item.id}`)}
        >
          <Text className="text-base font-semibold" numberOfLines={2}>
            {item.query}
          </Text>
          <Text className="text-sm text-gray-400 mt-2">
            {item.createdAt.toLocaleDateString("ja-JP")}
          </Text>
        </Pressable>
      )}
    />
  );
}
```

- [ ] **Step 4: 履歴詳細画面を作成**

`app/(main)/history/[id].tsx`:

```tsx
import { useEffect, useState } from "react";
import { ScrollView, View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getHistoryItem, HistoryItem } from "../../../lib/api";
import { ResultCard } from "../../../components/ResultCard";

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getHistoryItem(id)
      .then(setItem)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500">履歴が見つかりませんでした。</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-4">
      <ResultCard query={item.query} response={item.response} />
      <Text className="text-sm text-gray-400 text-center mt-4 mb-8">
        {item.createdAt.toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </ScrollView>
  );
}
```

- [ ] **Step 5: `@expo/vector-icons` のインストール確認**

```bash
npx expo install @expo/vector-icons @react-navigation/native
```

- [ ] **Step 6: 動作確認**

```bash
npx expo start --web
```

1. 検索画面で質問を送信
2. 履歴タブに切り替え → 検索した質問が一覧に表示されることを確認
3. 一覧をタップ → 詳細画面で回答カードが表示されることを確認

- [ ] **Step 7: コミット**

```bash
git add lib/api.ts app/\(main\)/history/
git commit -m "feat: add history list and detail screens with Firestore integration"
```

---

## Task 7: ログアウト機能 & 仕上げ

**Files:**
- Modify: `history-app/app/(main)/_layout.tsx`

- [ ] **Step 1: メインレイアウトにログアウトボタンを追加**

`app/(main)/_layout.tsx` を更新:

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Alert } from "react-native";
import { signOut } from "../../lib/auth";

export default function MainLayout() {
  const handleLogout = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <Pressable onPress={handleLogout} className="mr-4">
            <Ionicons name="log-out-outline" size={24} color="#666" />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "検索",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "履歴",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: 全画面通しで動作確認**

```bash
npx expo start --web
```

1. ログイン画面 → メール/パスワードでサインアップ・ログイン
2. 検索画面 → 質問を入力し回答カードが表示される
3. 履歴タブ → 検索履歴の一覧が表示される
4. 一覧タップ → 詳細画面で過去の回答が表示される
5. ログアウト → ログイン画面に戻る
6. Googleログインが動作する

- [ ] **Step 3: コミット**

```bash
git add .
git commit -m "feat: add logout button and finalize app navigation"
```

---

## Task 8: Cloud Functions デプロイ & CLAUDE.md 作成

**Files:**
- Create: `history-app/CLAUDE.md`

- [ ] **Step 1: Cloud Functions をデプロイ**

```bash
cd /Users/kazutoenomoto/workspace/apps/history-app
firebase deploy --only functions,firestore:rules
```

デプロイ完了後、Web 上でエンドツーエンド動作確認。

- [ ] **Step 2: CLAUDE.md を作成**

`CLAUDE.md`:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Dev server (web): `npx expo start --web`
- Dev server (iOS via Expo Go): `npx expo start`
- Cloud Functions local: `firebase emulators:start --only functions,firestore`
- Deploy functions: `firebase deploy --only functions`
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- iOS build: `eas build --platform ios`

## Architecture

Expo (React Native + Web) frontend → Firebase Cloud Functions (Gemini API proxy) → Firestore (history storage).

- Client never calls Gemini API directly. All AI calls go through `askAboutHistory` Cloud Function.
- Gemini API key is stored as a Firebase secret, accessible only from Cloud Functions.
- Firestore writes happen only in Cloud Functions. Client has read-only access to `users/{uid}/history`.
- Auth: Firebase Authentication (email/password + Google) via `expo-auth-session`.

## Key Patterns

- File-based routing via Expo Router: `(auth)` group for login, `(main)` group for authenticated screens.
- Auth guard in root `_layout.tsx` redirects based on `onAuthStateChanged`.
- NativeWind (Tailwind) for styling via `className` props.
- Environment variables prefixed with `EXPO_PUBLIC_` for client-side Firebase config.
```

- [ ] **Step 3: コミット**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project guidance"
```
