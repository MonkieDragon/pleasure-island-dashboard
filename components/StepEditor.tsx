import { PuzzleStep } from "@/types/database";

type Props = {
  steps: PuzzleStep[];
  selectedStepId: string | null;

  onSelectStep: (id: string) => void;
  onUpdateStep: (step: PuzzleStep) => void;
};

export default function StepEditor({
  steps,
  selectedStepId,
  onSelectStep,
}: Props) {
  return (
    <div style={{ width: 300, borderLeft: "1px solid #ccc", padding: 8 }}>
      <h3>Steps</h3>

      {steps.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelectStep(s.id)}
          style={{
            padding: 8,
            cursor: "pointer",
            background: selectedStepId === s.id ? "#eee" : "transparent",
          }}
        >
          <div>{s.type}</div>
          <div>{s.content}</div>
        </div>
      ))}
    </div>
  );
}
