export function Stepper({ step, total = 2 }: { step: number; total?: number }) {
  return (
    <div className="flex items-center gap-2 w-full max-w-xl mx-auto mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="stepper-track flex-1">
          <div
            className="stepper-fill"
            style={{ width: i + 1 <= step ? "100%" : "0%" }}
          />
        </div>
      ))}
    </div>
  );
}
