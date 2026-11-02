import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Orbit from "./Orbit";
import HeadTimeline from "./HeadTimeline";
import SelectReveal from "./SelectReveal";
import { projects } from "../data";

const ease = [0.22, 1, 0.36, 1] as const;
// height / width of media/portrait.webp
const PORTRAIT_RATIO = 1159 / 1100;

function Badge() {
  const text = "VIDEO EDITOR • CREATIVE EXPLORER • ";
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="animate-spin-slow absolute inset-0 h-full w-full">
        <defs>
          <path id="badge-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text className="fill-ink" style={{ fontSize: 8.6, letterSpacing: 2.4 }}>
          <textPath href="#badge-circle">{text}</textPath>
        </text>
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xl">✦</span>
    </div>
  );
}

function Float({
  children,
  className,
  delay,
  r = 0,
}: {
  children: React.ReactNode;
  className: string;
  delay: number;
  r?: number;
}) {
  return (
    <motion.div
      className={`absolute z-20 hidden lg:block ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay, ease }}
    >
      <div className="animate-drift" style={{ ["--r" as string]: `${r}deg`, animationDelay: `${delay}s` }}>
        {children}
      </div>
    </motion.div>
  );
}

export default function Hero({ onPlay }: { onPlay: (src: string) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(600);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageW(e.contentRect.width));
    ro.observe(el);
    const onMove = (e: PointerEvent) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden pt-28">
      {/* thin connector curves, like the reference */}
      <svg
        className="pointer-events-none absolute inset-x-0 top-0 hidden h-[100svh] w-full lg:block"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        <motion.path
          d="M190 470 C 210 600, 380 620, 560 600"
          stroke="#cfccc4"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, delay: 1.4, ease }}
        />
        <motion.path
          d="M1250 520 C 1240 640, 1080 650, 900 620"
          stroke="#cfccc4"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, delay: 1.6, ease }}
        />
      </svg>

      <div className="relative z-40 px-4 text-center">
        <SelectReveal delay={0.4} className="inline-block">
          <h1 className="font-serif text-[clamp(60px,9.4vw,144px)] leading-[0.86] tracking-[-0.02em] text-ink">
            <span className="block">Exploring</span>
            <span className="block italic">the World.</span>
          </h1>
        </SelectReveal>

        <motion.p
          className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted md:text-base"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 2.7, ease }}
        >
          Video editor. Creative explorer.
        </motion.p>

        <motion.div
          className="mt-6 flex items-center justify-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 2.85, ease }}
        >
          <a
            href="#work"
            className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition-transform hover:scale-[1.03]"
          >
            See the work
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </a>
          <button
            onClick={() => onPlay(projects[0].video)}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-medium text-ink transition-transform hover:scale-[1.03]"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-paper">
              <Play size={10} fill="currentColor" />
            </span>
            Watch reel
          </button>
        </motion.div>
      </div>

      {/* Portrait + orbiting cards. The hero grows to the portrait's full height
          so the shoulders show and fade out, on desktop as on mobile. */}
      <div className="relative -mt-2" style={{ height: stageW * PORTRAIT_RATIO }}>
        <div
          ref={stageRef}
          className="absolute left-1/2 top-0 w-[min(600px,96vw,max(400px,100svh_-_24rem))] -translate-x-1/2"
        >
          {/* thin edit timeline flowing behind the head */}
          <HeadTimeline className="absolute left-1/2 top-[14%] z-[4] w-screen -translate-x-1/2 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] [mask-repeat:no-repeat]" />
          <motion.img
            src="/media/portrait.webp"
            alt="Joshua Emmanuel, eyes closed, looking up"
            className="relative z-10 block w-full select-none [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
            draggable={false}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.3, ease }}
          />
          <Orbit width={stageW} mouse={mouse} />
        </div>
      </div>

      {/* Corner details */}
      <Float className="left-[6%] top-[40svh]" delay={1.1} r={-4}>
        <div className="glass w-52 rounded-3xl p-5">
          <span className="text-lg">✂︎</span>
          <p className="mt-3 text-[17px] font-medium leading-snug text-ink">Turning footage into feeling.</p>
          <p className="mt-2 text-xs text-muted">Edit, pace, repeat.</p>
        </div>
      </Float>

      <Float className="right-[6%] top-[46svh]" delay={1.3} r={5}>
        <div className="glass w-52 rounded-3xl p-5">
          <div className="flex -space-x-2">
            {projects.slice(0, 3).map((p) => (
              <img key={p.id} src={p.poster} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover grayscale" />
            ))}
            <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-white text-sm">+</span>
          </div>
          <p className="mt-3 text-[17px] font-medium leading-snug text-ink">Open to freelance.</p>
          <p className="mt-2 text-xs text-muted">South India. Anywhere.</p>
        </div>
      </Float>

      <motion.div
        className="absolute right-[7%] top-32 z-20 hidden lg:block"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 1.2, ease }}
      >
        <Badge />
      </motion.div>

      <motion.div
        className="absolute left-[6%] top-[calc(100svh-7rem)] z-40 hidden lg:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      >
        <div className="mb-3 h-px w-8 bg-ink/30" />
        <p className="text-sm leading-snug text-muted">
          6+ years
          <br />
          cutting stories.
        </p>
      </motion.div>

      <motion.div
        className="absolute right-[6%] top-[calc(100svh-7rem)] z-40 hidden text-right lg:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.6 }}
      >
        <span className="text-lg">✦</span>
        <p className="mt-2 text-sm leading-snug text-muted">
          Less noise.
          <br />
          More story.
        </p>
      </motion.div>
    </section>
  );
}
