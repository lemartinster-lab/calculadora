import { evaluate, missingParens, type AngleMode } from "@/lib/parser";
import { formatNumber, prettyExpr } from "@/lib/format";

interface DisplayProps {
  expr: string;
  lastExpr: string;
  justEvaluated: boolean;
  error: string | null;
  angle: AngleMode;
}

export function Display({ expr, lastExpr, justEvaluated, error, angle }: DisplayProps) {
  const ghost = ")".repeat(missingParens(expr));

  // Vista previa en vivo: solo si la expresión ya da un resultado y no es un número suelto.
  let preview = "";
  if (!justEvaluated && !error && /[^0-9.]/.test(expr)) {
    const r = evaluate(expr, angle, { autoClose: true });
    if (r.ok) preview = formatNumber(r.value);
  }

  const topLine = justEvaluated ? `${prettyExpr(lastExpr)} =` : "";
  const mainValue = justEvaluated ? formatNumber(Number(expr)) : null;

  return (
    <div
      className="flex min-h-36 flex-col justify-end gap-1 rounded-2xl bg-slate-950/60 px-5 py-4 text-right"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs font-medium tracking-wide text-slate-500">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
          {angle === "deg" ? "DEG" : "RAD"}
        </span>
        <span className="truncate pl-4 text-sm">{topLine}</span>
      </div>

      {mainValue !== null ? (
        <output className="break-all text-5xl font-light text-white">{mainValue}</output>
      ) : (
        <>
          <div className="min-h-12 break-all text-4xl font-light text-white">
            {expr === "" ? <span className="text-slate-600">0</span> : prettyExpr(expr)}
            <span className="text-slate-600">{ghost}</span>
          </div>
          <div className={`min-h-7 text-xl ${error ? "text-rose-400" : "text-slate-400"}`}>
            {error ?? (preview ? `= ${preview}` : "")}
          </div>
        </>
      )}
    </div>
  );
}
