import { describe, expect, it } from "vitest";
import { evaluate, missingParens, tokenize } from "./parser";
import { formatNumber, numberToExpr, prettyExpr } from "./format";
import { appendDecimal, appendOperator, backspace, toggleSign } from "./input";

const val = (expr: string, mode: "deg" | "rad" = "deg") => {
  const r = evaluate(expr, mode);
  if (!r.ok) throw new Error(`"${expr}" dio error: ${r.error}`);
  return r.value;
};
const err = (expr: string, mode: "deg" | "rad" = "deg") => {
  const r = evaluate(expr, mode);
  if (r.ok) throw new Error(`"${expr}" debía fallar y dio ${r.value}`);
  return r.error;
};

describe("aritmética básica", () => {
  it("suma, resta, multiplica y divide", () => {
    expect(val("2+3")).toBe(5);
    expect(val("10-4")).toBe(6);
    expect(val("6*7")).toBe(42);
    expect(val("9/4")).toBe(2.25);
  });

  it("respeta la prioridad de operaciones", () => {
    expect(val("2+3*4")).toBe(14);
    expect(val("(2+3)*4")).toBe(20);
    expect(val("10-2-3")).toBe(5);
    expect(val("100/10/2")).toBe(5);
  });

  it("corrige el ruido de coma flotante", () => {
    expect(val("0.1+0.2")).toBe(0.3);
    expect(val("1.1*3")).toBe(3.3);
  });

  it("acepta coma decimal y símbolos visuales", () => {
    expect(val("1,5+1,5")).toBe(3);
    expect(val("6×2÷3−1")).toBe(3);
  });

  it("maneja el signo menos unario", () => {
    expect(val("-5+3")).toBe(-2);
    expect(val("2*-3")).toBe(-6);
    expect(val("--4")).toBe(4);
    expect(val("(-5)")).toBe(-5);
  });

  it("calcula porcentajes como /100", () => {
    expect(val("50%")).toBe(0.5);
    expect(val("200*15%")).toBe(30);
  });
});

describe("potencias y factorial", () => {
  it("potencias, asociativas por la derecha", () => {
    expect(val("2^10")).toBe(1024);
    expect(val("2^3^2")).toBe(512);
    expect(val("-2^2")).toBe(-4);
    expect(val("(-2)^2")).toBe(4);
    expect(val("2^-1")).toBe(0.5);
  });

  it("factorial", () => {
    expect(val("5!")).toBe(120);
    expect(val("0!")).toBe(1);
    expect(val("3!+1")).toBe(7);
    expect(err("2.5!")).toMatch(/enteros/);
    expect(err("(-3)!")).toMatch(/enteros/);
    expect(err("171!")).toMatch(/grande/);
  });

  it("raíz de negativo y base 0 con exponente negativo dan error", () => {
    expect(err("(-8)^0.5")).toMatch(/no real/);
    expect(err("0^-1")).toMatch(/cero/);
  });
});

describe("funciones científicas", () => {
  it("trigonometría en grados", () => {
    expect(val("sin(30)")).toBe(0.5);
    expect(val("cos(60)")).toBe(0.5);
    expect(val("cos(90)")).toBe(0);
    expect(val("tan(45)")).toBe(1);
    expect(val("sin(180)")).toBe(0);
  });

  it("trigonometría en radianes", () => {
    expect(val("sin(π/2)", "rad")).toBe(1);
    expect(val("cos(pi)", "rad")).toBe(-1);
    expect(val("sin(pi)", "rad")).toBe(0);
  });

  it("tangente indefinida", () => {
    expect(err("tan(90)")).toMatch(/no definido/);
    expect(err("tan(270)")).toMatch(/no definido/);
    expect(err("tan(pi/2)", "rad")).toMatch(/no definido/);
  });

  it("funciones inversas", () => {
    expect(val("asin(0.5)")).toBe(30);
    expect(val("acos(0)")).toBe(90);
    expect(val("atan(1)")).toBe(45);
    expect(val("atan(1)", "rad")).toBe(0.785398163397);
    expect(err("asin(2)")).toMatch(/dominio/);
  });

  it("logaritmos y raíz", () => {
    expect(val("log(1000)")).toBe(3);
    expect(val("ln(e)")).toBe(1);
    expect(val("sqrt(16)")).toBe(4);
    expect(val("√9")).toBe(3);
    expect(err("log(0)")).toMatch(/dominio/);
    expect(err("ln(-1)")).toMatch(/dominio/);
    expect(err("sqrt(-4)")).toMatch(/negativo/);
  });

  it("constantes", () => {
    expect(val("π")).toBe(3.14159265359);
    expect(val("e")).toBe(2.71828182846);
  });
});

describe("multiplicación implícita", () => {
  it("entre número, constante, función y paréntesis", () => {
    expect(val("2π")).toBe(6.28318530718);
    expect(val("3(4+1)")).toBe(15);
    expect(val("(2)(3)")).toBe(6);
    expect(val("2sin(30)")).toBe(1);
    expect(val("2sqrt(9)")).toBe(6);
  });
});

