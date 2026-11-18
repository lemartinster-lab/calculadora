/**
 * Estado de la calculadora como función pura (reducer), separada de React
 * para poder probarla con tests.
 */
import { evaluate, missingParens, type AngleMode } from "./parser";
import { numberToExpr } from "./format";
import { appendDecimal, appendOperator, backspace, toggleSign } from "./input";

export interface HistoryItem {
  expr: string;
  result: number;
}

export interface CalcState {
  expr: string;
  /** true justo después de pulsar "=": la siguiente cifra empieza de cero. */
  justEvaluated: boolean;
  lastExpr: string;
  error: string | null;
  angle: AngleMode;
  history: HistoryItem[];
}

export type CalcAction =
  | { type: "digit"; value: string }
  | { type: "decimal" }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "postfix"; value: "!" | "%" | "^2" | "^(-1)" }
  | { type: "insert"; value: string } // funciones, constantes, "("
  | { type: "closeParen" }
  | { type: "sign" }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "equals" }
  | { type: "toggleAngle" }
  | { type: "useHistory"; value: number }
  | { type: "clearHistory" }
  | { type: "loadHistory"; value: HistoryItem[] }
  | { type: "setAngle"; value: AngleMode };

export const HISTORY_LIMIT = 20;

export const initialState: CalcState = {
  expr: "",
  justEvaluated: false,
  lastExpr: "",
  error: null,
  angle: "deg",
  history: [],
};

/** ¿Termina la expresión en algo sobre lo que se puede operar? (número, constante, ")", "!"…) */
export function endsWithOperand(expr: string): boolean {
  return /[0-9.)!%πe]$/.test(expr);
}

export function calcReducer(state: CalcState, action: CalcAction): CalcState {
  // Tras "=", escribir algo nuevo empieza otra expresión; operar continúa con el resultado.
  const fresh = state.justEvaluated;
  const base = { ...state, error: null, justEvaluated: false };

  switch (action.type) {
    case "digit":
      return { ...base, expr: (fresh ? "" : state.expr) + action.value };

    case "decimal":
      return { ...base, expr: appendDecimal(fresh ? "" : state.expr) };

    case "insert":
      return { ...base, expr: (fresh ? "" : state.expr) + action.value };

    case "operator":
      return { ...base, expr: appendOperator(state.expr, action.value) };

    case "postfix":
      if (!endsWithOperand(state.expr)) return { ...state, error: null };
      return { ...base, expr: state.expr + action.value };

    case "closeParen":
      if (missingParens(state.expr) === 0 || !endsWithOperand(state.expr)) {
        return { ...state, error: null };
      }
      return { ...base, expr: state.expr + ")" };

    case "sign":
      return { ...base, expr: toggleSign(state.expr) };

    case "backspace":
      return { ...base, expr: fresh ? "" : backspace(state.expr) };

    case "clear":
      return { ...base, expr: "", lastExpr: "" };

    case "equals": {
      if (state.expr === "" || fresh) return state;
      const r = evaluate(state.expr, state.angle, { autoClose: true });
      if (!r.ok) return { ...state, error: r.error };
      const closed = state.expr + ")".repeat(missingParens(state.expr));
      const history = [{ expr: closed, result: r.value }, ...state.history].slice(0, HISTORY_LIMIT);
      return {
        ...base,
        expr: numberToExpr(r.value),
        lastExpr: closed,
        justEvaluated: true,
        history,
      };
    }

    case "toggleAngle":
      return { ...state, angle: state.angle === "deg" ? "rad" : "deg" };

    case "setAngle":
      return { ...state, angle: action.value };

    case "useHistory": {
      const n = numberToExpr(action.value);
      const wrapped = action.value < 0 ? `(${n})` : n;
      // Si se puede encadenar con lo que hay, se añade; si no, sustituye.
      const expr = fresh || state.expr === "" || endsWithOperand(state.expr)
        ? wrapped
        : state.expr + wrapped;
      return { ...base, expr };
    }

    case "clearHistory":
      return { ...state, history: [] };

    case "loadHistory":
      return { ...state, history: action.value.slice(0, HISTORY_LIMIT) };
  }
}
