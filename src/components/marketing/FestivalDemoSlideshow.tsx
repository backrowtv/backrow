import Image from "next/image";
import styles from "./FestivalDemoSlideshow.module.css";

const frames = [
  { src: "/marketing/festival-demo-frame-1.jpg", alt: "Create a festival theme" },
  { src: "/marketing/festival-demo-frame-2.jpg", alt: "Members nominate movies" },
  { src: "/marketing/festival-demo-frame-3.jpg", alt: "Watch the lineup" },
  { src: "/marketing/festival-demo-frame-4.jpg", alt: "Rate each pick" },
  { src: "/marketing/festival-demo-frame-5.jpg", alt: "Reveal the standings" },
];

export function FestivalDemoSlideshow() {
  return (
    <div className={`${styles.stage} relative aspect-video w-full overflow-hidden bg-black`}>
      {frames.map((frame, i) => (
        <Image
          key={frame.src}
          src={frame.src}
          alt={frame.alt}
          fill
          priority={i === 0}
          sizes="(min-width: 1024px) 56rem, 100vw"
          className={styles.frame}
          style={{ animationDelay: `${i * 4}s` }}
        />
      ))}
    </div>
  );
}
