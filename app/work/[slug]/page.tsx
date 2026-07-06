import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllWork, getWork } from "@/lib/content";
import { PatchHighlight } from "@/components/effects/PatchHighlight";
import { Nav } from "@/components/ui/Nav";
import { Footer } from "@/components/ui/Footer";

export function generateStaticParams() {
  return getAllWork().map((w) => ({ slug: w.meta.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) return {};
  return {
    title: work.meta.title,
    description: work.meta.blurb,
  };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = getWork(slug);
  if (!work) notFound();

  return (
    <>
      <Nav />
      <main className="pt-12">
        <PatchHighlight>
          <Link
            href="/#projects"
            className="patch-link font-mono text-xs text-muted"
          >
            ← projects
          </Link>
        </PatchHighlight>
        <div className="mt-9 flex items-baseline justify-between gap-4">
          <h1 className="text-[22px] font-medium leading-snug">
            {work.meta.title}
          </h1>
          <span className="shrink-0 font-mono text-xs text-faint">
            {work.meta.period}
          </span>
        </div>
        {work.meta.link && (
          <p className="mt-2">
            <PatchHighlight>
              <a
                href={work.meta.link}
                target="_blank"
                rel="noopener noreferrer"
                className="patch-link text-[13px] text-accent"
              >
                {new URL(work.meta.link).hostname} ↗
              </a>
            </PatchHighlight>
          </p>
        )}
        <article className="prose mt-9 text-fg">
          <MDXRemote source={work.body} />
        </article>
      </main>
      <Footer />
    </>
  );
}
