import { site } from "@/content/site";
import { getAllWork } from "@/lib/content";
import { DiffusionText } from "@/components/effects/DiffusionText";
import { PatchHighlight } from "@/components/effects/PatchHighlight";
import { Nav } from "@/components/ui/Nav";
import { TimelineRow } from "@/components/ui/TimelineRow";
import { Footer } from "@/components/ui/Footer";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1 font-mono text-xs tracking-[0.08em] text-faint">
      {children}
    </p>
  );
}

export default function Home() {
  const projects = getAllWork();

  return (
    <>
      <Nav />
      <main>
        <section className="pt-24">
          <h1 className="max-w-[30ch] text-[26px] font-medium leading-[1.35]">
            <DiffusionText text={site.tagline} showCounter />
          </h1>
        </section>

        <section id="about" className="pt-24">
          <SectionLabel>about</SectionLabel>
          <div className="max-w-[54ch] space-y-3 text-[15px] leading-relaxed text-muted">
            {site.about.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          <p className="mt-4 max-w-[54ch] text-[15px] text-fg">
            {site.availability}
          </p>
          <p className="mt-4">
            <PatchHighlight>
              <a
                href={site.learningHref}
                target="_blank"
                rel="noopener noreferrer"
                className="patch-link text-[13px] text-accent"
              >
                check out what i&apos;m learning →
              </a>
            </PatchHighlight>
          </p>
        </section>

        <section id="experience" className="pt-24">
          <SectionLabel>experience</SectionLabel>
          {site.experience.map((e, i) => (
            <TimelineRow
              key={e.company}
              period={e.period}
              title={e.company}
              subtitle={e.role}
              blurb={e.blurb}
              last={i === site.experience.length - 1}
            />
          ))}
        </section>

        <section id="projects" className="pt-24">
          <SectionLabel>projects</SectionLabel>
          {projects.map((p, i) => (
            <TimelineRow
              key={p.meta.slug}
              period={p.meta.period}
              title={p.meta.title}
              blurb={p.meta.blurb}
              href={`/work/${p.meta.slug}`}
              last={i === projects.length - 1}
            />
          ))}
        </section>

        <section id="contact" className="pt-24">
          <SectionLabel>contact</SectionLabel>
          <p className="max-w-[54ch] text-[15px] leading-relaxed text-muted">
            {site.contact}
          </p>
          <p className="mt-3 text-[15px] font-medium text-accent">{site.email}</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
