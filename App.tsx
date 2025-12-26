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
  const [showStart, setShowStart] = useState(true);
  const [startFading, setStartFading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [tracks] = useState(() => [
    { title: '开始懂了', url: new URL('./music/开始懂了.mp3', import.meta.url).href },
    { title: '你听得到', url: new URL('./music/你听得到.mp3', import.meta.url).href },
    { title: '圣诞结', url: new URL('./music/圣诞结.mp3', import.meta.url).href },
    { title: '爱你没差', url: new URL('./music/爱你没差.mp3', import.meta.url).href },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [looping, setLooping] = useState(true); // 默认自动循环
  const [showTrackList, setShowTrackList] = useState(false);
  const [score, setScore] = useState(0);

  // 当前使用的音频 URL 由 tracks 和 currentIndex 决定

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

  const selectTrack = async (index: number) => {
    setCurrentIndex(index);
    setShowTrackList(false);
    if (audioRef.current) {
      audioRef.current.src = tracks[index].url;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('播放失败:', err);
      }
    }
  };

  const handleStartClick = async () => {
    // Play audio in response to user gesture
    if (audioRef.current) {
      try {
        // ensure src is set to selected track
        audioRef.current.src = tracks[currentIndex].url;
        audioRef.current.loop = looping;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('播放失败:', err);
      }
    }

    // Trigger fade-out animation then remove overlay
    setStartFading(true);
    setTimeout(() => setShowStart(false), 600);
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

  // Sync audio src / loop when currentIndex or looping changes
  useEffect(() => {
    if (audioRef.current) {
      const src = tracks[currentIndex]?.url;
      if (src) audioRef.current.src = src;
      audioRef.current.loop = !!looping;
      if (isPlaying) {
        const p = audioRef.current.play();
        if (p && p.catch) p.catch((e) => console.warn('play failed', e));
      }
    }
  }, [currentIndex, looping]);

  return (
    <div className="relative w-full h-screen font-sans">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={tracks[currentIndex].url}
        loop={looping}
        onEnded={() => {
          if (!looping) {
            setCurrentIndex(i => (i + 1) % tracks.length);
          }
        }}
      />

      {/* Background/Canvas Layer - Now receiving score */}
      <TreeCanvas onScoreUpdate={handleScoreUpdate} currentScore={score} />

      {/* Start Overlay - 居中毛玻璃开始按钮 */}
      {showStart && (
        <div className={`fixed inset-0 flex items-center justify-center z-30 transition-opacity ${startFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="glass-card p-8 rounded-3xl flex flex-col items-center gap-4">
            <h2 className="text-3xl font-bold text-white">捕捉礼物盒子</h2>
            <p className="text-sm text-slate-200/80">37928</p>
            <button
              onClick={handleStartClick}
              className="start-btn mt-2 px-6 py-3 rounded-xl text-lg font-semibold"
            >
              开始
            </button>
          </div>
        </div>
      )}

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

      {/* Music Player - Top Left (带可选歌曲列表，左半边可点击选择歌曲) */}
      <div className="absolute top-4 left-4 z-20">
         <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-2 pr-3 pl-1 rounded-full flex items-center gap-3 shadow-lg hover:bg-slate-900/80 transition-all group">
            <div
              onClick={() => setShowTrackList(s => !s)}
              className={`flex items-center gap-3 cursor-pointer p-2 rounded-full pl-3 pr-2 ${isPlaying ? 'animate-pulse' : ''}`}
              style={{ minWidth: 180 }}
            >
                <div className="bg-indigo-500/20 p-2 rounded-full">
                    <Music className={`w-5 h-5 text-indigo-300 ${isPlaying ? 'animate-spin-slow' : ''}`} />
                </div>

                <div className="flex-1 flex flex-col text-left">
                    <span className="text-sm text-white font-medium truncate">{tracks[currentIndex].title}</span>
                    <span className="text-[10px] text-slate-400">歌手</span>
                </div>
            </div>

            <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-1 ml-1">
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

         {/* Track list dropdown */}
         {showTrackList && (
           <div className="mt-2 bg-slate-900/70 backdrop-blur-md border border-white/10 rounded-xl py-2 shadow-xl w-56">
             {tracks.map((t, i) => (
               <button key={t.title} onClick={() => selectTrack(i)} className={`w-full text-left px-4 py-2 hover:bg-white/5 transition-colors ${i === currentIndex ? 'bg-white/5' : ''}`}>
                 <span className="text-sm text-white">{t.title}</span>
               </button>
             ))}
             <div className="px-3 pt-2">
               <label className="flex items-center gap-2 text-sm text-slate-300">
                 <input type="checkbox" checked={looping} onChange={() => setLooping(l => !l)} /> 自动循环
               </label>
             </div>
           </div>
         )}
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
        /* Start overlay glass styles */
        .glass-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          box-shadow: 0 8px 30px rgba(2,6,23,0.6);
          pointer-events: auto;
          text-align: center;
        }
        .start-btn {
          background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
          color: #fff;
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(6px);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .start-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,0.45); }
        /* Fade-out helper for overlay */
        .opacity-0 { opacity: 0; transition: opacity 0.5s ease; }
        .opacity-100 { opacity: 1; transition: opacity 0.2s ease; }
      `}</style>
    </div>
  );
};

export default App;