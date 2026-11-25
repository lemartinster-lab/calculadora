"use client";

import { useEffect, useReducer, useState } from "react";
import { calcReducer, initialState, type CalcAction, type HistoryItem } from "@/lib/calculator-state";
import { formatNumber, prettyExpr } from "@/lib/format";
import { MEMORY_KEYS, isMemoryKey, type Memory } from "@/lib/parser";
import { Display } from "./Display";
import { BasicKeypad, ScientificKeypad } from "./Keypad";

const STORAGE_KEY = "calculadora:v1";

interface Saved {
  history: HistoryItem[];
  angle: "deg" | "rad";
  scientific: boolean;
  memory: Memory;
}

/** Traduce una tecla física del ordenador a una acción de la calculadora. */
function keyToAction(key: string): CalcAction | null {
  if (/^[0-9]$/.test(key)) return { type: "digit", value: key };
  // Mayúsculas A–D (Shift + letra) usan o guardan las memorias.
  if (isMemoryKey(key)) return { type: "memory", key };
  switch (key) {
    case ".":
    case ",":
      return { type: "decimal" };
    case "+":
    case "-":
    case "*":
    case "/":
    case "^":
      return { type: "operator", value: key };
    case "x":
      return { type: "operator", value: "*" };
    case "%":
    case "!":
      return { type: "postfix", value: key };
    case "(":
      return { type: "insert", value: "(" };
    case ")":
      return { type: "closeParen" };
    case "Enter":
    case "=":
      return { type: "equals" };
    case "Backspace":
      return { type: "backspace" };
    case "Escape":
    case "Delete":
      return { type: "clear" };
    default:
      return null;
  }
}

export function Calculator() {
  const [state, dispatch] = useReducer(calcReducer, initialState);
  const [scientific, setScientific] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Cargar historial y preferencias guardadas en este navegador.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Saved>;
        if (Array.isArray(saved.history)) dispatch({ type: "loadHistory", value: saved.history });
        if (saved.angle === "deg" || saved.angle === "rad") dispatch({ type: "setAngle", value: saved.angle });
        if (typeof saved.scientific === "boolean") setScientific(saved.scientific);
        if (saved.memory && typeof saved.memory === "object") {
          const memory: Memory = {};
          for (const k of MEMORY_KEYS) {
            const v = saved.memory[k];
            if (typeof v === "number" && Number.isFinite(v)) memory[k] = v;
          }
          dispatch({ type: "loadMemory", value: memory });
        }
      }
    } catch {
      // Sin almacenamiento disponible: la calculadora funciona igual, sin recordar nada.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      const data: Saved = { history: state.history, angle: state.angle, scientific, memory: state.memory };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento lleno o bloqueado: se ignora */
    }
  }, [loaded, state.history, state.angle, scientific, state.memory]);

  const storedMemories = MEMORY_KEYS.filter((k) => state.memory[k] !== undefined);

  // Teclado físico.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const action = keyToAction(e.key);
      if (action) {
        e.preventDefault();
        dispatch(action);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start">
      <section
        className={`w-full rounded-3xl bg-slate-900 p-4 shadow-2xl ring-1 ring-white/5 sm:p-5 ${
          scientific ? "lg:max-w-3xl" : "lg:max-w-md"
        } mx-auto lg:mx-0`}
        aria-label="Calculadora"
      >
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Calculadora</h1>
          <div className="flex rounded-full bg-slate-800 p-1 text-sm" role="tablist">
            {[
              { label: "Básica", value: false },
              { label: "Científica", value: true },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                role="tab"
                aria-selected={scientific === m.value}
                onClick={() => setScientific(m.value)}
                className={`rounded-full px-3 py-1 transition ${
                  scientific === m.value ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <Display
          expr={state.expr}
          lastExpr={state.lastExpr}
          justEvaluated={state.justEvaluated}
          error={state.error}
          angle={state.angle}
          memory={state.memory}
        />

        {(storedMemories.length > 0 || state.storeArmed) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Memorias guardadas">
            {state.storeArmed && (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300">STO → elige A, B, C o D</span>
            )}
            {storedMemories.map((k) => (
              <span key={k} className="rounded bg-slate-800 px-1.5 py-0.5 text-sky-200">
                {k} = {formatNumber(state.memory[k] ?? 0)}
              </span>
            ))}
            {storedMemories.length > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: "clearMemory" })}
                className="ml-auto text-slate-500 hover:text-rose-400"
              >
                Borrar memorias
              </button>
            )}
          </div>
        )}

        <div className={`mt-4 grid gap-4 ${scientific ? "md:grid-cols-[1.25fr_1fr]" : ""}`}>
          {scientific && <ScientificKeypad angle={state.angle} storeArmed={state.storeArmed} onPress={dispatch} />}
          <BasicKeypad onPress={dispatch} />
        </div>
      </section>

      <aside className="mx-auto w-full max-w-md rounded-3xl bg-slate-900/70 p-5 ring-1 ring-white/5 lg:mx-0 lg:w-72">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Historial</h2>
          {state.history.length > 0 && (
            <button
              type="button"
              onClick={() => dispatch({ type: "clearHistory" })}
              className="text-xs text-slate-500 hover:text-rose-400"
            >
              Vaciar
            </button>
          )}
        </div>
        {state.history.length === 0 ? (
          <p className="text-sm text-slate-500">Aquí aparecerán tus últimas operaciones.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {state.history.map((h, i) => (
              <li key={`${i}-${h.expr}`}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "useHistory", value: h.result })}
                  className="w-full rounded-lg px-3 py-2 text-right transition hover:bg-slate-800"
                  title="Usar este resultado"
                >
                  <div className="truncate text-xs text-slate-500">{prettyExpr(h.expr)}</div>
                  <div className="text-lg text-slate-200">{formatNumber(h.result)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
