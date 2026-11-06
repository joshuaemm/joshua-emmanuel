import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import { gallery, type GalleryItem } from "../gallery";
import ChessPiece from "./ChessPiece";

const ease = [0.22, 1, 0.36, 1] as const;
const GAP = 12;
const COLS = 8; // one block of COLS × ROWS cells repeats endlessly in both directions
const ROWS = 5;
const CELLS = COLS * ROWS;
const DRIFT = { x: -16, y: -11 }; // px per second while nobody is dragging
const DRIFT_HOLD = { x: -6, y: -4 }; // slower, but never still, while a frame is centre stage
const SWAP_EVERY = 2200; // ms between a tile changing to another piece
// the centre-stage cycle (seconds): the next frame grows in while the current one shrinks out
const MOVE_S = 1.4;
const HOLD_S = 2.8;
const GROW_X = 3.2; // how much the featured column / row grows
const GROW_Y = 2.6;

const mod = (a: number, n: number) => ((a % n) + n) % n;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/**
 * Track sizes for one axis. Each track has its own random size (`mult`), and
 * each featured track grows by `grow × amount` (two can be mid-hand-off at
 * once). Sizes are normalised so the
 * block's total length never changes (keeping the endless tiling seamless),
 * which is also what makes every other track give way a little.
 */
function tracks(mult: number[], focus: [number, number][], base: number, grow: number) {
  const raw = mult.map((m, i) => m * (1 + grow * focus.reduce((a, [f, amt]) => (f === i ? a + amt : a), 0)));
  const sum = raw.reduce((x, y) => x + y, 0);
  return raw.map((v) => (v / sum) * mult.length * base);
}
const offsets = (sizes: number[]) => sizes.map((_, i) => sizes.slice(0, i).reduce((x, y) => x + y, 0));

type Hero = {
  c: number;
  r: number;
  phase: "grow" | "hold" | "shrink";
  t: number;
  from: { x: number; y: number };
  delta: { x: number; y: number };
  pan: boolean;
};

/**
 * One tile. At rest it is a "liquid grain" wash: the piece melted into a
 * blurred, softly moving field of its own colours under fine, still grain. On
 * hover it comes into focus, mildly coloured, and video starts playing; when it
 * is the featured frame in the centre, the grain goes and its clip plays from
 * the start (muted). Its frame (position and size) is set every frame by the grid.
 */
