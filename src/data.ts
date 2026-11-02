export type Project = {
  id: string;
  title: string;
  client: string;
  year: string;
  tag: string;
  loop: string;
  poster: string;
  video: string;
};

export const projects: Project[] = [
  {
    id: "we-are-back",
    title: "We Are Back",
    client: "VITC Model UN",
    year: "2026",
    tag: "Conference reel",
    loop: "/media/we-are-back-loop.mp4",
    poster: "/media/we-are-back.jpg",
    video: "/videos/we-are-back.mp4",
  },
  {
    id: "tri2champ",
    title: "Tri2Champ",
    client: "Triathlon brand",
    year: "2025",
    tag: "Sports promo",
    loop: "/media/tri2champ-loop.mp4",
    poster: "/media/tri2champ.jpg",
    video: "/videos/tri2champ.mp4",
  },
  {
    id: "gemini-ambassador",
    title: "Gemini Ambassador",
    client: "Google student program",
    year: "2025",
    tag: "Motion type",
    loop: "/media/gemini-ambassador-loop.mp4",
    poster: "/media/gemini-ambassador.jpg",
    video: "/videos/gemini-ambassador.mp4",
  },
  {
    id: "dance-club",
    title: "Dance Club VITC",
    client: "Performance night",
    year: "2026",
    tag: "Performance reel",
    loop: "/media/dance-club-loop.mp4",
    poster: "/media/dance-club.jpg",
    video: "/videos/dance-club.mp4",
  },
  {
    id: "habitra",
    title: "HabitRa",
    client: "App launch",
    year: "2026",
    tag: "Launch film",
    loop: "/media/habitra-loop.mp4",
    poster: "/media/habitra.jpg",
    video: "/videos/habitra.mp4",
  },
  {
    id: "house-of-scholars",
    title: "House of Scholars",
    client: "Debate Society, VIT Chennai",
    year: "2026",
    tag: "Event film",
    loop: "/media/house-of-scholars-loop.mp4",
    poster: "/media/house-of-scholars.jpg",
    video: "/videos/house-of-scholars.mp4",
  },
];

export const EMAIL = "joshuaemm.je@gmail.com";
