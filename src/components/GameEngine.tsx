import { useEffect, useRef, useCallback, useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const TILE = 40;
const MAP_W = 60;   // tiles
const MAP_H = 40;
const PX_W = MAP_W * TILE;
const PX_H = MAP_H * TILE;

// ── Types ────────────────────────────────────────────────────────────────────
export interface GearItem {
  id: string;
  name: string;
  emoji: string;
  dataRate: number;   // data/sec when deployed
  maxHp: number;      // vehicle HP bonus
  speedMod: number;   // multiplier
  riskMod: number;
  placed: boolean;
  slotX?: number;
  slotY?: number;
}

interface Vec2 { x: number; y: number; }

interface GameState {
  car: Vec2;
  carAngle: number;
  speed: number;
  tornado: Vec2;
  tornadoR: number;        // visual radius px
  tornadoVel: Vec2;
  probes: Array<{ pos: Vec2; active: boolean; dataTimer: number }>;
  data: number;            // 0-100
  hp: number;              // 0-100
  maxHp: number;
  time: number;            // seconds elapsed
  phase: "garage" | "driving" | "result";
  result: "win" | "lose" | null;
  gear: GearItem[];
  keys: Set<string>;
  camera: Vec2;
  particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }>;
  debrisParticles: Array<{ x: number; y: number; angle: number; dist: number; speed: number; size: number }>;
}

const DEFAULT_GEAR: GearItem[] = [
  { id: "turtle",   name: "Зонд-черепаха",   emoji: "🐢", dataRate: 12, maxHp: 0,  speedMod: 1.0,  riskMod: 0,  placed: false },
  { id: "turtle2",  name: "Зонд-черепаха 2", emoji: "🐢", dataRate: 12, maxHp: 0,  speedMod: 1.0,  riskMod: 0,  placed: false },
  { id: "doppler",  name: "Радар",            emoji: "📡", dataRate: 5,  maxHp: 0,  speedMod: 0.85, riskMod: -10, placed: false },
  { id: "armor",    name: "Броня",            emoji: "🛡️", dataRate: 0,  maxHp: 40, speedMod: 0.8,  riskMod: -20, placed: false },
  { id: "anchor",   name: "Якорь",            emoji: "⚓", dataRate: 0,  maxHp: 20, speedMod: 0.7,  riskMod: -15, placed: false },
  { id: "medkit",   name: "Медкомплект",      emoji: "🏥", dataRate: 0,  maxHp: 30, speedMod: 1.0,  riskMod: 0,  placed: false },
  { id: "camera",   name: "Камера",           emoji: "🎥", dataRate: 6,  maxHp: 0,  speedMod: 1.0,  riskMod: 0,  placed: false },
  { id: "balloon",  name: "Радиозонд",        emoji: "🎈", dataRate: 20, maxHp: 0,  speedMod: 1.0,  riskMod: 15, placed: false },
];

const BASE_SPEED = 180; // px/sec
const TORNADO_SPEED = 65;
const DANGER_DIST = 160;
const DATA_WIN = 100;
const CAR_W = 28;
const CAR_H = 48;

