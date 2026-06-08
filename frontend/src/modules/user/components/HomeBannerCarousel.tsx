import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

interface Banner {
  _id: string;
  title: string;
  image: string;
  link: string;
  order: number;
}

interface HomeBannerCarouselProps {
  banners: Banner[];
  loading?: boolean;
}

const SkeletonBanner = () => (
  <div className="w-full px-4 md:px-6 lg:px-8 my-4 md:my-5">
    <div className="relative overflow-hidden rounded-[24px] aspect-[16/9] md:aspect-[3/1] bg-neutral-100">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    </div>
  </div>
);

const HomeBannerCarousel = ({ banners, loading = false }: HomeBannerCarouselProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [banners?.length, currentSlide]);

  if (loading) return <SkeletonBanner />;
  if (!banners || banners.length === 0) return null;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
    }),
    center: {
      x: 0,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? "100%" : "-100%",
    }),
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 mt-2 md:mt-2 mb-5 md:mb-6">
      <div className="group relative overflow-hidden rounded-[24px] aspect-[16/9] md:aspect-[3/1] bg-neutral-100 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(e, info) => {
              // Delay resetting isDragging slightly so that click handlers register the state correctly
              setTimeout(() => setIsDragging(false), 50);

              const swipe = info.offset.x;
              const swipeThreshold = 50;
              if (swipe < -swipeThreshold) {
                // Swipe left (next banner)
                setDirection(1);
                setCurrentSlide((prev) => (prev + 1) % banners.length);
              } else if (swipe > swipeThreshold) {
                // Swipe right (prev banner)
                setDirection(-1);
                setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
              }
            }}
            className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing select-none touch-pan-y"
          >
            <Link
              to={banners[currentSlide].link}
              onClick={(e) => {
                if (isDragging) {
                  e.preventDefault();
                }
              }}
              className="block w-full h-full relative"
              draggable={false}>
              <img
                src={banners[currentSlide].image}
                alt={banners[currentSlide].title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                draggable={false}
              />
              
              {/* Premium Navy-Tinted Overlay */}
              <div 
                className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                style={{ 
                  background: 'linear-gradient(180deg, rgba(10, 25, 59, 0.15) 0%, rgba(10, 25, 59, 0.45) 100%)' 
                }}
              />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HomeBannerCarousel;
