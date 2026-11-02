import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import ChessPiece from "./ChessPiece";
import Timeline from "./Timeline";

const statement = ["Explorer", "by", "nature."];
const italic = new Set([2]);

const stats = [
  { big: "6+", small: "years editing" },
  { big: "18+", small: "years exploring" },
  { big: "∞", small: "curiosity" },
];

const words = ["Editing", "Motion", "Photography", "Writing", "Storytelling", "Speed cubing"];

function Word({ w, i, progress }: { w: string; i: number; progress: MotionValue<number> }) {
  const start = i / statement.length;
  const opacity = useTransform(progress, [start, start + 1 / statement.length], [0.12, 1]);
  return (
    <motion.span style={{ opacity }} className={`mr-[0.22em] inline-block ${italic.has(i) ? "italic" : ""}`}>
      {w}
    </motion.span>
  );
}

export default function About() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });

  return (
    <section id="about" className="relative overflow-hidden py-28 md:py-40">
      <ChessPiece piece="bishop" size={96} blur={1.5} rotate={-10} className="right-[6%] top-10 md:right-[12%] md:top-20" />
      <ChessPiece piece="king-black" size={84} blur={3} rotate={14} drift={110} className="left-[10%] top-[20%] hidden md:block" />
      <div className="mx-auto max-w-5xl px-4 text-center md:px-10">
        <p className="mb-8 text-xs uppercase tracking-[0.3em] text-muted">About</p>
        <p ref={ref} className="font-serif text-[clamp(48px,9vw,128px)] leading-[0.95] text-ink">
          {statement.map((w, i) => (
            <Word key={i} w={w} i={i} progress={scrollYProgress} />
          ))}
        </p>

        <div className="relative mx-auto mt-20 grid max-w-3xl grid-cols-3 gap-4">
          {/* an edit timeline running behind the glass stat cards */}
          <div className="absolute left-1/2 top-1/2 flex w-screen -translate-x-1/2 -translate-y-1/2 justify-center [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]">
            <Timeline />
          </div>
          {stats.map((s, i) => (
            <motion.div
              key={s.big}
              className="glass relative rounded-3xl px-3 py-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="font-serif text-4xl text-ink md:text-5xl">{s.big}</div>
              <div className="mt-1 text-xs text-muted">{s.small}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-24 flex overflow-hidden border-y border-line py-6">
        <div className="animate-marquee flex shrink-0 whitespace-nowrap">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0" aria-hidden={k === 1}>
              {[...words, ...words].map((w, i) => (
                <span key={i} className="flex items-center font-serif text-4xl italic text-ink md:text-5xl">
                  <span className="px-8">{w}</span>
                  <span className="text-base not-italic text-muted">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
