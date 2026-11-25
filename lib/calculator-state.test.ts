import { describe, expect, it } from "vitest";
import { calcReducer, initialState, type CalcAction, type CalcState } from "./calculator-state";

const run = (actions: CalcAction[], start: CalcState = initialState) =>
  actions.reduce(calcReducer, start);

const digits = (s: string): CalcAction[] => [...s].map((value) => ({ type: "digit", value }));

describe("flujo de la calculadora", () => {
  it("calcula y guarda en el historial", () => {
    const s = run([...digits("12"), { type: "operator", value: "+" }, ...digits("30"), { type: "equals" }]);
    expect(s.expr).toBe("42");
    expect(s.lastExpr).toBe("12+30");
    expect(s.justEvaluated).toBe(true);
    expect(s.history[0]).toEqual({ expr: "12+30", result: 42 });
  });

  it("tras = una cifra empieza de cero y un operador continúa", () => {
    const after = run([...digits("6"), { type: "operator", value: "*" }, ...digits("7"), { type: "equals" }]);
    expect(run([{ type: "digit", value: "5" }], after).expr).toBe("5");
    expect(run([{ type: "operator", value: "+" }, { type: "digit", value: "1" }], after).expr).toBe("42+1");
  });

  it("cierra paréntesis automáticamente al pulsar =", () => {
    const s = run([{ type: "insert", value: "sqrt(" }, ...digits("81"), { type: "equals" }]);
    expect(s.expr).toBe("9");
    expect(s.lastExpr).toBe("sqrt(81)");
  });

  it("muestra el error y conserva la expresión", () => {
    const s = run([...digits("5"), { type: "operator", value: "/" }, ...digits("0"), { type: "equals" }]);
    expect(s.error).toBe("División entre cero");
    expect(s.expr).toBe("5/0");
    expect(s.history).toHaveLength(0);
    // Al seguir escribiendo, el error desaparece.
    expect(run([{ type: "backspace" }], s).error).toBeNull();
  });

  it("respeta el modo de ángulo", () => {
    const deg = run([{ type: "insert", value: "sin(" }, ...digits("90"), { type: "equals" }]);
    expect(deg.expr).toBe("1");
    const rad = run([{ type: "toggleAngle" }, { type: "insert", value: "cos(" }, ...digits("0"), { type: "equals" }]);
    expect(rad.angle).toBe("rad");
    expect(rad.expr).toBe("1");
  });

  it("x² y factorial solo tras un número", () => {
    expect(run([{ type: "postfix", value: "^2" }]).expr).toBe("");
    expect(run([...digits("4"), { type: "postfix", value: "^2" }, { type: "equals" }]).expr).toBe("16");
    expect(run([...digits("4"), { type: "postfix", value: "!" }, { type: "equals" }]).expr).toBe("24");
  });

  it("no cierra un paréntesis que no está abierto", () => {
    expect(run([...digits("2"), { type: "closeParen" }]).expr).toBe("2");
  });

  it("reutiliza un resultado negativo del historial entre paréntesis", () => {
    const s = run([...digits("3"), { type: "operator", value: "*" }, { type: "useHistory", value: -2 }]);
    expect(s.expr).toBe("3*(-2)");
  });

  it("limita el historial a 20 entradas", () => {
    let s = initialState;
    for (let i = 0; i < 25; i++) {
      s = run([{ type: "clear" }, ...digits(String(i)), { type: "operator", value: "+" }, ...digits("1"), { type: "equals" }], s);
    }
    expect(s.history).toHaveLength(20);
    expect(s.history[0].result).toBe(25);
  });
});

describe("memorias A–D", () => {
  const sto: CalcAction = { type: "storeArm" };
  const mem = (key: "A" | "B" | "C" | "D"): CalcAction => ({ type: "memory", key });

  it("STO + letra guarda el resultado ya calculado", () => {
    const s = run([...digits("6"), { type: "operator", value: "*" }, ...digits("7"), { type: "equals" }, sto, mem("A")]);
    expect(s.memory.A).toBe(42);
    expect(s.storeArmed).toBe(false);
  });

  it("STO sin pulsar = calcula primero la expresión", () => {
    const s = run([...digits("10"), { type: "operator", value: "/" }, ...digits("4"), sto, mem("B")]);
    expect(s.memory.B).toBe(2.5);
    expect(s.expr).toBe("2.5");
    expect(s.history[0]).toEqual({ expr: "10/4", result: 2.5 });
  });

  it("sin STO, la letra se inserta y se usa en el cálculo", () => {
    const stored = run([...digits("5"), sto, mem("C")]);
    const s = run([...digits("2"), mem("C"), { type: "operator", value: "+" }, ...digits("1"), { type: "equals" }], stored);
    expect(s.expr).toBe("11");
  });

  it("STO no guarda si la expresión tiene error", () => {
    const s = run([...digits("1"), { type: "operator", value: "/" }, ...digits("0"), sto, mem("A")]);
    expect(s.memory.A).toBeUndefined();
    expect(s.error).toBe("División entre cero");
    expect(s.storeArmed).toBe(false);
  });

  it("otra tecla cancela STO, AC no borra memorias y Borrar memorias sí", () => {
    const armed = run([...digits("3"), sto, { type: "operator", value: "+" }]);
    expect(armed.storeArmed).toBe(false);
    const stored = run([sto, mem("D"), { type: "clear" }], run([...digits("9")]));
    expect(stored.memory.D).toBe(9);
    expect(run([{ type: "clearMemory" }], stored).memory).toEqual({});
  });
});
