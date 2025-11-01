/**
 * Custom Swiper Carousel Effect
 * Creates a 3D carousel with scaling, opacity, and rotation transforms.
 * Based on the popular swiper-effect-carousel community plugin.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

const EffectCarousel = function EffectCarousel({
  swiper,
  on,
}: {
  swiper: any;
  on: (event: string, handler: (...args: any[]) => void) => void;
}) {
  on("beforeInit", () => {
    if (swiper.params.effect !== "carousel") return;

    swiper.params.watchSlidesProgress = true;
    swiper.params.centeredSlides = true;
  });

  const setTranslate = () => {
    if (swiper.params.effect !== "carousel") return;

    const slides = swiper.slides;

    for (let i = 0; i < slides.length; i++) {
      const slideEl = slides[i];
      const slideProgress = (slideEl as unknown as { progress: number }).progress ?? 0;
      const absProgress = Math.abs(slideProgress);
      const isHorizontal = swiper.isHorizontal();

      // Scale: active slide is full size, adjacent slides scale down
      const scale = 1 - absProgress * 0.15;

      // Opacity: active slide is fully visible, others fade
      const opacity = 1 - absProgress * 0.3;

      // Z-translation for depth
      const zTranslate = -absProgress * 150;

      // Rotation for 3D effect
      const rotateY = slideProgress * -12;

      // Horizontal offset to prevent stacking
      const translateX = slideProgress * (isHorizontal ? 30 : 0);

      const transform = isHorizontal
        ? `translateX(${translateX}%) scale(${scale}) translateZ(${zTranslate}px) rotateY(${rotateY}deg)`
        : `scale(${scale}) translateZ(${zTranslate}px)`;

      slideEl.style.transform = transform;
      slideEl.style.opacity = String(Math.max(opacity, 0));
      slideEl.style.zIndex = String(Math.round((1 - absProgress) * 10));

      // Set transition origin
      if (slideProgress > 0) {
        slideEl.style.transformOrigin = "left center";
      } else if (slideProgress < 0) {
        slideEl.style.transformOrigin = "right center";
      } else {
        slideEl.style.transformOrigin = "center center";
      }
    }
  };

  const setTransition = (duration: number) => {
    if (swiper.params.effect !== "carousel") return;

    const slides = swiper.slides;
    for (let i = 0; i < slides.length; i++) {
      slides[i].style.transitionDuration = `${duration}ms`;
    }
  };

  on("setTranslate", setTranslate);
  on("setTransition", () => {
    const dur = (swiper.params as unknown as { speed?: number }).speed ?? 300;
    setTransition(dur);
  });
};

export default EffectCarousel;
