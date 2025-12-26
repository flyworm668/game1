import React, { useState, useRef, useEffect, useCallback } from 'react';
import TreeCanvas from './components/TreeCanvas';
import { Sparkles, Play, Pause, Music, Volume2, VolumeX, Gift } from 'lucide-react';

const FallingText: React.FC<{ text: string; delayStart?: number }> = ({ text, delayStart = 2000 }) => {
    const [hasFallen, setHasFallen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasFallen(true);
        }, delayStart);
        return () => clearTimeout(timer);
    }, [delayStart]);

    return (
        <span className="inline-block whitespace-nowrap">
            {text.split('').map((char, index) => {
                // Generate random fall physics for each character
                const randomX = (Math.random() - 0.5) * 400; // Scatter left/right
                const randomRotate = (Math.random() - 0.5) * 360; // Random rotation
                const randomDuration = 2 + Math.random() * 2; // Different fall speeds
                const randomDelay = Math.random() * 1.5; // Staggered start times

                const style: React.CSSProperties = hasFallen ? {
                    transform: `translate(${randomX}px, 100vh) rotate(${randomRotate}deg)`,
                    opacity: 0,
                    transition: `transform ${randomDuration}s ease-in ${randomDelay}s, opacity ${randomDuration}s ease-in ${randomDelay}s`
                } : {
                    transform: 'translate(0, 0) rotate(0deg)',
                    opacity: 1,
                    transition: 'transform 0.5s ease-out'
                };

                return (
                    <span 
                        key={index} 
                        style={style} 
                        className="inline-block"
                    >
                        {char === ' ' ? '\u00A0' : char}
                    </span>
                );
            })}
        </span>
    );
};


const App: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [score, setScore] = useState(0);

  // 指向项目内的音频文件（使用 Vite 推荐的方式构造可访问 URL）
  const AUDIO_URL = new URL('./music/开始懂了.mp3', import.meta.url).href;

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Audio playback failed:", error);
          });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleScoreUpdate = useCallback((points: number) => {
      setScore(prev => prev + points);
  }, []);

  // Set initial volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
    }
  }, []);

  return (
    <div className="relative w-full h-screen font-sans">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={AUDIO_URL}
        loop
      />

      {/* Background/Canvas Layer - Now receiving score */}
      <TreeCanvas onScoreUpdate={handleScoreUpdate} currentScore={score} />

      {/* Score Board - Top Right */}
      <div className="absolute top-4 right-4 z-20 animate-fade-in-down">
          <div className="bg-slate-900/60 backdrop-blur-md border border-yellow-500/30 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
              <Gift className="w-6 h-6 text-yellow-400 animate-bounce" />
              <div className="flex flex-col items-end">
                  <span className="text-xs text-yellow-200/80 uppercase font-bold tracking-wider">得分</span>
                  <span className="text-2xl font-mono font-bold text-white leading-none">{score}</span>
              </div>
          </div>
      </div>

      {/* Foreground UI Layer - Header */}
      <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex flex-col items-center z-10">
        <div className="p-4 rounded-xl text-center pointer-events-auto animate-fade-in-down">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 font-serif flex items-center gap-3 justify-center drop-shadow-lg">
             {/* Icons also fall */}
             <div className={isPlaying ? "animate-pulse" : ""}>
                 <FallingText text="★" delayStart={3000} />
             </div>
             <FallingText text="欢迎喵" delayStart={3500} />
             <div className={isPlaying ? "animate-pulse" : ""}>
                 <FallingText text="★" delayStart={3000} />
             </div>
          </h1>
          <div className="text-slate-200 text-sm md:text-base drop-shadow-md font-medium">
             <FallingText text="收集礼物看祝福烟花喵" delayStart={4500} />
          </div>
        </div>
      </div>

      {/* Music Player - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-20">
         <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-2 pr-4 rounded-full flex items-center gap-3 shadow-lg hover:bg-slate-900/80 transition-all group">
            <div className={`bg-indigo-500/20 p-3 rounded-full ${isPlaying ? 'animate-pulse' : ''}`}>
                <Music className={`w-5 h-5 text-indigo-300 ${isPlaying ? 'animate-spin-slow' : ''}`} />
            </div>
            
            <div className="flex flex-col hidden sm:flex">
                <span className="text-sm text-white font-medium">歌曲</span>
                <span className="text-[10px] text-slate-400">歌手</span>
            </div>

            <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-1">
              <button 
                  onClick={togglePlay}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label={isPlaying ? "Pause music" : "Play music"}
              >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <button 
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label={isMuted ? "Unmute" : "Mute"}
              >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
         </div>
      </div>

      {/* Footer Credits */}
      <div className="absolute bottom-4 right-4 pointer-events-none opacity-50 z-10 hidden md:block">
        <p className="text-xs text-black">667.flyworm</p>
      </div>

      {/* Global Style Helper */}
      <style>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 1s ease-out forwards;
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;