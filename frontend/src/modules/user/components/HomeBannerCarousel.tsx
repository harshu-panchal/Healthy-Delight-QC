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

  useEffect(() => {
    if (!banners || banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [banners?.length]);

  if (loading) return <SkeletonBanner />;
  if (!banners || banners.length === 0) return null;

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 mt-4 md:mt-4 mb-5 md:mb-6">
      <div className="group relative overflow-hidden rounded-[24px] aspect-[16/9] md:aspect-[3/1] bg-neutral-100 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentSlide}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-10">
            <Link
              to={banners[currentSlide].link}
              className="block w-full h-full relative">
              <img
                src={banners[currentSlide].image}
                alt={banners[currentSlide].title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
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
