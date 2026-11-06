import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { EMAIL } from "../data";

const links = [
  { label: "Work", href: "#work" },
  { label: "Archive", href: "#gallery" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-paper via-paper/85 to-transparent px-4 pb-6 pt-5 md:px-10 md:pt-7"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between">
        <a href="#" className="text-lg font-semibold tracking-tight text-ink">
          Joshua<sup className="ml-0.5 text-[10px] font-normal">°</sup>
        </a>

        <ul
          className="glass hidden items-center gap-1 rounded-full p-1 md:flex"
          onMouseLeave={() => setHovered(null)}
        >
          {links.map((l) => (
            <li key={l.href} className="relative">
              {hovered === l.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-ink/[0.06]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <a
                href={l.href}
                onMouseEnter={() => setHovered(l.href)}
                className="relative block px-5 py-2 text-[13px] text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href={`mailto:${EMAIL}`}
          className="group inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-paper"
        >
          Get in touch
          <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </nav>
    </motion.header>
  );
}
