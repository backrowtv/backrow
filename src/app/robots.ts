import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/club/",
          "/clubs",
          "/profile",
          "/admin",
          "/activity",
          "/calendar",
          "/discover",
          "/search",
          "/api/",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/join/",
          "/timeline",
          "/movies/",
          "/person/",
        ],
      },
    ],
    sitemap: "https://backrow.tv/sitemap.xml",
  };
}
