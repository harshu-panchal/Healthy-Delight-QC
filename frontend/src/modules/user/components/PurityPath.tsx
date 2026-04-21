import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import bg from "../../../../assets/bg.png";

// Import local assets
import pureSource from "../../../../assets/landing/pure_source.png";
import coldChain from "../../../../assets/landing/cold_chain.png";
import ecoPackaging from "../../../../assets/landing/eco_packaging.png";
import morningVideo from "../../../../assets/landing/morning.mp4";

const STEPS = [
  {
    id: "01",
    title: "Pure Source",
    subtitle: "Farm-Fresh Milking",
    desc: "Every morning starts at our partner farms. Milk is collected in sterile stainless steel cans within 2 hours of milking, preserving its raw protein and natural enzymes.",
    image: pureSource,
  },
  {
    id: "02",
    title: "Cold Chain",
    subtitle: "Purity Preserved",
    desc: "Temperature is everything. Our specialized fleet maintains a strict 4°C chain from the udder to the hub, ensuring zero bacterial growth without any preservatives.",
    image: coldChain,
  },
  {
    id: "03",
    title: "Eco-Packaging",
    subtitle: "Glass-Bottled Goodness",
    desc: "We ditch plastic for premium glass. Each bottle is steam-sterilized and vacuum-sealed, protecting the milk's flavor and the planet's health simultaneously.",
    image: ecoPackaging,
  },
  {
    id: "04",
    title: "Morning Magic",
    subtitle: "Doorstep Delivery",
    desc: "By 7 AM, pure health arrives at your door. Scanned, verified, and delivered fresh — providing your family with the perfect start to a healthy day.",
    video: morningVideo,
  },
];

export const PurityPath: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const pathLength = useTransform(scrollYProgress, [0.2, 0.7], [0, 1]);

  return (
    <section 
      ref={containerRef}
      className="relative pt-10 pb-24 md:pt-12 md:pb-32 overflow-hidden" 
      style={{ background: "#f8f6f2" }}
    >
      {/* Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.3] pointer-events-none" 
        style={{ backgroundImage: `url(${bg})`, backgroundSize: '400px auto', backgroundRepeat: 'repeat' }} 
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10">
        <div className="text-center mb-12 md:mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-[12px] font-black text-[#c5a059] uppercase tracking-[0.3em] mb-4"
          >
            Our Promise
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[34px] md:text-[52px] font-black text-[#0a193b] leading-tight mb-6"
            style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.025em" }}
          >
            The Path to <span className="text-[#c5a059]">Pure Freshness</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-[#0a193b]/60 text-[16px] md:text-[18px] max-w-2xl mx-auto leading-relaxed"
          >
            Experience the journey of unadulterated dairy, from our happy farms 
            to your morning table in record time.
          </motion.p>
        </div>

        <div className="relative py-10">
          {/* Connecting Path SVG (Hidden on Mobile) */}
          <svg
            className="hidden md:block absolute top-[140px] left-0 w-full h-[120px] pointer-events-none"
            viewBox="0 0 1200 120"
            fill="none"
          >
            <motion.path
              d="M0 60 C 150 60, 150 10, 300 10 C 450 10, 450 110, 600 110 C 750 110, 750 10, 900 10 C 1050 10, 1050 60, 1200 60"
              stroke="#0a193b"
              strokeWidth="5"
              strokeDasharray="12 12"
              style={{ pathLength }}
            />
          </svg>

          {/* Connecting Path SVG (Mobile - 2x2 Grid Z-Flow) */}
          <svg
            className="block md:hidden absolute top-0 left-0 w-full h-full pointer-events-none z-0 opacity-40"
            viewBox="0 0 100 200"
            fill="none"
            preserveAspectRatio="none"
          >
            <motion.path
               d="M 25,35 L 75,35 C 95,35 95,50 95,65 L 95,75 C 95,95 5,95 5,115 L 5,125 C 5,145 5,155 25,155 L 75,155"
              stroke="#0a193b"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              style={{ pathLength }}
            />
          </svg>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-20 md:gap-8 relative z-10">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center group"
              >
                {/* Image Container */}
                <div className="relative mb-4 md:mb-8">
                  <div className="w-32 h-32 md:w-56 md:h-56 rounded-full overflow-hidden border-2 md:border-4 border-white shadow-xl md:shadow-2xl relative z-10">
                    {step.video ? (
                      <video
                        src={step.video}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <img 
                        src={step.image} 
                        alt={step.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    )}
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-[#0a193b]/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>

                  {/* Flowing Pulse Effect (behind image) */}
                  <div className="absolute inset-0 rounded-full bg-[#c5a059]/10 animate-pulse scale-110 -z-10" />
                </div>

                <div className="text-center px-1">
                  <div className="text-[#c5a059] text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-1 md:mb-2">
                    Step {step.id}
                  </div>
                  <h3 className="text-[#0a193b] text-[15px] md:text-[22px] font-black mb-1 md:mb-2 leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {step.title}
                  </h3>
                  <div className="text-[#0a193b]/40 text-[10px] md:text-[13px] font-bold uppercase tracking-wider mb-2 md:mb-3">
                    {step.subtitle}
                  </div>
                  <p className="hidden md:block text-[#0a193b]/60 text-[14px] leading-relaxed max-w-[240px] mx-auto">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>


      </div>
    </section>
  );
};
