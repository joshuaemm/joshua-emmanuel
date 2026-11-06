import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { EMAIL } from "../data";
import SelectReveal from "./SelectReveal";
import ChessPiece from "./ChessPiece";
import Timeline from "./Timeline";
import StickerBand from "./StickerBand";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden px-4 pb-10 pt-28 md:px-10 md:pt-40">
      <ChessPiece piece="queen-black" size={150} blur={4} rotate={18} drift={110} className="left-[7%] top-[22%] hidden md:block" />
      <div className="mx-auto max-w-6xl text-center">
        <SelectReveal delay={0.2} className="inline-block">
          <h2 className="font-serif text-[clamp(56px,11vw,168px)] leading-[0.88] text-ink">
            <span className="block">Let's explore</span>
            <span className="block italic">together.</span>
          </h2>
        </SelectReveal>

        <div className="mt-12">
          <motion.a
            href={`mailto:${EMAIL}`}
            className="group inline-flex items-center gap-3 rounded-full bg-ink py-2 pl-6 pr-2 text-sm font-medium text-paper md:text-base"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 2.8, ease }}
            whileHover={{ scale: 1.03 }}
          >
            {EMAIL}
            <span className="grid h-10 w-10 place-items-center rounded-full bg-paper text-ink transition-transform duration-500 group-hover:rotate-45">
              <ArrowUpRight size={18} />
            </span>
          </motion.a>
        </div>
      </div>

      <div className="-mx-4 mt-20 md:-mx-10">
        <StickerBand />
      </div>

      <div className="mt-16 flex justify-center opacity-80 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        <Timeline compact />
      </div>

      <footer className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted md:flex-row">
        <span>© 2026 Joshua Emmanuel J.</span>
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ink" />
          </span>
          Open to freelance
        </span>
      </footer>
    </section>
  );
}
