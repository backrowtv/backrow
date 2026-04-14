const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://backrow.tv";

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "BackRow",
      url: baseUrl,
      description:
        "The best view is from the BackRow. Where movie clubs come together. Discover great films, compete together, and celebrate cinema.",
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "Organization",
      name: "BackRow",
      url: baseUrl,
      logo: `${baseUrl}/icon-512.png`,
    },
  ],
};

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
