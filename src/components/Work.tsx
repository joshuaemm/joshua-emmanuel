import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useReducedMotion, useScroll, useVelocity } from "framer-motion";
import { Play } from "lucide-react";
import { projects } from "../data";
import ChessPiece from "./ChessPiece";

const ease = [0.22, 1, 0.36, 1] as const;
const n = projects.length;
// wheel speed in degrees per second, normally and while hovered
const SPIN = 11.7;
const SPIN_HOVER = 2.6;
const step = 360 / n;

/** Wrap an angle to (-180, 180]. */
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * A slowly turning wheel of work cards, after the fanned-card portfolio reel.
 * The cards near the top of the wheel are in view; the wheel keeps turning, so
 * every work cycles through. Hover slows it, scrolling nudges it, drag spins it.
 */
function Wheel({ onPlay }: { onPlay: (src: string) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const [w, setW] = useState(1100);
  const [active, setActive] = useState(0);
  const angle = useRef(0);
  const speed = useRef(SPIN);
  const target = useRef(SPIN);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const scrollV = useVelocity(scrollY);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const R = Math.max(250, Math.min(440, w * 0.4));
  const cardW = R * 0.6;
  const cardH = cardW * 1.3;
  const stageH = R + cardH * 0.62 + 30;
  const dome = R - cardH * 0.62;

  useAnimationFrame((_, delta) => {
    const dt = Math.min(delta, 64) / 1000;
    if (!drag.current) {
      const base = reduce ? 0 : target.current;
      speed.current += (base - speed.current) * Math.min(1, dt * 3);
      // scrolling gives the wheel a push in the scroll direction
      angle.current -= (speed.current + scrollV.get() * 0.02) * dt;
    }

    let best = 0;
    let bestCos = -2;
    projects.forEach((_, i) => {
      const el = cards.current[i];
      if (!el) return;
      const t = wrap(angle.current + i * step);
      const rad = (t * Math.PI) / 180;
      const c = Math.cos(rad);
      if (c > bestCos) {
        bestCos = c;
        best = i;
      }
      const x = R * Math.sin(rad);
      const y = -R * c;
      const lift = Math.pow(Math.max(0, c), 6);
      el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0) rotate(${t}deg) scale(${0.92 + 0.1 * lift})`;
      el.style.opacity = String(Math.max(0, Math.min(1, (c + 0.3) / 0.45)));
      el.style.zIndex = String(Math.round(c * 10) + 10);
      el.style.pointerEvents = c > -0.1 ? "auto" : "none";
    });
    setActive((a) => (a === best ? a : best));
  });

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 4) d.moved = true;
    d.x = e.clientX;
    angle.current += dx * (180 / Math.PI / R);
  };
  const endDrag = () => {
    // let the click handler see `moved` first
    setTimeout(() => (drag.current = null), 0);
  };

  const p = projects[active];

  return (
    <div
      ref={stageRef}
      className="relative -mx-4 touch-pan-y select-none md:mx-0"
      style={{ height: stageH }}
      onMouseEnter={() => (target.current = SPIN_HOVER)}
      onMouseLeave={() => {
        target.current = SPIN;
        endDrag();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* the wheel melts away at the bottom instead of ending on a hard line */}
      <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
        <div className="absolute bottom-0 left-1/2">
          {projects.map((proj, i) => (
            <button
              key={proj.id}
              ref={(el) => {
                cards.current[i] = el;
              }}
              onClick={() => !drag.current?.moved && onPlay(proj.video)}
              className="group absolute left-0 top-0 will-change-transform"
              style={{ width: cardW, height: cardH, opacity: 0 }}
              aria-label={`Play ${proj.title}`}
            >
              <span className="glass block h-full w-full overflow-hidden rounded-[22px] p-1.5">
                <span className="relative block h-full w-full overflow-hidden rounded-[17px] bg-ink">
                  <video
                    className="h-full w-full object-cover grayscale transition-[filter,transform] duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    src={proj.loop}
                    poster={proj.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    draggable={false}
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-paper/85 px-2.5 py-1 text-[10px] text-ink backdrop-blur">
                    {proj.tag}
                  </span>
                  <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-paper/90 text-ink">
                      <Play size={16} fill="currentColor" />
                    </span>
                  </span>
                </span>
              </span>
            </button>
          ))}

          {/* the dome the cards turn around */}
          <div
            className="glass absolute left-0 top-0 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: dome * 2, height: dome * 2 }}
          />
        </div>
      </div>

      {/* title of the work at the top of the wheel, kept outside the fade */}
      <div className="pointer-events-none absolute inset-x-0 z-40 text-center" style={{ top: stageH - dome * 0.72 }}>
        <p className="text-[11px] tabular-nums tracking-[0.25em] text-muted">
          {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.45, ease }}
          >
            <h3 className="mt-2 font-serif text-[clamp(26px,3.4vw,44px)] leading-none text-ink">{p.title}</h3>
            <p className="mt-2 text-xs text-muted">
              {p.client} · {p.year}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Work({ onPlay }: { onPlay: (src: string) => void }) {
  return (
    <section id="work" className="relative px-4 pt-28 md:px-10 md:pt-40">
      <ChessPiece piece="king" framed size={100} rotate={12} drift={30} className="right-[9%] -top-6 hidden md:block" />
      <ChessPiece piece="pawn-black" size={190} blur={7} rotate={-20} drift={140} className="-left-10 bottom-[12%] hidden md:block" />
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="mb-10 flex items-end justify-between gap-6 md:mb-4"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease }}
        >
          <h2 className="font-serif text-[clamp(48px,8vw,112px)] leading-[0.9] text-ink">
            Selected <span className="italic">work.</span>
          </h2>
          <p className="hidden max-w-[12rem] text-right text-sm text-muted md:block">Drag to spin. Tap to watch.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease }}
        >
          <Wheel onPlay={onPlay} />
        </motion.div>
      </div>
    </section>
  );
}
