import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

// Images
const IMG_TIM = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/ddb5b262-1f97-4fbb-b78e-36b39b6e28ab.jpg";
const IMG_TORNADO = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/c0f1f7d6-fe37-410d-ba6f-9d1900c2f133.jpg";
const IMG_TRUCK = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/855434c1-2909-42aa-a3bf-b6f2498f0682.jpg";
const IMG_PLAINS = "https://cdn.poehali.dev/projects/3d75af2c-cf4a-4edb-9add-31635e599bed/files/8e7218e8-9afb-4b2d-b319-3f18e8c94a6a.jpg";

type SceneEffect = "normal" | "shake" | "dark";

interface Choice {
  text: string;
  nextScene: number;
}

interface Scene {
  id: number;
  bg: string;
  bgFilter?: string;
  effect?: SceneEffect;
  location?: string;
  date?: string;
  chapter?: string;
  character?: string;
  characterRole?: string;
  text: string;
  isNarration?: boolean;
  choices?: Choice[];
  autoNext?: number;
}

const SCENES: Scene[] = [
  {
    id: 0,
    bg: IMG_PLAINS,
    bgFilter: "sepia(0.3) brightness(0.45)",
    isNarration: true,
    chapter: "TWISTEX",
    text: "Основано на реальных событиях.\n31 мая 2013 года. Эль-Рено, Оклахома.",
    autoNext: 4500,
  },
  {
    id: 1,
    bg: IMG_PLAINS,
    bgFilter: "brightness(0.55)",
    isNarration: true,
    text: "Тим Самарас — один из самых известных охотников за торнадо в мире. Автор документальных фильмов National Geographic, изобретатель зонда-черепахи.\n\nЗа 20 лет он пережил сотни штормов.",
    autoNext: 5500,
  },
  {
    id: 2,
    bg: IMG_TIM,
    bgFilter: "brightness(0.65)",
    location: "Оклахома-Сити, Оклахома",
    date: "31 мая 2013 — 14:00",
    character: "Тим Самарас",
    characterRole: "Основатель TWISTEX",
    text: "Сегодня обещают что-то серьёзное. SPC поставили умеренный риск на центральную Оклахому. Но... я чую что-то другое. Такой воздух я помню. Как в 1999-м.",
  },
  {
    id: 3,
    bg: IMG_TRUCK,
    bgFilter: "brightness(0.7)",
    location: "Шоссе I-40, движение на запад",
    date: "31 мая 2013 — 15:30",
    character: "Карл Янг",
    characterRole: "Оператор TWISTEX",
    text: "Тим, радар выглядит странно. Супер-ячейка строится быстрее, чем ожидалось. Видишь эту ротацию? Она широкая... очень широкая.",
  },
  {
    id: 4,
    bg: IMG_TRUCK,
    character: "Тим Самарас",
    characterRole: "Основатель TWISTEX",
    text: "Я вижу. Пол, ты как? Готов к развёртыванию зондов?",
  },
  {
    id: 5,
    bg: IMG_TRUCK,
    character: "Пол Самарас",
    characterRole: "Сын Тима, полевой ассистент",
    text: "Готов, пап. Три зонда в кузове. Только... радио говорит, что другие команды уже разворачиваются. Там много народу на дорогах.",
  },
  {
    id: 6,
    bg: IMG_PLAINS,
    bgFilter: "brightness(0.45) contrast(1.2) hue-rotate(25deg)",
    location: "Эль-Рено, Оклахома",
    date: "31 мая 2013 — 17:00",
    isNarration: true,
    text: "16:17. Торнадо касается земли.\nЭль-Рено, штат Оклахома.\n\nНа радаре — что-то небывалое. Доплеровские данные показывают ширину, которой никто не ожидал.",
    autoNext: 5000,
  },
  {
    id: 7,
    bg: IMG_TORNADO,
    bgFilter: "brightness(0.45) contrast(1.3)",
    effect: "shake",
    location: "Поле к западу от Эль-Рено",
    date: "17:03",
    character: "Карл Янг",
    characterRole: "Оператор TWISTEX",
    text: "ТИМ. ЭТО... ЭТО НЕ НОРМАЛЬНО. Доплер показывает ширину 2.6 километра. Он РАСТЁТ. Я никогда такого не видел за все 15 лет—",
  },
  {
    id: 8,
    bg: IMG_TORNADO,
    bgFilter: "brightness(0.38) contrast(1.4) saturate(0.8)",
    character: "Тим Самарас",
    characterRole: "Основатель TWISTEX",
    text: "Выходим. Мне нужны данные. Разворачиваем на пересечении с грунтовой. Карл — снимай всё. Пол — зонд номер один к обочине. Давай.",
  },
  {
    id: 9,
    bg: IMG_TORNADO,
    bgFilter: "brightness(0.4) contrast(1.35)",
    location: "Грунтовая дорога, западнее Эль-Рено",
    date: "17:11",
    character: "Карл Янг",
    characterRole: "Оператор TWISTEX",
    text: "Тим... он меняет направление. Торнадо ПОВОРАЧИВАЕТ. Нестандартное движение — он идёт на северо-восток, прямо на нас. Это не по прогнозу—",
    choices: [
      { text: "«Остаёмся. Данные слишком важны.»", nextScene: 10 },
      { text: "«Эвакуируемся. Уходим немедленно.»", nextScene: 14 },
    ],
  },
  // === PATH A — остались ===
  {
    id: 10,
    bg: IMG_TORNADO,
    bgFilter: "brightness(0.28) contrast(1.5) saturate(0.6)",
    effect: "shake",
    character: "Тим Самарас",
    characterRole: "Основатель TWISTEX",
    text: "Мы успеем. Ещё три минуты. Зонд уже на земле — уходим сразу после подтверждения сигнала.",
  },
  {
    id: 11,
    bg: IMG_TORNADO,
    bgFilter: "brightness(0.18) saturate(0.3) contrast(1.6)",
    effect: "shake",
    character: "Пол Самарас",
    characterRole: "Сын Тима",
    text: "ПАП! ОН УСКОРЯЕТСЯ! 200 МЕТРОВ! ПОРА В МАШИНУ, СЕЙЧАС!",
  },
  {
    id: 12,
    bg: IMG_TRUCK,
    bgFilter: "brightness(0.1) contrast(2) saturate(0)",
    effect: "shake",
    isNarration: true,
    text: "17:18\n\nТорнадо Эль-Рено достиг ширины 4.2 километра.\nЭто абсолютный рекорд в истории метеорологических наблюдений.\nСкорость ветра — 476 км/ч.",
    autoNext: 5500,
  },
  {
    id: 13,
    bg: IMG_PLAINS,
    bgFilter: "brightness(0.07) saturate(0)",
    effect: "dark",
    isNarration: true,
    text: "Машина TWISTEX была поглощена торнадо.\n\nТим Самарас (55 лет), его сын Пол Самарас (24 года)\nи оператор Карл Янг (45 лет) погибли.\n\nЭто единственный раз в истории, когда опытные профессиональные охотники за торнадо были убиты прямо во время операции.",
    autoNext: 9000,
  },
  // === PATH B — ушли ===
  {
    id: 14,
    bg: IMG_TRUCK,
    bgFilter: "brightness(0.6)",
    character: "Тим Самарас",
    characterRole: "Основатель TWISTEX",
    text: "Ты прав. Уходим. Пол — в машину. Бросаем зонд. Вперёд.",
  },
  {
    id: 15,
    bg: IMG_TRUCK,
    bgFilter: "brightness(0.55)",
    effect: "shake",
    character: "Карл Янг",
    characterRole: "Оператор TWISTEX",
    text: "ОН ЗА НАМИ! ГАЗ, ТИМ, ГАЗ! Он пытается перекрыть дорогу справа — туда не езди! СЕВЕР! НА СЕВЕР!",
  },
  {
    id: 16,
    bg: IMG_PLAINS,
    bgFilter: "brightness(0.7)",
    isNarration: true,
    text: "Они успели уйти на север по грунтовке.\nТорнадо прошёл в 300 метрах от них.\n\nНо в тот день другие команды не ушли.\nВ реальности Тим Самарас выбора не сделал.",
    autoNext: 6000,
  },
  // === EPILOGUE ===
  {
    id: 17,
    bg: IMG_TIM,
    bgFilter: "brightness(0.45) sepia(0.6)",
    isNarration: true,
    chapter: "ПАМЯТЬ",
    text: "Тим Самарас говорил:\n\n«Я не хочу умереть от торнадо. Но если это случится — значит, мне не хватило данных, чтобы правильно предсказать его поведение. Это будет значить, что работа ещё не закончена.»",
    autoNext: 9000,
  },
  {
    id: 18,
    bg: IMG_PLAINS,
    bgFilter: "brightness(0.55) sepia(0.3)",
    isNarration: true,
    text: "Данные, собранные TWISTEX за годы работы, продолжают использоваться в метеорологических исследованиях по всему миру.\n\nЗонды Самараса до сих пор считаются самым близким, что учёные помещали внутрь торнадо.",
    autoNext: 7000,
  },
  {
    id: 19,
    bg: IMG_TORNADO,
    bgFilter: "brightness(0.3) saturate(0.5)",
    isNarration: true,
    chapter: "КОНЕЦ",
    text: "Посвящается Тиму Самарасу,\nПолу Самарасу и Карлу Янгу.\n\n1958–2013 · 1989–2013 · 1968–2013",
  },
];

