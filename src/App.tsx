import { useCallback, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Work from "./components/Work";
import Gallery from "./components/Gallery";
import About from "./components/About";
import Contact from "./components/Contact";
import VideoModal from "./components/VideoModal";

export default function App() {
  const [video, setVideo] = useState<string | null>(null);
  const close = useCallback(() => setVideo(null), []);

  return (
    <div className="grain relative min-h-screen bg-paper font-sans text-ink">
      <Navbar />
      <main>
        <Hero onPlay={setVideo} />
        <Work onPlay={setVideo} />
        <Gallery onOpen={setVideo} />
        <About />
        <Contact />
      </main>
      <VideoModal src={video} onClose={close} />
    </div>
  );
}
