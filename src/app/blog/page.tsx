import type { Metadata } from "next";
import Link from "next/link";
import { RaceAnimation } from "@/components/RaceAnimation";

export const metadata: Metadata = {
  title: "Cómo funciona Jev",
  description:
    "Explicación en español de Jev, el modelo System One de TypeSafe: primitivas, arquitectura, calibración y cómo usarlo con Vercel AI Gateway.",
};

// Paleta compartida por los diagramas (coincide con globals.css).
const C = {
  bg: "#f7f7f4",
  panel: "#ffffff",
  border: "#cdc9bf",
  fg: "#1c1e23",
  muted: "#555b66",
  accent: "#d2601f",
  ok: "#1a9660",
  warn: "#b3761a",
  bad: "#cf433a",
  info: "#2c6bd6",
};

function Figure({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <figure className="my-10">
      <div className="overflow-x-auto rounded-xl border border-border bg-bg-elev p-4">{children}</div>
      <figcaption className="mt-3 text-center text-sm text-fg-dim">{caption}</figcaption>
    </figure>
  );
}

function Box({
  x, y, w, h, label, sub, color = C.border, fill = C.panel,
}: {
  x: number; y: number; w: number; h: number; label: string; sub?: string; color?: string; fill?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={color} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 4 : h / 2 + 5)} textAnchor="middle" fill={C.fg} fontSize={14} fontWeight={600}>
        {label}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fill={C.muted} fontSize={11}>
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, color = C.muted }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.6} markerEnd="url(#arrow)" />;
}

function Defs() {
  return (
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={C.muted} />
      </marker>
    </defs>
  );
}

/** Diagrama 1: LLM secuencial frente a Jev en paralelo. */
function SequentialVsParallel() {
  const tokens = ["El", "correo", "parece", "spam", "porque", "…"];
  return (
    <svg viewBox="0 0 760 330" className="w-full min-w-[640px]" role="img" aria-label="LLM genera tokens uno a uno; Jev responde todas las preguntas a la vez">
      <Defs />
      <text x={20} y={30} fill={C.info} fontSize={13} fontWeight={700}>LLM (Sistema 2): un token detrás de otro</text>
      <Box x={20} y={50} w={110} h={50} label="Prompt" sub="texto libre" />
      {tokens.map((t, i) => (
        <g key={t}>
          <Arrow x1={130 + i * 95} y1={75} x2={158 + i * 95} y2={75} />
          <rect x={160 + i * 95} y={55} width={75} height={40} rx={8} fill={C.panel} stroke={C.info} strokeOpacity={0.6} />
          <text x={197 + i * 95} y={80} textAnchor="middle" fill={C.fg} fontSize={12}>{t}</text>
        </g>
      ))}
      <text x={20} y={125} fill={C.muted} fontSize={12}>Segundos · texto que hay que parsear · puede alucinar formatos · confianza poco fiable</text>

      <line x1={20} y1={150} x2={740} y2={150} stroke={C.border} strokeDasharray="4 6" />

      <text x={20} y={180} fill={C.accent} fontSize={13} fontWeight={700}>Jev (Sistema 1): lee una vez, responde todo a la vez</text>
      <Box x={20} y={215} w={130} h={70} label="Estado" sub="texto o JSON" color={C.accent} />
      <Arrow x1={150} y1={250} x2={228} y2={250} />
      <Box x={230} y={215} w={150} h={70} label="Lectura única" sub="un solo pase" color={C.accent} />
      {[
        { y: 195, l: "is_spam → 0.97", c: C.ok },
        { y: 240, l: "folder → spam", c: C.info },
        { y: 285, l: "suspicion → 4.6", c: C.warn },
      ].map((a) => (
        <g key={a.l}>
          <Arrow x1={380} y1={250} x2={468} y2={a.y + 15} />
          <rect x={470} y={a.y} width={190} height={30} rx={15} fill={C.panel} stroke={a.c} />
          <text x={565} y={a.y + 20} textAnchor="middle" fill={C.fg} fontSize={12}>{a.l}</text>
        </g>
      ))}
      <text x={672} y={255} fill={C.ok} fontSize={13} fontWeight={700}>~100 ms</text>
    </svg>
  );
}

