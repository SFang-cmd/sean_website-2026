export interface Experience {
  /** Mono year label shown on the right (e.g. "2026", "2023–25"). */
  period: string;
  company: string;
  role: string;
  blurb: string;
  /** Short impact fragment, rendered only on the lesser-known rows. */
  tag?: string;
}

export interface SiteContent {
  name: string;
  /** Deployed origin, used for metadata/sitemap. */
  url: string;
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
  role: "engineer",
  tagline: "I build machine learning systems across software and robotics.",
  about: [
    "I'm a CS and robotics student at Penn, building vision systems at Google. Before that, as a founding engineer, I helped raise $1.1M in AI hardware, and I researched computer vision at Penn's robotics lab.",
    "Currently, I'm building vision models and the infrastructure that runs them at scale.",
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
  ],
  socials: [
    { label: "GitHub", href: "https://github.com/SFang-cmd" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/sefang" },
  ],
  experience: [
    {
      period: "May 2026 – Present",
      company: "Google",
      role: "ML Engineer Intern",
      blurb: "Vision models for YouTube, under Algorithms & GenAI.",
    },
    {
      period: "Oct 2025 – Apr 2026",
      company: "Anthropic",
      role: "Claude Campus Ambassador",
      blurb: "Grew Penn's Claude Builder Club to 800+; ran a 200-person hackathon.",
    },
    {
      period: "May 2025 – Aug 2025",
      company: "UPenn GRASP Lab",
      role: "Research Assistant",
      blurb: "Computer vision for the DARPA Triage Challenge.",
      tag: "DARPA-sponsored",
    },
    {
      period: "Sep 2023 – May 2025",
      company: "Nanoneuro Systems",
      role: "Founding Engineer",
      blurb: "Biochips for AI inference; raised $1.1M preseed.",
      tag: "raised $1.1M pre-seed",
    },
    {
      period: "May 2024 – Aug 2024",
      company: "NuDigital Financial",
      role: "Software Engineer Intern",
      blurb: "Banking backend at 1M-user scale; cut latency 75%.",
      tag: "served 1M+ users",
    },
  ],
};
