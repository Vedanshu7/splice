import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { Snippet } from "@splice/shared";
import { api } from "@/lib/api";
import { CodeBlock } from "@/components/CodeBlock";

export default function SharedSnippetScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.snippets
      .getShared(slug)
      .then(setSnippet)
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>This shared snippet doesn't exist or was removed.</Text>
      </View>
    );
  }

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
      <Text style={styles.sharedBy}>Shared via Splice</Text>
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
  sharedBy: { color: "#546e7a", textAlign: "center", marginTop: 16, fontSize: 12 },
});
