import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE = "https://monkepay-arc-production.up.railway.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/sellers/", "/activity/", "/docs/"].map((p) => ({ url: `${SITE}${p}`, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.7 }));
}