/** Diagrama 2: arquitectura extremo a extremo. */
function Architecture() {
  return (
    <svg viewBox="0 0 800 380" className="w-full min-w-[680px]" role="img" aria-label="Arquitectura de Jev: estado y preguntas tipadas entran, salen probabilidades calibradas y tu código decide">
      <Defs />
      {/* Entradas */}
      <text x={20} y={28} fill={C.muted} fontSize={11} letterSpacing={1.5}>ENTRADA</text>
      <Box x={20} y={45} w={170} h={80} label="state" sub="correo, JSON, tool call…" />
      <Box x={20} y={150} w={170} h={110} label="questions" sub="noul · choice · score" />
      <text x={105} y={240} textAnchor="middle" fill={C.muted} fontSize={10}>salidas posibles fijadas</text>
      <text x={105} y={252} textAnchor="middle" fill={C.muted} fontSize={10}>de antemano (type-safe)</text>

      {/* Modelo */}
      <rect x={240} y={20} width={300} height={300} rx={16} fill="none" stroke={C.accent} strokeDasharray="6 5" />
      <text x={390} y={42} textAnchor="middle" fill={C.accent} fontSize={12} fontWeight={700}>Jev · modelo System One</text>
      <Arrow x1={190} y1={85} x2={268} y2={100} />
      <Arrow x1={190} y1={205} x2={268} y2={120} />
      <Box x={270} y={70} w={240} h={70} label="Codificador del estado" sub="lee la entrada una sola vez" color={C.accent} />
      <Arrow x1={390} y1={140} x2={390} y2={168} />
      <Box x={270} y={170} w={240} h={60} label="Muestreador paralelo" sub="todas las preguntas a la vez" color={C.accent} />
      <Arrow x1={390} y1={230} x2={390} y2={253} />
      <Box x={270} y={255} w={240} h={50} label="Distribuciones calibradas" sub="entrenado con RLCD" color={C.accent} />

      {/* Salidas */}
      <text x={590} y={28} fill={C.muted} fontSize={11} letterSpacing={1.5}>SALIDA</text>
      <Arrow x1={510} y1={280} x2={588} y2={85} />
      <Arrow x1={510} y1={280} x2={588} y2={165} />
      <Arrow x1={510} y1={280} x2={588} y2={245} />
      <Box x={590} y={60} w={190} h={50} label="noul: 0.93" sub="probabilidad de «sí»" color={C.ok} />
      <Box x={590} y={140} w={190} h={50} label="choice: billing" sub="+ probabilidades + confianza" color={C.info} />
      <Box x={590} y={220} w={190} h={50} label="score: 3.8 / 5" sub="+ distribución + confianza" color={C.warn} />

      {/* Tu código */}
      <rect x={20} y={335} width={760} height={36} rx={10} fill="rgba(210,96,31,0.1)" stroke={C.accent} />
      <text x={400} y={358} textAnchor="middle" fill={C.fg} fontSize={13}>
        Tu código decide: <tspan fill={C.accent} fontWeight={700}>if (noul &gt; 0.9 &amp;&amp; confidence &gt; 0.8) actuar() else pedirRevisión()</tspan>
      </text>
    </svg>
  );
}

/** Diagrama 3: las tres primitivas con salidas de ejemplo. */
function Primitives() {
  const bar = (x: number, y: number, label: string, p: number, color: string) => (
    <g key={label}>
      <text x={x} y={y + 11} fill={C.muted} fontSize={11}>{label}</text>
      <rect x={x + 70} y={y} width={130} height={12} rx={6} fill={C.bg} />
      <rect x={x + 70} y={y} width={130 * p} height={12} rx={6} fill={color} />
      <text x={x + 208} y={y + 11} fill={C.fg} fontSize={11}>{Math.round(p * 100)}%</text>
    </g>
  );
  return (
    <svg viewBox="0 0 780 250" className="w-full min-w-[680px]" role="img" aria-label="Las tres primitivas de Jev con salidas de ejemplo">
      {[
        { x: 10, t: "Noul · ¿sí o no?", q: "¿Es spam este correo?", c: C.ok },
        { x: 270, t: "Choice · ¿cuál?", q: "¿Qué equipo lo atiende?", c: C.info },
        { x: 530, t: "Score · ¿cuánto?", q: "¿Cuánto riesgo tiene?", c: C.warn },
      ].map((p) => (
        <g key={p.t}>
          <rect x={p.x} y={10} width={240} height={230} rx={14} fill={C.panel} stroke={p.c} strokeOpacity={0.7} />
          <text x={p.x + 16} y={38} fill={p.c} fontSize={15} fontWeight={700}>{p.t}</text>
          <text x={p.x + 16} y={60} fill={C.muted} fontSize={12}>{p.q}</text>
        </g>
      ))}
      {/* Noul: un medidor */}
      <rect x={26} y={100} width={208} height={18} rx={9} fill={C.bg} />
      <rect x={26} y={100} width={208 * 0.93} height={18} rx={9} fill={C.ok} />
      <text x={26} y={140} fill={C.muted} fontSize={11}>0 = no</text>
      <text x={234} y={140} textAnchor="end" fill={C.muted} fontSize={11}>1 = sí</text>
      <text x={130} y={185} textAnchor="middle" fill={C.fg} fontSize={22} fontWeight={700}>0.93</text>
      <text x={130} y={210} textAnchor="middle" fill={C.muted} fontSize={11}>una sola probabilidad</text>
      {/* Choice */}
      {bar(286, 90, "billing", 0.78, C.info)}
      {bar(286, 115, "soporte", 0.15, C.info)}
      {bar(286, 140, "ventas", 0.07, C.info)}
      <text x={400} y={190} textAnchor="middle" fill={C.fg} fontSize={14} fontWeight={700}>choice = billing</text>
      <text x={400} y={210} textAnchor="middle" fill={C.muted} fontSize={11}>confidence = 0.71</text>
      {/* Score */}
      {bar(546, 80, "1 bajo", 0.02, C.warn)}
      {bar(546, 100, "2", 0.08, C.warn)}
      {bar(546, 120, "3", 0.2, C.warn)}
      {bar(546, 140, "4", 0.45, C.warn)}
      {bar(546, 160, "5 alto", 0.25, C.warn)}
      <text x={660} y={200} textAnchor="middle" fill={C.fg} fontSize={14} fontWeight={700}>score = 3.8</text>
      <text x={660} y={220} textAnchor="middle" fill={C.muted} fontSize={11}>media ponderada de la rúbrica</text>
    </svg>
  );
}

