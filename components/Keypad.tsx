import type { CalcAction } from "@/lib/calculator-state";
import { MEMORY_KEYS, type AngleMode } from "@/lib/parser";

type Variant = "num" | "op" | "fn" | "util" | "equals";

interface KeyDef {
  label: string;
  action: CalcAction;
  variant: Variant;
  aria?: string;
  wide?: boolean;
  /** Tecla resaltada (STO esperando la letra). */
  active?: boolean;
}

const STYLES: Record<Variant, string> = {
  num: "bg-slate-800 text-white hover:bg-slate-700",
  op: "bg-amber-500/90 text-slate-950 hover:bg-amber-400 text-2xl",
  fn: "bg-slate-800/60 text-sky-200 hover:bg-slate-700/80 text-base",
  util: "bg-slate-600 text-white hover:bg-slate-500",
  equals: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-2xl",
};

const d = (value: string): KeyDef => ({ label: value, action: { type: "digit", value }, variant: "num" });

const BASIC_KEYS: KeyDef[] = [
  { label: "AC", action: { type: "clear" }, variant: "util", aria: "Borrar todo" },
  { label: "⌫", action: { type: "backspace" }, variant: "util", aria: "Borrar último" },
  { label: "%", action: { type: "postfix", value: "%" }, variant: "util", aria: "Porcentaje" },
  { label: "÷", action: { type: "operator", value: "/" }, variant: "op", aria: "Dividir" },
  d("7"), d("8"), d("9"),
  { label: "×", action: { type: "operator", value: "*" }, variant: "op", aria: "Multiplicar" },
  d("4"), d("5"), d("6"),
  { label: "−", action: { type: "operator", value: "-" }, variant: "op", aria: "Restar" },
  d("1"), d("2"), d("3"),
  { label: "+", action: { type: "operator", value: "+" }, variant: "op", aria: "Sumar" },
  { label: "±", action: { type: "sign" }, variant: "num", aria: "Cambiar signo" },
  d("0"),
  { label: ",", action: { type: "decimal" }, variant: "num", aria: "Coma decimal" },
  { label: "=", action: { type: "equals" }, variant: "equals", aria: "Igual" },
];

const fn = (label: string, value: string, aria?: string): KeyDef => ({
  label,
  action: { type: "insert", value },
  variant: "fn",
  aria,
});

function scientificKeys(angle: AngleMode, storeArmed: boolean): KeyDef[] {
  return [
    fn("sin", "sin(", "Seno"),
    fn("cos", "cos(", "Coseno"),
    fn("tan", "tan(", "Tangente"),
    fn("(", "(", "Abrir paréntesis"),
    { label: ")", action: { type: "closeParen" }, variant: "fn", aria: "Cerrar paréntesis" },
    fn("sin⁻¹", "asin(", "Arcoseno"),
    fn("cos⁻¹", "acos(", "Arcocoseno"),
    fn("tan⁻¹", "atan(", "Arcotangente"),
    { label: "xʸ", action: { type: "operator", value: "^" }, variant: "fn", aria: "Potencia" },
    { label: "x!", action: { type: "postfix", value: "!" }, variant: "fn", aria: "Factorial" },
    fn("ln", "ln(", "Logaritmo neperiano"),
    fn("log", "log(", "Logaritmo decimal"),
    fn("√", "sqrt(", "Raíz cuadrada"),
    fn("π", "π", "Pi"),
    fn("e", "e", "Número e"),
    { label: "x²", action: { type: "postfix", value: "^2" }, variant: "fn", aria: "Al cuadrado" },
    { label: "1/x", action: { type: "postfix", value: "^(-1)" }, variant: "fn", aria: "Inverso" },
    fn("10ˣ", "10^(", "Diez elevado a"),
    fn("eˣ", "e^(", "e elevado a"),
    {
      label: angle === "deg" ? "DEG" : "RAD",
      action: { type: "toggleAngle" },
      variant: "util",
      aria: `Modo de ángulo: ${angle === "deg" ? "grados" : "radianes"}. Pulsa para cambiar`,
    },
    {
      label: "STO",
      action: { type: "storeArm" },
      variant: "util",
      active: storeArmed,
      aria: storeArmed ? "Guardar: elige la memoria A, B, C o D" : "Guardar en memoria",
    },
    ...MEMORY_KEYS.map(
      (key): KeyDef => ({
        label: key,
        action: { type: "memory", key },
        variant: "fn",
        aria: storeArmed ? `Guardar en la memoria ${key}` : `Usar la memoria ${key}`,
      }),
    ),
  ];
}

function Key({ def, onPress }: { def: KeyDef; onPress: (a: CalcAction) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPress(def.action)}
      aria-label={def.aria ?? def.label}
      aria-pressed={def.active}
      className={`flex h-14 select-none items-center justify-center rounded-xl text-xl font-medium transition active:scale-95 sm:h-16 ${
        def.active ? "bg-amber-500 text-slate-950 ring-2 ring-amber-300" : STYLES[def.variant]
      }`}
    >
      {def.label}
    </button>
  );
}

export function BasicKeypad({ onPress }: { onPress: (a: CalcAction) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {BASIC_KEYS.map((k) => (
        <Key key={k.label} def={k} onPress={onPress} />
      ))}
    </div>
  );
}

export function ScientificKeypad({
  angle,
  storeArmed,
  onPress,
}: {
  angle: AngleMode;
  storeArmed: boolean;
  onPress: (a: CalcAction) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 md:grid-rows-5 md:gap-2.5 md:[&>button]:h-full">
      {scientificKeys(angle, storeArmed).map((k) => (
        <Key key={k.label} def={k} onPress={onPress} />
      ))}
    </div>
  );
}