const Tile = memo(function Tile({
  item,
  seed,
  featured,
  tileRef,
}: {
  item: GalleryItem;
  seed: number;
  featured: boolean;
  tileRef: (el: HTMLDivElement | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const active = hover || featured;
  const still = item.kind === "photo" ? item.src : item.poster;
  return (
    <div
      ref={tileRef}
      data-gallery-index={gallery.indexOf(item)}
      className="group absolute left-0 top-0 overflow-hidden rounded-2xl bg-[#e9e6df]"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <div key={item.id} className="absolute inset-0 animate-[gallery-in_0.9s_ease_both]">
        {/* liquid layer */}
        <img
          src={still}
          alt=""
          draggable={false}
          loading="lazy"
          className="gallery-liquid absolute inset-0 h-full w-full object-cover"
          style={{ animationDelay: `${-(seed % 17)}s` }}
        />
        {/* focused layer */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}>
          {item.kind === "video" && active ? (
            <video
              key={featured ? "featured" : "hover"} // a fresh element, so a featured clip starts from the top
              src={item.loop}
              poster={item.poster}
              className="h-full w-full object-cover saturate-[0.75]"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <img src={still} alt="" draggable={false} className="h-full w-full object-cover saturate-[0.75]" />
          )}
        </div>
        {/* grain */}
        <div
          className={`gallery-grain pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity duration-500 ${featured ? "opacity-0" : hover ? "opacity-10" : "opacity-35"}`}
        />
        {/* label */}
        <div
          className={`absolute inset-x-2 bottom-2 flex items-center gap-1.5 transition-all duration-500 ${
            active ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <span className="truncate rounded-full bg-paper/90 px-2.5 py-1 text-[10px] text-ink backdrop-blur">{item.title}</span>
          <span className="shrink-0 rounded-full bg-ink/70 px-2 py-1 text-[9px] text-paper">{item.tag}</span>
        </div>
      </div>
    </div>
  );
});

function Cursor() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]">
      <path d="M4 2.5 L4 19.5 L8.6 15.2 L11.6 21.6 L14.4 20.3 L11.4 14 L17.6 14 Z" fill="#0e0e0e" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * "The archive": an endless grid of every piece, in frames of random sizes.
 * Every few seconds one frame from a corner grows and glides into the centre
 * of the grid while every other frame gives way a little, and plays sharp; as
 * it shrinks back into place, the next one (from another corner) grows in. A selection
 * frame with a cursor rides the featured frame as if someone were resizing it.
 * Drag anywhere (it glides on); left alone it drifts by itself.
 */
export default function Gallery({ onOpen }: { onOpen: (src: string) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tileRefs = useRef<(HTMLDivElement | null)[][]>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  const frameLabel = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const recRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const inView = useInView(stageRef, { margin: "20% 0px" });
  const reduce = useReducedMotion();

  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ ...DRIFT });
  const clock = useRef(0);
  const heroes = useRef<Hero[]>([]);
  const [featured, setFeatured] = useState<string | null>(null); // "copy-cell" of the tile in the centre
  const featuredRef = useRef<string | null>(null);
  const corner = useRef(0);
  // every piece gets a turn in the centre before any repeats
  const queue = useRef<number[]>([]);
  const nextPiece = () => {
    if (!queue.current.length) queue.current = gallery.map((_, i) => i).sort(() => Math.random() - 0.5);
    return queue.current.shift()!;
  };
  const drag = useRef<{ x: number; y: number; t: number; moved: number; vx: number; vy: number } | null>(null);
  const cursorX = useMotionValue(-200);
  const cursorY = useMotionValue(-200);
  const [over, setOver] = useState(false);
  const [dragging, setDragging] = useState(false);

  // one piece per cell, all different
  const [items, setItems] = useState<number[]>(() => {
    const order = gallery.map((_, i) => i).sort(() => Math.random() - 0.5);
    return Array.from({ length: CELLS }, (_, k) => order[k % order.length]);
  });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const unit = size.w < 640 ? 120 : size.w < 1100 ? 160 : 190;
  const blockW = COLS * unit;
  const blockH = ROWS * unit;
  const nx = Math.ceil(size.w / blockW) + 1;
  const ny = Math.ceil(size.h / blockH) + 1;
  // random frame sizes: every column and row gets its own width / height
  const colMult = useMemo(() => Array.from({ length: COLS }, () => 0.65 + Math.random() * 0.8), []);
  const rowMult = useMemo(() => Array.from({ length: ROWS }, () => 0.7 + Math.random() * 0.65), []);
  const copies = useMemo(() => Array.from({ length: nx * ny }, (_, k) => [k % nx, Math.floor(k / nx)] as const), [nx, ny]);

  // single tiles keep changing to other pieces
  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => {
      setItems((prev) => {
        const k = Math.floor(Math.random() * prev.length);
        // leave the frames in (or heading to / from) the centre alone
        if (heroes.current.some((x) => x.r * COLS + x.c === k)) return prev;
        const pool = gallery.map((_, i) => i).filter((i) => !prev.includes(i));
        if (!pool.length) return prev;
        const next = prev.slice();
        next[k] = pool[Math.floor(Math.random() * pool.length)];
        return next;
      });
    }, SWAP_EVERY);
    return () => clearInterval(id);
  }, [inView, reduce]);

  useAnimationFrame((_, delta) => {
    if (!inView) return;
    const dt = Math.min(delta, 64) / 1000;
    if (!reduce) clock.current += dt;
    const t = clock.current;

    const ox0 = mod(pos.current.x, blockW) - blockW;
    const oy0 = mod(pos.current.y, blockH) - blockH;

    // the next featured frame: whichever sits nearest the next corner of the view
    const spawn = () => {
      const corners = [
        [0.15, 0.2],
        [0.85, 0.2],
        [0.85, 0.8],
        [0.15, 0.8],
      ];
      const [px, py] = corners[corner.current++ % 4];
      const live = heroes.current.map((x) => [x.c, x.r]);
      const cw0 = tracks(colMult, [], unit, 0);
      const rh0 = tracks(rowMult, [], unit, 0);
      const cx0 = offsets(cw0);
      const ry0 = offsets(rh0);
      let pick = { c: 0, r: 0, i: 0, j: 0 };
      let bestD = Infinity;
      copies.forEach(([i, j]) => {
        for (let c = 0; c < COLS; c++)
          for (let r = 0; r < ROWS; r++) {
            if (live.some(([lc, lr]) => lc === c || lr === r)) continue; // keep the hand-off clean
            const x = ox0 + i * blockW + cx0[c] + cw0[c] / 2;
            const y = oy0 + j * blockH + ry0[r] + rh0[r] / 2;
            const d = Math.hypot(x - px * size.w, y - py * size.h);
            if (d < bestD) {
              bestD = d;
              pick = { c, r, i, j };
            }
          }
      });
      // where its centre will be once fully grown, so the pan lands it in the middle
      const cw1 = tracks(colMult, [[pick.c, 1]], unit, GROW_X);
      const rh1 = tracks(rowMult, [[pick.r, 1]], unit, GROW_Y);
      const x1 = ox0 + pick.i * blockW + offsets(cw1)[pick.c] + cw1[pick.c] / 2;
      const y1 = oy0 + pick.j * blockH + offsets(rh1)[pick.r] + rh1[pick.r] / 2;
      // the frame takes the next piece from the queue (swapping with wherever that piece sat)
      const cell = pick.r * COLS + pick.c;
      const piece = nextPiece();
      setItems((prev) => {
        const next = prev.slice();
        const other = next.indexOf(piece);
        if (other >= 0 && other !== cell) next[other] = next[cell];
        next[cell] = piece;
        return next;
      });
      heroes.current.push({
        c: pick.c,
        r: pick.r,
        phase: "grow",
        t: 0,
        from: { ...pos.current },
        delta: { x: size.w / 2 - x1, y: size.h / 2 - y1 },
        pan: true,
      });
    };

    // advance the cycle: when a frame's hold ends it starts shrinking and the next one starts growing
    if (!reduce) {
      for (const x of heroes.current.slice()) {
        x.t += dt;
        if (x.phase === "grow" && x.t >= MOVE_S) {
          x.phase = "hold";
          x.t -= MOVE_S;
        } else if (x.phase === "hold" && x.t >= HOLD_S) {
          x.phase = "shrink";
          x.t -= HOLD_S;
          spawn();
        } else if (x.phase === "shrink" && x.t >= MOVE_S) {
          heroes.current.splice(heroes.current.indexOf(x), 1);
        }
      }
      if (!heroes.current.length) spawn();
    }
    const amountOf = (x: Hero) =>
      x.phase === "grow" ? easeInOut(Math.min(1, x.t / MOVE_S)) : x.phase === "hold" ? 1 : 1 - easeInOut(Math.min(1, x.t / MOVE_S));
    const incoming = heroes.current.find((x) => x.phase === "grow");

    if (drag.current) {
      heroes.current.forEach((x) => (x.pan = false)); // the visitor takes over; frames still resize in place
    } else if (incoming && incoming.pan) {
      // glide the incoming frame into the centre as it grows
      const p = easeInOut(Math.min(1, incoming.t / MOVE_S));
      pos.current.x = incoming.from.x + incoming.delta.x * p;
      pos.current.y = incoming.from.y + incoming.delta.y * p;
      vel.current = { x: 0, y: 0 };
    } else {
      // glide on after a throw, settling into a slow drift (slower still while a frame is centre stage)
      const k = Math.min(1, dt * 1.6);
      const still = reduce || heroes.current.some((x) => x.phase === "hold");
      const target = reduce ? { x: 0, y: 0 } : still ? DRIFT_HOLD : DRIFT;
      vel.current.x += (target.x - vel.current.x) * k;
      vel.current.y += (target.y - vel.current.y) * k;
      pos.current.x += vel.current.x * dt;
      pos.current.y += vel.current.y * dt;
    }

    const cw = tracks(colMult, heroes.current.map((x) => [x.c, amountOf(x)] as [number, number]), unit, GROW_X);
    const rh = tracks(rowMult, heroes.current.map((x) => [x.r, amountOf(x)] as [number, number]), unit, GROW_Y);
    const cx = offsets(cw);
    const ry = offsets(rh);

    const ox = mod(pos.current.x, blockW) - blockW;
    const oy = mod(pos.current.y, blockH) - blockH;
    copies.forEach(([i, j], k) => {
      const el = copyRefs.current[k];
      if (el) el.style.transform = `translate3d(${ox + i * blockW}px, ${oy + j * blockH}px, 0)`;
      const tiles = tileRefs.current[k];
      if (!tiles) return;
      for (let cell = 0; cell < CELLS; cell++) {
        const tile = tiles[cell];
        if (!tile) continue;
        const c = cell % COLS;
        const r = Math.floor(cell / COLS);
        const s = tile.style;
        s.transform = `translate3d(${cx[c] + GAP / 2}px, ${ry[r] + GAP / 2}px, 0)`;
        s.width = `${cw[c] - GAP}px`;
        s.height = `${rh[r] - GAP}px`;
      }
    });

    // selection frame + cursor on the most-grown frame (the copy of it nearest the middle)
    const lead = heroes.current.reduce<Hero | null>((m, x) => (!m || amountOf(x) > amountOf(m) ? x : m), null);
    const leadAmount = lead ? amountOf(lead) : 0;
    let leadKey: string | null = null;
    const fr = frameRef.current;
    if (fr) fr.style.opacity = String(leadAmount);
    if (lead && leadAmount > 0) {
      let best = { x: 0, y: 0, k: 0 };
      let bestD = Infinity;
      copies.forEach(([i, j], k) => {
        const x = ox + i * blockW + cx[lead.c] + GAP / 2;
        const y = oy + j * blockH + ry[lead.r] + GAP / 2;
        const d = Math.hypot(x + cw[lead.c] / 2 - size.w / 2, y + rh[lead.r] / 2 - size.h / 2);
        if (d < bestD) {
          bestD = d;
          best = { x, y, k };
        }
      });
      if (fr) {
        fr.style.transform = `translate3d(${best.x - 5}px, ${best.y - 5}px, 0)`;
        fr.style.width = `${cw[lead.c] - GAP + 10}px`;
        fr.style.height = `${rh[lead.r] - GAP + 10}px`;
      }
      if (frameLabel.current) frameLabel.current.textContent = `${Math.round(cw[lead.c] - GAP)} × ${Math.round(rh[lead.r] - GAP)}`;
      if (leadAmount > 0.5) leadKey = `${best.k}-${lead.r * COLS + lead.c}`;
    }
    if (leadKey !== featuredRef.current) {
      featuredRef.current = leadKey;
      setFeatured(leadKey);
    }

    if (recRef.current) {
      const frames = Math.floor(t * 24);
      const two = (n: number) => String(n).padStart(2, "0");
      // hh:mm:ss:ff at 24 fps
      recRef.current.textContent = `01:${two(Math.floor(frames / 1440) % 60)}:${two(Math.floor(frames / 24) % 60)}:${two(frames % 24)}`;
    }
    if (coordRef.current) {
      const f = (v: number) => `${v < 0 ? "−" : " "}${String(Math.abs(Math.round(v))).padStart(4, "0")}`;
      coordRef.current.textContent = `X ${f(-pos.current.x)} · Y ${f(-pos.current.y)}`;
    }
  });

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, vx: 0, vy: 0 };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (r) {
      cursorX.set(e.clientX - r.left);
      cursorY.set(e.clientY - r.top);
    }
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    const dx = e.clientX - d.x;
    const dy = e.pointerType === "mouse" ? e.clientY - d.y : 0; // touch: vertical swipes scroll the page
    const dt = Math.max(1, now - d.t) / 1000;
    pos.current.x += dx;
    pos.current.y += dy;
    d.vx = dx / dt;
    d.vy = dy / dt;
    d.moved += Math.abs(dx) + Math.abs(dy);
    d.x = e.clientX;
    d.y = e.clientY;
    d.t = now;
    if (d.moved > 6) stageRef.current?.setPointerCapture(e.pointerId);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (d.moved > 6) {
      vel.current = { x: Math.max(-2500, Math.min(2500, d.vx)), y: Math.max(-2500, Math.min(2500, d.vy)) };
      return;
    }
    // a click, not a drag: open the piece under the pointer
    const tile = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest("[data-gallery-index]");
    const item = tile ? gallery[Number(tile.getAttribute("data-gallery-index"))] : undefined;
    if (item) onOpen(item.kind === "video" ? item.video : item.src);
  };

  const handle = "absolute h-[7px] w-[7px] border border-ink bg-paper";

  return (
    <section id="gallery" className="relative pt-28 md:pt-40">
      <ChessPiece piece="pawn" size={84} blur={1} rotate={-16} drift={60} className="right-[16%] top-16 hidden md:block" />
      <motion.div
        className="relative mx-auto mb-10 flex max-w-6xl items-end justify-between gap-6 px-4 md:px-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease }}
      >
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted">The archive</p>
          <h2 className="font-serif text-[clamp(48px,8vw,112px)] leading-[0.9] text-ink">
            Everything, <span className="italic">explored.</span>
          </h2>
        </div>
        <span aria-hidden className="absolute -top-2 left-[46%] hidden text-sm tracking-[0.4em] text-muted md:block">✦ ✦ ✦</span>
        <p className="hidden max-w-[13rem] text-right text-sm text-muted md:block">
          {gallery.length} pieces. Drag anywhere. Click to open.
        </p>
      </motion.div>

      <div
        ref={stageRef}
        className={`relative h-[88svh] touch-pan-y select-none overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)] ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        } md:cursor-none`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOver(true)}
        onPointerLeave={() => setOver(false)}
      >
        {copies.map(([i, j], k) => (
          <div
            key={k}
            ref={(el) => {
              copyRefs.current[k] = el;
            }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: blockW, height: blockH }}
          >
            {items.map((itemIndex, cell) => (
              <Tile
                key={cell}
                item={gallery[itemIndex]}
                seed={cell * 7 + i * 3 + j}
                featured={featured === `${k}-${cell}`}
                tileRef={(el) => {
                  (tileRefs.current[k] ??= [])[cell] = el;
                }}
              />
            ))}
          </div>
        ))}

        {/* selection frame + cursor riding the big tile, as if resizing it */}
        <div ref={frameRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-10 border border-ink/60" style={{ opacity: 0 }}>
          <span className={`${handle} -left-1 -top-1`} />
          <span className={`${handle} -right-1 -top-1`} />
          <span className={`${handle} -bottom-1 -left-1`} />
          <span className={`${handle} -bottom-1 -right-1`} />
          <span className={`${handle} -top-1 left-1/2 -translate-x-1/2`} />
          <span className={`${handle} -bottom-1 left-1/2 -translate-x-1/2`} />
          <span
            ref={frameLabel}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] text-paper"
          />
          <span className="absolute -bottom-3 -right-3">
            <Cursor />
          </span>
        </div>

        {/* small editing details: a recording timecode and an audio meter */}
        <div className="pointer-events-none absolute right-4 top-16 z-10 flex items-center gap-2 rounded-full bg-paper/80 px-3 py-1 font-mono text-[10px] text-ink/80 backdrop-blur md:right-10">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e0573f]" />
          REC <span ref={recRef}>01:00:00:00</span>
        </div>
        <div className="pointer-events-none absolute bottom-8 right-4 z-10 hidden items-end gap-[3px] rounded-full bg-paper/80 px-3 py-1.5 backdrop-blur md:flex md:right-10">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="w-[3px] origin-bottom rounded-full bg-[#93c7a6] animate-[gallery-meter_0.9s_ease-in-out_infinite_alternate]"
              style={{ height: 14, animationDelay: `${-((i * 0.37) % 0.9)}s` }}
            />
          ))}
        </div>

        {/* map-style readout */}
        <div className="pointer-events-none absolute bottom-8 left-4 z-10 flex items-center gap-3 font-mono text-[10px] text-ink/70 md:left-10">
          <span className="rounded-full bg-paper/80 px-2.5 py-1 backdrop-blur" ref={coordRef} />
          <span className="hidden rounded-full bg-paper/80 px-2.5 py-1 backdrop-blur md:inline">{gallery.length} pieces</span>
        </div>

        {/* cursor label */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-20 hidden md:block"
          style={{ x: cursorX, y: cursorY, opacity: over ? 1 : 0 }}
        >
          <span className="block -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink px-3 py-1.5 text-[11px] font-medium text-paper shadow-lg">
            {dragging ? "Exploring…" : "Drag · Click"}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
