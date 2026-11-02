import { useEffect, useRef, useState } from "react";
import { useAnimationFrame, useReducedMotion } from "framer-motion";
import { AudioLines, Compass, Scissors, Type } from "lucide-react";
import { projects } from "../data";

type Item =
  | { kind: "label"; title: string; sub: string; icon: React.ReactNode; tint: string }
  | { kind: "video"; src: string; poster: string };

const items: Item[] = [
  { kind: "label", title: "Edit", sub: "Every frame, on purpose.", icon: <Scissors size={14} />, tint: "#e9f7c9" },
  { kind: "video", src: projects[0].loop, poster: projects[0].poster },
  { kind: "label", title: "Motion", sub: "Type that moves.", icon: <Type size={14} />, tint: "#e6e1ff" },
  { kind: "video", src: projects[1].loop, poster: projects[1].poster },
  { kind: "label", title: "Rhythm", sub: "Cut to the beat.", icon: <AudioLines size={14} />, tint: "#ffe4d3" },
  { kind: "video", src: projects[2].loop, poster: projects[2].poster },
  { kind: "label", title: "Explore", sub: "Always learning.", icon: <Compass size={14} />, tint: "#dcefff" },
];

const TAU = Math.PI * 2;

/**
 * A ring of cards circling the portrait's head. Cards on the far side of the
 * ring sit behind the portrait (lower z-index), near-side cards sit in front.
 * `width` is the portrait stage width; everything scales from it.
 */
export default function Orbit({ width, mouse }: { width: number; mouse: React.RefObject<{ x: number; y: number }> }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const angle = useRef(0);
  const speed = useRef(1);
  const [hover, setHover] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    speed.current = hover ? 0.25 : 1;
  }, [hover]);

  useAnimationFrame((time, delta) => {
    if (!reduce) angle.current += (delta / 1000) * 0.32 * speed.current;
    // fade in per card (a wrapper opacity would flatten the front/back layering)
    const intro = Math.min(1, Math.max(0, (time - 900) / 1200));
    const narrow = width < 500;
    const rx = width * (narrow ? 0.56 : 0.66);
    const ry = width * 0.11;
    const m = mouse.current ?? { x: 0, y: 0 };
    const tilt = -9 + m.x * 4;

    items.forEach((_, i) => {
      const el = refs.current[i];
      if (!el) return;
      const t = angle.current + (i / items.length) * TAU;
      const s = Math.sin(t);
      const c = Math.cos(t); // > 0 means in front of the head
      const depth = (c + 1) / 2;
      const x = rx * s;
      const y = ry * c + m.y * 10 * depth;
      // rotate the ring plane slightly, like the reference
      const rad = (tilt * Math.PI) / 180;
      const rxp = x * Math.cos(rad) - y * Math.sin(rad);
      const ryp = x * Math.sin(rad) + y * Math.cos(rad);
      const scale = 0.72 + 0.28 * depth;
      el.style.transform = `translate(-50%, -50%) translate3d(${rxp}px, ${ryp}px, 0) perspective(700px) rotateY(${-s * 38}deg) scale(${scale})`;
      el.style.opacity = String((0.35 + 0.65 * depth) * intro);
      el.style.zIndex = c > 0 ? "30" : "5";
      el.style.filter = c > 0 ? "none" : `blur(${(1 - depth) * 1.5}px)`;
    });
  });

  const u = Math.max(0.62, Math.min(1, width / 620));

  return (
    <div
      className="absolute left-[56%] top-[33%]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {items.map((item, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="absolute left-0 top-0 will-change-transform"
          style={{ transform: "translate(-50%, -50%)", opacity: 0 }}
        >
          {item.kind === "label" ? (
            <div
              className="glass flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ width: 196 * u, fontSize: 13 * u }}
            >
              <span
                className="grid shrink-0 place-items-center rounded-lg text-ink"
                style={{ width: 30 * u, height: 30 * u, background: item.tint }}
              >
                {item.icon}
              </span>
              <span className="leading-tight">
                <span className="block font-medium text-ink" style={{ fontSize: 15 * u }}>
                  {item.title}
                </span>
                <span className="block text-muted" style={{ fontSize: 11 * u }}>
                  {item.sub}
                </span>
              </span>
            </div>
          ) : (
            <div
              className="glass overflow-hidden rounded-2xl p-1.5"
              style={{ width: 128 * u, height: 164 * u }}
            >
              <video
                className="h-full w-full rounded-xl object-cover grayscale"
                src={item.src}
                poster={item.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
