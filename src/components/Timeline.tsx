import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { projects } from "../data";

// pale takes on DaVinci Resolve's track colours, to sit on the paper background
const C = {
  panel: "rgba(255,255,255,0.55)",
  rule: "#d9d6cf",
  label: "#a9a69e",
  video: "#dfe8f5",
  videoEdge: "#bccde6",
  videoText: "#7f93b3",
  audio: "#ddefe4",
  audioEdge: "#b6d9c3",
  wave: "#93c7a6",
  head: "#eea58f",
};

type Clip = { at: number; len: number; name?: string; thumb?: string };
type Track = { id: string; kind: "video" | "audio"; h: number; clips: Clip[] };

const T = (i: number) => projects[i % projects.length].poster;

const FULL: Track[] = [
  { id: "V2", kind: "video", h: 30, clips: [{ at: 210, len: 160, name: "Title_v3", thumb: T(5) }, { at: 760, len: 220, name: "Overlay", thumb: T(4) }] },
  {
    id: "V1",
    kind: "video",
    h: 40,
    clips: [
      { at: 0, len: 250, name: "We_Are_Back.mov", thumb: T(0) },
      { at: 254, len: 300, name: "Tri2Champ_A.mov", thumb: T(1) },
      { at: 558, len: 190, name: "Gemini.mov", thumb: T(2) },
      { at: 752, len: 330, name: "Dance_Club.mov", thumb: T(3) },
      { at: 1086, len: 280, name: "HoS_Debate.mov", thumb: T(5) },
    ],
  },
  { id: "A1", kind: "audio", h: 32, clips: [{ at: 0, len: 552, name: "VO_take2.wav" }, { at: 558, len: 808, name: "VO_take4.wav" }] },
  { id: "A2", kind: "audio", h: 32, clips: [{ at: 40, len: 1300, name: "Music_Beat.wav" }] },
];

const COMPACT: Track[] = [
  {
    id: "V1",
    kind: "video",
    h: 30,
    clips: [
      { at: 0, len: 220, name: "Reel_01.mov", thumb: T(1) },
      { at: 224, len: 260, name: "Reel_02.mov", thumb: T(3) },
      { at: 488, len: 200, name: "Reel_03.mov", thumb: T(0) },
    ],
  },
  { id: "A1", kind: "audio", h: 26, clips: [{ at: 0, len: 688, name: "Mix.wav" }] },
];

const HEADER = 40;
const RULER = 22;

/** Deterministic waveform: a mirrored polyline of pseudo-random peaks. */
function wave(len: number, h: number, seed: number) {
  const mid = h / 2;
  const top: string[] = [];
  const bot: string[] = [];
  for (let x = 0; x <= len; x += 3) {
    const n = Math.sin(x * 0.11 + seed) * 0.5 + Math.sin(x * 0.037 + seed * 2) * 0.35 + Math.sin(x * 0.53 + seed) * 0.15;
    const a = (0.25 + Math.abs(n) * 0.75) * (mid - 3);
    top.push(`${x},${mid - a}`);
    bot.unshift(`${x},${mid + a}`);
  }
  return [...top, ...bot].join(" ");
}

function timecode(f: number) {
  const s = Math.floor(f / 24);
  return `01:00:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * A pale, DaVinci-style edit timeline used as a background asset: ruler, video
 * tracks with filmstrip thumbnails, audio tracks with waveforms and a playhead
 * that keeps scrubbing. The clips slide in each time it comes into view.
 */
export default function Timeline({ compact = false, className }: { compact?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-5% 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], compact ? [40, -80] : [60, -220]);

  const tracks = compact ? COMPACT : FULL;
  const width = Math.max(...tracks.flatMap((t) => t.clips.map((c) => c.at + c.len))) + 60;
  const height = RULER + tracks.reduce((s, t) => s + t.h + 4, 0);

  return (
    <div ref={ref} aria-hidden className={`pointer-events-none select-none ${className ?? ""}`}>
      <motion.div
        className="relative overflow-hidden rounded-xl border"
        style={{ x, width: width + HEADER, height, borderColor: C.rule, background: C.panel }}
      >
        {/* ruler */}
        <div className="absolute inset-x-0 top-0 border-b" style={{ height: RULER, borderColor: C.rule, left: HEADER }}>
          {Array.from({ length: Math.ceil(width / 20) }, (_, i) => (
            <span
              key={i}
              className="absolute bottom-0 w-px"
              style={{ left: i * 20, height: i % 5 === 0 ? 8 : 4, background: C.rule }}
            />
          ))}
          {Array.from({ length: Math.ceil(width / 200) }, (_, i) => (
            <span
              key={i}
              className="absolute top-0.5 font-mono text-[9px] tracking-tight"
              style={{ left: i * 200 + 3, color: C.label }}
            >
              {timecode(i * 200 * 2)}
            </span>
          ))}
        </div>

        {/* tracks */}
        {tracks.map((t, ti) => {
          const top = RULER + 2 + tracks.slice(0, ti).reduce((s, tr) => s + tr.h + 4, 0);
          const video = t.kind === "video";
          return (
            <div key={t.id} className="absolute inset-x-0" style={{ top, height: t.h }}>
              <span
                className="absolute left-0 top-0 flex h-full items-center justify-center border-r font-mono text-[10px]"
                style={{ width: HEADER, color: C.label, borderColor: C.rule }}
              >
                {t.id}
              </span>
              {t.clips.map((c, ci) => (
                <motion.div
                  key={ci}
                  className="absolute top-0 h-full overflow-hidden rounded-[4px] border"
                  style={{
                    left: HEADER + c.at,
                    width: c.len,
                    background: video ? C.video : C.audio,
                    borderColor: video ? C.videoEdge : C.audioEdge,
                    transformOrigin: "left center",
                  }}
                  initial={false}
                  animate={inView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                  transition={{ duration: 0.8, delay: inView ? 0.1 + ti * 0.12 + ci * 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
                >
                  {video && c.thumb && (
                    <span
                      className="absolute inset-x-0 bottom-0 top-3 opacity-40 grayscale"
                      style={{ backgroundImage: `url(${c.thumb})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }}
                    />
                  )}
                  {!video && (
                    <svg className="absolute inset-x-0 bottom-0" width={c.len} height={t.h - 10} style={{ top: 10 }}>
                      <polygon points={wave(c.len, t.h - 10, ti * 3 + ci * 7)} fill={C.wave} opacity={0.75} />
                    </svg>
                  )}
                  {c.name && (
                    <span
                      className="absolute left-1.5 top-0 font-mono text-[8px] leading-3"
                      style={{ color: video ? C.videoText : C.wave }}
                    >
                      {c.name}
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          );
        })}

        {/* playhead */}
        <motion.div
          className="absolute bottom-0 top-0 w-px"
          style={{ background: C.head, left: HEADER }}
          animate={{ x: [0, width - 40] }}
          transition={{ duration: compact ? 14 : 22, ease: "linear", repeat: Infinity }}
        >
          <span
            className="absolute -left-[5px] top-0 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent"
            style={{ borderTopColor: C.head }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
