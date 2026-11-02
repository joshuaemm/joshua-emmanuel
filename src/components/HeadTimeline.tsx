import { useMemo, useRef } from "react";
import { useAnimationFrame, useReducedMotion } from "framer-motion";
import { projects } from "../data";

const SPEED = 38; // px per second, right to left
const GAP = 4;
const AMP = 16; // wave height in px
const WAVELENGTH = 720;

/** Deterministic waveform polygon for an audio clip. */
function wave(len: number, h: number, seed: number) {
  const mid = h / 2;
  const top: string[] = [];
  const bot: string[] = [];
  for (let x = 0; x <= len; x += 3) {
    const n = Math.sin(x * 0.13 + seed) * 0.6 + Math.sin(x * 0.041 + seed * 2) * 0.4;
    const a = (0.3 + Math.abs(n) * 0.7) * (mid - 1);
    top.push(`${x},${mid - a}`);
    bot.unshift(`${x},${mid + a}`);
  }
  return [...top, ...bot].join(" ");
}

/**
 * A thin ribbon of edit clips (a video lane over an audio lane) that flows
 * right to left along a gentle wave, behind the portrait.
 */
export default function HeadTimeline({ className }: { className?: string }) {
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const offset = useRef(0);
  const reduce = useReducedMotion();

  // a loop of clips long enough to cover the widest screens
  const clips = useMemo(() => {
    const base = [120, 84, 160, 104, 72, 140, 96, 180, 88, 128, 64, 150, 110, 92, 170, 76, 132, 100];
    const widths = [...base, ...base.slice().reverse()];
    let at = 0;
    return widths.map((len, i) => {
      const c = { at, len, thumb: projects[i % projects.length].poster };
      at += len + GAP;
      return c;
    });
  }, []);
  const loop = clips[clips.length - 1].at + clips[clips.length - 1].len + GAP;

  useAnimationFrame((t, delta) => {
    if (!reduce) offset.current = (offset.current + (Math.min(delta, 64) / 1000) * SPEED) % loop;
    const k = (Math.PI * 2) / WAVELENGTH;
    // the wave itself breathes slowly so the path never looks fixed
    const amp = AMP * (0.75 + 0.25 * Math.sin(t / 2600));
    clips.forEach((c, i) => {
      const el = items.current[i];
      if (!el) return;
      // wrap so clips leaving on the left re-enter on the right
      let x = c.at - offset.current;
      if (x < -c.len - 40) x += loop;
      const cx = x + c.len / 2;
      const y = amp * Math.sin(cx * k);
      const slope = Math.atan(amp * k * Math.cos(cx * k));
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${slope}rad)`;
    });
  });

  return (
    <div aria-hidden className={`pointer-events-none select-none ${className ?? ""}`} style={{ height: 96 }}>
      {clips.map((c, i) => (
        <div
          key={i}
          ref={(el) => {
            items.current[i] = el;
          }}
          className="absolute left-0 top-[34px] will-change-transform"
          style={{ width: c.len }}
        >
          <div className="relative h-[14px] overflow-hidden rounded-[3px] border border-[#bccde6] bg-[#dfe8f5]">
            <span
              className="absolute inset-0 opacity-35 grayscale"
              style={{ backgroundImage: `url(${c.thumb})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }}
            />
          </div>
          <div className="mt-[3px] h-[10px] overflow-hidden rounded-[3px] border border-[#b6d9c3] bg-[#ddefe4]">
            <svg width={c.len} height={8} className="block">
              <polygon points={wave(c.len, 8, i * 5)} fill="#93c7a6" opacity={0.8} />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
