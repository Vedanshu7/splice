import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
  }

  return (
    <View className="flex-1 justify-center bg-[#0b0d13] p-6">
      <Text className="mb-6 text-[22px] font-semibold text-[#eeffff]">Sign in to Splice</Text>
      <TextInput
        className="mb-3 rounded-lg border border-[#2a2f3a] p-3 text-[#eeffff]"
        placeholder="Email"
        placeholderTextColor="#546e7a"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="mb-3 rounded-lg border border-[#2a2f3a] p-3 text-[#eeffff]"
        placeholder="Password"
        placeholderTextColor="#546e7a"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text className="mb-3 text-[#ff5370]">{error}</Text>}
      <Pressable
        className="items-center rounded-lg bg-[#7c4dff] p-3.5"
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text className="font-semibold text-white">{loading ? "Signing in..." : "Sign in"}</Text>
      </Pressable>
    </View>
  );
}
