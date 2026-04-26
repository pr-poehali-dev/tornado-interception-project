import { useState, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const IMG_MAP = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/94afdfe9-8f1b-4d1b-93cd-1eb6b49696ad.jpg";
const IMG_TIV = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/137fe18e-c36f-4c79-aff1-a553f731166d.jpg";
const IMG_TORNADO = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/c0f1f7d6-fe37-410d-ba6f-9d1900c2f133.jpg";
const IMG_PLAINS = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/8e7218e8-9afb-4b2d-b319-3f18e8c94a6a.jpg";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  name: string;
  emoji: string;
  armor: number;       // 1-5
  speed: number;       // 1-5
  capacity: number;    // кол-во оборудования
  desc: string;
  risk: number;        // штраф к выживанию %
}

interface Equipment {
  id: string;
  name: string;
  emoji: string;
  dataBonus: number;   // +% к данным
  riskMod: number;     // +/- % к риску
  slots: number;       // занимает слотов
  desc: string;
}

interface Position {
  id: string;
  label: string;
  x: number; // % на карте
  y: number;
  distanceM: number;    // метров от торнадо
  riskMod: number;      // % риска
  dataBonus: number;    // % данных
  desc: string;
}

interface Route {
  id: string;
  label: string;
  desc: string;
  riskMod: number;
  timeBonus: boolean;   // успеем до торнадо?
  emoji: string;
}

