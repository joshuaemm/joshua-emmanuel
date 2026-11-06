import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

const words = ["Video editor", "Creative explorer", "Storyteller", "Joshua Emmanuel"];

/** A ragged, torn-paper edge as a clip-path polygon (deterministic). */
function torn(edge: "top" | "bottom", depth: number, seed: number) {
  const pts: string[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    const n = Math.abs(Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
    const y = n * depth;
    pts.push(edge === "top" ? `${x}% ${y}px` : `${x}% calc(100% - ${y}px)`);
  }
  return edge === "top"
    ? `polygon(${pts.join(",")}, 100% 100%, 0% 100%)`
    : `polygon(0% 0%, 100% 0%, ${pts.reverse().join(",")})`;
}

/**
 * After the "portfolio" reference: a head-and-shoulders cutout with a thick
 * sticker outline, sitting on a dark torn-paper band with big text scrolling
 * behind the head. The sticker pops back in on every visit.
 */
export default function StickerBand() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [24, -16]);
  const textX = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);

  const row = [...words, ...words];

  return (
    <div ref={ref} className="relative h-[clamp(340px,42vw,560px)] overflow-hidden">
      {/* dark band, torn along its top edge */}
      <div
        className="absolute inset-x-0 bottom-0 h-[58%] overflow-hidden bg-ink"
        style={{ clipPath: torn("top", 14, 3) }}
      >
        <motion.div style={{ x: textX }} className="flex h-full items-center">
          <div className="animate-marquee flex shrink-0 whitespace-nowrap [animation-duration:28s]">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center" aria-hidden={k === 1}>
                {row.map((w, i) => (
                  <span
                    key={i}
                    className="flex items-center font-sans text-[clamp(44px,8vw,120px)] font-black uppercase leading-none tracking-[-0.03em] text-paper"
                  >
                    <span className="px-6 md:px-10">{w}</span>
                    <span className="text-[0.45em] text-paper/70">✦ ✦ ✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* the sticker */}
      <motion.div style={{ y }} className="absolute bottom-0 left-1/2 z-10 w-[clamp(290px,38vw,500px)] -translate-x-1/2">
        <motion.img
          src="/media/sticker.webp"
          alt="Joshua Emmanuel, smiling"
          draggable={false}
          className="block w-full select-none drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]"
          initial={false}
          animate={inView ? { scale: 1, rotate: -3, opacity: 1 } : { scale: 0.6, rotate: -14, opacity: 0 }}
          transition={inView ? { type: "spring", stiffness: 180, damping: 14, delay: 0.15 } : { duration: 0 }}
        />
      </motion.div>

      {/* paper torn back over the band's lower edge and the sticker's shoulders */}
      <div
        className="absolute inset-x-0 -bottom-px z-20 h-8 bg-paper"
        style={{ clipPath: torn("top", 18, 11) }}
      />
    </div>
  );
}
