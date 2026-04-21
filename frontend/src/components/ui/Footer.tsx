import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../../assets/logo.png';
import { getHeaderCategoriesPublic, HeaderCategory } from '../../services/api/headerCategoryService';
import { useThemeContext } from '../../context/ThemeContext';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const { setActiveCategory } = useThemeContext();
  const [categories, setCategories] = useState<HeaderCategory[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getHeaderCategoriesPublic();
        if (data && data.length > 0) {
          const published = data
            .filter((c) => c.status === "Published" && c.slug !== "all")
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          setCategories(published);
        }
      } catch (error) {
        console.error("Failed to fetch footer categories", error);
      }
    };
    fetchCategories();
  }, []);

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="hidden md:block bg-[#0a193b] text-white border-t border-white/5 relative overflow-hidden">
      {/* SOLID BACKGROUND BLOCK - Ensures no transparency or bleed */}
      <div className="absolute inset-0 bg-[#0a193b] z-0" />
      
      {/* SUBTLE TEXTURE OVERLAY */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10"
        style={{
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/natural-paper.png")',
        }}
      />

      <div className="max-w-[1240px] mx-auto px-10 pt-20 pb-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          {/* Column 1: Brand & Mission */}
          <div className="flex flex-col items-start">
            <Link to="/" onClick={() => handleCategoryClick('all')} className="mb-8 transition-all hover:opacity-80 active:scale-95">
              <img src={logo} alt="Healthy Delight" className="h-11 w-auto object-contain brightness-0 invert" />
            </Link>
            <p className="text-white/80 text-[15px] leading-relaxed mb-8 font-medium italic">
              "Purity in every drop, freshness in every bite. Bridging the gap between the organic farm and your urban home."
            </p>
            <div className="flex items-center gap-4">
              {[
                { name: 'Facebook', icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
                { name: 'Instagram', icon: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01' },
                { name: 'Twitter', icon: 'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z' }
              ].map((social) => (
                <a
                  key={social.name}
                  href="#"
                  className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 hover:border-[#c5a059]/50 transition-all hover:-translate-y-1"
                  aria-label={social.name}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {social.name === 'Instagram' ? (
                      <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d={social.icon} /></>
                    ) : (
                      <path d={social.icon} />
                    )}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Platform Links */}
          <div>
            <h4 className="text-[#c5a059] font-black uppercase tracking-[0.25em] text-[12px] mb-10 drop-shadow-sm">Platform</h4>
            <ul className="space-y-5">
              {[
                { label: 'Home', path: '/', action: 'all' },
                { label: 'Wishlist', path: '/wishlist' },
                { label: 'Subscription Plans', path: '/subscription' },
                { label: 'About Healthy Delight', path: '/about-us' },
                { label: 'Customer Portal', path: '/account' }
              ].map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.path}
                    onClick={() => link.action && handleCategoryClick(link.action)}
                    className="text-white/70 hover:text-[#c5a059] text-[15px] font-semibold transition-all hover:translate-x-1 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Dynamic Categories */}
          <div>
            <h4 className="text-[#c5a059] font-black uppercase tracking-[0.25em] text-[12px] mb-10 drop-shadow-sm">Shop Categories</h4>
            <ul className="space-y-5">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat._id}>
                    <Link 
                      to="/"
                      onClick={() => handleCategoryClick(cat.slug)}
                      className="text-white/70 hover:text-[#c5a059] text-[15px] font-semibold transition-all hover:translate-x-1 inline-block"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))
              ) : (
                // Fallback / Loading Skeleton State
                [1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="h-5 w-32 bg-white/5 rounded animate-pulse" />
                ))
              )}
            </ul>
          </div>

          {/* Column 4: Support & Apps */}
          <div>
            <h4 className="text-[#c5a059] font-black uppercase tracking-[0.25em] text-[12px] mb-10 drop-shadow-sm">Get In Touch</h4>
            <div className="space-y-6">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#c5a059] group-hover:bg-[#c5a059]/10 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/50 text-[10px] font-black uppercase tracking-wider mb-0.5">Email Support</p>
                  <p className="text-white text-[14px] font-bold">support@healthydelight.com</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 group mb-8">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#c5a059] group-hover:bg-[#c5a059]/10 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/50 text-[10px] font-black uppercase tracking-wider mb-0.5">Call Hotline</p>
                  <p className="text-white text-[14px] font-bold">+91 1800-419-5566</p>
                </div>
              </div>

              <div className="pt-6 flex flex-col gap-4">
                 <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 hover:border-[#c5a059]/30 transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-white text-[#0a193b] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.24-1.99 1.1-3.15-1.02.04-2.25.68-2.98 1.54-.65.76-1.22 1.96-1.06 3.1 1.1.08 2.21-.66 2.94-1.49z"/>
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-0.5">Download App</p>
                      <p className="text-[14px] font-bold text-white">App Store</p>
                    </div>
                 </div>
                 
                 <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 hover:border-[#c5a059]/30 transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-white text-[#0a193b] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.609 1.814L13.792 12l-10.183 10.186c-.39.39-.567.876-.567 1.342 0 1.026.833 1.842 1.816 1.842.454 0 .891-.18 1.258-.547l11.458-11.458c.367-.367.547-.804.547-1.365s-.18-.999-.547-1.365L6.116.547C5.749.18 5.312 0 4.858 0c-.983 0-1.816.816-1.816 1.842 0 .466.177.952.567 1.342z" transform="scale(0.8) translate(3, 3)"/>
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-0.5">Download App</p>
                      <p className="text-[14px] font-bold text-white">Google Play</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-white/50 text-[13px] font-bold">
            <p>© {currentYear} Healthy Delight. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
              Built with ❤️ in India
            </p>
          </div>
          <div className="flex items-center gap-10 text-white/60 text-[13px] font-black uppercase tracking-widest">
            <a href="#" className="hover:text-[#c5a059] transition-all">Privacy</a>
            <a href="#" className="hover:text-[#c5a059] transition-all">Terms</a>
            <a href="#" className="hover:text-[#c5a059] transition-all">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