interface Build {
  vehicle: Vehicle | null;
  equipment: Equipment[];
  position: Position | null;
  route: Route | null;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const VEHICLES: Vehicle[] = [
  {
    id: "pickup",
    name: "Ford F-250",
    emoji: "🛻",
    armor: 1, speed: 5, capacity: 3,
    desc: "Стандартный пикап охотников. Быстрый, но уязвимый к мусору.",
    risk: 40,
  },
  {
    id: "suv",
    name: "Chevy Suburban",
    emoji: "🚙",
    armor: 2, speed: 4, capacity: 4,
    desc: "Просторный внедорожник. Больше места для оборудования.",
    risk: 30,
  },
  {
    id: "tiv",
    name: "TIV-2 Перехватчик",
    emoji: "🚛",
    armor: 5, speed: 2, capacity: 5,
    desc: "Бронированный перехватчик торнадо. Выдерживает прямое попадание.",
    risk: 8,
  },
  {
    id: "dod",
    name: "DOW Доплер",
    emoji: "📡",
    armor: 2, speed: 3, capacity: 6,
    desc: "Грузовик с доплеровским радаром. Максимум данных, средняя защита.",
    risk: 25,
  },
];

const EQUIPMENT: Equipment[] = [
  {
    id: "turtle",
    name: "Зонд-черепаха",
    emoji: "🐢",
    dataBonus: 35, riskMod: +5, slots: 1,
    desc: "Изобретение Самараса. Ставится прямо на пути торнадо.",
  },
  {
    id: "drone",
    name: "Дрон-разведчик",
    emoji: "🚁",
    dataBonus: 20, riskMod: -5, slots: 1,
    desc: "Безопасный сбор данных с воздуха. Меньше риска, меньше точности.",
  },
  {
    id: "doppler",
    name: "Портативный радар",
    emoji: "📻",
    dataBonus: 25, riskMod: -8, slots: 2,
    desc: "Отслеживает путь торнадо в реальном времени. Снижает риск.",
  },
  {
    id: "camera",
    name: "Камера 4K",
    emoji: "🎥",
    dataBonus: 10, riskMod: 0, slots: 1,
    desc: "Документирование экспедиции. Нужно для National Geographic.",
  },
  {
    id: "windsock",
    name: "Метеостанция",
    emoji: "🌡️",
    dataBonus: 15, riskMod: -3, slots: 2,
    desc: "Давление, влажность, температура. Ценные атмосферные данные.",
  },
  {
    id: "anchor",
    name: "Земляные якоря",
    emoji: "⚓",
    dataBonus: 0, riskMod: -15, slots: 1,
    desc: "Крепят машину к земле. Только для TIV-2.",
  },
  {
    id: "medkit",
    name: "Медкомплект",
    emoji: "🏥",
    dataBonus: 0, riskMod: -10, slots: 1,
    desc: "На случай травм. Не поднимает данные, но спасает жизни.",
  },
  {
    id: "balloon",
    name: "Радиозонд",
    emoji: "🎈",
    dataBonus: 30, riskMod: +3, slots: 1,
    desc: "Запускается в стену торнадо. Высокий риск, уникальные данные.",
  },
];

const POSITIONS: Position[] = [
  {
    id: "far",
    label: "Безопасная зона",
    x: 15, y: 45,
    distanceM: 3000,
    riskMod: -30, dataBonus: 10,
    desc: "3 км от вихря. Почти нет данных, почти нет риска.",
  },
  {
    id: "medium",
    label: "Рабочая позиция",
    x: 35, y: 55,
    distanceM: 1200,
    riskMod: 0, dataBonus: 40,
    desc: "1.2 км — стандартная дистанция TWISTEX. Баланс риска и данных.",
  },
  {
    id: "close",
    label: "Передовая позиция",
    x: 55, y: 62,
    distanceM: 400,
    riskMod: +25, dataBonus: 70,
    desc: "400 м. Зонды можно поставить точно. Высокий риск.",
  },
  {
    id: "intercept",
    label: "Точка перехвата",
    x: 70, y: 58,
    distanceM: 100,
    riskMod: +55, dataBonus: 100,
    desc: "100 м от стены вихря. Только для TIV-2. Максимум данных.",
  },
];

const ROUTES: Route[] = [
  {
    id: "highway",
    label: "Шоссе I-40",
    emoji: "🛣️",
    desc: "Быстрый маршрут. Но много других машин — риск пробки при эвакуации.",
    riskMod: +8,
    timeBonus: true,
  },
  {
    id: "gravel",
    label: "Грунтовые дороги",
    emoji: "🌾",
    desc: "Объезд через поля. Медленнее, но нет машин. Гибкий маршрут.",
    riskMod: -5,
    timeBonus: false,
  },
  {
    id: "optimal",
    label: "Оптимальный маршрут",
    emoji: "🗺️",
    desc: "Расчёт по модели SPC: баланс скорости и безопасности.",
    riskMod: 0,
    timeBonus: true,
  },
  {
    id: "aggressive",
    label: "Агрессивный перехват",
    emoji: "⚡",
    desc: "Выехать навстречу торнадо. Максимум данных, минимум времени на отход.",
    riskMod: +20,
    timeBonus: true,
  },
];

// ── Result calculator ──────────────────────────────────────────────────────────

function calcResult(build: Build) {
  const v = build.vehicle!;
  const p = build.position!;
  const r = build.route!;
  const eq = build.equipment;

  let risk = v.risk + p.riskMod + r.riskMod;
  let data = p.dataBonus;

  for (const e of eq) {
    risk += e.riskMod;
    data += e.dataBonus;
  }

  // Anchor only works with TIV
  const hasAnchor = eq.some((e) => e.id === "anchor");
  if (hasAnchor && v.id !== "tiv") risk += 10;
  if (hasAnchor && v.id === "tiv") risk -= 10;

  // Intercept position needs TIV
  if (p.id === "intercept" && v.id !== "tiv") risk += 30;

  risk = Math.max(2, Math.min(98, risk));
  data = Math.min(100, data);

  const survived = Math.random() * 100 > risk;
  const qualityData = data > 60;

  return { risk: Math.round(risk), data: Math.round(data), survived, qualityData };
}

type ResultType = ReturnType<typeof calcResult>;

// ── Step bar ──────────────────────────────────────────────────────────────────

const STEPS = ["Машина", "Оборудование", "Маршрут", "Позиция", "Старт"];

const StepBar = ({ step }: { step: number }) => (
  <div className="flex items-center gap-0 mb-8">
    {STEPS.map((s, i) => (
      <div key={s} className="flex items-center flex-1">
        <div className="flex flex-col items-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-300"
            style={{
              background: i < step ? "#d97706" : i === step ? "#f59e0b" : "rgba(30,20,5,0.8)",
              border: i <= step ? "1px solid #f59e0b" : "1px solid rgba(100,70,10,0.3)",
              color: i <= step ? "#000" : "#4b3a12",
            }}
          >
            {i < step ? "✓" : i + 1}
          </div>
          <span
            className="font-mono text-[9px] tracking-widest mt-1 uppercase"
            style={{ color: i === step ? "#f59e0b" : i < step ? "#d97706" : "#2a1f06" }}
          >
            {s}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div
            className="flex-1 h-px mx-1 transition-all duration-500"
            style={{ background: i < step ? "#d97706" : "rgba(80,50,5,0.3)" }}
          />
        )}
      </div>
    ))}
  </div>
);

// ── Stat bar ──────────────────────────────────────────────────────────────────

const StatBar = ({ label, value, max = 5, color = "#f59e0b" }: { label: string; value: number; max?: number; color?: string }) => (
  <div className="flex items-center gap-2">
    <span className="font-mono text-[10px] text-gray-600 tracking-widest w-16 uppercase">{label}</span>
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-2 transition-all duration-300"
          style={{
            background: i < value ? color : "rgba(40,30,5,0.6)",
            clipPath: "polygon(2px 0%, 100% 0%, calc(100% - 2px) 100%, 0% 100%)",
          }}
        />
      ))}
    </div>
  </div>
);

