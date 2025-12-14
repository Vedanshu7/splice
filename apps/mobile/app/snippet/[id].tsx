import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { Snippet } from "@splice/shared";
import { api } from "@/lib/api";
import { CodeBlock } from "@/components/CodeBlock";

export default function SnippetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [snippet, setSnippet] = useState<Snippet | null>(null);

  useEffect(() => {
    api.snippets.get(id).then(setSnippet);
  }, [id]);

  if (!snippet) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{snippet.title}</Text>
      <Text style={styles.language}>{snippet.language}</Text>
      {snippet.aiSummary && <Text style={styles.summary}>{snippet.aiSummary}</Text>}
      <CodeBlock content={snippet.content} language={snippet.language} />
      {snippet.tags.length > 0 && (
        <View style={styles.tags}>
          {snippet.tags.map((tag) => (
            <View key={tag.id} style={styles.tag}>
              <Text style={styles.tagText}>{tag.name}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d13" },
  loading: { color: "#8a92a3", padding: 16 },
  title: { color: "#eeffff", fontSize: 20, fontWeight: "700" },
  language: { color: "#8a92a3", marginTop: 2, marginBottom: 10 },
  summary: {
    color: "#8a92a3",
    backgroundColor: "#171a23",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: { backgroundColor: "#171a23", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: "#8a92a3", fontSize: 12 },
});
