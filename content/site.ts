export interface Experience {
  /** Mono year label shown on the right (e.g. "2026", "2023–25"). */
  period: string;
  company: string;
  role: string;
  /** Not rendered since Oct 2026: the timeline is company · role · period only. Kept for notes. */
  blurb: string;
}

export interface SiteContent {
  name: string;
  /** Deployed origin, used for metadata/sitemap. */
  url: string;
  /**
   * Canonical origin of the photography side (B). A host alias of this same
   * app: next.config.ts rewrites it onto the /photo routes.
   */
  photosUrl: string;
  role: string;
  /** The single hero line. */
  tagline: string;
  /** About-section paragraphs, rendered in order. */
  about: string[];
  /** A confident, evergreen availability line closing the About section. */
  availability: string;
  /** Destination for the "what i'm learning" link. Empty/placeholder for now. */
  learningHref: string;
  /** Contact-section invitation copy; the email renders beneath it. */
  contact: string;
  email: string;
  /** The footer easter egg: a playful, model-readout-styled "tag" line. */
  tag: string;
  nav: { label: string; href: string }[];
  socials: { label: string; href: string }[];
  experience: Experience[];
}

export const site: SiteContent = {
  name: "Sean Fang",
  url: "https://sean-fang.com",
  photosUrl: "https://photos.sean-fang.com",
  role: "engineer",
  tagline:
    "I build machine learning models and the systems that run them at scale.",
  about: [
    "I'm a CS and robotics student at Penn, building vision systems at Google. Before that, as a founding engineer, I helped raise $1.1M in AI hardware, and I researched computer vision at Penn's robotics lab.",
    "These days that mostly means teaching models to watch video. Most of what I build never gets seen — the pipeline under a model, the tool someone else uses to check its work — and I've come to prefer it that way.",
    "I like making things that occasionally break, mostly around AI, vision, and cloud systems. Off the clock I'm flying drones, shooting photos, or writing code at some odd hour.",
  ],
  availability: "Always open to new problems in ML, vision, and systems.",
  learningHref: "https://github.com/SFang-cmd/obiKnowledge",
  contact:
    "Feel free to reach out — about ML, a project, or anything at all. Just send an email:",
  email: "sfangcmd [at] gmail [dot] com",
  tag: "> tag: here to do cool things. [0.98]",
  nav: [
    { label: "about", href: "#about" },
    { label: "experience", href: "#experience" },
    { label: "projects", href: "#projects" },
    { label: "contact", href: "#contact" },
    // The door: last, set in the B side's serif, runs the shrink wave.
    { label: "off the clock", href: "/photo" },
  ],
  socials: [
    { label: "GitHub", href: "https://github.com/SFang-cmd" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/sefang" },
  ],
  experience: [
    {
      // Two stints, one row: the gap is the Google summer (no overlap by contract).
      period: "Oct 2025 – Apr 2026, Sep 2026 – Present",
      company: "Anthropic",
      role: "Claude Campus Ambassador",
      blurb: "",
    },
    {
      period: "May – Aug 2026",
      company: "Google",
      role: "Software Engineering Intern, Machine Learning",
      blurb: "",
    },
    {
      period: "May – Aug 2025",
      company: "UPenn PRONTO Lab",
      role: "Research Assistant",
      blurb: "",
    },
    {
      period: "Dec 2023 – May 2025",
      company: "Nanoneuro Systems",
      role: "Founding Engineer",
      blurb: "",
    },
    {
      period: "May – Aug 2024",
      company: "NuDigital Financial",
      role: "Software Engineer Intern",
      blurb: "",
    },
  ],
};
