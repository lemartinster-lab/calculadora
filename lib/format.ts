/**
 * Formato de números y expresiones al estilo español:
 * coma decimal y punto como separador de miles (1.234.567,89).
 */

const MAX_PLAIN = 1e15;
const MIN_PLAIN = 1e-9;

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return "Error";
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "−∞";
  if (value === 0) return "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";

  // Números enormes o diminutos en notación científica: 1,23 × 10^20
  if (abs >= MAX_PLAIN || abs < MIN_PLAIN) {
    const [mantissa, exponent] = abs.toExponential(9).split("e");
    const m = mantissa.replace(/\.?0+$/, "").replace(".", ",");
    const exp = parseInt(exponent, 10);
    return `${sign}${m} × 10^${exp}`;
  }

  const plain = parseFloat(abs.toPrecision(12)).toString();
  // toString puede devolver notación exponencial en casos límite; se evita con toFixed.
  const fixed = plain.includes("e") ? abs.toFixed(12).replace(/\.?0+$/, "") : plain;
  const [intPart, decPart] = fixed.split(".");
  return sign + groupThousands(intPart) + (decPart ? "," + decPart : "");
}

/** Convierte un número en texto apto para volver a meterlo en la expresión. */
export function numberToExpr(value: number): string {
  if (Math.abs(value) >= MAX_PLAIN || (value !== 0 && Math.abs(value) < MIN_PLAIN)) {
    // Representación sin notación exponencial (el motor no la admite).
    const s = value.toLocaleString("en-US", {
      useGrouping: false,
      maximumSignificantDigits: 12,
    });
    return s;
  }
  return parseFloat(value.toPrecision(12)).toString();
}

/** Muestra la expresión interna con símbolos bonitos: 2*3/4-1 → 2×3÷4−1 */
export function prettyExpr(expr: string): string {
  return expr
    .replace(/asin\(/g, "sin⁻¹(")
    .replace(/acos\(/g, "cos⁻¹(")
    .replace(/atan\(/g, "tan⁻¹(")
    .replace(/sqrt\(/g, "√(")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−")
    .replace(/\./g, ",");
}
