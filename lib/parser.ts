/**
 * Motor de cálculo de la calculadora.
 *
 * No usa eval(): la expresión se convierte en tokens y se evalúa con un
 * analizador descendente recursivo que respeta la prioridad de operaciones:
 *
 *   expresión  = término (("+" | "-") término)*
 *   término    = unario (("*" | "/") unario | multiplicación implícita)*
 *   unario     = ("-" | "+") unario | potencia
 *   potencia   = postfijo ("^" unario)?          (asociativa por la derecha)
 *   postfijo   = primario ("!" | "%")*
 *   primario   = número | constante | memoria (A–D) | función "(" expresión ")" | "(" expresión ")"
 *
 * Así, -2^2 = -4, 2^3^2 = 512, 2π = 6,28… y 3(4+1) = 15.
 */

export type AngleMode = "deg" | "rad";

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export class CalcError extends Error {}

/** Memorias de la calculadora (como STO/RCL en una Casio). Una memoria sin guardar vale 0. */
export const MEMORY_KEYS = ["A", "B", "C", "D"] as const;
export type MemoryKey = (typeof MEMORY_KEYS)[number];
export type Memory = Partial<Record<MemoryKey, number>>;

export function isMemoryKey(ch: string): ch is MemoryKey {
  return (MEMORY_KEYS as readonly string[]).includes(ch);
}

type Token =
  | { type: "num"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "post"; value: "!" | "%" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "const"; value: number }
  | { type: "func"; name: FuncName };

const FUNCTIONS = ["sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "sqrt"] as const;
type FuncName = (typeof FUNCTIONS)[number];

const CONSTANTS: Record<string, number> = { pi: Math.PI, "π": Math.PI, e: Math.E };

/** Símbolos visuales que se aceptan como equivalentes de los operadores ASCII. */
const SYMBOL_MAP: Record<string, string> = {
  "×": "*",
  "·": "*",
  "÷": "/",
  "−": "-",
  "√": "sqrt",
};

export function tokenize(input: string, memory: Memory = {}): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = input;

  while (i < src.length) {
    let ch = src[i];

    if (ch === " ") {
      i++;
      continue;
    }

    if (SYMBOL_MAP[ch]) {
      const mapped = SYMBOL_MAP[ch];
      if (mapped === "sqrt") {
        tokens.push({ type: "func", name: "sqrt" });
        i++;
        continue;
      }
      ch = mapped;
    }

    // Números: admite punto o coma como separador decimal.
    if (/[0-9.,]/.test(ch)) {
      let raw = "";
      while (i < src.length && /[0-9.,]/.test(src[i])) {
        raw += src[i] === "," ? "." : src[i];
        i++;
      }
      if ((raw.match(/\./g) ?? []).length > 1 || raw === ".") {
        throw new CalcError("Número mal escrito");
      }
      const prev = tokens[tokens.length - 1];
      if (prev && prev.type === "num") {
        throw new CalcError("Falta un operador entre dos números");
      }
      tokens.push({ type: "num", value: parseFloat(raw) });
      continue;
    }

    if ("+-*/^".includes(ch)) {
      tokens.push({ type: "op", value: ch as "+" | "-" | "*" | "/" | "^" });
      i++;
      continue;
    }

    if (ch === "!" || ch === "%") {
      tokens.push({ type: "post", value: ch });
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }

    if (ch === "π") {
      tokens.push({ type: "const", value: Math.PI });
      i++;
      continue;
    }

    // Memorias A–D: siempre en mayúscula, para no confundirlas con "e" ni con funciones.
    if (isMemoryKey(ch)) {
      tokens.push({ type: "const", value: memory[ch] ?? 0 });
      i++;
      continue;
    }

    // Nombres de funciones y constantes.
    if (/[a-zA-Z]/.test(ch)) {
      let word = "";
      while (i < src.length && /[a-zA-Z]/.test(src[i]) && !isMemoryKey(src[i])) {
        word += src[i].toLowerCase();
        i++;
      }
      if ((FUNCTIONS as readonly string[]).includes(word)) {
        tokens.push({ type: "func", name: word as FuncName });
      } else if (Object.hasOwn(CONSTANTS, word)) {
        tokens.push({ type: "const", value: CONSTANTS[word] });
      } else {
        throw new CalcError(`Función desconocida: ${word}`);
      }
      continue;
    }

    throw new CalcError(`Carácter no válido: ${ch}`);
  }

  return tokens;
}

/** Valores de trigonometría tan pequeños son ruido de coma flotante: sin(π) → 0. */
const TRIG_EPSILON = 1e-14;

function snapTrig(x: number): number {
  return Math.abs(x) < TRIG_EPSILON ? 0 : x;
}

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new CalcError("El factorial solo admite enteros no negativos");
  }
  if (n > 170) throw new CalcError("Número demasiado grande");
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