function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    ref.current = setInterval(() => {
      if (i >= text.length) {
        setDone(true);
        clearInterval(ref.current!);
        return;
      }
      setDisplayed(text.slice(0, i + 1));
      i++;
    }, speed);
    return () => clearInterval(ref.current!);
  }, [text, speed]);

  const skip = useCallback(() => {
    clearInterval(ref.current!);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

const RainOverlay = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
    {Array.from({ length: 35 }).map((_, i) => (
      <div
        key={i}
        className="absolute w-px bg-white/15"
        style={{
          left: `${(i * 37 + 13) % 100}%`,
          top: 0,
          height: `${50 + (i * 23) % 50}px`,
          animationDelay: `${(i * 0.17) % 2}s`,
          animationDuration: `${0.5 + (i * 0.11) % 0.7}s`,
          animation: `rain-fall ${0.5 + (i * 0.11) % 0.7}s linear ${(i * 0.17) % 2}s infinite`,
          transform: "rotate(12deg)",
        }}
      />
    ))}
  </div>
);

const GrainOverlay = () => (
  <div
    className="absolute inset-0 pointer-events-none z-10 opacity-25"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
      backgroundSize: "120px",
    }}
  />
);

export default function Index() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scene = SCENES[sceneIdx];
  const { displayed, done, skip } = useTypewriter(
    scene.text,
    scene.isNarration ? 20 : 28
  );

  const goTo = useCallback(
    (idx: number) => {
      if (transitioning) return;
      setTransitioning(true);
      clearTimeout(autoRef.current!);
      setTimeout(() => {
        if (idx >= SCENES.length) {
          setShowEnd(true);
        } else {
          setSceneIdx(idx);
        }
        setTransitioning(false);
      }, 700);
    },
    [transitioning]
  );

  const next = useCallback(() => {
    if (!done) { skip(); return; }
    if (scene.choices) return;
    const ni = sceneIdx + 1;
    if (ni < SCENES.length) goTo(ni);
    else setShowEnd(true);
  }, [done, skip, scene, sceneIdx, goTo]);

  useEffect(() => {
    if (!started) return;
    clearTimeout(autoRef.current!);
    if (scene.autoNext && done) {
      autoRef.current = setTimeout(() => {
        const ni = sceneIdx + 1;
        if (ni < SCENES.length) goTo(ni);
        else setShowEnd(true);
      }, scene.autoNext);
    }
    return () => clearTimeout(autoRef.current!);
  }, [scene, sceneIdx, done, started, goTo]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["Space", "Enter", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
        if (!started) { setStarted(true); return; }
        next();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [started, next]);

  // TITLE
  if (!started) {
    return (
      <div
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden cursor-pointer font-rubik"
        style={{ background: "#000" }}
        onClick={() => setStarted(true)}
      >
        <div className="absolute inset-0">
          <img src={IMG_TORNADO} alt="" className="w-full h-full object-cover opacity-25" style={{ filter: "sepia(0.6) contrast(1.3) brightness(0.7)" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/40" />
        </div>
        <GrainOverlay />

        <div className="relative z-20 text-center px-8 max-w-2xl">
          <div
            className="font-mono text-amber-500/60 text-xs tracking-[0.5em] uppercase mb-8"
            style={{ animation: "fade-up 1s ease-out 0.2s both" }}
          >
            Визуальная новелла · Реальные события
          </div>
          <h1
            className="font-bebas text-[clamp(5rem,20vw,14rem)] leading-none tracking-widest text-white"
            style={{
              textShadow: "0 0 100px rgba(200,110,20,0.35), 0 2px 40px rgba(0,0,0,0.9)",
              animation: "fade-up 1s ease-out 0.4s both",
            }}
          >
            TWISTEX
          </h1>
          <div
            className="w-24 h-px bg-amber-600/50 mx-auto my-6"
            style={{ animation: "fade-up 1s ease-out 0.5s both" }}
          />
          <p
            className="font-oswald text-gray-300 text-xl font-light tracking-wide leading-relaxed"
            style={{ animation: "fade-up 1s ease-out 0.6s both" }}
          >
            История последней экспедиции<br />
            <span className="text-amber-400">Тима Самараса и его команды</span>
          </p>
          <p
            className="font-mono text-gray-600 text-xs mt-3 tracking-widest"
            style={{ animation: "fade-up 1s ease-out 0.7s both" }}
          >
            31 мая 2013 · Эль-Рено, Оклахома · EF5
          </p>

          <div
            className="mt-16 font-mono text-amber-600/50 text-sm"
            style={{ animation: "pulse-text 2s ease-in-out infinite" }}
          >
            нажмите чтобы начать
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-10 z-20">
          {[
            { label: "ЛЕТ ОПЫТА", val: "20" },
            { label: "ТОРНАДО", val: "125+" },
            { label: "ЗОНДОВ УСТАНОВЛЕНО", val: "47" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-bebas text-4xl text-amber-400">{s.val}</div>
              <div className="font-mono text-gray-600 text-[10px] tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes fade-up { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
          @keyframes pulse-text { 0%,100%{opacity:.5} 50%{opacity:1} }
        `}</style>
      </div>
    );
  }

  // END SCREEN
  if (showEnd) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-rubik" style={{ background: "#000" }}>
        <div className="absolute inset-0">
          <img src={IMG_PLAINS} alt="" className="w-full h-full object-cover opacity-15" style={{ filter: "grayscale(1)" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/70" />
        </div>
        <GrainOverlay />

        <div className="relative z-20 text-center px-8 max-w-lg" style={{ animation: "fade-up 1.2s ease-out both" }}>
          <div className="font-mono text-amber-500/50 text-xs tracking-[0.4em] uppercase mb-8">Спасибо за прочтение</div>
          <div className="font-oswald text-gray-300 text-lg font-light leading-loose mb-8">
            Работа охотников за торнадо помогла создать системы раннего предупреждения,<br />которые ежегодно спасают тысячи жизней.
          </div>
          <div
            className="inline-block font-mono text-xs text-gray-500 border border-gray-800 px-8 py-5 leading-loose"
            style={{ background: "rgba(15,10,3,0.9)" }}
          >
            Tim Samaras · 1958–2013<br />
            Paul Samaras · 1989–2013<br />
            Carl Young · 1968–2013
          </div>

          <div className="mt-12">
            <button
              className="px-8 py-3 font-oswald tracking-widest text-sm uppercase text-black bg-amber-500 hover:bg-amber-400 transition-colors"
              style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
              onClick={() => { setSceneIdx(0); setShowEnd(false); setStarted(false); }}
            >
              Начать заново
            </button>
          </div>
        </div>

        <style>{`@keyframes fade-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    );
  }

  // SCENE
  const isShaking = scene.effect === "shake";

  return (
    <div
      className="relative min-h-screen overflow-hidden font-rubik select-none"
      style={{
        background: "#000",
        animation: isShaking && done ? "scene-shake 0.12s infinite" : "none",
      }}
      onClick={!scene.choices ? next : undefined}
    >
      {/* BG image */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: transitioning ? 0 : 1 }}
      >
        <img
          src={scene.bg}
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: scene.bgFilter ?? "brightness(0.6)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/98 via-black/25 to-black/15" />
      </div>

      <GrainOverlay />
      {isShaking && <RainOverlay />}

      {/* Chapter title overlay */}
      {scene.chapter && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div
            className="text-center"
            style={{ animation: "fade-up 1s ease-out both" }}
          >
            <div
              className="font-bebas text-[clamp(4rem,12vw,10rem)] tracking-[0.3em] text-white"
              style={{ textShadow: "0 0 80px rgba(200,110,20,0.4)" }}
            >
              {scene.chapter}
            </div>
          </div>
        </div>
      )}

      {/* Top bar — location */}
      {(scene.location || scene.date) && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="font-mono text-amber-400/80 text-xs tracking-widest uppercase">{scene.location}</div>
          <div className="font-mono text-gray-500 text-xs tracking-widest">{scene.date}</div>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-900/80 z-40 pointer-events-none">
        <div
          className="h-full bg-amber-600/80 transition-all duration-700"
          style={{ width: `${(sceneIdx / (SCENES.length - 1)) * 100}%` }}
        />
      </div>

      {/* Back */}
      {sceneIdx > 0 && (
        <button
          className="absolute top-5 right-5 z-50 font-mono text-xs text-gray-700 hover:text-gray-400 transition-colors p-1"
          onClick={(e) => { e.stopPropagation(); goTo(sceneIdx - 1); }}
        >
          <Icon name="ChevronLeft" size={15} />
        </button>
      )}

      {/* ── DIALOGUE BOX ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-500"
        style={{ opacity: transitioning ? 0 : 1 }}
      >
        {/* Nameplate */}
        {scene.character && (
          <div className="px-5 pb-1.5">
            <div
              className="inline-flex flex-col px-5 py-2"
              style={{
                background: "linear-gradient(135deg, rgba(160,85,5,0.95), rgba(100,50,3,0.97))",
                clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
              }}
            >
              <span className="font-oswald font-semibold text-white text-lg tracking-wide leading-tight">
                {scene.character}
              </span>
              {scene.characterRole && (
                <span className="font-mono text-amber-200/65 text-[10px] tracking-wider uppercase">
                  {scene.characterRole}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Text box */}
        <div
          className="mx-4 mb-4 px-7 py-5 relative"
          style={{
            background: scene.isNarration
              ? "linear-gradient(135deg, rgba(4,3,1,0.98), rgba(8,6,2,0.99))"
              : "linear-gradient(135deg, rgba(7,5,1,0.97), rgba(14,9,2,0.99))",
            border: `1px solid ${scene.isNarration ? "rgba(130,85,20,0.35)" : "rgba(180,110,20,0.25)"}`,
            clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
          }}
        >
          {scene.isNarration && (
            <div className="absolute left-0 top-5 bottom-5 w-0.5 bg-amber-600/45" />
          )}

          <p
            className={`leading-relaxed whitespace-pre-line min-h-[4.5rem] ${
              scene.isNarration
                ? "font-oswald font-light text-gray-300 text-base italic tracking-wide"
                : "font-rubik text-gray-100 text-[1.05rem]"
            }`}
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
          >
            {displayed}
            {!done && (
              <span className="inline-block w-0.5 h-4 bg-amber-400/80 align-middle ml-1 animate-pulse" />
            )}
          </p>

          {/* Choices */}
          {done && scene.choices && (
            <div className="mt-5 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              {scene.choices.map((choice, i) => (
                <button
                  key={i}
                  className="text-left px-5 py-3 font-oswald text-sm tracking-wide uppercase transition-all duration-200"
                  style={{
                    background: "rgba(25,15,3,0.85)",
                    border: "1px solid rgba(170,100,15,0.35)",
                    clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)",
                    color: "#d4a542",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(140,80,8,0.45)";
                    (e.currentTarget as HTMLElement).style.color = "#f5d060";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(25,15,3,0.85)";
                    (e.currentTarget as HTMLElement).style.color = "#d4a542";
                  }}
                  onClick={() => goTo(choice.nextScene)}
                >
                  <span className="text-amber-700 mr-3 font-mono">▸</span>
                  {choice.text}
                </button>
              ))}
            </div>
          )}

          {/* Continue hint */}
          {done && !scene.choices && !scene.autoNext && (
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <span className="font-mono text-amber-700/50 text-xs tracking-widest">далее</span>
              <Icon name="ChevronRight" size={13} className="text-amber-700/50" />
            </div>
          )}
          {done && scene.autoNext && (
            <div className="mt-2 flex justify-end">
              <span className="font-mono text-gray-700/60 text-xs tracking-widest animate-pulse">продолжение...</span>
            </div>
          )}
        </div>
      </div>

      {/* Scene counter */}
      <div className="absolute bottom-3.5 right-5 z-50 font-mono text-gray-800 text-[10px] tracking-widest pointer-events-none">
        {sceneIdx + 1} / {SCENES.length}
      </div>

      <style>{`
        @keyframes fade-up { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rain-fall {
          0%{transform:translateY(-80px) rotate(12deg);opacity:.7}
          100%{transform:translateY(110vh) rotate(12deg);opacity:.05}
        }
        @keyframes scene-shake {
          0%,100%{transform:translate(0,0) rotate(0deg)}
          20%{transform:translate(-3px,1px) rotate(-.3deg)}
          40%{transform:translate(3px,-1px) rotate(.3deg)}
          60%{transform:translate(-2px,2px) rotate(-.2deg)}
          80%{transform:translate(2px,-2px) rotate(.2deg)}
        }
      `}</style>
    </div>
  );
}
