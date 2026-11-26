// @vitest-environment node
import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import plugin from "./local-plugin.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("props-interface", plugin.rules["props-interface"], {
  valid: [
    "interface BadgeProps { tone: string }\nfunction Badge({ tone }: BadgeProps) { return tone; }",
    "interface PanelProps<T> { value: T }\nconst Panel = <T,>({ value }: PanelProps<T>) => value;",
    "function formatLabel({ label }: { label: string }) { return label; }",
    "const getStatus = ({ ok }: { ok: boolean }) => ok;",
    "type Tone = { name: string };",
    "interface ButtonProps extends React.ComponentProps<'button'> { tone: string }",
    "function Panel({ value }: PanelProps<{ id: string }>) { return value; }",
    "const Badge: FC<BadgeProps> = ({ tone }) => tone;",
    "const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => null);",
    "const Badge = memo(BadgeImpl, (prev: { tone: string }, next: { tone: string }) => prev.tone === next.tone);",
  ],
  invalid: [
    {
      code: "function Badge({ tone }: { tone: string }) { return tone; }",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "const Badge = ({ tone }: { tone: string }) => tone;",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "const Badge = memo(function ({ tone }: { tone: string }) { return tone; });",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "function Badge(props: React.ComponentProps<'div'> & { tone: string }) { return props; }",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "function Badge({ tone } : Readonly<{ tone: string }> = { tone: 'x' }) { return tone; }",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "vi.mock('x', () => ({ Link: ({ to }: { to: string }) => to }));",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "const Badge: React.FC<{ tone: string }> = ({ tone }) => tone;",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "const Input = forwardRef<HTMLInputElement, { tone: string }>((props, ref) => null);",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "const Input = memo(forwardRef<HTMLInputElement, { tone: string }>((props, ref) => null));",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "const Badge = memo<{ tone: string }>((props) => null);",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "function Card({ children }: PropsWithChildren<{ tone: string }>) { return children; }",
      errors: [{ messageId: "inlineProps" }],
    },
    {
      code: "type BadgeProps = { tone: string };",
      errors: [{ messageId: "propsAlias" }],
    },
  ],
});
