import React from 'react';
import homeBgImg from '../../../assets/HomeBackground.png';
import homeBgImg2 from '../../../assets/Home_Bg_2.png';
import homeBgImg3 from '../../../assets/Home_Bg_3.png';
import homeBgImg4 from '../../../assets/Home_Bg_4.png';

interface HomeBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const HomeBackground: React.FC<HomeBackgroundProps> = ({ children, className = "" }) => {
  return (
    <div className={`relative min-h-screen w-full ${className}`} style={{ background: 'transparent' }}>
      {/* Fixed Background Image */}
      <div
        className="fixed inset-0 z-[-1]"
        style={{
          backgroundImage: `url(${homeBgImg2})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundAttachment: 'fixed',
          backgroundColor: '#EADDCF',
          opacity: 0.2,
          filter: 'blur(0.5px)', // Softens the background
          transform: 'scale(1.02)', // Slightly zooms in to hide blurry transparent edges
        }}
      />

      {children}
    </div>
  );
};

export default HomeBackground;
