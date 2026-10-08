import Link from "next/link";
import { site } from "@/content/site";

/**
 * B chrome: name in serif (→ /photo), then Gallery and Work with me.
 * `blend` is the home variant: fixed over the streams, white text in
 * `mix-blend-mode: difference`, so it reads dark on paper, light on charcoal,
 * and inverted over whatever image is passing under it.
 */
export function PhotoNav({ blend = false }: { blend?: boolean }) {
  const link = "text-[13px] underline-offset-4 hover:underline";
  return (
    <header
      className={
        blend
          ? "fixed inset-x-0 top-0 z-10 flex items-baseline justify-between px-7 py-5 text-white mix-blend-difference"
          : "flex items-baseline justify-between border-b border-line px-7 py-5"
      }
    >
      <Link href="/photo" className="font-serif text-[22px] leading-none">
        {site.name}
      </Link>
      <nav className="flex gap-6">
        <Link href="/photo/gallery" className={link}>
          Gallery
        </Link>
        <Link href="/photo#work" className={link}>
          Work with me
        </Link>
      </nav>
    </header>
  );
}
