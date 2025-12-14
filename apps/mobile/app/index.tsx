import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import type { Snippet } from "@splice/shared";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function BrowseScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  const load = useCallback(async () => {
    try {
      setSnippets(await api.snippets.list());
    } catch {
      // not authed yet or API unreachable; list stays empty
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function runSearch() {
    if (!query.trim()) return load();
    const results = await api.search.query(query, "semantic");
    setSnippets(results.map((r) => r.snippet));
  }

  if (isLoading || !user) return null;

  return (
    <View className="flex-1 bg-[#0b0d13] p-4">
      <TextInput
        className="mb-4 rounded-lg border border-[#2a2f3a] p-3 text-[#eeffff]"
        placeholder="Search snippets (try natural language)..."
        placeholderTextColor="#546e7a"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={runSearch}
      />
      <FlatList
        data={snippets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 90 }}
        ListEmptyComponent={<Text className="mt-10 text-center text-[#546e7a]">No snippets yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            className="rounded-xl bg-[#171a23] p-3.5"
            onPress={() => router.push(`/snippet/${item.id}`)}
          >
            <Text className="text-[15px] font-semibold text-[#eeffff]">{item.title}</Text>
            <Text className="mt-1 text-[13px] text-[#8a92a3]" numberOfLines={2}>
              {item.aiSummary || item.content.slice(0, 100)}
            </Text>
          </Pressable>
        )}
      />
      <Pressable
        className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#7c4dff]"
        onPress={() => router.push("/snippet/new")}
      >
        <Text className="text-[28px] leading-[30px] text-white">+</Text>
      </Pressable>
    </View>
  );
}
