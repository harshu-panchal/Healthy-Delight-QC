import { useState, useRef } from 'react';
import logoSrc from '../../assets/logo.png';
import appStartVid from '../../assets/login/app_start_vid.mp4';

interface BrandingSequenceProps {
  onComplete: () => void;
}

export default function BrandingSequence({ onComplete }: BrandingSequenceProps) {
  const [phase, setPhase] = useState(0); // 0: Video, 1: Logo Fade, 2: Logo Move Up
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnd = () => {
    setPhase(1);
    // Logo fades in at center
    setTimeout(() => {
      setPhase(2); // Logo moves up
    }, 1000);

    // Complete the sequence and signal parent
    setTimeout(() => {
      onComplete();
    }, 1800);
  };

  return (
    <div className="hd-branding-root">
      <div className={`hd-sequence-container ${phase >= 1 ? 'hd-fade-out' : ''}`}>

        {/* Top Text: Centered in gap */}
        <div className="hd-text-void-wrapper">
          <div className="hd-intro-cursive hd-text-top">Fresh, organic milk & dairy</div>
        </div>

        {/* Video Wrapper */}
        <div className="hd-video-wrapper">
          <video
            ref={videoRef}
            src={appStartVid}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnd}
            className="hd-intro-video"
          />
          {/* Soft fade at the bottom of the video */}
          <div className="hd-video-bottom-fade" />
        </div>

        {/* Bottom Text: Centered in gap */}
        <div className="hd-text-void-wrapper">
          <div className="hd-intro-cursive hd-text-bottom">Delivered straight to your doorstep</div>
        </div>

        {/* Subtle overlay revealed at end of video */}
        <div className={`hd-video-finish-overlay ${phase >= 1 ? 'hd-active' : ''}`} />
      </div>

      {/* ── LOGO ANIMATION ── */}
      <div className={`hd-branding-logo-wrapper 
        ${phase === 1 ? 'hd-logo-center-in' : ''} 
        ${phase === 2 ? 'hd-logo-move-up' : ''}
        ${phase === 0 ? 'opacity-0' : ''}`}
      >
        <img src={logoSrc} alt="Healthy Delight" className="hd-branding-logo" />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600;1,700&display=swap');

        .hd-branding-root {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: linear-gradient(180deg, #0a193b 0%, #f8f6f2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
        }

        .hd-sequence-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-evenly;
          width: 100%;
          height: 100vh;
          transition: opacity 1s ease-in-out;
          padding: 20px 0;
        }
        .hd-fade-out { opacity: 0; pointer-events: none; }

        .hd-text-void-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .hd-intro-cursive {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          color: #ffffff;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          width: 0;
          text-align: center;
          line-height: 1.2;
          pointer-events: none;
          text-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .hd-text-top {
          font-size: 26px;
          animation: hd-scribe 3.5s cubic-bezier(0.445, 0.05, 0.55, 0.95) forwards 1s;
        }

        .hd-text-bottom {
          font-size: 18px;
          color: #0a193b;
          text-shadow: none;
          font-weight: 600;
          animation: hd-scribe 3s cubic-bezier(0.445, 0.05, 0.55, 0.95) forwards 4s;
        }

        @keyframes hd-scribe {
          from { width: 0; }
          to { width: 100%; }
        }

        @media (min-width: 1024px) {
          .hd-text-top { font-size: 38px; }
          .hd-text-bottom { font-size: 28px; }
        }

        .hd-video-wrapper {
          position: relative;
          width: 90%;
          max-width: 1000px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 15px 50px rgba(0,0,0,0.3);
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 16 / 9;
        }

        .hd-intro-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .hd-video-bottom-fade {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 30%;
          background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(248, 246, 242, 0.3) 100%);
          pointer-events: none;
        }

        .hd-video-finish-overlay {
          position: absolute;
          inset: 0;
          background: #f8f6f2;
          opacity: 0;
          transition: opacity 0.8s ease;
          pointer-events: none;
        }
        .hd-video-finish-overlay.hd-active { opacity: 0.3; }

        .hd-branding-logo-wrapper {
          position: absolute;
          z-index: 20;
          transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .hd-logo-center-in { transform: scale(1.1); opacity: 1; }
        .hd-logo-move-up { transform: translateY(-40px) scale(1); opacity: 1; }

        .hd-branding-logo {
          width: 160px;
          height: 80px;
          object-fit: contain;
          background: #fff;
          padding: 12px 16px;
          border-radius: 20px;
          box-shadow: 0 12px 40px rgba(10,25,59,0.3);
        }

        @media (min-width: 1024px) {
          .hd-branding-logo { width: 220px; height: 110px; }
        }
      `}</style>
    </div>
  );
}
