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
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * 4));
  const [looping, setLooping] = useState(false); // 默认不循环，自动跳转下一首
  const [showTrackList, setShowTrackList] = useState(false);
  const [isCompact, setIsCompact] = useState(true); // 控制播放器展开/收起状态
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // 当前使用的音频 URL 由 tracks 和 currentIndex 决定
  // 网页加载时随机选择一首歌曲等候播放

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
        // ensure src is set to current track
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

  // Set initial volume and add event listeners
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      
      // Update progress bar
      const handleTimeUpdate = () => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const duration = audioRef.current.duration;
          if (duration > 0) {
            setProgress((current / duration) * 100);
          }
        }
      };

      // Get duration when metadata loads
      const handleLoadedMetadata = () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      };

      // Auto-play next track when current ends
      const handleEnded = () => {
        if (!looping) {
          setCurrentIndex(i => (i + 1) % tracks.length);
        } else {
          // If looping, reset progress
          setProgress(0);
        }
      };

      const audio = audioRef.current;
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [looping, tracks.length]);

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

  // Format time in MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const percentage = clickX / width;
      const newTime = percentage * duration;
      audioRef.current.currentTime = newTime;
      setProgress(percentage * 100);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center overflow-hidden">
      {/* Mobile App Container - Fixed Size */}
      <div className="relative bg-slate-900 overflow-hidden"
           style={{ width: '528px', height: '728px' }}>
        
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
          <div className={`absolute inset-0 flex items-center justify-center z-30 transition-opacity ${startFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="glass-card p-6 rounded-3xl flex flex-col items-center gap-3">
              <h2 className="text-2xl font-bold text-white">捕捉礼物盒子</h2>
              <p className="text-xs text-slate-200/80">37928</p>
              <button
                onClick={handleStartClick}
                className="start-btn mt-2 px-5 py-2 rounded-xl text-lg font-semibold"
              >
                开始
              </button>
            </div>
          </div>
        )}

        {/* Score Board - Top Right */}
        <div className="absolute top-3 right-3 z-20 animate-fade-in-down">
            <div className="bg-slate-900/60 backdrop-blur-md border border-yellow-500/30 px-3 py-2 rounded-xl shadow-xl flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400 animate-bounce" />
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-yellow-200/80 uppercase font-bold tracking-wider">得分</span>
                    <span className="text-xl font-mono font-bold text-white leading-none">{score}</span>
                </div>
            </div>
        </div>

        {/* Foreground UI Layer - Header */}
        <div className="absolute top-12 left-0 w-full p-4 pointer-events-none flex flex-col items-center z-10">
          <div className="p-3 rounded-xl text-center pointer-events-auto animate-fade-in-down">
            <h1 className="text-2xl font-bold text-white mb-1 font-serif flex items-center gap-2 justify-center drop-shadow-lg">
               {/* Icons also fall */}
               <div className={isPlaying ? "animate-pulse" : ""}>
                   <FallingText text="★" delayStart={3000} />
               </div>
               <FallingText text="欢迎" delayStart={3500} />
               <div className={isPlaying ? "animate-pulse" : ""}>
                   <FallingText text="★" delayStart={3000} />
               </div>
            </h1>
            <div className="text-slate-200 text-xs drop-shadow-md font-medium">
               <FallingText text="收集礼物看祝福烟花" delayStart={4500} />
            </div>
          </div>
        </div>

        {/* Music Player - Top Left (可展开/收起的播放器) */}
        <div className="absolute top-3 left-3 z-20">
           {/* Compact Mode - 只有旋转的胶片 */}
           {isCompact ? (
             <div 
               onClick={() => setIsCompact(false)}
               className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-2 rounded-xl shadow-lg hover:bg-slate-900/80 transition-all cursor-pointer group"
             >
               <div className={`flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''}`}>
                 <div className="bg-indigo-500/20 p-2 rounded-full group-hover:bg-indigo-500/30 transition-colors">
                   <Music className={`w-4 h-4 text-indigo-300`} />
                 </div>
               </div>
             </div>
           ) : (
             /* Expanded Mode - 完整播放器 */
             <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 p-1.5 pr-2 pl-1 rounded-xl shadow-lg hover:bg-slate-900/80 transition-all group w-48">
               {/* Top row: controls and track info */}
               <div className="flex items-center gap-2">
                  {/* 胶片区域 - 点击可收起 */}
                  <div
                    onClick={() => setIsCompact(true)}
                    className={`flex items-center gap-1 cursor-pointer p-1 rounded-full ${isPlaying ? 'animate-spin-slow' : ''}`}
                  >
                      <div className="bg-indigo-500/20 p-1.5 rounded-full">
                          <Music className={`w-3 h-3 text-indigo-300`} />
                      </div>
                  </div>

                  <div className="h-4 w-px bg-white/10 mx-1"></div>

                  {/* 歌曲名字 - 点击显示歌曲列表 */}
                  <div
                    onClick={() => setShowTrackList(!showTrackList)}
                    className="flex-1 flex flex-col text-left cursor-pointer hover:bg-white/5 rounded-lg p-1 transition-colors"
                  >
                      <span className="text-[11px] text-white font-medium truncate">{tracks[currentIndex].title}</span>
                      <span className="text-[9px] text-slate-400">点击选择歌曲</span>
                  </div>

                  <div className="h-4 w-px bg-white/10 mx-1"></div>

                  <div className="flex items-center gap-0.5 ml-1">
                    <button 
                        onClick={togglePlay}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        aria-label={isPlaying ? "Pause music" : "Play music"}
                    >
                        {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>

                    <button 
                        onClick={toggleMute}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  </div>
               </div>

               {/* Progress bar */}
               <div className="mt-1.5 mx-1.5">
                  <div 
                    className="w-full h-1 bg-slate-700/50 rounded-full cursor-pointer overflow-hidden relative"
                    onClick={handleProgressClick}
                  >
                    <div 
                      className="h-full bg-indigo-400 rounded-full transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-300 mt-0.5">
                    <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
               </div>

               {/* 歌曲列表 - 点击歌曲名字显示 */}
               {showTrackList && (
                 <div className="mt-1 bg-slate-900/70 backdrop-blur-md border border-white/10 rounded-xl py-1 shadow-xl w-44">
                   {tracks.map((t, i) => (
                     <button 
                       key={t.title} 
                       onClick={() => {
                         selectTrack(i);
                         setShowTrackList(false);
                       }} 
                       className={`w-full text-left px-3 py-1.5 hover:bg-white/5 transition-colors ${i === currentIndex ? 'bg-white/5' : ''}`}
                     >
                       <span className="text-[11px] text-white">{t.title}</span>
                     </button>
                   ))}
                 </div>
               )}
             </div>
           )}
        </div>

        {/* Footer Credits */}
        <div className="absolute bottom-3 right-3 pointer-events-none opacity-50 z-10 hidden md:block">
          <p className="text-[9px] text-black">667.flyworm</p>
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
    </div>
  );
};

export default App;
