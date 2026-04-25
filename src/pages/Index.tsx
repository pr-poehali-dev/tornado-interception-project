import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const TORNADO_IMG = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/d913a1c0-677c-402a-a154-3520876980bd.jpg";
const VEHICLE_IMG = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/02ae0a8e-0772-4167-91ea-3a4912a4b9de.jpg";
const STATION_IMG = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/42f84fd4-07f4-455a-bbb9-aa9e8d345f93.jpg";

type Screen = "menu" | "campaign" | "game" | "dialog";

const LEVELS = [
  {
    id: 1,
    name: "Первый Шторм",
    subtitle: "Оклахома, 2024",
    description: "Команда новобранцев сталкивается с первым торнадо EF2. Развертывание мобильной станции.",
    difficulty: "ЛЕГКО",
    tornadoType: "EF2",
    color: "#4ade80",
    unlocked: true,
    objectives: ["Развернуть станцию в 500м от торнадо", "Собрать 3 пакета данных", "Выжить"],
  },
  {
    id: 2,
    name: "Двойная Угроза",
    subtitle: "Техас, 2024",
    description: "Два торнадо движутся навстречу. Критические условия для исследования слияния вихрей.",
    difficulty: "СРЕДНЕ",
    tornadoType: "EF3",
    color: "#facc15",
    unlocked: true,
    objectives: ["Отследить оба торнадо", "Зафиксировать момент слияния", "Эвакуировать станцию"],
  },
  {
    id: 3,
    name: "Монстр Категории 5",
    subtitle: "Канзас, 2024",
    description: "EF5 — редчайшее явление. Ширина 3 километра. Команда рискует всем ради данных.",
    difficulty: "ХАРДКОР",
    tornadoType: "EF5",
    color: "#f97316",
    unlocked: false,
    objectives: ["Приблизиться на 200м", "Запустить зонды внутрь", "Уйти живыми"],
  },
  {
    id: 4,
    name: "Ночной Кошмар",
    subtitle: "Миссури, 2024",
    description: "Ночной торнадо. Видимость нулевая. Только радар и интуиция опытного охотника.",
    difficulty: "ЭКСТРИМ",
    tornadoType: "EF4",
    color: "#c084fc",
    unlocked: false,
    objectives: ["Обнаружить торнадо в темноте", "Навигация только по радару", "Спасти фермеров"],
  },
];

const DIALOGS = [
  {
    character: "Доктор Александра Морозова",
    role: "Главный метеоролог",
    text: "Команда, сигнал с радара подтверждён. EF2 формируется в 15 километрах. Это наш шанс получить данные, которых нет ни у одной лаборатории в мире.",
    avatar: "🧬",
  },
  {
    character: "Максим Стальнов",
    role: "Водитель-исследователь",
    text: "Дорога размыта. Но я провезу нас туда. Мы делали это раньше при EF3, справимся и с этим. Пристегнитесь.",
    avatar: "🚗",
  },
  {
    character: "Инженер Денис Облаков",
    role: "Специалист по оборудованию",
    text: "Станция готова к развертыванию. Новые датчики давления выдержат ветер до 400 км/ч. Теоретически... Выдвигаемся!",
    avatar: "⚙️",
  },
];

const WindParticle = ({ style }: { style: React.CSSProperties }) => (
  <div
    className="absolute h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent animate-wind-drift"
    style={{ width: `${Math.random() * 100 + 50}px`, ...style }}
  />
);

const TornadoCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = () => {
      timeRef.current += 0.02;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const layers = 60;

      for (let i = 0; i < layers; i++) {
        const progress = i / layers;
        const y = h * 0.1 + h * 0.85 * progress;
        const radius = 8 + progress * progress * w * 0.35;
        const alpha = 0.03 + progress * 0.12;
        const speed = (1 - progress * 0.6) * 2;
        const angle = t * speed + (i * Math.PI * 2) / 10;

        const x = cx + Math.sin(angle) * radius * 0.3;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, `rgba(100, 120, 80, ${alpha * 1.5})`);
        gradient.addColorStop(0.5, `rgba(60, 80, 50, ${alpha})`);
        gradient.addColorStop(1, `rgba(30, 40, 20, 0)`);

        ctx.beginPath();
        ctx.ellipse(x, y, radius * 0.4, radius * 0.15, angle * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Core funnel
      ctx.beginPath();
      ctx.moveTo(cx, h * 0.08);
      for (let i = 0; i < 80; i++) {
        const progress = i / 80;
        const y = h * 0.08 + h * 0.88 * progress;
        const spread = 3 + progress * progress * w * 0.28;
        const wave = Math.sin(t * 3 + progress * 12) * spread * 0.3;
        ctx.lineTo(cx + spread + wave, y);
      }
      for (let i = 80; i >= 0; i--) {
        const progress = i / 80;
        const y = h * 0.08 + h * 0.88 * progress;
        const spread = 3 + progress * progress * w * 0.28;
        const wave = Math.sin(t * 3 + progress * 12 + Math.PI) * spread * 0.3;
        ctx.lineTo(cx - spread + wave, y);
      }
      ctx.closePath();

      const funnelGrad = ctx.createLinearGradient(cx - 100, 0, cx + 100, 0);
      funnelGrad.addColorStop(0, "rgba(50, 70, 40, 0.15)");
      funnelGrad.addColorStop(0.5, "rgba(80, 100, 60, 0.25)");
      funnelGrad.addColorStop(1, "rgba(50, 70, 40, 0.15)");
      ctx.fillStyle = funnelGrad;
      ctx.fill();

      // Debris
      for (let d = 0; d < 20; d++) {
        const debrisT = (t * 0.5 + d * 0.31) % 1;
        const debrisProgress = debrisT;
        const debrisY = h * 0.1 + h * 0.85 * debrisProgress;
        const debrisRadius = 8 + debrisProgress * debrisProgress * w * 0.35;
        const debrisAngle = t * 4 + d * 1.3;
        const debrisX = cx + Math.cos(debrisAngle) * debrisRadius * 0.7;
        const size = 2 + Math.random() * 3;

        ctx.save();
        ctx.translate(debrisX, debrisY);
        ctx.rotate(debrisAngle * 2);
        ctx.fillStyle = `rgba(80, 60, 30, ${0.6 - debrisProgress * 0.4})`;
        ctx.fillRect(-size / 2, -size / 2, size, size * 0.3);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

const RadarDisplay = ({ windSpeed, pressure, category }: { windSpeed: number; pressure: number; category: string }) => (
  <div className="relative w-32 h-32">
    <div className="absolute inset-0 rounded-full border border-green-500/30 bg-black/60 backdrop-blur-sm" />
    <div className="absolute inset-2 rounded-full border border-green-500/20" />
    <div className="absolute inset-4 rounded-full border border-green-500/15" />
    <div className="absolute inset-6 rounded-full border border-green-500/10" />
    <div
      className="absolute top-1/2 left-1/2 w-px origin-bottom bg-green-400/70"
      style={{
        height: "45%",
        transform: `translateX(-50%) rotate(${Date.now() / 20}deg)`,
        animation: "spin 2s linear infinite",
      }}
    />
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="font-mono text-green-400 text-xs font-bold">{category}</span>
      <span className="font-mono text-green-300 text-[10px]">{windSpeed} км/ч</span>
    </div>
    <div className="absolute inset-0 rounded-full bg-green-400/5 animate-radar-ping" />
  </div>
);

export default function Index() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedLevel, setSelectedLevel] = useState(LEVELS[0]);
  const [dialogIndex, setDialogIndex] = useState(0);
  const [windParticles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 90}%`,
      animationDelay: `${Math.random() * 8}s`,
      animationDuration: `${6 + Math.random() * 8}s`,
      opacity: 0.1 + Math.random() * 0.3,
    }))
  );
  const [gameTime, setGameTime] = useState(0);
  const [dataCollected, setDataCollected] = useState(0);
  const [windSpeed, setWindSpeed] = useState(180);
  const [pressure, setPressure] = useState(950);

  useEffect(() => {
    if (screen !== "game") return;
    const interval = setInterval(() => {
      setGameTime((t) => t + 1);
      setWindSpeed((w) => Math.max(150, Math.min(420, w + (Math.random() - 0.5) * 20)));
      setPressure((p) => Math.max(870, Math.min(980, p + (Math.random() - 0.5) * 5)));
      if (Math.random() > 0.7) setDataCollected((d) => Math.min(100, d + Math.floor(Math.random() * 8)));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  return (
    <div
      className="min-h-screen bg-black text-white overflow-hidden relative font-rubik"
      style={{ background: "linear-gradient(180deg, #0a0f05 0%, #0d1a08 40%, #0f1f0a 100%)" }}
    >
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 30%, #1a3a0a 0%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 animate-lightning" style={{ background: "radial-gradient(ellipse 200px 300px at 70% 20%, rgba(200,220,255,0.15), transparent)" }} />

        {windParticles.map((p) => (
          <div
            key={p.id}
            className="absolute h-px animate-wind-drift"
            style={{
              top: p.top,
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
              opacity: p.opacity,
              width: `${60 + Math.random() * 120}px`,
              background: "linear-gradient(90deg, transparent, rgba(150,200,100,0.6), transparent)",
            }}
          />
        ))}
      </div>

      {/* ===== MAIN MENU ===== */}
      {screen === "menu" && (
        <div className="relative min-h-screen flex flex-col">
          {/* Hero image */}
          <div className="absolute inset-0">
            <img src={TORNADO_IMG} alt="Торнадо" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,15,5,0.3) 0%, rgba(10,15,5,0.6) 50%, rgba(10,15,5,0.95) 100%)" }} />
          </div>

          <div className="relative z-10 flex flex-col min-h-screen">
            {/* Top bar */}
            <div className="flex justify-between items-center px-8 pt-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse-danger" />
                <span className="font-mono text-orange-400 text-xs tracking-widest">STORM ALERT ACTIVE</span>
              </div>
              <div className="font-mono text-gray-500 text-xs tracking-widest">v1.0 BETA</div>
            </div>

            {/* Main title */}
            <div className="flex-1 flex flex-col justify-center px-8 lg:px-20">
              <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <div className="font-mono text-green-400/60 text-sm tracking-[0.3em] mb-4 uppercase">
                  National Tornado Research Division
                </div>
              </div>

              <div className="animate-fade-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
                <h1
                  className="font-bebas text-[clamp(4rem,15vw,14rem)] leading-none tracking-wider text-white"
                  style={{ textShadow: "0 0 80px rgba(100,200,50,0.2), 0 4px 30px rgba(0,0,0,0.8)" }}
                >
                  STORM
                </h1>
                <h1
                  className="font-bebas text-[clamp(3rem,12vw,11rem)] leading-none tracking-widest"
                  style={{
                    WebkitTextStroke: "2px rgba(150,220,80,0.8)",
                    color: "transparent",
                    textShadow: "0 0 40px rgba(150,220,80,0.3)",
                  }}
                >
                  CHASER
                </h1>
              </div>

              <div className="animate-fade-up mt-6 max-w-xl" style={{ animationDelay: "0.4s", opacity: 0 }}>
                <p className="font-oswald text-gray-300 text-lg font-light tracking-wide leading-relaxed">
                  Реалистичная физика торнадо. Динамическая погода. Живые персонажи.
                  <br />
                  <span className="text-green-400">Наука требует жертв.</span>
                </p>
              </div>

              {/* CTA */}
              <div className="animate-fade-up mt-10 flex flex-wrap gap-4" style={{ animationDelay: "0.6s", opacity: 0 }}>
                <button
                  onClick={() => setScreen("campaign")}
                  className="group relative overflow-hidden px-10 py-4 font-oswald text-lg font-semibold tracking-widest uppercase transition-all duration-300"
                  style={{
                    background: "linear-gradient(135deg, #4a8a1a, #2d5c0a)",
                    border: "1px solid rgba(100,200,50,0.4)",
                    clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                  }}
                >
                  <span className="relative z-10 text-white">▶ НАЧАТЬ КАМПАНИЮ</span>
                  <div className="absolute inset-0 bg-green-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  className="px-8 py-4 font-oswald text-lg font-light tracking-widest uppercase text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-all duration-300"
                  style={{
                    clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
                  }}
                >
                  ⚙ НАСТРОЙКИ
                </button>
              </div>

              {/* Stats row */}
              <div className="animate-fade-up mt-16 flex gap-8 border-t border-gray-800 pt-8" style={{ animationDelay: "0.8s", opacity: 0 }}>
                {[
                  { label: "УРОВНЕЙ", value: "12" },
                  { label: "ТИПОВ ТОРНАДО", value: "8" },
                  { label: "ПЕРСОНАЖЕЙ", value: "6" },
                  { label: "ФИЗИЧЕСКИХ ПАРАМЕТРОВ", value: "47" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="font-bebas text-4xl text-green-400">{stat.value}</div>
                    <div className="font-mono text-gray-500 text-xs tracking-widest">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CAMPAIGN SCREEN ===== */}
      {screen === "campaign" && (
        <div className="relative min-h-screen">
          {/* Back */}
          <button
            onClick={() => setScreen("menu")}
            className="fixed top-6 left-6 z-50 flex items-center gap-2 font-mono text-sm text-gray-400 hover:text-green-400 transition-colors"
          >
            <Icon name="ChevronLeft" size={16} />
            НАЗАД
          </button>

          <div className="pt-20 px-6 lg:px-16 pb-12">
            <div className="animate-fade-up" style={{ opacity: 0 }}>
              <div className="font-mono text-green-400/60 text-xs tracking-[0.3em] mb-2">РЕЖИМ КАМПАНИИ</div>
              <h2 className="font-bebas text-7xl tracking-widest text-white mb-2">ОПЕРАЦИИ</h2>
              <div className="w-20 h-0.5 bg-green-500 mb-8" />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {LEVELS.map((level, idx) => (
                <div
                  key={level.id}
                  className={`relative group cursor-pointer border transition-all duration-300 overflow-hidden ${
                    level.unlocked
                      ? "border-gray-700 hover:border-green-500/50"
                      : "border-gray-800 opacity-60 cursor-not-allowed"
                  }`}
                  style={{
                    background: "linear-gradient(135deg, rgba(15,25,8,0.9), rgba(8,15,4,0.95))",
                    animationDelay: `${idx * 0.1}s`,
                    clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
                  }}
                  onClick={() => {
                    if (level.unlocked) {
                      setSelectedLevel(level);
                      setScreen("dialog");
                      setDialogIndex(0);
                    }
                  }}
                >
                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `radial-gradient(ellipse at 30% 50%, ${level.color}08, transparent)` }}
                  />

                  <div className="relative p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className="font-mono text-xs px-2 py-0.5 font-bold"
                            style={{ color: level.color, border: `1px solid ${level.color}40`, background: `${level.color}10` }}
                          >
                            {level.tornadoType}
                          </span>
                          <span
                            className="font-mono text-xs px-2 py-0.5"
                            style={{ color: level.color + "aa" }}
                          >
                            {level.difficulty}
                          </span>
                        </div>
                        <h3 className="font-bebas text-3xl text-white tracking-wide">{level.name}</h3>
                        <div className="font-mono text-gray-500 text-xs">{level.subtitle}</div>
                      </div>
                      <div className="text-3xl font-bebas text-gray-700">
                        {level.unlocked ? `0${level.id}` : "🔒"}
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm leading-relaxed mb-4 font-rubik">{level.description}</p>

                    <div className="space-y-1">
                      {level.objectives.map((obj, i) => (
                        <div key={i} className="flex items-center gap-2 font-mono text-xs text-gray-500">
                          <div className="w-1 h-1 rounded-full" style={{ background: level.color + "60" }} />
                          {obj}
                        </div>
                      ))}
                    </div>

                    {level.unlocked && (
                      <div
                        className="mt-4 flex items-center gap-2 font-oswald text-sm tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: level.color }}
                      >
                        НАЧАТЬ МИССИЮ <Icon name="ArrowRight" size={14} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== DIALOG / BRIEFING ===== */}
      {screen === "dialog" && (
        <div className="relative min-h-screen flex flex-col">
          <div className="absolute inset-0">
            <img src={VEHICLE_IMG} alt="Машина" className="w-full h-full object-cover opacity-25" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,15,5,0.7) 0%, rgba(10,15,5,0.85) 100%)" }} />
          </div>

          <div className="relative z-10 flex flex-col min-h-screen p-8">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setScreen("campaign")}
                className="flex items-center gap-2 font-mono text-sm text-gray-400 hover:text-green-400 transition-colors"
              >
                <Icon name="ChevronLeft" size={16} />
                К ВЫБОРУ УРОВНЯ
              </button>
              <div className="font-mono text-gray-600 text-xs tracking-widest">
                БРИФИНГ — {selectedLevel.name.toUpperCase()}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
              {/* Dialog box */}
              <div
                className="mb-8 p-8 border border-gray-700 animate-fade-up"
                style={{
                  background: "linear-gradient(135deg, rgba(15,25,8,0.95), rgba(8,15,4,0.98))",
                  clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))",
                  opacity: 0,
                }}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: "rgba(100,200,50,0.1)", border: "1px solid rgba(100,200,50,0.3)" }}
                  >
                    {DIALOGS[dialogIndex].avatar}
                  </div>
                  <div>
                    <div className="font-oswald font-semibold text-white text-lg tracking-wide">
                      {DIALOGS[dialogIndex].character}
                    </div>
                    <div className="font-mono text-green-400/60 text-xs tracking-widest">
                      {DIALOGS[dialogIndex].role}
                    </div>
                  </div>
                </div>

                <p className="text-gray-200 text-lg leading-relaxed font-rubik font-light">
                  "{DIALOGS[dialogIndex].text}"
                </p>

                <div className="mt-6 flex gap-2">
                  {DIALOGS.map((_, i) => (
                    <div
                      key={i}
                      className="h-0.5 flex-1 transition-all duration-300"
                      style={{ background: i <= dialogIndex ? "#4ade80" : "rgba(100,200,50,0.2)" }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                {dialogIndex < DIALOGS.length - 1 ? (
                  <button
                    onClick={() => setDialogIndex((i) => i + 1)}
                    className="flex-1 py-4 font-oswald text-lg font-semibold tracking-widest uppercase transition-all duration-300 text-white"
                    style={{
                      background: "linear-gradient(135deg, rgba(50,100,20,0.8), rgba(30,60,10,0.9))",
                      border: "1px solid rgba(100,200,50,0.3)",
                      clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                    }}
                  >
                    ДАЛЕЕ →
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setDataCollected(0);
                      setGameTime(0);
                      setWindSpeed(180);
                      setPressure(950);
                      setScreen("game");
                    }}
                    className="flex-1 py-4 font-oswald text-lg font-bold tracking-widest uppercase text-black transition-all duration-300 animate-pulse-danger"
                    style={{
                      background: "linear-gradient(135deg, #6abf25, #4a8a15)",
                      clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                    }}
                  >
                    ▶ НАЧАТЬ МИССИЮ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== GAME SCREEN ===== */}
      {screen === "game" && (
        <div className="relative h-screen flex flex-col overflow-hidden">
          {/* Tornado visual */}
          <div className="absolute inset-0">
            <img src={STATION_IMG} alt="Станция" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,10,3,0.6) 0%, rgba(5,10,3,0.3) 50%, rgba(5,10,3,0.8) 100%)" }} />
          </div>

          {/* Tornado canvas animation */}
          <div className="absolute right-0 top-0 w-1/3 h-full opacity-80">
            <TornadoCanvas />
          </div>

          {/* HUD - Top bar */}
          <div className="relative z-20 flex items-center justify-between px-6 pt-4 pb-3 border-b border-gray-800/60 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setScreen("menu")}
                className="flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                <Icon name="X" size={14} /> ВЫЙТИ
              </button>
              <div className="font-bebas text-2xl text-green-400 tracking-widest">
                {selectedLevel.name.toUpperCase()}
              </div>
              <div className="font-mono text-gray-500 text-xs">{selectedLevel.subtitle}</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="font-mono text-xs text-gray-400">
                ВРЕМЯ:{" "}
                <span className="text-white">
                  {String(Math.floor(gameTime / 60)).padStart(2, "0")}:
                  {String(gameTime % 60).padStart(2, "0")}
                </span>
              </div>
              <div
                className="px-3 py-1 font-mono text-xs font-bold animate-pulse-danger"
                style={{
                  color: selectedLevel.color,
                  border: `1px solid ${selectedLevel.color}50`,
                  background: `${selectedLevel.color}10`,
                }}
              >
                {selectedLevel.tornadoType} АКТИВЕН
              </div>
            </div>
          </div>

          {/* Main game area */}
          <div className="relative z-10 flex-1 flex">
            {/* Left panel - Controls */}
            <div
              className="w-72 border-r border-gray-800/60 bg-black/50 backdrop-blur-sm p-4 flex flex-col gap-4"
            >
              <div className="font-mono text-green-400/60 text-xs tracking-widest mb-2">ПАНЕЛЬ УПРАВЛЕНИЯ</div>

              {/* Wind speed */}
              <div className="p-3 border border-gray-800 bg-black/30">
                <div className="font-mono text-gray-500 text-xs mb-1 tracking-widest">СКОРОСТЬ ВЕТРА</div>
                <div className="flex items-end gap-2">
                  <span className="font-bebas text-4xl" style={{ color: windSpeed > 300 ? "#f97316" : windSpeed > 200 ? "#facc15" : "#4ade80" }}>
                    {Math.round(windSpeed)}
                  </span>
                  <span className="font-mono text-gray-500 text-xs mb-1">КМ/Ч</span>
                </div>
                <div className="w-full h-1 bg-gray-800 mt-2">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${((windSpeed - 100) / 320) * 100}%`,
                      background: windSpeed > 300 ? "#f97316" : windSpeed > 200 ? "#facc15" : "#4ade80",
                    }}
                  />
                </div>
              </div>

              {/* Pressure */}
              <div className="p-3 border border-gray-800 bg-black/30">
                <div className="font-mono text-gray-500 text-xs mb-1 tracking-widest">ДАВЛЕНИЕ</div>
                <div className="flex items-end gap-2">
                  <span className="font-bebas text-4xl text-blue-400">{Math.round(pressure)}</span>
                  <span className="font-mono text-gray-500 text-xs mb-1">ГПА</span>
                </div>
              </div>

              {/* Data collected */}
              <div className="p-3 border border-gray-800 bg-black/30">
                <div className="font-mono text-gray-500 text-xs mb-2 tracking-widest">СБОР ДАННЫХ</div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bebas text-2xl text-green-400">{dataCollected}%</span>
                  <span className="font-mono text-xs text-gray-600">{dataCollected >= 100 ? "✓ ГОТОВО" : "В ПРОЦЕССЕ"}</span>
                </div>
                <div className="w-full h-2 bg-gray-800">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${dataCollected}%`,
                      background: "linear-gradient(90deg, #16a34a, #4ade80)",
                    }}
                  />
                </div>
              </div>

              {/* Radar */}
              <div className="flex justify-center py-2">
                <RadarDisplay windSpeed={Math.round(windSpeed)} pressure={Math.round(pressure)} category={selectedLevel.tornadoType} />
              </div>

              {/* Action buttons */}
              <div className="space-y-2 mt-auto">
                {["РАЗВЕРНУТЬ СТАНЦИЮ", "ЗАПУСТИТЬ ЗОНД", "ЭКСТРЕННЫЙ ВЫЕЗД"].map((action, i) => (
                  <button
                    key={action}
                    className="w-full py-2.5 font-oswald text-sm tracking-widest uppercase transition-all duration-200 text-left px-3"
                    style={{
                      background: i === 2 ? "rgba(239,68,68,0.1)" : "rgba(50,80,20,0.2)",
                      border: `1px solid ${i === 2 ? "rgba(239,68,68,0.3)" : "rgba(100,200,50,0.2)"}`,
                      color: i === 2 ? "#f87171" : "#86efac",
                      clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)",
                    }}
                  >
                    {i === 0 ? "▦" : i === 1 ? "◉" : "⚠"} {action}
                  </button>
                ))}
              </div>
            </div>

            {/* Center - main viewport */}
            <div className="flex-1 relative flex items-end justify-center pb-8">
              {/* Objectives overlay */}
              <div
                className="absolute top-4 right-4 p-4 border border-gray-800 bg-black/60 backdrop-blur-sm w-56"
                style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
              >
                <div className="font-mono text-green-400/60 text-xs tracking-widest mb-3">ЗАДАЧИ</div>
                {selectedLevel.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <div className={`w-3 h-3 border mt-0.5 flex-shrink-0 ${i === 0 && dataCollected > 30 ? "bg-green-500 border-green-500" : "border-gray-600"}`} />
                    <span className={`font-rubik text-xs leading-snug ${i === 0 && dataCollected > 30 ? "text-gray-500 line-through" : "text-gray-300"}`}>
                      {obj}
                    </span>
                  </div>
                ))}
              </div>

              {/* Atmospheric warning */}
              {windSpeed > 300 && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 border border-red-500/50 bg-red-500/10 animate-pulse-danger">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-mono text-red-400 text-xs tracking-widest">КРИТИЧЕСКИЙ ВЕТЕР</span>
                </div>
              )}

              {/* Ground indicators */}
              <div className="flex gap-6 items-center">
                {["СТАНЦИЯ А", "ТРАНСПОРТ", "ЗОНД-1"].map((item, i) => (
                  <div key={item} className="flex flex-col items-center gap-2">
                    <div
                      className="w-12 h-12 flex items-center justify-center text-xl border"
                      style={{
                        background: "rgba(20,40,10,0.8)",
                        borderColor: "rgba(100,200,50,0.3)",
                        clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                      }}
                    >
                      {i === 0 ? "📡" : i === 1 ? "🚐" : "🎯"}
                    </div>
                    <span className="font-mono text-xs text-green-400/60">{item}</span>
                    <div className="w-px h-3 bg-green-500/30" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom status bar */}
          <div className="relative z-20 flex items-center justify-between px-6 py-2 border-t border-gray-800/60 bg-black/40 backdrop-blur-sm">
            <div className="flex gap-6">
              {[
                { label: "ШИРОТА", value: "35.467°N" },
                { label: "ДОЛГОТА", value: "97.513°W" },
                { label: "ДИСТАНЦИЯ ДО ВИХРЯ", value: `${Math.round(500 - dataCollected * 3)}м` },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="font-mono text-gray-600 text-xs">{item.label}:</span>
                  <span className="font-mono text-green-400 text-xs">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="font-mono text-gray-600 text-xs">
              STORM CHASER v1.0 | ФИЗИКА АКТИВНА
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
