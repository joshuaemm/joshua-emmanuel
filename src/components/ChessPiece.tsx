import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useTransform } from "framer-motion";

const ease = [0.65, 0, 0.35, 1] as const;

/**
 * A softly focused floating chess piece, after the "échec" poster: it drifts
 * against the scroll and, each time it comes into view, is revealed by a
 * selection marquee opening over it (the same move as the headlines, minus the
 * cursor). `framed` keeps a thin selection frame around it afterwards.
 */
export default function ChessPiece({
  piece,
  className,
  size = 180,
  blur = 0,
  rotate = 0,
  drift = 80,
  delay = 0.2,
  framed = false,
}: {
  piece: "queen" | "pawn" | "bishop" | "king" | "queen-black" | "pawn-black" | "king-black";
  className: string;
  size?: number;
  blur?: number;
  rotate?: number;
  /** px travelled against the scroll while it crosses the screen */
  drift?: number;
  delay?: number;
  framed?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-5% 0px" });
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);
  const r = useTransform(scrollYProgress, [0, 1], [rotate - 8, rotate + 8]);

  // p: marquee drag progress (0 → 1); box: marquee opacity
  const p = useMotionValue(0);
  const box = useMotionValue(0);
  // the overhang keeps the blur's soft edge from being cut once fully revealed
  const clip = useTransform(p, (v) => {
    const edge = `calc(${(1 - v) * 100}% - ${v * 24}px)`;
    return `inset(-24px ${edge} ${edge} -24px)`;
  });
  const boxSize = useTransform(p, (v) => `${v * 100}%`);

  useEffect(() => {
    if (!inView) {
      p.set(0);
      box.set(0);
      return;
    }
    if (reduce) {
      p.set(1);
      return;
    }
    box.set(1);
    const a = animate(p, 1, { duration: 0.9, delay, ease });
    const b = animate(box, framed ? 1 : 0, { duration: 0.5, delay: delay + 1.05 });
    return () => {
      a.stop();
      b.stop();
    };
  }, [inView, reduce, delay, framed, p, box]);

  const handle = "absolute h-[6px] w-[6px] border border-ink/60 bg-paper";

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute select-none ${className}`}
      style={{ y, width: size }}
    >
      {/* selection marquee: opens from the top-left, then fades (or stays, when framed) */}
      <motion.div className="absolute -inset-4" style={{ opacity: box }}>
        <motion.div className="absolute left-0 top-0 border border-ink/25" style={{ width: boxSize, height: boxSize }}>
          <span className={`${handle} -left-[3px] -top-[3px]`} />
          <span className={`${handle} -right-[3px] -top-[3px]`} />
          <span className={`${handle} -bottom-[3px] -left-[3px]`} />
          <span className={`${handle} -bottom-[3px] -right-[3px]`} />
        </motion.div>
      </motion.div>
      <motion.img
        src={`/media/chess-${piece}.webp`}
        alt=""
        draggable={false}
        className="block w-full"
        style={{ rotate: r, clipPath: clip, filter: blur ? `blur(${blur}px)` : undefined }}
      />
    </motion.div>
  );
}