/** Diagrama 4: respuesta × confianza → política. */
function ConfidenceMatrix() {
  const cell = (x: number, y: number, title: string, body: string, color: string) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={250} height={100} rx={12} fill={C.panel} stroke={color} />
      <text x={x + 125} y={y + 42} textAnchor="middle" fill={color} fontSize={15} fontWeight={700}>{title}</text>
      <text x={x + 125} y={y + 66} textAnchor="middle" fill={C.muted} fontSize={12}>{body}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 660 300" className="w-full min-w-[560px]" role="img" aria-label="Matriz de decisión según respuesta y confianza">
      <text x={380} y={24} textAnchor="middle" fill={C.muted} fontSize={12} letterSpacing={1.5}>CONFIANZA →</text>
      <text x={250} y={50} textAnchor="middle" fill={C.fg} fontSize={13}>baja</text>
      <text x={510} y={50} textAnchor="middle" fill={C.fg} fontSize={13}>alta</text>
      <text x={40} y={125} fill={C.fg} fontSize={13}>«aprobar»</text>
      <text x={40} y={235} fill={C.fg} fontSize={13}>«bloquear»</text>
      {cell(125, 65, "Revisión humana", "la respuesta es dudosa", C.warn)}
      {cell(385, 65, "Actuar solo", "automatiza sin miedo", C.ok)}
      {cell(125, 180, "Revisión humana", "posible falso positivo", C.warn)}
      {cell(385, 180, "Bloquear", "con evidencia sólida", C.bad)}
    </svg>
  );
}

/** Diagrama 5: flujo de esta app con Vercel AI Gateway. */
function AppFlow() {
  return (
    <svg viewBox="0 0 800 200" className="w-full min-w-[680px]" role="img" aria-label="Flujo de la petición desde el navegador hasta Jev a través del proxy y Vercel AI Gateway">
      <Defs />
      <Box x={10} y={60} w={160} h={80} label="Navegador" sub="clave en localStorage" />
      <Arrow x1={170} y1={100} x2={228} y2={100} />
      <text x={199} y={88} textAnchor="middle" fill={C.muted} fontSize={10}>POST</text>
      <Box x={230} y={60} w={170} h={80} label="/api/jev" sub="proxy Next.js (sin CORS)" color={C.accent} />
      <Arrow x1={400} y1={100} x2={458} y2={100} />
      <Box x={460} y={60} w={170} h={80} label="Vercel AI Gateway" sub="typesafe-ai/jev" color={C.info} />
      <Arrow x1={630} y1={100} x2={668} y2={100} />
      <Box x={670} y={60} w={120} h={80} label="Jev" sub="TypeSafe" color={C.ok} />
      <text x={400} y={180} textAnchor="middle" fill={C.muted} fontSize={12}>
        Alternativa: /api/jev → api.typesafe.ai/v1/systemone directamente (modelo jev-latest)
      </text>
    </svg>
  );
}

