import { site } from "@/content/site";
import { PatchHighlight } from "@/components/effects/PatchHighlight";
import { VlmCaption } from "@/components/effects/VlmCaption";
import { EffectToggles } from "@/components/ui/EffectToggles";

export function Footer() {
  return (
    <footer className="mt-24 pb-12">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {site.socials.map((s) => (
          <PatchHighlight key={s.label}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="patch-link text-[13px] text-muted"
            >
              {s.label}
            </a>
          </PatchHighlight>
        ))}
      </div>
      <div className="mt-9 space-y-3">
        <VlmCaption text={site.tag} />
        <EffectToggles />
      </div>
    </footer>
  );
}
