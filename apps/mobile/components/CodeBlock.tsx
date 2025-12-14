import CodeHighlighter from "react-native-code-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

/** Syntax-highlighted, horizontally-scrollable code view for a snippet's content. */
export function CodeBlock({ content, language }: { content: string; language: string }) {
  return (
    <CodeHighlighter
      hljsStyle={atomOneDark}
      language={language}
      customStyle={{ backgroundColor: "#0f111a", borderRadius: 8, padding: 12 }}
      textStyle={{ fontFamily: "Menlo, monospace", fontSize: 13, lineHeight: 20 }}
      scrollViewProps={{ horizontal: true }}
    >
      {content}
    </CodeHighlighter>
  );
}