// ── Map with draggable marker ──────────────────────────────────────────────────

const MapPositioner = ({
  positions,
  selected,
  onSelect,
}: {
  positions: Position[];
  selected: Position | null;
  onSelect: (p: Position) => void;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);

  // Tornado path — SVG line
  const tornadoPoints = "75,15 72,28 70,38 71,48 73,58 74,68 72,78 70,88";

  return (
    <div className="relative w-full rounded overflow-hidden" style={{ paddingBottom: "56%", background: "#0a0800" }}>
      <div ref={mapRef} className="absolute inset-0">
        {/* Map background */}
        <img src={IMG_MAP} alt="карта" className="w-full h-full object-cover opacity-40" style={{ filter: "sepia(0.8) hue-rotate(20deg) brightness(0.5)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(200,80,0,0.08), transparent 60%)" }} />

        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {[20, 40, 60, 80].map((v) => (
            <g key={v}>
              <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(100,70,10,0.15)" strokeWidth="0.3" />
              <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(100,70,10,0.15)" strokeWidth="0.3" />
            </g>
          ))}

          {/* Tornado path */}
          <polyline
            points={tornadoPoints}
            fill="none"
            stroke="rgba(220,80,0,0.6)"
            strokeWidth="1.5"
            strokeDasharray="2,1"
          />
          {/* Tornado head */}
          <circle cx="72" cy="15" r="3" fill="rgba(220,60,0,0.7)" />
          <circle cx="72" cy="15" r="5" fill="none" stroke="rgba(220,60,0,0.4)" strokeWidth="0.8">
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="74" y="13" fill="rgba(255,100,30,0.9)" fontSize="3" fontFamily="monospace">EF5 ↓</text>

          {/* Roads */}
          <line x1="0" y1="60" x2="100" y2="60" stroke="rgba(150,120,50,0.35)" strokeWidth="0.6" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(150,120,50,0.25)" strokeWidth="0.4" />
          <text x="2" y="58" fill="rgba(150,120,50,0.6)" fontSize="2.5" fontFamily="monospace">I-40</text>

          {/* Distance rings from intercept point */}
          {[10, 20, 35].map((r, i) => (
            <circle
              key={r}
              cx="71"
              cy="50"
              r={r}
              fill="none"
              stroke={`rgba(220,80,0,${0.06 - i * 0.015})`}
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
          ))}
        </svg>

        {/* Position markers */}
        {positions.map((pos) => {
          const isSel = selected?.id === pos.id;
          return (
            <button
              key={pos.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-200"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => onSelect(pos)}
            >
              {/* Ping ring */}
              {isSel && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "2px solid #f59e0b",
                    animation: "map-ping 1.5s ease-out infinite",
                    transform: "scale(2.5)",
                  }}
                />
              )}
              <div
                className="relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200"
                style={{
                  background: isSel ? "#f59e0b" : "rgba(20,15,3,0.85)",
                  border: `2px solid ${isSel ? "#f59e0b" : "rgba(200,140,20,0.5)"}`,
                  boxShadow: isSel ? "0 0 12px rgba(245,158,11,0.6)" : "none",
                  transform: isSel ? "scale(1.3)" : "scale(1)",
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: isSel ? "#000" : "#d97706" }} />
              </div>
              {/* Label */}
              <div
                className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap px-2 py-0.5 pointer-events-none"
                style={{
                  background: "rgba(5,3,0,0.9)",
                  border: "1px solid rgba(200,140,20,0.3)",
                  opacity: isSel ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
              >
                <span className="font-mono text-amber-400 text-[9px] tracking-widest">{pos.label}</span>
                <br />
                <span className="font-mono text-gray-600 text-[8px]">{pos.distanceM}м от вихря</span>
              </div>
            </button>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-px bg-red-500/60 border-dashed" style={{ borderTop: "1px dashed rgba(220,80,0,0.7)" }} />
            <span className="font-mono text-[8px] text-red-400/60">Путь торнадо</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500/70" />
            <span className="font-mono text-[8px] text-amber-400/60">Позиция команды</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes map-ping {
          0% { transform: scale(1.5); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ── Result screen ──────────────────────────────────────────────────────────────

const ResultScreen = ({
  build,
  result,
  onRetry,
  onMenu,
}: {
  build: Build;
  result: ResultType;
  onRetry: () => void;
  onMenu: () => void;
}) => {
  const [phase, setPhase] = useState(0); // 0=approach 1=data 2=outcome
  const [shown, setShown] = useState(false);

  // Auto-advance phases
  useState(() => {
    setTimeout(() => setPhase(1), 1800);
    setTimeout(() => setPhase(2), 3600);
    setTimeout(() => setShown(true), 4200);
  });

  const eq = build.equipment;

  const outcomeTitle = result.survived
    ? result.qualityData
      ? "МИССИЯ ВЫПОЛНЕНА"
      : "ВЫЖИЛИ. ДАННЫХ МАЛО."
    : "КОМАНДА ПОГИБЛА";

  const outcomeColor = result.survived
    ? result.qualityData ? "#4ade80" : "#facc15"
    : "#ef4444";

  const outcomeDesc = result.survived
    ? result.qualityData
      ? `Экспедиция прошла успешно. ${eq.some((e) => e.id === "turtle") ? "Зонды-черепахи зафиксировали уникальные данные внутри вихря." : "Команда собрала ценные метеорологические данные."} Материалы переданы в NOAA.`
      : "Команда выжила, но торнадо изменил путь раньше времени. Зонды не успели зафиксировать ключевые параметры. Частичный успех."
    : `${build.vehicle?.name ?? "Машина"} не смогла уйти от торнадо. ${build.position?.id === "intercept" && build.vehicle?.id !== "tiv" ? "Точка перехвата на 100 метрах — слишком близко для этой машины." : "Торнадо изменил направление неожиданно."} Команда погибла.`

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-rubik" style={{ background: "#000" }}>
      <div className="absolute inset-0">
        <img
          src={result.survived ? IMG_PLAINS : IMG_TORNADO}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: result.survived ? "brightness(0.4)" : "brightness(0.25) saturate(0.3) contrast(1.5)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/50" />
      </div>

      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-20"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`, backgroundSize: "120px" }}
      />

      <div className="relative z-20 w-full max-w-2xl px-6 py-12">
        {/* Cinematic countdown phases */}
        <div className="mb-8 space-y-2">
          {[
            { label: "ВЫДВИЖЕНИЕ К ПОЗИЦИИ", done: phase >= 0 },
            { label: "СБОР ДАННЫХ", done: phase >= 1 },
            { label: "РЕЗУЛЬТАТ ЭКСПЕДИЦИИ", done: phase >= 2 },
          ].map((p, i) => (
            <div key={p.label} className="flex items-center gap-3 transition-all duration-500" style={{ opacity: phase >= i ? 1 : 0.2 }}>
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: p.done ? "rgba(100,200,50,0.2)" : "rgba(30,30,30,0.6)", border: `1px solid ${p.done ? "#4ade80" : "rgba(80,80,80,0.4)"}` }}
              >
                {p.done && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </div>
              <span className="font-mono text-xs tracking-widest" style={{ color: p.done ? "#86efac" : "#2a2a2a" }}>{p.label}</span>
              {i === phase && !shown && (
                <div className="flex gap-1 ml-2">
                  {[0, 1, 2].map((d) => (
                    <div key={d} className="w-1 h-1 rounded-full bg-amber-500/60 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main outcome */}
        {shown && (
          <div style={{ animation: "fade-up 0.8s ease-out both" }}>
            {/* Outcome title */}
            <div
              className="font-bebas text-[clamp(2.5rem,8vw,5rem)] tracking-widest mb-2"
              style={{ color: outcomeColor, textShadow: `0 0 40px ${outcomeColor}40` }}
            >
              {outcomeTitle}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-6">
              <div>
                <div className="font-mono text-xs text-gray-600 tracking-widest mb-1">РИСК</div>
                <div className="font-bebas text-4xl" style={{ color: result.risk > 60 ? "#ef4444" : result.risk > 35 ? "#facc15" : "#4ade80" }}>
                  {result.risk}%
                </div>
              </div>
              <div>
                <div className="font-mono text-xs text-gray-600 tracking-widest mb-1">ДАННЫХ СОБРАНО</div>
                <div className="font-bebas text-4xl text-amber-400">{result.data}%</div>
              </div>
              <div>
                <div className="font-mono text-xs text-gray-600 tracking-widest mb-1">ИСХОД</div>
                <div className="font-bebas text-4xl" style={{ color: outcomeColor }}>{result.survived ? "ЖИВЫ" : "ПОГИБЛИ"}</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-base leading-relaxed mb-6 font-rubik font-light border-l-2 border-amber-700/40 pl-4">
              {outcomeDesc}
            </p>

            {/* Build summary */}
            <div
              className="p-4 mb-8 grid grid-cols-2 gap-3"
              style={{ background: "rgba(10,7,2,0.9)", border: "1px solid rgba(100,70,10,0.3)" }}
            >
              <div>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-1">МАШИНА</div>
                <div className="font-oswald text-sm text-gray-300">{build.vehicle?.emoji} {build.vehicle?.name}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-1">ПОЗИЦИЯ</div>
                <div className="font-oswald text-sm text-gray-300">📍 {build.position?.label}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-1">МАРШРУТ</div>
                <div className="font-oswald text-sm text-gray-300">{build.route?.emoji} {build.route?.label}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-1">ОБОРУДОВАНИЕ</div>
                <div className="font-oswald text-sm text-gray-300">{build.equipment.map((e) => e.emoji).join(" ")} ×{build.equipment.length}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="flex-1 py-3 font-oswald tracking-widest text-sm uppercase text-black bg-amber-500 hover:bg-amber-400 transition-colors"
                style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
              >
                Собрать заново
              </button>
              <button
                onClick={onMenu}
                className="flex-1 py-3 font-oswald tracking-widest text-sm uppercase text-amber-400 border border-amber-800/50 hover:border-amber-600 transition-colors"
                style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
              >
                Главное меню
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
};

// ── Main builder ───────────────────────────────────────────────────────────────

interface MissionBuilderProps {
  onBack: () => void;
}

export default function MissionBuilder({ onBack }: MissionBuilderProps) {
  const [step, setStep] = useState(0);
  const [build, setBuild] = useState<Build>({ vehicle: null, equipment: [], position: null, route: null });
  const [result, setResult] = useState<ResultType | null>(null);

  const totalSlots = build.vehicle?.capacity ?? 0;
  const usedSlots = build.equipment.reduce((s, e) => s + e.slots, 0);

  const toggleEquipment = useCallback((eq: Equipment) => {
    setBuild((prev) => {
      const has = prev.equipment.some((e) => e.id === eq.id);
      if (has) return { ...prev, equipment: prev.equipment.filter((e) => e.id !== eq.id) };
      if (usedSlots + eq.slots > totalSlots) return prev;
      return { ...prev, equipment: [...prev.equipment, eq] };
    });
  }, [usedSlots, totalSlots]);

  const launch = () => {
    if (!build.vehicle || !build.position || !build.route) return;
    setResult(calcResult(build));
  };

  const retry = () => {
    setResult(null);
    setStep(0);
    setBuild({ vehicle: null, equipment: [], position: null, route: null });
  };

  if (result) {
    return <ResultScreen build={build} result={result} onRetry={retry} onMenu={onBack} />;
  }

  // Preview risk/data
  let previewRisk = build.vehicle ? build.vehicle.risk : 50;
  let previewData = build.position ? build.position.dataBonus : 0;
  if (build.position) previewRisk += build.position.riskMod;
  if (build.route) previewRisk += build.route.riskMod;
  for (const e of build.equipment) { previewRisk += e.riskMod; previewData += e.dataBonus; }
  previewRisk = Math.max(2, Math.min(98, previewRisk));
  previewData = Math.min(100, previewData);

  return (
    <div className="min-h-screen font-rubik" style={{ background: "#050300" }}>
      {/* Top nav */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-amber-900/20" style={{ background: "rgba(5,3,0,0.97)", backdropFilter: "blur(8px)" }}>
        <button onClick={onBack} className="flex items-center gap-2 font-mono text-xs text-gray-600 hover:text-amber-400 transition-colors">
          <Icon name="ChevronLeft" size={15} /> НАЗАД
        </button>
        <div className="font-bebas text-2xl text-amber-400 tracking-widest">КОНСТРУКТОР ЭКСПЕДИЦИИ</div>
        {/* Live risk/data */}
        <div className="flex gap-4">
          <div className="text-right">
            <div className="font-mono text-[9px] text-gray-700 tracking-widest">РИСК</div>
            <div className="font-bebas text-xl" style={{ color: previewRisk > 60 ? "#ef4444" : previewRisk > 35 ? "#facc15" : "#4ade80" }}>
              {previewRisk}%
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] text-gray-700 tracking-widest">ДАННЫЕ</div>
            <div className="font-bebas text-xl text-amber-400">{previewData}%</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <StepBar step={step} />

        {/* ── STEP 0: Vehicle ── */}
        {step === 0 && (
          <div style={{ animation: "fade-in 0.4s ease-out" }}>
            <div className="mb-6">
              <h2 className="font-bebas text-4xl text-white tracking-wide mb-1">Выбери машину</h2>
              <p className="font-rubik text-gray-500 text-sm">Машина определяет броню, скорость и количество слотов для оборудования.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VEHICLES.map((v) => {
                const sel = build.vehicle?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => { setBuild((b) => ({ ...b, vehicle: v, equipment: [] })); }}
                    className="text-left p-5 border transition-all duration-200 relative overflow-hidden"
                    style={{
                      background: sel ? "rgba(160,90,5,0.15)" : "rgba(10,7,2,0.9)",
                      border: `1px solid ${sel ? "#f59e0b" : "rgba(100,70,10,0.3)"}`,
                      clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                      boxShadow: sel ? "0 0 20px rgba(245,158,11,0.15)" : "none",
                    }}
                  >
                    {sel && <div className="absolute top-3 right-3 font-mono text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5">ВЫБРАНО</div>}
                    <div className="text-4xl mb-3">{v.emoji}</div>
                    <div className="font-oswald font-semibold text-white text-xl tracking-wide mb-1">{v.name}</div>
                    <p className="font-rubik text-gray-500 text-xs mb-4 leading-relaxed">{v.desc}</p>
                    <div className="space-y-1.5">
                      <StatBar label="Броня" value={v.armor} color="#4ade80" />
                      <StatBar label="Скорость" value={v.speed} color="#60a5fa" />
                      <StatBar label="Слоты" value={v.capacity} max={6} color="#f59e0b" />
                    </div>
                    <div className="mt-3 font-mono text-xs" style={{ color: v.risk > 30 ? "#f87171" : "#86efac" }}>
                      Базовый риск: {v.risk}%
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                disabled={!build.vehicle}
                onClick={() => setStep(1)}
                className="px-10 py-3 font-oswald tracking-widest text-sm uppercase transition-all"
                style={{
                  background: build.vehicle ? "#d97706" : "rgba(50,35,5,0.5)",
                  color: build.vehicle ? "#000" : "#2a1f06",
                  clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
                  cursor: build.vehicle ? "pointer" : "not-allowed",
                }}
              >
                Далее →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Equipment ── */}
        {step === 1 && (
          <div style={{ animation: "fade-in 0.4s ease-out" }}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-bebas text-4xl text-white tracking-wide mb-1">Загрузи оборудование</h2>
                <p className="font-rubik text-gray-500 text-sm">Слоты в {build.vehicle?.name}: <span className="text-amber-400">{usedSlots}/{totalSlots}</span></p>
              </div>
              {/* Slot visualizer */}
              <div className="flex gap-1.5 mt-1">
                {Array.from({ length: totalSlots }).map((_, i) => (
                  <div
                    key={i}
                    className="w-5 h-7 transition-all duration-300"
                    style={{
                      background: i < usedSlots ? "#d97706" : "rgba(40,28,5,0.8)",
                      border: `1px solid ${i < usedSlots ? "#f59e0b" : "rgba(80,55,5,0.4)"}`,
                      clipPath: "polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EQUIPMENT.map((eq) => {
                const sel = build.equipment.some((e) => e.id === eq.id);
                const wouldExceed = !sel && usedSlots + eq.slots > totalSlots;
                return (
                  <button
                    key={eq.id}
                    onClick={() => !wouldExceed && toggleEquipment(eq)}
                    className="text-left p-4 border transition-all duration-200 relative"
                    style={{
                      background: sel ? "rgba(160,90,5,0.15)" : wouldExceed ? "rgba(5,3,0,0.5)" : "rgba(10,7,2,0.9)",
                      border: `1px solid ${sel ? "#f59e0b" : wouldExceed ? "rgba(40,28,5,0.3)" : "rgba(100,70,10,0.3)"}`,
                      opacity: wouldExceed ? 0.4 : 1,
                      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
                      cursor: wouldExceed ? "not-allowed" : "pointer",
                    }}
                  >
                    {sel && <div className="absolute top-2 right-2 text-amber-400 text-sm">✓</div>}
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0 mt-0.5">{eq.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-oswald font-semibold text-white text-base">{eq.name}</span>
                          <span className="font-mono text-[9px] text-gray-600 border border-gray-800 px-1">{eq.slots} слот{eq.slots > 1 ? "а" : ""}</span>
                        </div>
                        <p className="font-rubik text-gray-500 text-xs leading-relaxed mb-2">{eq.desc}</p>
                        <div className="flex gap-4">
                          <span className="font-mono text-[10px] text-green-400">📊 +{eq.dataBonus}% данных</span>
                          <span className="font-mono text-[10px]" style={{ color: eq.riskMod > 0 ? "#f87171" : eq.riskMod < 0 ? "#86efac" : "#6b7280" }}>
                            {eq.riskMod > 0 ? `⚠ +${eq.riskMod}% риска` : eq.riskMod < 0 ? `✓ ${eq.riskMod}% риска` : "— нейтрально"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3 justify-between">
              <button onClick={() => setStep(0)} className="px-6 py-3 font-oswald tracking-widest text-sm uppercase text-gray-600 border border-gray-800 hover:border-gray-600 transition-colors" style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}>← Назад</button>
              <button onClick={() => setStep(2)} className="px-10 py-3 font-oswald tracking-widest text-sm uppercase text-black bg-amber-600 hover:bg-amber-500 transition-colors" style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}>Далее →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Route ── */}
        {step === 2 && (
          <div style={{ animation: "fade-in 0.4s ease-out" }}>
            <div className="mb-6">
              <h2 className="font-bebas text-4xl text-white tracking-wide mb-1">Выбери маршрут</h2>
              <p className="font-rubik text-gray-500 text-sm">Путь к торнадо влияет на риск и время прибытия.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ROUTES.map((r) => {
                const sel = build.route?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setBuild((b) => ({ ...b, route: r }))}
                    className="text-left p-5 border transition-all duration-200"
                    style={{
                      background: sel ? "rgba(160,90,5,0.15)" : "rgba(10,7,2,0.9)",
                      border: `1px solid ${sel ? "#f59e0b" : "rgba(100,70,10,0.3)"}`,
                      clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                      boxShadow: sel ? "0 0 20px rgba(245,158,11,0.12)" : "none",
                    }}
                  >
                    <div className="text-3xl mb-3">{r.emoji}</div>
                    <div className="font-oswald font-semibold text-white text-xl mb-1">{r.label}</div>
                    <p className="font-rubik text-gray-500 text-xs leading-relaxed mb-3">{r.desc}</p>
                    <div className="flex gap-4">
                      <span className="font-mono text-[10px]" style={{ color: r.riskMod > 0 ? "#f87171" : r.riskMod < 0 ? "#86efac" : "#6b7280" }}>
                        {r.riskMod > 0 ? `⚠ +${r.riskMod}% риска` : r.riskMod < 0 ? `✓ ${r.riskMod}% риска` : "— нейтрально"}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: r.timeBonus ? "#60a5fa" : "#6b7280" }}>
                        {r.timeBonus ? "⏱ Успеем вовремя" : "⏱ Медленнее"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex gap-3 justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-3 font-oswald tracking-widest text-sm uppercase text-gray-600 border border-gray-800 hover:border-gray-600 transition-colors" style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}>← Назад</button>
              <button disabled={!build.route} onClick={() => setStep(3)} className="px-10 py-3 font-oswald tracking-widest text-sm uppercase text-black transition-colors" style={{ background: build.route ? "#d97706" : "rgba(50,35,5,0.5)", color: build.route ? "#000" : "#2a1f06", clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))", cursor: build.route ? "pointer" : "not-allowed" }}>Далее →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Position ── */}
        {step === 3 && (
          <div style={{ animation: "fade-in 0.4s ease-out" }}>
            <div className="mb-6">
              <h2 className="font-bebas text-4xl text-white tracking-wide mb-1">Разместись на карте</h2>
              <p className="font-rubik text-gray-500 text-sm">Нажми на точку на карте — выбери позицию развёртывания команды.</p>
            </div>

            <MapPositioner positions={POSITIONS} selected={build.position} onSelect={(p) => setBuild((b) => ({ ...b, position: p }))} />

            {/* Position info card */}
            {build.position && (
              <div
                className="mt-4 p-4 border flex items-start gap-4"
                style={{ background: "rgba(12,8,2,0.95)", border: "1px solid rgba(200,140,20,0.25)", animation: "fade-in 0.3s ease-out" }}
              >
                <div>
                  <div className="font-oswald font-semibold text-white text-lg mb-0.5">{build.position.label}</div>
                  <div className="font-mono text-amber-400/70 text-xs mb-2">{build.position.distanceM} метров от вихря</div>
                  <p className="font-rubik text-gray-400 text-sm">{build.position.desc}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="font-mono text-[9px] text-gray-700 mb-0.5">РИСК</div>
                  <div className="font-bebas text-2xl" style={{ color: build.position.riskMod > 20 ? "#ef4444" : build.position.riskMod > 0 ? "#facc15" : "#4ade80" }}>
                    {build.position.riskMod > 0 ? `+${build.position.riskMod}` : build.position.riskMod}%
                  </div>
                  <div className="font-mono text-[9px] text-gray-700 mt-1 mb-0.5">ДАННЫЕ</div>
                  <div className="font-bebas text-2xl text-amber-400">+{build.position.dataBonus}%</div>
                </div>
              </div>
            )}

            {build.position?.id === "intercept" && build.vehicle?.id !== "tiv" && (
              <div className="mt-3 p-3 border border-red-800/50 bg-red-900/10 flex items-center gap-2">
                <Icon name="AlertTriangle" size={16} className="text-red-400 flex-shrink-0" />
                <span className="font-mono text-xs text-red-400">Точка перехвата рекомендована только для TIV-2. Риск резко возрастёт.</span>
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-between">
              <button onClick={() => setStep(2)} className="px-6 py-3 font-oswald tracking-widest text-sm uppercase text-gray-600 border border-gray-800 hover:border-gray-600 transition-colors" style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}>← Назад</button>
              <button disabled={!build.position} onClick={() => setStep(4)} className="px-10 py-3 font-oswald tracking-widest text-sm uppercase text-black transition-colors" style={{ background: build.position ? "#d97706" : "rgba(50,35,5,0.5)", color: build.position ? "#000" : "#2a1f06", clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))", cursor: build.position ? "pointer" : "not-allowed" }}>Далее →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Launch ── */}
        {step === 4 && (
          <div style={{ animation: "fade-in 0.4s ease-out" }}>
            <div className="mb-6">
              <h2 className="font-bebas text-4xl text-white tracking-wide mb-1">Брифинг</h2>
              <p className="font-rubik text-gray-500 text-sm">Проверь состав экспедиции перед выездом.</p>
            </div>

            {/* Full summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-5 border" style={{ background: "rgba(10,7,2,0.95)", border: "1px solid rgba(100,70,10,0.3)", clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-3">ТРАНСПОРТ</div>
                <div className="text-4xl mb-2">{build.vehicle?.emoji}</div>
                <div className="font-oswald text-white text-xl font-semibold">{build.vehicle?.name}</div>
                <div className="mt-2 space-y-1">
                  <StatBar label="Броня" value={build.vehicle?.armor ?? 0} color="#4ade80" />
                  <StatBar label="Скорость" value={build.vehicle?.speed ?? 0} color="#60a5fa" />
                </div>
              </div>

              <div className="p-5 border" style={{ background: "rgba(10,7,2,0.95)", border: "1px solid rgba(100,70,10,0.3)", clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-3">МАРШРУТ И ПОЗИЦИЯ</div>
                <div className="font-oswald text-white text-lg mb-1">{build.route?.emoji} {build.route?.label}</div>
                <div className="font-oswald text-amber-400 text-lg">📍 {build.position?.label}</div>
                <div className="font-mono text-gray-600 text-xs mt-2">{build.position?.distanceM}м от вихря</div>
              </div>

              <div className="p-5 border sm:col-span-2" style={{ background: "rgba(10,7,2,0.95)", border: "1px solid rgba(100,70,10,0.3)", clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))" }}>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-3">ОБОРУДОВАНИЕ ({usedSlots}/{totalSlots} СЛОТОВ)</div>
                {build.equipment.length === 0 ? (
                  <div className="font-rubik text-gray-600 text-sm">Нет оборудования</div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {build.equipment.map((eq) => (
                      <div key={eq.id} className="flex items-center gap-2 px-3 py-1.5" style={{ background: "rgba(30,20,3,0.8)", border: "1px solid rgba(120,80,10,0.4)" }}>
                        <span className="text-lg">{eq.emoji}</span>
                        <div>
                          <div className="font-oswald text-white text-sm">{eq.name}</div>
                          <div className="font-mono text-[9px] text-green-400">+{eq.dataBonus}% данных</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Final risk/data big display */}
            <div className="flex gap-6 mb-8 p-5 border" style={{ background: "rgba(8,5,1,0.97)", border: "1px solid rgba(200,140,20,0.2)" }}>
              <div>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-1">ИТОГОВЫЙ РИСК</div>
                <div className="font-bebas text-6xl" style={{ color: previewRisk > 60 ? "#ef4444" : previewRisk > 35 ? "#facc15" : "#4ade80" }}>
                  {previewRisk}%
                </div>
              </div>
              <div className="w-px bg-amber-900/30" />
              <div>
                <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-1">ОЖИДАЕМЫЕ ДАННЫЕ</div>
                <div className="font-bebas text-6xl text-amber-400">{previewData}%</div>
              </div>
              <div className="ml-auto flex items-center">
                <div className="font-mono text-xs text-gray-600 text-right leading-loose">
                  {previewRisk > 70 && "⚠ Критический риск\n"}
                  {previewRisk <= 20 && "✓ Безопасная операция\n"}
                  {previewData > 70 && "★ Ценные данные"}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-between">
              <button onClick={() => setStep(3)} className="px-6 py-3 font-oswald tracking-widest text-sm uppercase text-gray-600 border border-gray-800 hover:border-gray-600 transition-colors" style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}>← Назад</button>
              <button
                onClick={launch}
                className="flex-1 py-4 font-bebas text-2xl tracking-widest uppercase text-black transition-all hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(135deg, #d97706, #b45309)",
                  clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))",
                  boxShadow: "0 0 30px rgba(217,119,6,0.3)",
                }}
              >
                ▶ ВЫДВИГАЕМСЯ
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