function dist(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── Garage ──────────────────────────────────────────────────────────────────

function Garage({
  gear,
  onStart,
  onBack,
}: {
  gear: GearItem[];
  onStart: (g: GearItem[]) => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<GearItem[]>(gear);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<Vec2>({ x: 0, y: 0 });

  // Car slots: 4 slots on the car silhouette
  const SLOTS = [
    { id: "s0", x: 95,  y: 58,  label: "Перед-Л" },
    { id: "s1", x: 155, y: 58,  label: "Перед-П" },
    { id: "s2", x: 95,  y: 148, label: "Зад-Л"   },
    { id: "s3", x: 155, y: 148, label: "Зад-П"   },
  ];

  const [slotContents, setSlotContents] = useState<Record<string, string>>({});
  const carRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setDragPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !carRef.current) { setDragging(null); return; }

      const carRect = carRef.current.getBoundingClientRect();
      const mx = e.clientX - carRect.left;
      const my = e.clientY - carRect.top;

      let droppedSlot: string | null = null;
      for (const slot of SLOTS) {
        if (Math.abs(mx - slot.x) < 30 && Math.abs(my - slot.y) < 30) {
          droppedSlot = slot.id;
          break;
        }
      }

      if (droppedSlot) {
        // Remove from old slot if already placed
        const newSlots = { ...slotContents };
        for (const k of Object.keys(newSlots)) {
          if (newSlots[k] === dragging) delete newSlots[k];
        }
        newSlots[droppedSlot] = dragging;
        setSlotContents(newSlots);
        setItems((prev) => prev.map((i) => i.id === dragging ? { ...i, placed: true } : i));
      } else {
        // Dropped outside — unplace
        const newSlots = { ...slotContents };
        for (const k of Object.keys(newSlots)) {
          if (newSlots[k] === dragging) delete newSlots[k];
        }
        setSlotContents(newSlots);
        setItems((prev) => prev.map((i) => i.id === dragging ? { ...i, placed: false } : i));
      }

      setDragging(null);
    },
    [dragging, slotContents, SLOTS]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const placedIds = Object.values(slotContents);
  const placedGear = items.filter((i) => placedIds.includes(i.id));
  const totalSpeed = placedGear.reduce((acc, g) => acc * g.speedMod, 1.0);
  const totalHp = 100 + placedGear.reduce((acc, g) => acc + g.maxHp, 0);
  const totalData = placedGear.reduce((acc, g) => acc + g.dataRate, 0);

  const startDrive = () => {
    const finalGear = items.map((i) => ({ ...i, placed: placedIds.includes(i.id) }));
    onStart(finalGear);
  };

  return (
    <div className="min-h-screen font-rubik flex flex-col" style={{ background: "#080604" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/20">
        <button onClick={onBack} className="font-mono text-xs text-gray-600 hover:text-amber-400 transition-colors">← НАЗАД</button>
        <div className="font-bebas text-2xl text-amber-400 tracking-widest">ГАРАЖ — СОБЕРИ МАШИНУ</div>
        <div className="font-mono text-xs text-gray-700">Перетащи детали на машину</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: parts shelf */}
        <div className="w-56 border-r border-amber-900/15 p-4 flex flex-col gap-2 overflow-y-auto" style={{ background: "rgba(6,4,1,0.9)" }}>
          <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-2">СКЛАД ОБОРУДОВАНИЯ</div>
          {items.map((item) => {
            const isPlaced = placedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDragging(item.id);
                  setDragPos({ x: e.clientX, y: e.clientY });
                }}
                className="flex items-center gap-2 p-2 border cursor-grab active:cursor-grabbing transition-all select-none"
                style={{
                  background: isPlaced ? "rgba(160,90,5,0.15)" : "rgba(12,8,2,0.8)",
                  border: `1px solid ${isPlaced ? "rgba(200,130,20,0.5)" : "rgba(60,40,5,0.4)"}`,
                  opacity: isPlaced ? 0.5 : 1,
                  clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)",
                }}
              >
                <span className="text-xl flex-shrink-0">{item.emoji}</span>
                <div className="min-w-0">
                  <div className="font-oswald text-white text-sm truncate">{item.name}</div>
                  <div className="flex gap-2">
                    {item.dataRate > 0 && <span className="font-mono text-[9px] text-green-400">📊+{item.dataRate}</span>}
                    {item.maxHp > 0 && <span className="font-mono text-[9px] text-blue-400">🛡+{item.maxHp}</span>}
                    {item.speedMod !== 1 && <span className="font-mono text-[9px] text-amber-400">⚡{(item.speedMod * 100).toFixed(0)}%</span>}
                  </div>
                </div>
                {isPlaced && <div className="ml-auto text-amber-500 text-xs flex-shrink-0">✓</div>}
              </div>
            );
          })}
        </div>

        {/* Center: car + slots */}
        <div className="flex-1 flex items-center justify-center relative" style={{ background: "radial-gradient(ellipse at 50% 50%, #0e0a03 0%, #050300 100%)" }}>
          <div className="text-center">
            <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-6">CHEVROLET SUBURBAN — CHASER UNIT</div>

            <div ref={carRef} className="relative inline-block" style={{ width: 250, height: 220 }}>
              {/* Car SVG */}
              <svg width="250" height="220" viewBox="0 0 250 220">
                {/* Shadow */}
                <ellipse cx="125" cy="205" rx="70" ry="10" fill="rgba(0,0,0,0.5)" />
                {/* Body */}
                <rect x="80" y="30" width="90" height="150" rx="12" fill="#1a1208" stroke="#4a3008" strokeWidth="2" />
                {/* Roof */}
                <rect x="90" y="45" width="70" height="60" rx="8" fill="#0f0b04" stroke="#3a2506" strokeWidth="1" />
                {/* Windshield */}
                <rect x="93" y="48" width="64" height="30" rx="4" fill="rgba(100,180,255,0.15)" stroke="rgba(100,180,255,0.3)" strokeWidth="1" />
                {/* Rear window */}
                <rect x="93" y="90" width="64" height="20" rx="3" fill="rgba(100,180,255,0.1)" stroke="rgba(100,180,255,0.2)" strokeWidth="1" />
                {/* Front */}
                <rect x="85" y="18" width="80" height="20" rx="6" fill="#221608" stroke="#4a3008" strokeWidth="1.5" />
                {/* Headlights */}
                <ellipse cx="95" cy="20" rx="7" ry="4" fill="rgba(255,220,100,0.7)" />
                <ellipse cx="155" cy="20" rx="7" ry="4" fill="rgba(255,220,100,0.7)" />
                {/* Rear */}
                <rect x="85" y="172" width="80" height="14" rx="4" fill="#1a0e04" stroke="#3a2506" strokeWidth="1" />
                {/* Taillights */}
                <ellipse cx="95" cy="179" rx="6" ry="3" fill="rgba(255,60,60,0.6)" />
                <ellipse cx="155" cy="179" rx="6" ry="3" fill="rgba(255,60,60,0.6)" />
                {/* Wheels */}
                {[{ cx: 88, cy: 60 }, { cx: 162, cy: 60 }, { cx: 88, cy: 155 }, { cx: 162, cy: 155 }].map((w, i) => (
                  <g key={i}>
                    <ellipse cx={w.cx} cy={w.cy} rx="12" ry="14" fill="#111" stroke="#333" strokeWidth="1.5" />
                    <ellipse cx={w.cx} cy={w.cy} rx="6" ry="7" fill="#222" stroke="#555" strokeWidth="1" />
                  </g>
                ))}
                {/* Slot hotspots */}
                {SLOTS.map((slot) => {
                  const content = slotContents[slot.id];
                  const item = items.find((i) => i.id === content);
                  return (
                    <g key={slot.id}>
                      <rect
                        x={slot.x - 22}
                        y={slot.y - 22}
                        width="44"
                        height="44"
                        rx="4"
                        fill={content ? "rgba(160,90,5,0.25)" : "rgba(80,50,5,0.15)"}
                        stroke={content ? "rgba(245,158,11,0.7)" : "rgba(100,70,10,0.35)"}
                        strokeWidth="1.5"
                        strokeDasharray={content ? "none" : "3,2"}
                      />
                      {item ? (
                        <text x={slot.x} y={slot.y + 7} textAnchor="middle" fontSize="20">{item.emoji}</text>
                      ) : (
                        <text x={slot.x} y={slot.y + 5} textAnchor="middle" fontSize="10" fill="rgba(120,80,10,0.5)" fontFamily="monospace">+</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-4 font-mono text-[9px] text-amber-900/60 tracking-widest">
              Перетащи деталь из склада → на слот машины
            </div>
          </div>
        </div>

        {/* Right: stats */}
        <div className="w-52 border-l border-amber-900/15 p-4 flex flex-col gap-4" style={{ background: "rgba(6,4,1,0.9)" }}>
          <div className="font-mono text-[9px] text-gray-700 tracking-widest">ХАРАКТЕРИСТИКИ</div>
          {[
            { label: "СКОРОСТЬ", val: `${(totalSpeed * 100).toFixed(0)}%`, color: totalSpeed < 0.8 ? "#f87171" : "#60a5fa" },
            { label: "HP", val: `${totalHp}`, color: "#4ade80" },
            { label: "ДАННЫЕ/СЕК", val: `+${totalData}`, color: "#f59e0b" },
            { label: "СНАРЯЖЕНИЕ", val: `${placedIds.length}/4`, color: "#d1d5db" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono text-[9px] text-gray-700 tracking-widest mb-1">{s.label}</div>
              <div className="font-bebas text-2xl" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}

          <div className="mt-auto pt-4 border-t border-amber-900/20 space-y-2">
            <div className="font-mono text-[9px] text-gray-700 tracking-widest">УПРАВЛЕНИЕ</div>
            <div className="font-mono text-[9px] text-gray-600 leading-loose">
              WASD — движение<br />
              E — поставить зонд<br />
              R — забрать зонд<br />
              ESC — пауза
            </div>
          </div>

          <button
            onClick={startDrive}
            className="w-full py-3 font-bebas text-xl tracking-widest text-black transition-all hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #d97706, #b45309)",
              clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
            }}
          >
            ВЫДВИГАТЬСЯ ▶
          </button>
        </div>
      </div>

      {/* Floating drag ghost */}
      {dragging && (
        <div
          className="fixed pointer-events-none z-50 text-3xl"
          style={{ left: dragPos.x - 16, top: dragPos.y - 16, filter: "drop-shadow(0 0 8px rgba(245,158,11,0.6))" }}
        >
          {items.find((i) => i.id === dragging)?.emoji}
        </div>
      )}
    </div>
  );
}

// ── Game Canvas ──────────────────────────────────────────────────────────────

function GameCanvas({
  gear,
  onEnd,
}: {
  gear: GearItem[];
  onEnd: (result: "win" | "lose", data: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [hud, setHud] = useState({ data: 0, hp: 100, time: 0, speed: 0, dist: 0, probes: 0 });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // Build initial state
  useEffect(() => {
    const placed = gear.filter((g) => g.placed);
    const maxHp = 100 + placed.reduce((a, g) => a + g.maxHp, 0);
    const speedMul = placed.reduce((a, g) => a * g.speedMod, 1.0);

    stateRef.current = {
      car: { x: TILE * 8, y: PX_H / 2 },
      carAngle: 0,
      speed: BASE_SPEED * speedMul,
      tornado: { x: PX_W - TILE * 10, y: PX_H / 2 },
      tornadoR: 80,
      tornadoVel: { x: -TORNADO_SPEED * 0.4, y: -TORNADO_SPEED * 0.3 },
      probes: [],
      data: 0,
      hp: maxHp,
      maxHp,
      time: 0,
      phase: "driving",
      result: null,
      gear,
      keys: new Set(),
      camera: { x: 0, y: 0 },
      particles: [],
      debrisParticles: Array.from({ length: 30 }, (_, i) => ({
        x: 0, y: 0,
        angle: (i / 30) * Math.PI * 2,
        dist: 60 + Math.random() * 80,
        speed: 0.8 + Math.random() * 1.2,
        size: 2 + Math.random() * 4,
      })),
    };
  }, [gear]);

  // Key handlers
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s) return;
      s.keys.add(e.code);
      if (e.code === "Escape") {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
      }
      if (e.code === "KeyE") {
        // Deploy probe
        const placed = s.gear.filter((g) => g.placed && (g.id.startsWith("turtle") || g.id === "balloon") && !s.probes.some((p) => p.active));
        if (placed.length > 0 && s.probes.length < 3) {
          s.probes.push({ pos: { x: s.car.x, y: s.car.y }, active: true, dataTimer: 0 });
          // Spawn particles
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            s.particles.push({ x: s.car.x, y: s.car.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.8, maxLife: 0.8, color: "#4ade80" });
          }
        }
      }
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      stateRef.current?.keys.delete(e.code);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (ts: number) => {
      if (!stateRef.current) { animRef.current = requestAnimationFrame(loop); return; }
      const dt = Math.min((ts - (lastTimeRef.current || ts)) / 1000, 0.05);
      lastTimeRef.current = ts;

      if (!pausedRef.current) update(dt, stateRef.current, canvas, ctx, onEnd, setHud);
      render(ctx, canvas, stateRef.current);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [onEnd]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" style={{ imageRendering: "pixelated" }} />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-stretch justify-between px-4 py-2 gap-3" style={{ background: "rgba(4,3,0,0.85)", borderBottom: "1px solid rgba(80,50,5,0.4)" }}>
          {/* HP */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-gray-700 tracking-widest">HP</span>
            <div className="w-28 h-2 bg-gray-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-200" style={{ width: `${(hud.hp / (stateRef.current?.maxHp ?? 100)) * 100}%`, background: hud.hp < 40 ? "#ef4444" : hud.hp < 70 ? "#facc15" : "#4ade80" }} />
            </div>
            <span className="font-mono text-xs text-gray-400">{Math.round(hud.hp)}</span>
          </div>

          {/* Data */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-gray-700 tracking-widest">ДАННЫЕ</span>
            <div className="w-36 h-2 bg-gray-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-200" style={{ width: `${hud.data}%`, background: "linear-gradient(90deg, #d97706, #f59e0b)" }} />
            </div>
            <span className="font-mono text-xs text-amber-400 font-bold">{Math.round(hud.data)}%</span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-gray-700 tracking-widest">ДИСТАНЦИЯ</span>
            <span className="font-bebas text-xl" style={{ color: hud.dist < 200 ? "#ef4444" : hud.dist < 500 ? "#facc15" : "#4ade80" }}>
              {Math.round(hud.dist)}м
            </span>
          </div>

          {/* Probes */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-gray-700 tracking-widest">ЗОНДЫ</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-3 h-3 rounded-full" style={{ background: i < hud.probes ? "#4ade80" : "rgba(40,30,5,0.6)", border: "1px solid rgba(100,70,10,0.4)" }} />
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-gray-700 tracking-widest">ВРЕМЯ</span>
            <span className="font-mono text-xs text-gray-400">
              {String(Math.floor(hud.time / 60)).padStart(2, "0")}:{String(Math.floor(hud.time % 60)).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
        <div className="font-mono text-[9px] text-gray-700 leading-loose" style={{ background: "rgba(4,3,0,0.7)", padding: "4px 8px" }}>
          WASD — движение &nbsp;|&nbsp; E — зонд &nbsp;|&nbsp; ESC — пауза
        </div>
      </div>

      {/* Pause overlay */}
      {paused && (
        <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="text-center">
            <div className="font-bebas text-6xl text-amber-400 tracking-widest">ПАУЗА</div>
            <div className="font-mono text-gray-500 text-sm mt-2">ESC — продолжить</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Update logic ─────────────────────────────────────────────────────────────

function update(
  dt: number,
  s: GameState,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  onEnd: (r: "win" | "lose", data: number) => void,
  setHud: (h: { data: number; hp: number; time: number; speed: number; dist: number; probes: number }) => void
) {
  s.time += dt;

  // ── Car movement ──
  const keys = s.keys;
  let ax = 0, ay = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp"))    ay = -1;
  if (keys.has("KeyS") || keys.has("ArrowDown"))  ay =  1;
  if (keys.has("KeyA") || keys.has("ArrowLeft"))  ax = -1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ax =  1;

  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    s.car.x += (ax / len) * s.speed * dt;
    s.car.y += (ay / len) * s.speed * dt;
    s.carAngle = Math.atan2(ay, ax) + Math.PI / 2;
  }

  // Bounds
  s.car.x = clamp(s.car.x, CAR_W, PX_W - CAR_W);
  s.car.y = clamp(s.car.y, CAR_H, PX_H - CAR_H);

  // ── Tornado AI — wanders, tracks car loosely ──
  const toDist = dist(s.car, s.tornado);
  const toCarX = (s.car.x - s.tornado.x) / toDist;
  const toCarY = (s.car.y - s.tornado.y) / toDist;

  // Drift toward car when far, wander when close
  const trackStr = toDist > 600 ? 0.4 : toDist > 300 ? 0.15 : 0.0;
  s.tornadoVel.x += (toCarX * trackStr + (Math.random() - 0.5) * 0.3) * dt * 80;
  s.tornadoVel.y += (toCarY * trackStr + (Math.random() - 0.5) * 0.3) * dt * 80;

  // Limit speed
  const tvLen = Math.hypot(s.tornadoVel.x, s.tornadoVel.y);
  if (tvLen > TORNADO_SPEED) {
    s.tornadoVel.x = (s.tornadoVel.x / tvLen) * TORNADO_SPEED;
    s.tornadoVel.y = (s.tornadoVel.y / tvLen) * TORNADO_SPEED;
  }

  s.tornado.x += s.tornadoVel.x * dt;
  s.tornado.y += s.tornadoVel.y * dt;

  // Bounce off walls
  if (s.tornado.x < TILE * 3) { s.tornadoVel.x = Math.abs(s.tornadoVel.x); }
  if (s.tornado.x > PX_W - TILE * 3) { s.tornadoVel.x = -Math.abs(s.tornadoVel.x); }
  if (s.tornado.y < TILE * 3) { s.tornadoVel.y = Math.abs(s.tornadoVel.y); }
  if (s.tornado.y > PX_H - TILE * 3) { s.tornadoVel.y = -Math.abs(s.tornadoVel.y); }

  // Tornado grows slightly over time
  s.tornadoR = 80 + s.time * 1.5;

  // ── Damage ──
  if (toDist < DANGER_DIST + s.tornadoR * 0.3) {
    const dmg = (1 - (toDist / (DANGER_DIST + s.tornadoR * 0.3))) * 40 * dt;
    s.hp -= dmg;
    // Damage particles
    if (Math.random() < 0.3) {
      const a = Math.random() * Math.PI * 2;
      s.particles.push({ x: s.car.x, y: s.car.y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 30, life: 0.5, maxLife: 0.5, color: "#ef4444" });
    }
  }

  // ── Probes collect data ──
  for (const probe of s.probes) {
    if (!probe.active) continue;
    const pd = dist(probe.pos, s.tornado);
    const inRange = pd < s.tornadoR + 200;
    if (inRange) {
      const placed = s.gear.filter((g) => g.placed);
      const rate = placed.reduce((a, g) => a + g.dataRate, 0);
      const bonus = Math.max(0, 1 - pd / (s.tornadoR + 200));
      s.data += rate * bonus * dt * 0.5;
      probe.dataTimer += dt;
      if (Math.random() < 0.15) {
        const a = Math.random() * Math.PI * 2;
        s.particles.push({ x: probe.pos.x, y: probe.pos.y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30 - 20, life: 0.6, maxLife: 0.6, color: "#f59e0b" });
      }
    }
    // Probe gets damaged if tornado passes over it
    if (pd < s.tornadoR * 0.5) {
      probe.active = false;
    }
  }
  s.data = Math.min(100, s.data);

  // ── Particles ──
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 40 * dt;
    p.life -= dt;
    if (p.life <= 0) s.particles.splice(i, 1);
  }

  // ── Camera follows car ──
  const tw = canvas.width;
  const th = canvas.height;
  s.camera.x = clamp(s.car.x - tw / 2, 0, PX_W - tw);
  s.camera.y = clamp(s.car.y - th / 2, 0, PX_H - th);

  // ── Win/lose ──
  if (s.hp <= 0) {
    onEnd("lose", Math.round(s.data));
  }
  if (s.data >= DATA_WIN) {
    onEnd("win", Math.round(s.data));
  }

  setHud({
    data: Math.round(s.data),
    hp: Math.round(s.hp),
    time: s.time,
    speed: s.speed,
    dist: Math.round(toDist * 0.1),
    probes: s.probes.filter((p) => p.active).length,
  });
}

// ── Render ───────────────────────────────────────────────────────────────────

function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, s: GameState) {
  const W = canvas.width;
  const H = canvas.height;
  const cx = s.camera.x;
  const cy = s.camera.y;

  ctx.clearRect(0, 0, W, H);

  // ── Sky / ground ──
  const tDist = dist(s.car, s.tornado);
  const danger = Math.max(0, 1 - tDist / 700);
  const skyColor = `rgb(${Math.round(8 + danger * 30)},${Math.round(10 + danger * 5)},${Math.round(3)})`;
  ctx.fillStyle = skyColor;
  ctx.fillRect(0, 0, W, H);

  // Field tiles
  for (let tx = 0; tx < MAP_W; tx++) {
    for (let ty = 0; ty < MAP_H; ty++) {
      const wx = tx * TILE - cx;
      const wy = ty * TILE - cy;
      if (wx < -TILE || wx > W + TILE || wy < -TILE || wy > H + TILE) continue;

      const isRoad = ty === Math.floor(MAP_H / 2) || ty === Math.floor(MAP_H / 2) + 1;
      const isVRoad = tx === Math.floor(MAP_W / 2);

      let color = "#0c0a04";
      if (isRoad || isVRoad) color = "#1a1508";
      else if ((tx + ty) % 7 < 2) color = "#0a0803";
      else if ((tx * 3 + ty * 5) % 11 < 1) color = "#0e0c05";

      ctx.fillStyle = color;
      ctx.fillRect(wx, wy, TILE, TILE);

      // Road markings
      if (isRoad && tx % 4 === 0) {
        ctx.fillStyle = "rgba(80,60,10,0.3)";
        ctx.fillRect(wx + TILE * 0.4, wy + TILE * 0.4, TILE * 0.2, TILE * 0.2);
      }
    }
  }

  // ── Trees / shrubs (decorations) ──
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const tx = ((i * 137 + 23) % MAP_W) * TILE - cx;
    const ty = ((i * 79 + 41) % MAP_H) * TILE - cy;
    if (tx < -30 || tx > W + 30 || ty < -30 || ty > H + 30) continue;
    if (Math.abs(ty + cy - (MAP_H / 2) * TILE) < TILE * 3) continue; // skip road area

    const sz = 8 + (i % 5) * 3;
    ctx.fillStyle = `rgba(${15 + (i % 3) * 5},${20 + (i % 4) * 5},${5 + (i % 3) * 3},0.8)`;
    ctx.beginPath();
    ctx.arc(tx + TILE / 2, ty + TILE / 2, sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Road dashes ──
  const roadY = (Math.floor(MAP_H / 2) * TILE) + TILE - cy;
  ctx.strokeStyle = "rgba(80,60,10,0.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([12, 20]);
  ctx.beginPath();
  ctx.moveTo(0, roadY);
  ctx.lineTo(W, roadY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Tornado ──
  const tx = s.tornado.x - cx;
  const ty2 = s.tornado.y - cy;
  const t = s.time;

  // Outer haze rings
  for (let ring = 4; ring >= 0; ring--) {
    const r = s.tornadoR * (1 + ring * 0.4);
    const alpha = 0.04 - ring * 0.006;
    const grad = ctx.createRadialGradient(tx, ty2, 0, tx, ty2, r);
    grad.addColorStop(0, `rgba(80,100,50,${alpha * 3})`);
    grad.addColorStop(1, `rgba(30,40,15,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(tx, ty2, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Debris ring
  ctx.save();
  for (const d of s.debrisParticles) {
    const angle = d.angle + t * d.speed;
    const dx = tx + Math.cos(angle) * (d.dist + Math.sin(t * 2 + d.angle) * 15);
    const dy = ty2 + Math.sin(angle) * (d.dist * 0.35 + Math.cos(t * 1.5 + d.angle) * 8);
    const alpha = 0.5 + Math.sin(t * 3 + d.angle) * 0.3;
    ctx.fillStyle = `rgba(80,60,30,${alpha})`;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(angle * 3);
    ctx.fillRect(-d.size / 2, -d.size / 4, d.size, d.size * 0.4);
    ctx.restore();
  }
  ctx.restore();

  // Funnel
  const funnelLayers = 20;
  for (let i = 0; i < funnelLayers; i++) {
    const prog = i / funnelLayers;
    const fh = s.tornadoR * 2.5;
    const fy = ty2 - s.tornadoR * 0.3 + fh * prog;
    const fw = (3 + prog * prog * s.tornadoR * 1.8) * (1 + Math.sin(t * 4 + prog * 8) * 0.08);
    const foffset = Math.sin(t * 3 + prog * 10) * fw * 0.25;
    const alpha = 0.12 + prog * 0.15;
    ctx.fillStyle = `rgba(60,80,40,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(tx + foffset, fy, fw, fw * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Core
  ctx.strokeStyle = `rgba(100,130,60,0.3)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tx, ty2 - s.tornadoR * 2.5);
  for (let i = 1; i <= 20; i++) {
    const prog = i / 20;
    const fy = ty2 - s.tornadoR * 2.5 + s.tornadoR * 3 * prog;
    const fw = 3 + prog * prog * s.tornadoR * 0.6;
    const wave = Math.sin(t * 5 + prog * 12) * fw * 0.4;
    ctx.lineTo(tx + wave, fy);
  }
  ctx.stroke();

  // Danger zone circle
  const dangerAlpha = Math.max(0, 0.15 - tDist / 4000);
  if (dangerAlpha > 0.01) {
    ctx.strokeStyle = `rgba(220,80,30,${dangerAlpha})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(tx, ty2, DANGER_DIST + s.tornadoR * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Probes ──
  for (const probe of s.probes) {
    const px = probe.pos.x - cx;
    const py = probe.pos.y - cy;
    if (!probe.active) {
      ctx.globalAlpha = 0.3;
    }
    // Glow
    const pg = ctx.createRadialGradient(px, py, 0, px, py, 20);
    pg.addColorStop(0, probe.active ? "rgba(100,255,80,0.3)" : "rgba(100,100,100,0.2)");
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();
    // Icon
    ctx.font = "16px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐢", px, py);
    ctx.globalAlpha = 1;
  }

  // ── Car ──
  const carX = s.car.x - cx;
  const carY = s.car.y - cy;

  ctx.save();
  ctx.translate(carX, carY);
  ctx.rotate(s.carAngle);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(2, 4, CAR_W * 0.8, CAR_H * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyGrad = ctx.createLinearGradient(-CAR_W / 2, 0, CAR_W / 2, 0);
  bodyGrad.addColorStop(0, "#1a1208");
  bodyGrad.addColorStop(0.5, "#2a1c0a");
  bodyGrad.addColorStop(1, "#1a1208");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H, 5);
  ctx.fill();
  ctx.strokeStyle = "#4a3008";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Windshield
  ctx.fillStyle = "rgba(100,180,255,0.2)";
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2 + 3, -CAR_H / 2 + 4, CAR_W - 6, CAR_H * 0.28, 3);
  ctx.fill();

  // Rear window
  ctx.fillStyle = "rgba(100,180,255,0.15)";
  ctx.beginPath();
  ctx.roundRect(-CAR_W / 2 + 4, CAR_H * 0.15, CAR_W - 8, CAR_H * 0.18, 2);
  ctx.fill();

  // Headlights
  const moving = s.keys.has("KeyW") || s.keys.has("ArrowUp");
  ctx.fillStyle = moving ? "rgba(255,230,120,0.9)" : "rgba(255,200,80,0.4)";
  ctx.beginPath(); ctx.ellipse(-CAR_W / 2 + 4, -CAR_H / 2 + 2, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(CAR_W / 2 - 4, -CAR_H / 2 + 2, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  // Taillights
  ctx.fillStyle = "rgba(255,60,60,0.6)";
  ctx.beginPath(); ctx.ellipse(-CAR_W / 2 + 4, CAR_H / 2 - 3, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(CAR_W / 2 - 4, CAR_H / 2 - 3, 3, 2, 0, 0, Math.PI * 2); ctx.fill();

  // Wheels
  ctx.fillStyle = "#111";
  [[-CAR_W / 2 - 2, -CAR_H * 0.28], [CAR_W / 2 + 2, -CAR_H * 0.28], [-CAR_W / 2 - 2, CAR_H * 0.28], [CAR_W / 2 + 2, CAR_H * 0.28]].forEach(([wx, wy]) => {
    ctx.beginPath();
    ctx.ellipse(wx, wy, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Gear on car
  const placedGear = s.gear.filter((g) => g.placed);
  ctx.font = "10px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  placedGear.slice(0, 4).forEach((g, i) => {
    const gx = (i % 2 === 0 ? -8 : 8);
    const gy = (i < 2 ? -8 : 8);
    ctx.fillText(g.emoji, gx, gy);
  });

  ctx.restore();

  // Headlight beam
  if (moving) {
    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(s.carAngle);
    const beamGrad = ctx.createRadialGradient(0, -CAR_H / 2, 0, 0, -CAR_H / 2 - 60, 60);
    beamGrad.addColorStop(0, "rgba(255,230,120,0.15)");
    beamGrad.addColorStop(1, "rgba(255,230,120,0)");
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-15, -CAR_H / 2);
    ctx.lineTo(-40, -CAR_H / 2 - 80);
    ctx.lineTo(40, -CAR_H / 2 - 80);
    ctx.lineTo(15, -CAR_H / 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Particles ──
  for (const p of s.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cx, p.y - cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Minimap ──
  const mm = { x: W - 140, y: H - 100, w: 130, h: 90 };
  ctx.fillStyle = "rgba(4,3,0,0.85)";
  ctx.strokeStyle = "rgba(80,50,5,0.5)";
  ctx.lineWidth = 1;
  ctx.fillRect(mm.x, mm.y, mm.w, mm.h);
  ctx.strokeRect(mm.x, mm.y, mm.w, mm.h);

  const toMM = (wx: number, wy: number) => ({
    x: mm.x + (wx / PX_W) * mm.w,
    y: mm.y + (wy / PX_H) * mm.h,
  });

  // Tornado on minimap
  const tmm = toMM(s.tornado.x, s.tornado.y);
  ctx.fillStyle = "rgba(200,80,30,0.7)";
  ctx.beginPath();
  ctx.arc(tmm.x, tmm.y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Car on minimap
  const cmm = toMM(s.car.x, s.car.y);
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(cmm.x, cmm.y, 3, 0, Math.PI * 2);
  ctx.fill();

  // Probes on minimap
  for (const probe of s.probes) {
    if (!probe.active) continue;
    const pmm = toMM(probe.pos.x, probe.pos.y);
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(pmm.x, pmm.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = "7px monospace";
  ctx.fillStyle = "rgba(80,50,5,0.8)";
  ctx.fillText("КАРТА", mm.x + 4, mm.y + 8);
}

// ── Result screen ─────────────────────────────────────────────────────────────

function ResultScreen({
  result,
  data,
  time,
  onRetry,
  onMenu,
}: {
  result: "win" | "lose";
  data: number;
  time: number;
  onRetry: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center font-rubik" style={{ background: "#050300" }}>
      <div
        className="font-bebas text-[clamp(3rem,10vw,7rem)] tracking-widest mb-4"
        style={{ color: result === "win" ? "#4ade80" : "#ef4444", textShadow: `0 0 60px ${result === "win" ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"}` }}
      >
        {result === "win" ? "ДАННЫЕ ПОЛУЧЕНЫ" : "КОМАНДА ПОГИБЛА"}
      </div>
      <div className="flex gap-10 mb-8">
        <div className="text-center">
          <div className="font-mono text-[9px] text-gray-700 tracking-widest">ДАННЫХ СОБРАНО</div>
          <div className="font-bebas text-5xl text-amber-400">{data}%</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[9px] text-gray-700 tracking-widest">ВРЕМЯ</div>
          <div className="font-bebas text-5xl text-gray-400">
            {String(Math.floor(time / 60)).padStart(2, "0")}:{String(Math.floor(time % 60)).padStart(2, "0")}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onRetry} className="px-8 py-3 font-oswald tracking-widest text-sm uppercase text-black bg-amber-500 hover:bg-amber-400 transition-colors" style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))" }}>
          Снова в гараж
        </button>
        <button onClick={onMenu} className="px-8 py-3 font-oswald tracking-widest text-sm uppercase text-amber-400 border border-amber-800/50 hover:border-amber-600 transition-colors" style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))" }}>
          Главное меню
        </button>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function GameEngine({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<"garage" | "driving" | "result">("garage");
  const [gear, setGear] = useState<GearItem[]>(DEFAULT_GEAR);
  const [gameResult, setGameResult] = useState<{ r: "win" | "lose"; data: number; time: number } | null>(null);
  const timeRef = useRef(0);

  const handleStart = (g: GearItem[]) => {
    setGear(g);
    setPhase("driving");
  };

  const handleEnd = useCallback((r: "win" | "lose", data: number) => {
    setGameResult({ r, data, time: timeRef.current });
    setPhase("result");
  }, []);

  const handleRetry = () => {
    setGear(DEFAULT_GEAR);
    setGameResult(null);
    setPhase("garage");
  };

  if (phase === "garage") {
    return <Garage gear={gear} onStart={handleStart} onBack={onBack} />;
  }

  if (phase === "result" && gameResult) {
    return <ResultScreen result={gameResult.r} data={gameResult.data} time={gameResult.time} onRetry={handleRetry} onMenu={onBack} />;
  }

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: "#000" }}>
      <GameCanvas gear={gear} onEnd={handleEnd} />
    </div>
  );
}
