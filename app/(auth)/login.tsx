import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { signInWithEmail, signUpWithEmail, useGoogleAuth } from "../../lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle, request } = useGoogleAuth();

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert("エラー", "メールアドレスとパスワードを入力してください。");
      return;
    }
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      Alert.alert("エラー", toJapaneseError(error.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert("エラー", toJapaneseError(error.code));
    } finally {
      setIsLoading(false);
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
        editable={!isLoading}
      />

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isLoading}
      />

      <Pressable
        className={`rounded-lg py-3 mb-4 ${isLoading ? "bg-gray-400" : "bg-blue-600"}`}
        onPress={handleEmailAuth}
        disabled={isLoading}
      >
        <Text className="text-white text-center font-semibold text-lg">
          {isLoading ? "..." : isSignUp ? "アカウント作成" : "ログイン"}
        </Text>
      </Pressable>

      <Pressable
        className="bg-white border border-gray-300 rounded-lg py-3 mb-6"
        onPress={handleGoogleAuth}
        disabled={!request || isLoading}
      >
        <Text className="text-center font-semibold text-lg">
          Googleでログイン
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsSignUp(!isSignUp)} disabled={isLoading}>
        <Text className="text-blue-600 text-center">
          {isSignUp
            ? "アカウントをお持ちの方はこちら"
            : "アカウントを作成する"}
        </Text>
      </Pressable>
    </View>
  );
}

function toJapaneseError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "このメールアドレスはすでに使用されています。";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが正しくありません。";
    case "auth/user-not-found":
      return "このメールアドレスのアカウントが見つかりません。";
    case "auth/weak-password":
      return "パスワードは6文字以上にしてください。";
    case "auth/too-many-requests":
      return "ログイン試行回数が多すぎます。しばらくしてからお試しください。";
    default:
      return "エラーが発生しました。再試行してください。";
  }
}