/** Diagrama: un pase por token frente a un único pase con una salida por pregunta (hipótesis). */
function ForwardPasses() {
  const toks = ["{", '"urgent":', "true,", '"team":', '"eng"', "}"];
  return (
    <svg viewBox="0 0 830 330" className="w-full min-w-[680px]" role="img" aria-label="Varios pases autorregresivos frente a un único pase con salidas por pregunta">
      <Defs />
      <text x={20} y={26} fill={C.info} fontSize={13} fontWeight={700}>LLM · un pase del modelo por token</text>
      {toks.map((t, i) => (
        <g key={t}>
          <rect x={20} y={42 + i * 44} width={120} height={32} rx={8} fill={C.panel} stroke={C.info} />
          <text x={80} y={62 + i * 44} textAnchor="middle" fill={C.fg} fontSize={11}>modelo · pase {i + 1}</text>
          <Arrow x1={140} y1={58 + i * 44} x2={188} y2={58 + i * 44} />
          <text x={196} y={62 + i * 44} fill={C.fg} fontSize={12} fontFamily="monospace">{t}</text>
        </g>
      ))}
      <text x={20} y={318} fill={C.muted} fontSize={11}>cada token vuelve a entrar → secuencial</text>

      <line x1={330} y1={20} x2={330} y2={320} stroke={C.border} strokeDasharray="4 6" />

      <text x={360} y={26} fill={C.accent} fontSize={13} fontWeight={700}>Jev · un único pase (hipótesis)</text>
      <Box x={360} y={120} w={120} h={70} label="estado" sub="+ preguntas" />
      <Arrow x1={480} y1={155} x2={508} y2={155} />
      <Box x={510} y={105} w={100} h={100} label="1 pase" sub="del modelo" color={C.accent} />
      {[
        { y: 60, q: "urgent", p: 0.94 },
        { y: 145, q: "team = eng", p: 0.88 },
        { y: 230, q: "refund", p: 0.06 },
      ].map((o) => (
        <g key={o.q}>
          <Arrow x1={610} y1={155} x2={638} y2={o.y + 12} />
          <text x={642} y={o.y + 4} fill={C.fg} fontSize={11}>{o.q}</text>
          <rect x={642} y={o.y + 10} width={120} height={12} rx={6} fill={C.bg} stroke={C.border} />
          <rect x={642} y={o.y + 10} width={120 * o.p} height={12} rx={6} fill={C.ok} fillOpacity={0.55} />
          <text x={768} y={o.y + 20} fill={C.ok} fontSize={11}>{o.p}</text>
        </g>
      ))}
      <text x={360} y={318} fill={C.muted} fontSize={11}>puntúa opciones cerradas a la vez → sin bucle</text>
    </svg>
  );
}

const REQUEST_EXAMPLE = `POST https://ai-gateway.vercel.sh/typesafe/v1/systemone
Authorization: Bearer $AI_GATEWAY_API_KEY

{
  "model": "typesafe-ai/jev",
  "state": "Asunto: ¡Has ganado un iPhone! Haz clic aquí…",
  "questions": {
    "is_spam":   { "type": "noul",   "instructions": "¿Es spam?" },
    "folder":    { "type": "choice", "instructions": "¿A qué carpeta va?",
                   "criteria": { "inbox": null, "promos": null, "spam": null } },
    "suspicion": { "type": "score",  "instructions": "¿Cuán sospechoso es?",
                   "criteria": ["nada", "poco", "algo", "bastante", "muy"] }
  }
}`;

const RESPONSE_EXAMPLE = `{
  "answers": {
    "is_spam":   { "type": "noul",   "noul": 0.97 },
    "folder":    { "type": "choice", "choice": "spam",
                   "probabilities": { "inbox": 0.01, "promos": 0.04, "spam": 0.95 },
                   "confidence": 0.91 },
    "suspicion": { "type": "score",  "score": 4.6, "confidence": 0.84, "...": "…" }
  },
  "usage": { "input_tokens": 58, "output_tokens": 0 }
}`;