function applyFunction(name: FuncName, x: number, mode: AngleMode): number {
  const toRad = (v: number) => (mode === "deg" ? (v * Math.PI) / 180 : v);
  const fromRad = (v: number) => (mode === "deg" ? (v * 180) / Math.PI : v);

  switch (name) {
    case "sin":
      return snapTrig(Math.sin(toRad(x)));
    case "cos":
      return snapTrig(Math.cos(toRad(x)));
    case "tan": {
      // La tangente no existe en 90°, 270°… (o π/2, 3π/2… en radianes).
      const deg = mode === "deg" ? x : (x * 180) / Math.PI;
      const rest = Math.abs(deg % 180);
      if (Math.abs(rest - 90) < 1e-9) throw new CalcError("Resultado no definido");
      return snapTrig(Math.tan(toRad(x)));
    }
    case "asin":
      if (x < -1 || x > 1) throw new CalcError("Fuera de dominio");
      return fromRad(Math.asin(x));
    case "acos":
      if (x < -1 || x > 1) throw new CalcError("Fuera de dominio");
      return fromRad(Math.acos(x));
    case "atan":
      return fromRad(Math.atan(x));
    case "ln":
      if (x <= 0) throw new CalcError("Fuera de dominio");
      return Math.log(x);
    case "log":
      if (x <= 0) throw new CalcError("Fuera de dominio");
      return Math.log10(x);
    case "sqrt":
      if (x < 0) throw new CalcError("Raíz de número negativo");
      return Math.sqrt(x);
  }
}

class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly mode: AngleMode,
  ) {}

  parse(): number {
    if (this.tokens.length === 0) throw new CalcError("Expresión vacía");
    const value = this.expression();
    if (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (t.type === "rparen") throw new CalcError("Paréntesis de cierre de más");
      throw new CalcError("Expresión incompleta o mal formada");
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private expression(): number {
    let value = this.term();
    for (;;) {
      const t = this.peek();
      if (t?.type === "op" && (t.value === "+" || t.value === "-")) {
        this.pos++;
        const rhs = this.term();
        value = t.value === "+" ? value + rhs : value - rhs;
      } else {
        return value;
      }
    }
  }

  private startsOperand(t: Token | undefined): boolean {
    return (
      t !== undefined &&
      (t.type === "num" || t.type === "const" || t.type === "func" || t.type === "lparen")
    );
  }

  private term(): number {
    let value = this.unary();
    for (;;) {
      const t = this.peek();
      if (t?.type === "op" && (t.value === "*" || t.value === "/")) {
        this.pos++;
        const rhs = this.unary();
        if (t.value === "/") {
          if (rhs === 0) throw new CalcError("División entre cero");
          value = value / rhs;
        } else {
          value = value * rhs;
        }
      } else if (this.startsOperand(t)) {
        // Multiplicación implícita: 2π, 3(4+1), (2)(3), 2sin(30)…
        value = value * this.unary();
      } else {
        return value;
      }
    }
  }

  private unary(): number {
    const t = this.peek();
    if (t?.type === "op" && (t.value === "-" || t.value === "+")) {
      this.pos++;
      const v = this.unary();
      return t.value === "-" ? -v : v;
    }
    return this.power();
  }

  private power(): number {
    const base = this.postfix();
    const t = this.peek();
    if (t?.type === "op" && t.value === "^") {
      this.pos++;
      const exp = this.unary(); // admite 2^-1 y es asociativa por la derecha
      if (base === 0 && exp < 0) throw new CalcError("División entre cero");
      const r = Math.pow(base, exp);
      if (Number.isNaN(r)) throw new CalcError("Resultado no real");
      return r;
    }
    return base;
  }

  private postfix(): number {
    let value = this.primary();
    for (;;) {
      const t = this.peek();
      if (t?.type !== "post") return value;
      this.pos++;
      value = t.value === "!" ? factorial(value) : value / 100;
    }
  }

  private primary(): number {
    const t = this.next();
    if (!t) throw new CalcError("Expresión incompleta");

    switch (t.type) {
      case "num":
      case "const":
        return t.value;
      case "lparen": {
        const v = this.expression();
        const close = this.next();
        if (close?.type !== "rparen") throw new CalcError("Paréntesis sin cerrar");
        return v;
      }
      case "func": {
        // Admite sin(30) y también sin 30 o √9 sin paréntesis.
        const arg = this.peek()?.type === "lparen" ? this.primary() : this.power();
        return applyFunction(t.name, arg, this.mode);
      }
      case "rparen":
        throw new CalcError("Paréntesis vacío o mal colocado");
      default:
        throw new CalcError("Falta un número");
    }
  }
}

/** Redondea a 12 cifras significativas para quitar ruido: 0,1 + 0,2 → 0,3. */
export function cleanFloat(x: number): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  return parseFloat(x.toPrecision(12));
}

/** Cuenta los paréntesis que quedan abiertos al final de la expresión. */
export function missingParens(expr: string): number {
  let depth = 0;
  for (const ch of expr) {
    if (ch === "(") depth++;
    else if (ch === ")" && depth > 0) depth--;
  }
  return depth;
}

export function evaluate(
  expr: string,
  mode: AngleMode = "deg",
  options: { autoClose?: boolean; memory?: Memory } = {},
): EvalResult {
  try {
    const source = options.autoClose ? expr + ")".repeat(missingParens(expr)) : expr;
    const value = new Parser(tokenize(source, options.memory), mode).parse();
    if (!Number.isFinite(value)) throw new CalcError("Número demasiado grande");
    const clean = cleanFloat(value);
    return { ok: true, value: Object.is(clean, -0) ? 0 : clean };
  } catch (err) {
    if (err instanceof CalcError) return { ok: false, error: err.message };
    return { ok: false, error: "Error inesperado" };
  }
}
