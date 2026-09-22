# Jev explicado

Playground y blog en español para entender **Jev**, el modelo System One de [TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev), comparándolo en directo con un LLM normal (`gpt-5-nano`).

- **Playground (`/`)**: eliges un ejemplo, defines las preguntas y ves cómo responden los dos modelos: tiempo, tokens, coste y la respuesta de cada uno lado a lado.
- **Blog (`/blog`)**: explicación para no técnicos, con diagramas y animaciones.

## ¿Qué es Jev en una frase?

Un modelo que **no escribe texto: decide**. Le das una situación (`state`) y unas preguntas con respuestas cerradas (`questions`), y devuelve probabilidades calibradas para todas a la vez en una sola pasada.

| Tipo | Pregunta | Devuelve |
| --- | --- | --- |
| `noul` | ¿sí o no? | una probabilidad de 0 a 1 |
| `choice` | ¿cuál de estas opciones? | la opción, la probabilidad de cada una y la confianza |
| `score` | ¿cuánto, en esta escala? | la nota, la probabilidad de cada nivel y la confianza |

## Puesta en marcha

Requisitos: Node.js 20 o superior y una clave de [Vercel AI Gateway](https://vercel.com/docs/ai-gateway).

```bash
npm install
cp .env.example .env      # y pon tu clave
npm run dev
```

En `.env`:

```
AI_GATEWAY_API_KEY=vck_...
```

Abre http://localhost:3000. Si ves otro puerto en la terminal, usa ese.

Solo hace falta esa clave: el mismo AI Gateway sirve los dos modelos. La clave se queda en el servidor y nunca llega al navegador.

## Cómo se usa

1. **Elige un ejemplo** en la barra izquierda: spam, NVIDIA comprar/vender, guardarraíl de herramientas de un agente o triaje de tickets.
2. **Revisa el estado**: es el texto o JSON que leen los modelos. Ábrelo para editarlo o cambia a otra muestra.
3. **Configura las preguntas**: abre cualquiera para cambiar su nombre, su tipo, sus instrucciones y sus `criteria`. También puedes añadir o borrar preguntas.
4. **Pulsa Ejecutar** (o Ctrl + Enter):
   - **Carrera en directo**: Jev responde todo a la vez; GPT escribe su JSON token a token, en streaming real.
   - **Respuestas**: una tarjeta por pregunta, con Jev a la izquierda, GPT a la derecha y si coinciden.
   - **Métricas**: tiempo, tokens, coste por llamada y por un millón de llamadas.

## Cómo funciona por dentro

```
Navegador ──► /api/jev ─────► Vercel AI Gateway ──► Jev (typesafe-ai/jev)
          └─► /api/compare ─► Vercel AI Gateway ──► gpt-5-nano (streaming, salida estructurada)
```

- **Jev** recibe el `state` y las `questions` tal cual.
- **gpt-5-nano** recibe lo mismo convertido en prompt y en JSON Schema estricto, así que devuelve la misma forma de respuesta que Jev. El razonamiento está desactivado (`reasoning_effort: "minimal"`).

## Estructura

```
src/
  app/
    page.tsx              playground: estado, preguntas, ejecución
    blog/page.tsx         artículo explicativo con diagramas
    api/jev/route.ts      proxy a Jev vía AI Gateway
    api/compare/route.ts  gpt-5-nano en streaming con salida estructurada
  components/
    Sidebar.tsx           ejemplos (plegable) y acceso al blog
    Workbench.tsx         estado y editor de preguntas
    QuestionEditor.tsx    tarjetas plegables noul / choice / score
    LiveRace.tsx          carrera animada y métricas
    ResultsPanel.tsx      respuestas de ambos modelos lado a lado
    RaceAnimation.tsx     animación del blog (LLM vs Jev)
  lib/
    examples.ts           ejemplos y su regla de decisión (decide)
    compare.ts            modelo de comparación, precios, esquema y prompt
    providers.ts          endpoint y modelo de Jev
    types.ts              tipos de la API de Jev
```

## Personalizar

- **Otro modelo de comparación**: `GATEWAY_MODEL` en `src/lib/compare.ts`.
- **Precios**: `PRICES` en el mismo archivo. Revísalos, porque cambian a menudo.
- **Nuevo ejemplo**: añade un objeto a `EXAMPLES` en `src/lib/examples.ts` con `state`, `questions`, `samples` y `decide()`.

## Créditos

Basado en [davila7/jev-explained](https://github.com/davila7/jev-explained) (MIT). Datos de Jev según el [blog de TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
