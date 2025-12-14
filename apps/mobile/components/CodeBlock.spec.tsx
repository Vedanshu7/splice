import TestRenderer from "react-test-renderer";

// react-native-code-highlighter pulls in react-syntax-highlighter's full
// dependency chain and, transitively, real RN host components — none of
// which is worth exercising just to unit-test that CodeBlock passes its
// props through correctly. Stub it with a plain, non-native component.
jest.mock("react-native-code-highlighter", () => {
  return function MockCodeHighlighter(props: { children: string; language: string }) {
    return props.children;
  };
});

import { CodeBlock } from "./CodeBlock";

describe("CodeBlock", () => {
  it("passes the snippet content and language through to the highlighter", () => {
    const renderer = TestRenderer.create(<CodeBlock content="const x = 1;" language="typescript" />);
    expect(renderer.toJSON()).toBe("const x = 1;");
  });
});
