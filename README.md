# Calculadora

Calculadora básica y científica hecha con Next.js, TypeScript y Tailwind CSS.

## Funciones

- **Modo básico**: las cuatro operaciones, porcentaje, cambio de signo, coma decimal y borrar.
- **Modo científico**: sin, cos y tan con sus inversas, ln, log, √, xʸ, x², 1/x, 10ˣ, eˣ, x!, π, e, paréntesis y selector de grados o radianes.
- Muestra el resultado en vivo mientras escribes y cierra solo los paréntesis que faltan.
- Formato español: coma decimal y punto de miles (1.234.567,89).
- Errores claros en español: «División entre cero», «Fuera de dominio», «Paréntesis sin cerrar»…
- Historial de las últimas 20 operaciones, guardado en el navegador. Si pulsas una, reutilizas su resultado.
- Funciona con el teclado: números, `+ - * / ^ ( ) % !`, Intro o `=` para calcular, Retroceso para borrar y Esc para borrarlo todo.

## Seguridad

No usa `eval()`. La expresión se analiza con un intérprete propio (`lib/parser.ts`) que solo entiende números, operadores y las funciones de la lista.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run build
```

## Estructura

| Ruta | Contenido |
|------|-----------|
| `lib/parser.ts` | Motor de cálculo (tokenizador y analizador descendente recursivo) |
| `lib/format.ts` | Formato español de números y expresiones |
| `lib/input.ts` | Reglas de edición (borrar, operadores, decimales, signo) |
| `lib/calculator-state.ts` | Estado de la calculadora como reducer puro |
| `lib/*.test.ts` | Tests |
| `components/` | Pantalla, teclados y componente principal |
| `app/` | Página y layout de Next.js |

## Despliegue en Vercel

Sube el repositorio a GitHub, impórtalo en Vercel y despliégalo. No necesita variables de entorno.
