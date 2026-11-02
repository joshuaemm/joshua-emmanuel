import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, motionValue, useInView, useReducedMotion, useTransform, type MotionValue } from "framer-motion";

const ease = [0.65, 0, 0.35, 1] as const;
const PAD = 14;

/**
 * One drag: a rectangle in fractions of the (padded) text box, dragged by
 * `cursor` from its top-left corner ("se") or its top-right corner ("sw").
 */
export type Segment = { x: number; y: number; w: number; h: number; cursor: 0 | 1; dir?: "se" | "sw" };

// two lines of text: each cursor takes one line in two drags, from opposite sides
const TWO_LINES: Segment[] = [
  { x: 0, y: 0, w: 0.56, h: 0.53, cursor: 0 },
  { x: 0.44, y: 0.47, w: 0.56, h: 0.53, cursor: 1, dir: "sw" },
  { x: 0.5, y: 0, w: 0.5, h: 0.53, cursor: 0 },
  { x: 0, y: 0.47, w: 0.5, h: 0.53, cursor: 1, dir: "sw" },
];

function Cursor({ light }: { light?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]">
      <path
        d="M4 2.5 L4 19.5 L8.6 15.2 L11.6 21.6 L14.4 20.3 L11.4 14 L17.6 14 Z"
        fill={light ? "#fff" : "#0e0e0e"}
        stroke={light ? "#0e0e0e" : "#fff"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type SegState = { p: MotionValue<number>; box: MotionValue<number> };
type CursorState = { x: MotionValue<number>; y: MotionValue<number>; o: MotionValue<number> };

function Marquee({ seg, st, W, H }: { seg: Segment; st: SegState; W: number; H: number }) {
  const sw = seg.dir === "sw";
  const left = useTransform(st.p, (v) => seg.x * W + (sw ? (1 - v) * seg.w * W : 0) - PAD);
  const top = seg.y * H - PAD;
  const width = useTransform(st.p, (v) => v * seg.w * W);
  const height = useTransform(st.p, (v) => v * seg.h * H);
  const label = useTransform(st.p, (v) => `${Math.round(v * seg.w * W)} × ${Math.round(v * seg.h * H)}`);
  const handle = "absolute h-[7px] w-[7px] border border-ink bg-paper";
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute border border-ink/70 bg-ink/[0.03]"
      style={{ left, top, width, height, opacity: st.box }}
    >
      <span className={`${handle} -left-1 -top-1`} />
      <span className={`${handle} -right-1 -top-1`} />
      <span className={`${handle} -bottom-1 -left-1`} />
      <span className={`${handle} -bottom-1 -right-1`} />
      <motion.span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 font-sans text-[10px] not-italic tabular-nums tracking-normal text-paper">
        {label}
      </motion.span>
    </motion.div>
  );
}

function Piece({ seg, st, W, H, children }: { seg: Segment; st: SegState; W: number; H: number; children: React.ReactNode }) {
  const sw = seg.dir === "sw";
  // the copy of the text that shows through this selection
  const clip = useTransform(st.p, (v) => {
    const l = seg.x * W + (sw ? (1 - v) * seg.w * W : 0);
    const r = sw ? seg.x * W + seg.w * W : seg.x * W + v * seg.w * W;
    const t = seg.y * H;
    const b = t + v * seg.h * H;
    return `inset(${t - PAD}px ${W - PAD - r}px ${H - PAD - b}px ${l - PAD}px)`;
  });
  return (
    <motion.div aria-hidden className="absolute inset-0" style={{ clipPath: clip }}>
      {children}
    </motion.div>
  );
}

/**
 * Reveals its children like a design-tool selection, in several drags by two
 * cursors: each drag shows the part of the text inside its marquee, until the
 * whole text is in. Then the cursors leave and the text stays. Scrolling
 * away resets it, so it plays again on the next visit.
 */
export default function SelectReveal({
  children,
  delay = 0,
  segments = TWO_LINES,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  segments?: Segment[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // replays every time the text comes back into view
  const inView = useInView(ref, { margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [done, setDone] = useState(false);

  const segs = useMemo<SegState[]>(() => segments.map(() => ({ p: motionValue(0), box: motionValue(0) })), [segments]);
  const cursors = useMemo<CursorState[]>(
    () => [0, 1].map(() => ({ x: motionValue(0), y: motionValue(0), o: motionValue(0) })),
    [],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // geometry of the padded box the fractions refer to
  const W = size.w + PAD * 2;
  const H = size.h + PAD * 2;

  useEffect(() => {
    if (size.w === 0) return;
    const running: { stop: () => void }[] = [];
    const listeners: (() => void)[] = [];
    // stop everything and hide the text again, ready for the next visit
    const reset = () => {
      running.forEach((a) => a.stop());
      listeners.forEach((off) => off());
      segs.forEach((st) => {
        st.p.set(0);
        st.box.set(0);
      });
      cursors.forEach((cur) => cur.o.set(0));
    };
    if (!inView) {
      reset();
      setDone(false);
      return;
    }
    if (reduce) {
      setDone(true);
      return;
    }
    setDone(false);
    let cancelled = false;
    const wait = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
    const run = (...args: Parameters<typeof animate>) => {
      const a = (animate as (...a: unknown[]) => { stop: () => void } & PromiseLike<void>)(...args);
      running.push(a);
      return a;
    };

    const runCursor = async (c: 0 | 1, startDelay: number) => {
      const cur = cursors[c];
      const mine = segments.map((s, i) => [s, segs[i]] as const).filter(([s]) => s.cursor === c);
      if (!mine.length) return;
      // enter from below, on this cursor's side
      cur.x.set(c === 0 ? -60 : size.w + 60);
      cur.y.set(size.h + 110);
      await wait(startDelay);
      if (cancelled) return;
      run(cur.o, 1, { duration: 0.25 });
      for (const [s, st] of mine) {
        const sw = s.dir === "sw";
        const sx = (sw ? s.x + s.w : s.x) * W - PAD;
        const sy = s.y * H - PAD;
        await Promise.all([run(cur.x, sx, { duration: 0.55, ease }), run(cur.y, sy, { duration: 0.55, ease })]);
        if (cancelled) return;
        st.box.set(1);
        const off = st.p.on("change", (v) => {
          cur.x.set(sx + (sw ? -1 : 1) * v * s.w * W);
          cur.y.set(sy + v * s.h * H);
        });
        listeners.push(off);
        await run(st.p, 1, { duration: 0.75, ease });
        off();
        if (cancelled) return;
        // release: the marquee fades while the cursor heads to its next drag
        run(st.box, 0, { duration: 0.45, delay: 0.1 });
      }
      if (cancelled) return;
      run(cur.x, c === 0 ? -120 : size.w + 120, { duration: 0.8, ease });
      run(cur.y, size.h * 0.6, { duration: 0.8, ease });
      await run(cur.o, 0, { duration: 0.6, delay: 0.2 });
    };

    Promise.all([runCursor(0, delay), runCursor(1, delay + 0.35)]).then(() => {
      if (!cancelled) setDone(true);
    });
    return () => {
      cancelled = true;
      reset();
    };
    // motion values are stable; rerun when the section is entered or left
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, size.w > 0, reduce]);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      {/* the real text holds the layout and takes over once the reveal is done */}
      <div style={{ visibility: done ? "visible" : "hidden" }}>{children}</div>

      {!done && (
        <>
          {segments.map((s, i) => (
            <Piece key={i} seg={s} st={segs[i]} W={W} H={H}>
              {children}
            </Piece>
          ))}
          {segments.map((s, i) => (
            <Marquee key={i} seg={s} st={segs[i]} W={W} H={H} />
          ))}
          {cursors.map((cur, c) => (
            <motion.div
              key={c}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-10"
              style={{ x: cur.x, y: cur.y, opacity: cur.o }}
            >
              <Cursor light={c === 1} />
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}
