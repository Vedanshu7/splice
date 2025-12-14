import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";

export default function NewSnippetScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const snippet = await api.snippets.create({ title, content, language });
      router.replace(`/snippet/${snippet.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor="#546e7a"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Language"
        placeholderTextColor="#546e7a"
        value={language}
        onChangeText={setLanguage}
      />
      <TextInput
        style={[styles.input, styles.code]}
        placeholder="Paste your snippet..."
        placeholderTextColor="#546e7a"
        multiline
        value={content}
        onChangeText={setContent}
      />
      <Pressable
        style={[styles.button, (!title || !content) && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving || !title || !content}
      >
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save snippet"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d13", padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#2a2f3a",
    borderRadius: 8,
    padding: 12,
    color: "#eeffff",
    marginBottom: 12,
  },
  code: { minHeight: 220, fontFamily: "Menlo, monospace", textAlignVertical: "top" },
  button: { backgroundColor: "#7c4dff", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
