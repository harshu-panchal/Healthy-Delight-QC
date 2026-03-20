import React from 'react';
import homeBgImg from '../../../assets/HomeBackground.png';

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
          backgroundImage: `url(${homeBgImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundAttachment: 'fixed',
          backgroundColor: '#FFFDD0',
        }}
      />

      {children}
    </div>
  );
};

export default HomeBackground;
