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
