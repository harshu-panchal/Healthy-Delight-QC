import React from 'react';

interface HomeBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const HomeBackground: React.FC<HomeBackgroundProps> = ({ children, className = "" }) => {
  return (
    <div 
      className={`relative min-h-screen w-full ${className}`} 
      style={{ 
        background: 'transparent',
        backgroundColor: 'transparent'
      }}
    >
      {children}
    </div>
  );
};

export default HomeBackground;
