import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/join/",
          "/activity",
          "/calendar",
          "/timeline",
          "/search",
          // Profiles are admin-only today; opt them out of indexing entirely.
          "/profile",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
