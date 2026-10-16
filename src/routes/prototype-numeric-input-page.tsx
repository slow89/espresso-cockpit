// PROTOTYPE — throwaway route. Three variants of numeric entry for the profile Step editor,
// switchable via `?variant=` on `/prototype/numeric-input`.
// Wayfinder ticket: .scratch/profile-editor/issues/05-numeric-input-on-tablet.md
import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { initialStepDraft, type StepDraft } from "@/components/prototype/numeric-input/fields";
import { PrototypeSwitcher } from "@/components/prototype/numeric-input/prototype-switcher";
import { StateReadout, StepNameRow } from "@/components/prototype/numeric-input/shared";
import {
  VariantASteppers,
  variantAName,
} from "@/components/prototype/numeric-input/variant-a-steppers";
import {
  VariantBKeypad,
  variantBName,
} from "@/components/prototype/numeric-input/variant-b-keypad";
import {
  VariantCScrubber,
  variantCName,
} from "@/components/prototype/numeric-input/variant-c-scrubber";

const variants = [
  { key: "A", name: variantAName },
  { key: "B", name: variantBName },
  { key: "C", name: variantCName },
] as const;

export function PrototypeNumericInputPage() {
  const { variant } = useSearch({ from: "/prototype/numeric-input" });
  const navigate = useNavigate();
  // Editable draft owned by the prototype; in the real editor this is the Profile Draft store.
  const [draft, setDraft] = useState<StepDraft>(initialStepDraft);
  const [stepName, setStepName] = useState("Pressure rise");

  return (
    <div className="app-shell flex flex-col overflow-hidden border-b border-border/30 bg-shell">
      <StepNameRow onStepName={setStepName} stepName={stepName} />
      <div className="min-h-0 flex-1">
        {variant === "A" && <VariantASteppers draft={draft} onChange={setDraft} />}
        {variant === "B" && <VariantBKeypad draft={draft} onChange={setDraft} />}
        {variant === "C" && <VariantCScrubber draft={draft} onChange={setDraft} />}
      </div>
      <StateReadout draft={draft} />
      <PrototypeSwitcher
        current={variant}
        onChange={(key) =>
          navigate({
            to: "/prototype/numeric-input",
            search: { variant: key as "A" | "B" | "C" },
            replace: true,
          })
        }
        variants={variants}
      />
    </div>
  );
}
