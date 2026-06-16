import { TransferSurface } from "@/components/TransferSurface";

const webApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Oppassum",
  url: "https://oppassum.vercel.app/",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires a modern browser with WebRTC support.",
  description:
    "Oppassum is a browser-based P2P file sharing app for transferring files directly across devices over WiFi.",
  image: "https://oppassum.vercel.app/oppassum-logo.png",
  creator: {
    "@type": "Person",
    name: "Abdullah Zia"
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  }
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationJsonLd)
        }}
      />
      <TransferSurface />
    </>
  );
}
