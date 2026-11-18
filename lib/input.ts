/**
 * Reglas de edición de la expresión mientras se pulsan teclas.
 * La expresión interna usa ASCII: 2*(3+sqrt(4))/5
 */

const FUNC_TOKENS = ["asin(", "acos(", "atan(", "sin(", "cos(", "tan(", "sqrt(", "log(", "ln("];
const BINARY_OPS = ["+", "-", "*", "/", "^"];

/** Borra el último elemento; las funciones se borran enteras (sin( de golpe). */
export function backspace(expr: string): string {
  for (const f of FUNC_TOKENS) {
    if (expr.endsWith(f)) return expr.slice(0, -f.length);
  }
  return expr.slice(0, -1);
}

/** Añade un operador binario; si ya había uno al final, lo sustituye. */
export function appendOperator(expr: string, op: string): string {
  const last = expr.slice(-1);
  if (expr === "") {
    // Solo tiene sentido empezar con un signo menos.
    return op === "-" ? "-" : expr;
  }
  if (BINARY_OPS.includes(last)) {
    // Permite 2*-3 y 2^-1, pero cambia 2+ por 2*
    if (op === "-" && (last === "*" || last === "/" || last === "^")) return expr + op;
    const trimmed = expr.slice(0, -1);
    // Si había "*-" y se pulsa otro operador, se quitan ambos.
    if (BINARY_OPS.includes(trimmed.slice(-1))) return trimmed.slice(0, -1) + op;
    return trimmed === "" ? (op === "-" ? "-" : "") : trimmed + op;
  }
  if (last === "(") {
    return op === "-" ? expr + op : expr;
  }
  return expr + op;
}

/** Añade el separador decimal solo si el número actual aún no tiene uno. */
export function appendDecimal(expr: string): string {
  const match = expr.match(/[0-9.]*$/);
  const current = match ? match[0] : "";
  if (current.includes(".")) return expr;
  return expr + (current === "" ? "0." : ".");
}

/** Cambia el signo del último número: 5 → (-5 y (-5 → 5 */
export function toggleSign(expr: string): string {
  const neg = expr.match(/\(-([0-9.]+)$/);
  if (neg) return expr.slice(0, -neg[0].length) + neg[1];
  const num = expr.match(/[0-9.]+$/);
  if (num) return expr.slice(0, -num[0].length) + "(-" + num[0];
  return expr;
}