describe("errores con mensaje claro", () => {
  it("división entre cero", () => {
    expect(err("5/0")).toBe("División entre cero");
    expect(err("1/(2-2)")).toBe("División entre cero");
  });

  it("expresiones mal formadas", () => {
    expect(err("")).toBe("Expresión vacía");
    expect(err("2+")).toMatch(/incompleta/);
    expect(err("(2+3")).toBe("Paréntesis sin cerrar");
    expect(err("2+3)")).toMatch(/de más/);
    expect(err("1.2.3")).toBe("Número mal escrito");
    expect(err("foo(2)")).toMatch(/desconocida/);
    expect(err("2#3")).toMatch(/no válido/);
    expect(err("2 3")).toMatch(/operador/);
  });

  it("desbordamiento", () => {
    expect(err("10^400")).toMatch(/grande/);
  });

  it("no ejecuta código JavaScript", () => {
    expect(evaluate("alert(1)").ok).toBe(false);
    expect(() => tokenize("constructor")).toThrow();
  });
});

describe("cierre automático de paréntesis", () => {
  it("cuenta los paréntesis abiertos", () => {
    expect(missingParens("sin(30")).toBe(1);
    expect(missingParens("((2+3)*(4")).toBe(2);
    expect(missingParens("(2)")).toBe(0);
  });

  it("evalúa cerrando lo que falta", () => {
    expect(evaluate("sqrt(16", "deg", { autoClose: true })).toEqual({ ok: true, value: 4 });
    expect(evaluate("2*(3+(1", "deg", { autoClose: true })).toEqual({ ok: true, value: 8 });
  });
});

describe("formato español", () => {
  it("coma decimal y puntos de miles", () => {
    expect(formatNumber(1234567.89)).toBe("1.234.567,89");
    expect(formatNumber(1234)).toBe("1.234");
    expect(formatNumber(0.5)).toBe("0,5");
    expect(formatNumber(-42.1)).toBe("−42,1");
    expect(formatNumber(0)).toBe("0");
  });

  it("notación científica para extremos", () => {
    expect(formatNumber(1.5e20)).toBe("1,5 × 10^20");
    expect(formatNumber(2e-12)).toBe("2 × 10^-12");
  });

  it("expresión con símbolos bonitos", () => {
    expect(prettyExpr("2*3/4-1.5")).toBe("2×3÷4−1,5");
    expect(prettyExpr("sqrt(asin(0.5")).toBe("√(sin⁻¹(0,5");
  });

  it("el resultado puede reutilizarse en otra expresión", () => {
    for (const n of [0.3, -12.5, 1e20, 3e-12, 123456789]) {
      expect(val(numberToExpr(n))).toBe(n);
    }
  });
});

describe("edición de la expresión", () => {
  it("borra funciones enteras", () => {
    expect(backspace("2+sin(")).toBe("2+");
    expect(backspace("sqrt(")).toBe("");
    expect(backspace("123")).toBe("12");
  });

  it("sustituye operadores repetidos", () => {
    expect(appendOperator("2+", "*")).toBe("2*");
    expect(appendOperator("2*", "-")).toBe("2*-");
    expect(appendOperator("2*-", "+")).toBe("2+");
    expect(appendOperator("", "*")).toBe("");
    expect(appendOperator("", "-")).toBe("-");
    expect(appendOperator("(", "-")).toBe("(-");
  });

  it("evita dos decimales en el mismo número", () => {
    expect(appendDecimal("3.1")).toBe("3.1");
    expect(appendDecimal("3")).toBe("3.");
    expect(appendDecimal("3+")).toBe("3+0.");
  });

  it("cambia el signo del último número", () => {
    expect(toggleSign("2+5")).toBe("2+(-5");
    expect(toggleSign("2+(-5")).toBe("2+5");
    expect(toggleSign("2+")).toBe("2+");
  });
});

describe("memorias A–D", () => {
  const memory = { A: 12.5, B: -2, C: 90 };

  it("sustituye cada letra por su valor", () => {
    expect(evaluate("A+B", "deg", { memory })).toEqual({ ok: true, value: 10.5 });
    expect(evaluate("sin(C)", "deg", { memory })).toEqual({ ok: true, value: 1 });
  });

  it("admite multiplicación implícita con memorias", () => {
    expect(evaluate("2A", "deg", { memory })).toEqual({ ok: true, value: 25 });
    expect(evaluate("AB", "deg", { memory })).toEqual({ ok: true, value: -25 });
    expect(evaluate("eA", "deg", { memory: { A: 1 } })).toEqual(evaluate("e"));
  });

  it("una memoria sin guardar vale 0", () => {
    expect(evaluate("D+1", "deg", { memory })).toEqual({ ok: true, value: 1 });
    expect(evaluate("A")).toEqual({ ok: true, value: 0 });
  });

  it("las memorias negativas funcionan con potencias y signos", () => {
    expect(evaluate("B^2", "deg", { memory })).toEqual({ ok: true, value: 4 });
    expect(evaluate("-B", "deg", { memory })).toEqual({ ok: true, value: 2 });
  });
});