function H2({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="mt-16 mb-4 scroll-mt-8 text-2xl font-bold text-fg">
      {children}
    </h2>
  );
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-bg font-sans">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 text-sm">
          <span className="font-mono text-fg-muted">jev · explicado</span>
          <Link href="/" className="rounded-md bg-accent px-3 py-1.5 font-semibold text-white hover:opacity-90">
            Probar en el playground →
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-24 text-[17px] leading-[1.75] text-fg-muted">
        <p className="mt-14 font-mono text-sm text-accent">Clase práctica · IA para automatizar decisiones</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight text-fg text-balance sm:text-5xl">
          Jev: un modelo que no escribe, <span className="text-accent">decide</span>
        </h1>
        <p className="mt-6 text-lg">
          Estamos acostumbrados a que la IA sea un chat que genera texto. Jev, el primer modelo
          <strong className="text-fg"> System One</strong> de TypeSafe, hace otra cosa: le das una situación y unas
          preguntas con respuestas cerradas, y te devuelve <strong className="text-fg">probabilidades calibradas</strong> en
          unos 100 milisegundos. Ni una palabra de texto libre. Veamos por qué eso importa.
        </p>

        <nav className="mt-8 rounded-xl border border-border bg-bg-elev p-5 text-sm">
          <p className="mb-2 font-semibold text-fg">En este artículo</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li><a className="hover:text-accent" href="#sistemas">Sistema 1 frente a Sistema 2</a></li>
            <li><a className="hover:text-accent" href="#primitivas">Las tres primitivas</a></li>
            <li><a className="hover:text-accent" href="#arquitectura">Arquitectura</a></li>
            <li><a className="hover:text-accent" href="#pase-unico">¿Cómo puede responder todo de golpe?</a></li>
            <li><a className="hover:text-accent" href="#confianza">La confianza como segundo eje</a></li>
            <li><a className="hover:text-accent" href="#agentes">Jev dentro de un agente</a></li>
            <li><a className="hover:text-accent" href="#casos">Problemas que resuelve hoy</a></li>
            <li><a className="hover:text-accent" href="#api">Anatomía de una petición</a></li>
            <li><a className="hover:text-accent" href="#vercel">Usarlo con Vercel AI Gateway</a></li>
            <li><a className="hover:text-accent" href="#ejercicios">Ejercicios para clase</a></li>
          </ol>
        </nav>

        <H2 id="sistemas">1. Sistema 1 frente a Sistema 2</H2>
        <p>
          El nombre viene de Daniel Kahneman: el <strong className="text-fg">Sistema 1</strong> es el pensamiento rápido e
          intuitivo («¿esto es peligroso?»), y el <strong className="text-fg">Sistema 2</strong> es el lento y deliberado
          («resuelve esta integral»). Los LLM de chat son buenos en el Sistema 2, pero para decisiones rápidas pagan
          un peaje enorme: generan token a token, tardan segundos y devuelven texto que tu código tiene que parsear.
        </p>
        <p className="mt-4">
          Míralo en acción. Los dos reciben el mismo correo y las mismas preguntas. Fíjate en cuántas veces tiene que
          «pensar» cada uno:
        </p>
        <figure className="my-10">
          <div className="rounded-xl border border-border bg-bg-elev p-5">
            <RaceAnimation />
          </div>
          <figcaption className="mt-3 text-center text-sm text-fg-dim">
            Un LLM es como alguien redactando una carta: cada palabra depende de la anterior. Jev es como alguien rellenando un
            test: ve todas las casillas y las marca a la vez. (Tiempos ralentizados para que se vea.)
          </figcaption>
        </figure>
        <Figure caption="Un LLM encadena tokens de uno en uno. Jev lee el estado una vez y responde todas las preguntas en paralelo.">
          <SequentialVsParallel />
        </Figure>
        <figure className="my-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/llm-vs-jev.png"
            alt="Un LLM general emite tokens uno tras otro; Jev puntúa cada respuesta en un solo pase (urgent 0.94, team=eng 0.88, refund 0.06). Ambos acaban en la misma rama de código."
            className="mx-auto w-full rounded-xl border border-border bg-white"
          />
          <figcaption className="mt-3 text-center text-sm text-fg-dim">
            La salida puede parecer idéntica; el cómputo no lo es. El LLM tiene que <em>escribir</em> el JSON símbolo a símbolo,
            y Jev <em>puntúa</em> cada respuesta posible de una vez.
          </figcaption>
        </figure>
        <p>
          Según TypeSafe, Jev responde en <strong className="text-fg">70–500 ms</strong>, entre 40 y 200 veces más rápido que
          un modelo frontera en la misma tarea, con un coste de entrada de unos $0,042 por millón de tokens y la salida
          prácticamente gratis. Como las salidas posibles se fijan de antemano, los errores de tipo son imposibles por
          construcción.
        </p>

        <H2 id="primitivas">2. Las tres primitivas</H2>
        <p>Todo lo que le preguntas a Jev encaja en uno de tres tipos. Elige según la forma de la pregunta:</p>
        <Figure caption="Noul para sí/no, Choice para elegir entre opciones conocidas y Score para graduar en una escala ordenada.">
          <Primitives />
        </Figure>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-fg">
              <tr className="border-b border-border"><th className="py-2 pr-4">Primitiva</th><th className="py-2 pr-4">Cuándo</th><th className="py-2">Devuelve</th></tr>
            </thead>
            <tbody>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono text-ok">noul</td><td className="pr-4">pregunta binaria</td><td>una probabilidad de 0 a 1</td></tr>
              <tr className="border-b border-border"><td className="py-2 pr-4 font-mono text-info">choice</td><td className="pr-4">elegir entre opciones</td><td>opción, probabilidad por opción y <code>confidence</code></td></tr>
              <tr><td className="py-2 pr-4 font-mono text-warn">score</td><td className="pr-4">graduar en una rúbrica</td><td>puntuación ponderada, distribución y <code>confidence</code></td></tr>
            </tbody>
          </table>
        </div>
        <figure className="my-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/jev-primitives.png" alt="Ilustración de las primitivas Noul, Choice y Score" className="mx-auto w-full max-w-xl rounded-xl border border-border" />
          <figcaption className="mt-3 text-center text-sm text-fg-dim">Ilustración original del repositorio jev-explained.</figcaption>
        </figure>

        <H2 id="arquitectura">3. Arquitectura</H2>
        <p>
          Por dentro, Jev no es un LLM con un prompt ingenioso. TypeSafe describe tres piezas: una
          <strong className="text-fg"> arquitectura nueva optimizada para salidas estructuradas</strong>, un
          <strong className="text-fg"> muestreador paralelo</strong> que produce todas las salidas en una sola consulta y un
          método de entrenamiento llamado <strong className="text-fg">RLCD</strong> (<em>Reinforcement Learning for Calibrated
          Decisions</em>) que premia probabilidades honestas, no solo aciertos.
        </p>
        <Figure caption="El estado se codifica una sola vez; cada pregunta tipada obtiene su distribución calibrada; tu código aplica los umbrales.">
          <Architecture />
        </Figure>
        <p>
          La consecuencia práctica: <strong className="text-fg">diez preguntas cuestan casi lo mismo que una</strong>. Puedes
          preguntar de más «por si acaso» y dejar que tu código decida qué respuestas usar. Y fíjate en la franja
          naranja: <em>el modelo no toma la decisión final</em>. Te da números; tú pones los umbrales.
        </p>

        <H2 id="pase-unico">4. ¿Cómo puede responder todo de golpe?</H2>
        <p>
          Es la pregunta más interesante, y hay que separar lo que se sabe de lo que se deduce. TypeSafe
          <strong className="text-fg"> no ha publicado la arquitectura interna</strong>: ni el número de parámetros, ni si es un
          transformer, ni cómo funciona exactamente su muestreador.
        </p>
        <div className="my-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ok/40 bg-ok-soft p-5 text-[15px]">
            <p className="mb-2 font-semibold text-ok">Confirmado por TypeSafe</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Es <strong className="text-fg">no autorregresivo</strong>: no predice el siguiente token.</li>
              <li>Lee el estado una vez y responde todas las preguntas en <strong className="text-fg">el mismo pase</strong>.</li>
              <li>Las preguntas son <strong className="text-fg">independientes</strong>: una respuesta nunca es contexto de otra.</li>
              <li>Usa una arquitectura nueva, un «muestreador paralelo» y se entrena con RLCD.</li>
              <li>Límites: unos 64k tokens de estado más preguntas, hasta 255 opciones por <code>choice</code> y de 2 a 10 niveles por <code>score</code>.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-warn/40 bg-warn-soft p-5 text-[15px]">
            <p className="mb-2 font-semibold text-warn">Hipótesis razonable (no confirmada)</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Se parece más a un <strong className="text-fg">clasificador</strong> (como BERT o un <em>cross-encoder</em>) que a un chat.</li>
              <li>Cada pregunta tendría su propia salida que puntúa sus opciones y aplica un <em>softmax</em>.</li>
              <li>Una máscara de atención impediría que las preguntas se vean entre sí.</li>
            </ul>
          </div>
        </div>
        <p>
          La clave para entender que sea posible: <strong className="text-fg">el espacio de respuestas es finito y lo das tú</strong>.
          Un LLM tiene que construir su respuesta símbolo a símbolo porque podría escribir cualquier cosa, y cada token depende
          de los anteriores; por eso necesita un pase completo del modelo <em>por cada token</em>. Si las únicas salidas posibles son
          <code> inbox</code>, <code>promotions</code> o <code>spam</code>, no hace falta escribir nada: basta con calcular una
          puntuación para cada opción y normalizarla en probabilidades. Y eso se puede hacer para todas las opciones y todas las
          preguntas a la vez, igual que un clasificador de imágenes da la probabilidad de sus 1000 clases en una sola pasada.
        </p>
        <Figure caption="Izquierda: un LLM repite el pase completo del modelo por cada token. Derecha (hipótesis): un único pase y una salida por pregunta que reparte la probabilidad entre las opciones cerradas.">
          <ForwardPasses />
        </Figure>
        <p>
          Por eso los tokens de salida son gratis y diez preguntas cuestan casi lo mismo que una: el trabajo caro es leer el
          estado, y eso se hace <strong className="text-fg">una sola vez</strong>. RLCD encaja en este esquema: si la salida
          es una distribución de probabilidad, puedes entrenar directamente para que esa distribución esté calibrada.
        </p>

        <H2 id="confianza">5. La confianza como segundo eje</H2>
        <p>
          Las respuestas <code>choice</code> y <code>score</code> traen dos cosas: <em>qué</em> (la respuesta) y
          <em> cuán seguro</em> (la forma de la distribución). Que Jev esté calibrado significa que cuando dice 90 %,
          acierta aproximadamente el 90 % de las veces. Eso permite una política muy simple:
        </p>
        <Figure caption="Alta confianza: automatiza. Baja confianza: escala a una persona.">
          <ConfidenceMatrix />
        </Figure>

        <H2 id="agentes">6. Jev dentro de un agente</H2>
        <p>
          Un agente puede decir que ha terminado una tarea mientras los tests siguen fallando. Jev puede inspeccionar el estado y
          responder preguntas acotadas: <em>¿han pasado los tests?</em>, <em>¿el agente está repitiendo la misma acción?</em>,
          <em> ¿la salida cumple la política?</em>, <em>¿hay que revisar este resultado?</em>
        </p>
        <p className="mt-4">
          No sustituye a un test cuando existe uno: añade una <strong className="text-fg">comprobación semántica</strong> allí donde
          la regla depende del significado. Como responde en milisegundos, se puede meter en varios puntos del bucle del agente sin
          ralentizarlo:
        </p>
        <figure className="my-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/jev-agent-loop.png"
            alt="Bucle de un agente: 1 contexto y estado, 2 Jev elige modelo, 3 LLM, 4 llamada a herramienta, 5 Jev aprueba la herramienta, 6 se ejecuta, 7 Jev verifica el resultado y vuelve al contexto."
            className="mx-auto w-full max-w-2xl rounded-xl border border-border"
          />
          <figcaption className="mt-3 text-center text-sm text-fg-dim">
            En verde, los puntos de control de Jev; lo demás es el bucle normal de un agente.
          </figcaption>
        </figure>
        <ol className="list-decimal space-y-2 pl-5">
          <li><strong className="text-fg">Antes de la llamada (2) · elegir modelo:</strong> ¿esta tarea necesita el modelo grande o basta uno barato? (<code>choice</code>)</li>
          <li><strong className="text-fg">Antes de ejecutar (5) · aprobar la herramienta:</strong> ¿es destructiva?, ¿está dentro del alcance?, ¿cuánto daño podría hacer? Es exactamente el ejemplo «Guardarraíl de herramientas» del playground.</li>
          <li><strong className="text-fg">Después de ejecutar (7) · verificar:</strong> ¿se cumplió el objetivo?, ¿el agente está en bucle?, ¿hace falta una persona?</li>
        </ol>

        <H2 id="casos">7. Problemas que Jev resuelve hoy</H2>
        <p>
          Los mejores casos de uso comparten tres propiedades: <strong className="text-fg">puedes enumerar las respuestas posibles</strong>,
          una persona cuidadosa podría juzgar la entrada rápido, y la decisión se repite <strong className="text-fg">tan a menudo</strong> que
          la latencia o el coste importan.
        </p>
        <div className="my-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-bg-elev p-5 text-[15px]">
            <p className="mb-2 font-semibold text-accent">Soporte y operaciones</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Clasificar intención, urgencia, departamento, spam y frustración del cliente.</li>
              <li>Encaminar reembolsos y excepciones de política con varias comprobaciones pequeñas.</li>
              <li>Ordenar logs e incidencias por gravedad semántica antes de que los lea una persona.</li>
            </ul>
            <p className="mt-3 text-[14px] text-fg-dim">Una sola petición puede hacer todas estas preguntas sobre el mismo ticket; tu código las combina en la política real de enrutado.</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-elev p-5 text-[15px]">
            <p className="mb-2 font-semibold text-info">Búsqueda y recuperación (RAG)</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Reordenar pasajes recuperados según si responden a la consulta.</li>
              <li>Comprobar si una cita respalda de verdad una afirmación.</li>
              <li>Filtrar fragmentos irrelevantes antes de mandar el contexto a un LLM caro.</li>
            </ul>
            <p className="mt-3 text-[14px] text-fg-dim">Los embeddings encuentran texto relacionado; Jev toma la decisión más estrecha: ¿este pasaje sirve para esta pregunta?</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-elev p-5 text-[15px]">
            <p className="mb-2 font-semibold text-bad">Calidad y seguridad</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Detectar jailbreaks o inyección de prompts.</li>
              <li>Revisar contenido generado contra una política o rúbrica.</li>
              <li>Marcar cambios de código o llamadas a herramientas arriesgadas antes de ejecutarlas.</li>
            </ul>
            <p className="mt-3 text-[14px] text-fg-dim">Van junto a los controles deterministas: permisos, sandboxes y tests siguen aplicando las reglas exactas.</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-elev p-5 text-[15px]">
            <p className="mb-2 font-semibold text-ok">Clasificación masiva</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Etiquetar documentos, papers, productos o mensajes de clientes.</li>
              <li>Convertir texto libre en features para un modelo de ML clásico.</li>
              <li>Puntuar cada elemento de un corpus grande con la misma rúbrica.</li>
            </ul>
            <p className="mt-3 text-[14px] text-fg-dim">Aquí el coste por llamada deja de ser un número de benchmark: un juicio que era demasiado caro para cada fila entra en el pipeline normal.</p>
          </div>
        </div>

        <H2 id="api">8. Anatomía de una petición</H2>
        <p>
          Una petición tiene tres campos: <code>model</code>, <code>state</code> (cualquier texto o JSON) y
          <code> questions</code>, un mapa de preguntas tipadas. Así pregunta el ejemplo del clasificador de spam:
        </p>
        <pre className="my-6 overflow-x-auto rounded-xl border border-border bg-bg-elev p-4 font-mono text-[13px] leading-relaxed text-fg">{REQUEST_EXAMPLE}</pre>
        <p>Y esto es lo que vuelve: un objeto tipado por cada pregunta, sin texto que parsear.</p>
        <pre className="my-6 overflow-x-auto rounded-xl border border-border bg-bg-elev p-4 font-mono text-[13px] leading-relaxed text-fg">{RESPONSE_EXAMPLE}</pre>

        <H2 id="vercel">9. Usarlo con Vercel AI Gateway</H2>
        <p>
          Jev está disponible en el AI Gateway de Vercel con el id <code>typesafe-ai/jev</code>, usando el mismo formato de
          petición que la API nativa de TypeSafe. Para conseguir la clave:
        </p>
        <pre className="my-6 overflow-x-auto rounded-xl border border-border bg-bg-elev p-4 font-mono text-[13px] text-fg">npx vercel ai-gateway setup</pre>
        <p>
          Ni TypeSafe ni el Gateway aceptan llamadas directas desde el navegador (CORS), así que el playground incluye un
          pequeño proxy en <code>src/app/api/jev/route.ts</code>. La clave vive solo en el <code>localStorage</code> del
          navegador y viaja en cada petición; el servidor nunca la guarda.
        </p>
        <Figure caption="Recorrido de cada petición en el playground.">
          <AppFlow />
        </Figure>
        <p>
          <strong className="text-fg">Comparativa en vivo.</strong> Si eliges el proveedor Vercel AI Gateway, cada ejecución
          manda también el mismo estado y las mismas preguntas a <code>openai/gpt-5-nano</code>. En la traza verás la latencia,
          los tokens y el coste de los dos modelos, además de cuánto costaría hacer un millón de llamadas. Los precios están en{" "}
          <code>src/lib/compare.ts</code>.
        </p>

        <H2 id="ejercicios">10. Ejercicios para clase</H2>
        <ol className="list-decimal space-y-3 pl-5">
          <li><strong className="text-fg">Mueve la aguja.</strong> En el clasificador de spam, edita el correo hasta que <code>is_spam</code> baje de 0,5. ¿Qué palabras pesaban más?</li>
          <li><strong className="text-fg">Busca la duda.</strong> En el guardarraíl de herramientas, escribe una llamada ambigua y observa cómo cae la <code>confidence</code>.</li>
          <li><strong className="text-fg">Fan-out.</strong> En la bandeja de soporte, compara la latencia de 1 pregunta frente a 10. ¿Escala lineal?</li>
          <li><strong className="text-fg">Diseña tu umbral.</strong> Cambia la función <code>decide()</code> de un ejemplo en <code>src/lib/examples.ts</code> y justifica tus umbrales.</li>
          <li><strong className="text-fg">Crea tu ejemplo.</strong> Añade un caso de tu dominio con al menos una pregunta de cada primitiva.</li>
        </ol>

        <div className="mt-16 rounded-2xl border border-accent/40 bg-accent-soft p-6 text-center">
          <p className="text-lg font-semibold text-fg">Suficiente teoría.</p>
          <p className="mt-1">Abre el playground, pega tu clave de Vercel AI Gateway y lanza el primer ejemplo.</p>
          <Link href="/" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 font-semibold text-white hover:opacity-90">
            Ir al playground →
          </Link>
        </div>

        <p className="mt-12 text-sm text-fg-dim">
          Fuentes: <a className="underline hover:text-accent" href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">TypeSafe, «Introducing System One models and Jev»</a> ·{" "}
          <a className="underline hover:text-accent" href="https://flaviocopes.com/jev/">Flavio Copes, «A deep dive into Jev»</a> ·{" "}
          <a className="underline hover:text-accent" href="https://www.mindstudio.ai/blog/jev-system-one-model-launch">MindStudio</a> ·{" "}
          <a className="underline hover:text-accent" href="https://github.com/davila7/jev-explained">davila7/jev-explained</a> ·{" "}
          <a className="underline hover:text-accent" href="https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe">Documentación de Vercel AI Gateway</a>. Las cifras son las publicadas por TypeSafe.
        </p>
      </article>
    </div>
  );
}
