import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { CanvasCard, LoopRange } from '../../types/canvas';
import ReactPlayer from 'react-player';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Volume1,
  VolumeX,
  Gauge,
  ChevronUp,
  BookmarkPlus,
  Repeat,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { InstagramIcon } from '../ui/InstagramIcon';
import { mediaService } from '../../services/mediaService';
import { useCanvasStore } from '../../store/canvasStore';

interface EmbedCardProps {
  card: CanvasCard;
  isSelected?: boolean;
}

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

export const EmbedCard: React.FC<EmbedCardProps> = ({ card, isSelected }) => {
  const isSpacePressed = useCanvasStore((s) => s.isSpacePressed);
  const storeCard = useCanvasStore((s) => s.cards[card.id]);
  const currentCard = storeCard || card;
  const pinVideoTimestamp = useCanvasStore((s) => s.pinVideoTimestamp);
  const setLoopRangeStore = useCanvasStore((s) => s.setLoopRange);

  // Fallback states for non-player embeds
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Player state variables passed into ReactPlayer
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // UI popovers and auto-hide
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showLoopPopover, setShowLoopPopover] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isControlsHovered, setIsControlsHovered] = useState(false);

  // Surface click tracking (click vs drag differentiation) & center ripple flash
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const pointerDownTime = useRef<number>(0);
  const [flashState, setFlashState] = useState<{ type: 'play' | 'pause' | 'bookmark'; id: number } | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const playerRef = useRef<any>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<number | null>(null);

  const isInstagram =
    Boolean(card.url?.includes('instagram.com') || card.tags?.includes('INSTAGRAM'));

  const isYouTube =
    Boolean(
      card.url?.includes('youtube.com') ||
      card.url?.includes('youtu.be') ||
      card.tags?.includes('YOUTUBE')
    );

  const isVimeo =
    Boolean(
      card.url?.includes('vimeo.com') ||
      card.tags?.includes('VIMEO')
    );

  const isPlayableEmbed = isYouTube || isVimeo;

  // Normalize YouTube embed URLs to standard watch URLs for optimal ReactPlayer support
  const normalizedUrl = useMemo(() => {
    const raw = card.metadata?.source || card.url || '';
    const embedMatch = raw.match(/(?:youtube(?:-nocookie)?\.com\/embed\/)([\w-]{11})/i);
    if (embedMatch && embedMatch[1]) {
      return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
    }
    return raw;
  }, [card.url, card.metadata?.source]);

  const parsedMetaDuration = useMemo(() => {
    return currentCard.metadata?.duration
      ? mediaService.parseDuration(currentCard.metadata.duration)
      : 0;
  }, [currentCard.metadata]);

  const effectiveDuration = duration > 0 ? duration : (parsedMetaDuration > 0 ? parsedMetaDuration : 60);

  // Loop range state synced with store
  const loopRange: LoopRange = useMemo(() => currentCard.loopRange || {
    enabled: false,
    start: 0,
    end: effectiveDuration > 0 ? effectiveDuration : 10,
  }, [currentCard.loopRange, effectiveDuration]);

  const triggerFlash = (type: 'play' | 'pause' | 'bookmark') => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    setFlashState({ type, id: Date.now() });
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashState(null);
    }, 650);
  };

  // Reset 2.5s inactivity hide timer for player controls
  const resetInactivityTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (
      isPlaying &&
      !isControlsHovered &&
      !showVolumeSlider &&
      !showSpeedMenu &&
      !showLoopPopover &&
      !isScrubbing
    ) {
      inactivityTimerRef.current = window.setTimeout(() => {
        setIsControlsVisible(false);
      }, 2500);
    }
  }, [isPlaying, isControlsHovered, showVolumeSlider, showSpeedMenu, showLoopPopover, isScrubbing]);

  const handleMouseMove = () => {
    resetInactivityTimer();
  };

  const handleMouseLeave = () => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    setShowVolumeSlider(false);
    setShowSpeedMenu(false);
    setShowLoopPopover(false);
    setIsControlsHovered(false);

    if (isPlaying) {
      setIsControlsVisible(false);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }
    const id = window.setTimeout(() => {
      resetInactivityTimer();
    }, 0);
    return () => window.clearTimeout(id);
  }, [isPlaying, resetInactivityTimer]);

  // Jump/seek player to specific seconds
  const seekPlayer = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(effectiveDuration, time));
    setCurrentTime(clamped);

    if (playerRef.current) {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(clamped, 'seconds');
      } else if (typeof playerRef.current.currentTime === 'number') {
        playerRef.current.currentTime = clamped;
      }
    }
  }, [effectiveDuration]);

  // Respond to store seekMedia requests (via seekNonce)
  const prevNonceRef = useRef<number | undefined>(currentCard.playbackState?.seekNonce);
  useEffect(() => {
    const state = currentCard.playbackState;
    if (!state || state.seekNonce === undefined) return;
    if (state.seekNonce !== prevNonceRef.current) {
      prevNonceRef.current = state.seekNonce;
      if (state.seekTarget !== undefined) {
        const target = state.seekTarget;
        queueMicrotask(() => {
          seekPlayer(target);
          setIsPlaying(true);
          triggerFlash('play');
          resetInactivityTimer();
        });
      }
    }
  }, [currentCard.playbackState, seekPlayer, resetInactivityTimer]);

  // Handle continuous A-B looping
  useEffect(() => {
    if (!loopRange.enabled || effectiveDuration <= 0) return;
    if (currentTime >= loopRange.end) {
      queueMicrotask(() => {
        seekPlayer(loopRange.start);
      });
    }
  }, [currentTime, loopRange, effectiveDuration, seekPlayer]);

  // Keyboard shortcuts for A/B Loop ([ and ]) when card is selected
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '[') {
        e.preventDefault();
        const newStart = Math.min(currentTime, loopRange.end - 1);
        setLoopRangeStore(card.id, {
          enabled: true,
          start: Math.max(0, newStart),
          end: loopRange.end,
        });
        triggerFlash('bookmark');
      } else if (e.key === ']') {
        e.preventDefault();
        const newEnd = Math.max(currentTime, loopRange.start + 1);
        setLoopRangeStore(card.id, {
          enabled: true,
          start: loopRange.start,
          end: Math.min(effectiveDuration, newEnd),
        });
        triggerFlash('bookmark');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, card.id, currentTime, loopRange, effectiveDuration, setLoopRangeStore]);

  // Progress update callback from ReactPlayer
  const handleProgress = (progressData: any) => {
    if (isScrubbing) return;
    if (progressData && typeof progressData.playedSeconds === 'number') {
      setCurrentTime(progressData.playedSeconds);
    } else if (progressData?.target && typeof progressData.target.currentTime === 'number') {
      setCurrentTime(progressData.target.currentTime);
    } else if (playerRef.current && typeof playerRef.current.currentTime === 'number') {
      setCurrentTime(playerRef.current.currentTime);
    }
  };

  // Duration callback from ReactPlayer
  const handleDuration = (dur: any) => {
    if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
      setDuration(dur);
    } else if (dur?.target && typeof dur.target.duration === 'number' && !isNaN(dur.target.duration) && dur.target.duration > 0) {
      setDuration(dur.target.duration);
    } else if (playerRef.current && typeof playerRef.current.duration === 'number' && !isNaN(playerRef.current.duration) && playerRef.current.duration > 0) {
      setDuration(playerRef.current.duration);
    }
    setIsLoading(false);
  };

  const togglePlay = (e?: React.MouseEvent | React.PointerEvent) => {
    e?.stopPropagation();
    setIsPlaying((prev) => {
      const next = !prev;
      triggerFlash(next ? 'play' : 'pause');
      return next;
    });
    resetInactivityTimer();
  };

  // Surface pointer handlers on transparent interceptor shield
  // (Clicking the video surface toggles Play/Pause without triggering card drag; drag via card header)
  const handleSurfacePointerDown = (e: React.PointerEvent) => {
    if (e.button === 0) {
      e.stopPropagation();
      pointerDownPos.current = { x: e.clientX, y: e.clientY };
      pointerDownTime.current = Date.now();
    }
  };

  const handleSurfacePointerUp = (e: React.PointerEvent) => {
    if (e.button === 0 && pointerDownPos.current) {
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      const elapsed = Date.now() - pointerDownTime.current;
      pointerDownPos.current = null;

      // If user clicked without dragging, toggle play
      if (dx < 6 && dy < 6 && elapsed < 400) {
        togglePlay(e);
      }
    }
  };

  const restartMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startTime = loopRange.enabled ? loopRange.start : 0;
    seekPlayer(startTime);
    setIsPlaying(true);
    triggerFlash('play');
    resetInactivityTimer();
  };

  const handlePinTimestamp = (e: React.MouseEvent) => {
    e.stopPropagation();
    pinVideoTimestamp(card.id, currentTime);
    triggerFlash('bookmark');
  };

  const toggleLoopRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willEnable = !loopRange.enabled;
    let newStart = loopRange.start;
    let newEnd = loopRange.end;

    if (willEnable && (newEnd <= newStart || newEnd === 0)) {
      newStart = Math.max(0, currentTime - 5);
      newEnd = Math.min(effectiveDuration, currentTime + 5);
    }

    setLoopRangeStore(card.id, {
      enabled: willEnable,
      start: newStart,
      end: newEnd,
    });
    triggerFlash('bookmark');
    resetInactivityTimer();
  };

  const setPointA = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newStart = Math.min(currentTime, loopRange.end - 1);
    setLoopRangeStore(card.id, {
      enabled: true,
      start: Math.max(0, newStart),
      end: loopRange.end,
    });
    triggerFlash('bookmark');
  };

  const setPointB = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newEnd = Math.max(currentTime, loopRange.start + 1);
    setLoopRangeStore(card.id, {
      enabled: true,
      start: loopRange.start,
      end: Math.min(effectiveDuration, newEnd),
    });
    triggerFlash('bookmark');
  };

  // Scrubber drag / click interaction
  const handleScrubberPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!scrubberRef.current || effectiveDuration <= 0) return;

    setIsScrubbing(true);
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetTime = (clickX / rect.width) * effectiveDuration;
    seekPlayer(targetTime);

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!scrubberRef.current || effectiveDuration <= 0) return;
      const moveRect = scrubberRef.current.getBoundingClientRect();
      const moveX = Math.max(0, Math.min(moveRect.width, moveEvt.clientX - moveRect.left));
      const moveTime = (moveX / moveRect.width) * effectiveDuration;
      seekPlayer(moveTime);
    };

    const handlePointerUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      resetInactivityTimer();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Draggable A/B Loop handles along scrubber
  const handleLoopHandlePointerDown = (handle: 'A' | 'B', e: React.PointerEvent) => {
    e.stopPropagation();
    if (!scrubberRef.current || effectiveDuration <= 0) return;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!scrubberRef.current || effectiveDuration <= 0) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const moveX = Math.max(0, Math.min(rect.width, moveEvt.clientX - rect.left));
      const targetTime = (moveX / rect.width) * effectiveDuration;

      if (handle === 'A') {
        const validStart = Math.max(0, Math.min(targetTime, loopRange.end - 1));
        setLoopRangeStore(card.id, {
          enabled: true,
          start: validStart,
          end: loopRange.end,
        });
      } else {
        const validEnd = Math.min(effectiveDuration, Math.max(targetTime, loopRange.start + 1));
        setLoopRangeStore(card.id, {
          enabled: true,
          start: loopRange.start,
          end: validEnd,
        });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      resetInactivityTimer();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
    resetInactivityTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
    resetInactivityTimer();
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const curIdx = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIdx = (curIdx + 1) % SPEED_OPTIONS.length;
    setPlaybackRate(SPEED_OPTIONS[nextIdx]);
    resetInactivityTimer();
  };

  const handleSpeedChange = (speed: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    resetInactivityTimer();
  };

  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const loopStartPercent = effectiveDuration > 0 ? (loopRange.start / effectiveDuration) * 100 : 0;
  const loopEndPercent = effectiveDuration > 0 ? (loopRange.end / effectiveDuration) * 100 : 100;
  const loopWidthPercent = Math.max(0, loopEndPercent - loopStartPercent);

  const shouldShowControls =
    !isPlaying ||
    isControlsHovered ||
    showVolumeSlider ||
    showSpeedMenu ||
    showLoopPopover ||
    isScrubbing ||
    isControlsVisible;

  return (
    <div className="w-full h-full min-h-0 relative flex flex-col bg-[#F8F7F4] overflow-hidden select-none group/embed">
      {/* 1. Instagram Embed Card */}
      {isInstagram && card.url ? (
        hasError ? (
          /* Graceful Fallback Card for Private / Blocked Instagram Posts */
          <div className="w-full h-full min-h-0 p-5 flex flex-col items-center justify-between bg-[#FFFFFF] text-center overflow-y-auto">
            <div className="flex flex-col items-center my-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-950/60 text-white">
                <InstagramIcon className="w-7 h-7" size={28} />
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">Instagram Reel</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                  This post may be private, age-restricted, or protected by Instagram embed restrictions.
                </p>
              </div>

              <div className="w-full max-w-[280px] px-3 py-2 rounded-xl bg-black/50 border border-white/5 text-[11px] font-mono text-slate-300 break-all text-left">
                {card.metadata?.source || card.url}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-white/10 w-full justify-center">
              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-button text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                title="Retry loading iframe"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>

              <a
                href={card.metadata?.source || card.url}
                target="_blank"
                rel="noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-950/60 transition-all cursor-pointer"
              >
                <span>Open in Instagram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          /* Native Instagram Iframe Player */
          <div className="relative w-full h-full min-h-0 bg-black flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 z-0 pointer-events-none">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                <span className="text-[11px] font-mono">Loading Instagram...</span>
              </div>
            )}

            <iframe
              src={card.url}
              title={card.title}
              allowTransparency
              frameBorder="0"
              scrolling="no"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              onLoad={() => setIsLoading(false)}
              onError={() => setHasError(true)}
              className={`w-full h-full border-none bg-black transition-opacity duration-200 z-10 ${
                isSpacePressed ? 'pointer-events-none' : 'pointer-events-auto'
              } ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Subtle top-right link to open original post */}
            <a
              href={card.metadata?.source || card.url}
              target="_blank"
              rel="noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-opacity opacity-0 group-hover/embed:opacity-100"
              title="Open Reel in Instagram"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Transparent Drag Overlay: Enabled ONLY while holding Spacebar */}
            {isSpacePressed && (
              <div
                className="absolute inset-0 z-30 bg-transparent cursor-grab active:cursor-grabbing select-none"
                title="Hold Space to move card"
              />
            )}
          </div>
        )
      ) : isPlayableEmbed && card.url ? (
        /* 2. YouTube & Vimeo Player with ReactPlayer, Transparent Interceptor Shield & Custom Controls */
        <div
          onMouseMove={handleMouseMove}
          onMouseEnter={() => {
            setIsControlsVisible(true);
            resetInactivityTimer();
          }}
          onMouseLeave={handleMouseLeave}
          className="relative w-full h-full min-h-0 bg-black flex items-center justify-center overflow-hidden group/embedplayer select-none"
        >
          {/* ReactPlayer Component filling the container */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden bg-black flex items-center justify-center">
            <ReactPlayer
              ref={playerRef}
              src={normalizedUrl}
              {...({ url: normalizedUrl } as any)}
              width="100%"
              height="100%"
              playing={isPlaying}
              volume={isMuted ? 0 : volume}
              muted={isMuted}
              playbackRate={playbackRate}
              controls={false}
              playsInline
              config={{
                youtube: {
                  playerVars: {
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    iv_load_policy: 3,
                    fs: 0,
                    disablekb: 1,
                  },
                },
              }}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onTimeUpdate={handleProgress}
              onDurationChange={handleDuration}
              onLoadedMetadata={handleDuration}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={() => setHasError(true)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Top-Right Link to Open in Original Source (YouTube / Vimeo) */}
          <a
            href={card.metadata?.source || card.url}
            target="_blank"
            rel="noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-opacity opacity-0 group-hover/embedplayer:opacity-100"
            title={isYouTube ? 'Open in YouTube' : 'Open in Vimeo'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Transparent Interceptor Shield
              Guarantees the canvas receives pointer events (drag, select)
              and prevents the YouTube iframe from stealing the mouse or clicking external links */}
          <div
            id={`interceptor-shield-${card.id}`}
            onPointerDown={handleSurfacePointerDown}
            onPointerUp={handleSurfacePointerUp}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-10 bg-transparent cursor-pointer select-none"
            title={isPlaying ? 'Click to Pause' : 'Click to Play'}
          />

          {/* Center Play Button Badge when Paused */}
          {!isPlaying && !flashState && (
            <div className="absolute z-10 w-14 h-14 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl shadow-rose-950/80 pointer-events-none transition-transform group-hover/embedplayer:scale-110">
              <Play className="w-6 h-6 fill-white translate-x-0.5 text-white" />
            </div>
          )}

          {/* Animated Center Ripple Flash Badge on Play/Pause/Bookmark */}
          {flashState && (
            <div
              key={flashState.id}
              className="absolute inset-0 pointer-events-none flex items-center justify-center z-30"
            >
              <div className="w-16 h-16 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl shadow-black/80 animate-media-flash">
                {flashState.type === 'play' ? (
                  <Play className="w-7 h-7 fill-white translate-x-0.5 text-white" />
                ) : flashState.type === 'pause' ? (
                  <Pause className="w-7 h-7 fill-white text-white" />
                ) : (
                  <BookmarkPlus className="w-7 h-7 text-amber-400 fill-amber-400" />
                )}
              </div>
            </div>
          )}

          {/* 3. Pinned Bottom Player Controls Bar with Auto-Hide & Smooth Dark Gradient Scrim */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsControlsHovered(true)}
            onMouseLeave={() => setIsControlsHovered(false)}
            className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-6 pb-2 px-2 sm:px-2.5 flex flex-col gap-1.5 transition-opacity duration-300 ${
              shouldShowControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Progress Bar / Scrubber Timeline with Dual A/B Handles & Bookmark Pips */}
            <div
              ref={scrubberRef}
              onPointerDown={handleScrubberPointerDown}
              className="group/scrub relative w-full h-[20px] -my-0.5 flex items-center cursor-pointer select-none touch-none"
            >
              {/* Track Bar (Expands on hover/scrub) */}
              <div
                className={`relative w-full rounded-full bg-white/20 transition-all duration-150 ${
                  isScrubbing ? 'h-[7px] bg-white/30' : 'h-[4px] group-hover/scrub:h-[7px]'
                }`}
              >
                {/* A/B Loop Shaded Range Highlight (Yellow/Amber Glow) */}
                {loopRange.enabled && effectiveDuration > 0 && (
                  <div
                    className="absolute top-0 bottom-0 bg-amber-400/35 border-l-2 border-r-2 border-amber-400 pointer-events-none rounded z-0 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                    style={{
                      left: `${loopStartPercent}%`,
                      width: `${loopWidthPercent}%`,
                    }}
                  />
                )}

                {/* Loaded/Played Track Progress */}
                <div
                  className="h-full rounded-full bg-[#C93B1D] relative z-10"
                  style={{ width: `${progressPercent}%` }}
                >
                  {/* Accented Draggable Scrubber Thumb Handle */}
                  <div
                    className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-sm border-2 border-[#C93B1D] transition-transform duration-100 ${
                      isScrubbing
                        ? 'scale-125'
                        : 'scale-0 group-hover/scrub:scale-100'
                    }`}
                  />
                </div>

                {/* Bookmark Marker Pips along Scrubber Track */}
                {currentCard.bookmarks?.map((bm) => {
                  const bmPct = effectiveDuration > 0 ? (bm.time / effectiveDuration) * 100 : 0;
                  return (
                    <div
                      key={bm.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        seekPlayer(bm.time);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/marker cursor-pointer p-1"
                      style={{ left: `${bmPct}%` }}
                      title={`Jump to [⏱ ${bm.label}]`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 border border-black shadow-md hover:scale-150 transition-transform" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/marker:flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/95 text-[10px] font-mono text-cyan-300 whitespace-nowrap border border-cyan-500/30 shadow-2xl pointer-events-none">
                        ⏱ {bm.label}
                      </div>
                    </div>
                  );
                })}

                {/* Dual Scrubber Handle A (Draggable Loop Start Point) */}
                {loopRange.enabled && effectiveDuration > 0 && (
                  <div
                    onPointerDown={(e) => handleLoopHandlePointerDown('A', e)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 flex flex-col items-center cursor-ew-resize group/handleA touch-none"
                    style={{ left: `${loopStartPercent}%` }}
                    title={`Loop Point A: ${mediaService.formatDuration(loopRange.start)} (Drag to scrub or press '[')`}
                  >
                    <div className="px-1 py-0.5 rounded bg-amber-500 text-[9px] font-mono font-bold text-black shadow-md border border-amber-300 select-none -translate-y-3 group-hover/handleA:scale-110 transition-transform">
                      A
                    </div>
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md ring-2 ring-amber-400/50 group-hover/handleA:scale-125 transition-transform" />
                  </div>
                )}

                {/* Dual Scrubber Handle B (Draggable Loop End Point) */}
                {loopRange.enabled && effectiveDuration > 0 && (
                  <div
                    onPointerDown={(e) => handleLoopHandlePointerDown('B', e)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 flex flex-col items-center cursor-ew-resize group/handleB touch-none"
                    style={{ left: `${loopEndPercent}%` }}
                    title={`Loop Point B: ${mediaService.formatDuration(loopRange.end)} (Drag to scrub or press ']')`}
                  >
                    <div className="px-1 py-0.5 rounded bg-amber-500 text-[9px] font-mono font-bold text-black shadow-md border border-amber-300 select-none -translate-y-3 group-hover/handleB:scale-110 transition-transform">
                      B
                    </div>
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-md ring-2 ring-amber-400/50 group-hover/handleB:scale-125 transition-transform" />
                  </div>
                )}
              </div>
            </div>

            {/* Controls Row with Flexible Wrapping & Compact Icons */}
            <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1 w-full min-w-0">
              {/* Left Controls: Play/Pause, Restart, Time Display */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Play / Pause Toggle Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/15 text-white transition-colors flex items-center justify-center cursor-pointer shrink-0"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-white text-white shrink-0" />
                  ) : (
                    <Play className="w-4 h-4 fill-white text-white translate-x-0.5 shrink-0" />
                  )}
                </button>

                {/* Restart from Beginning Button */}
                <button
                  type="button"
                  onClick={restartMedia}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer shrink-0"
                  title={loopRange.enabled ? 'Restart from Point A' : 'Restart from beginning'}
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                </button>

                {/* Time Stamp Typography */}
                <span className="font-mono text-[11px] sm:text-xs font-medium text-slate-200 tracking-tight whitespace-nowrap pl-0.5 select-none shrink-0">
                  {mediaService.formatDuration(currentTime)}
                  <span className="text-slate-500 mx-0.5">/</span>
                  {mediaService.formatDuration(effectiveDuration)}
                </span>
              </div>

              {/* Right Controls: Bookmark Pinning, A/B Loop Pill, Volume & Speed */}
              <div className="flex items-center gap-1 shrink-0 relative ml-auto">
                {/* Bookmark / Pin Timestamp Button */}
                <button
                  type="button"
                  onClick={handlePinTimestamp}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/15 text-slate-300 hover:text-amber-400 transition-colors flex items-center justify-center cursor-pointer relative group/pin shrink-0"
                  title={`Bookmark Timestamp (${mediaService.formatDuration(currentTime)}) & Spawn/Append Note`}
                >
                  <BookmarkPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/pin:scale-110 transition-transform shrink-0" />
                </button>

                {/* A/B Loop Tool Toggle Pill & Popover */}
                <div className="relative flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={toggleLoopRange}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setShowLoopPopover(!showLoopPopover);
                    }}
                    className={`min-h-[26px] sm:min-h-[28px] px-1.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-mono font-medium transition-all flex items-center gap-1 cursor-pointer shadow-sm shrink-0 ${
                      loopRange.enabled
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50 ring-1 ring-amber-400/30 font-bold'
                        : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                    }`}
                    title={`A/B Loop (${loopRange.enabled ? 'ON' : 'OFF'}): [${mediaService.formatDuration(loopRange.start)} - ${mediaService.formatDuration(loopRange.end)}]. Right-click or caret for options.`}
                  >
                    <Repeat className={`w-3 h-3 shrink-0 ${loopRange.enabled ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>A⇄B</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLoopPopover(!showLoopPopover)}
                    className="w-3.5 h-[26px] sm:h-[28px] flex items-center justify-center text-slate-400 hover:text-white rounded-r transition-colors cursor-pointer -ml-1 shrink-0"
                    title="Configure A/B Loop Range"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>

                  {/* A/B Loop Configuration Popover */}
                  {showLoopPopover && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute bottom-full right-0 mb-2.5 p-2.5 rounded-xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-md flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-100 min-w-[210px]"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-xs text-slate-200 font-semibold">
                        <span className="flex items-center gap-1.5 text-amber-400">
                          <Repeat className="w-3.5 h-3.5" />
                          A/B Loop Range
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowLoopPopover(false)}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400">Loop Status:</span>
                        <button
                          type="button"
                          onClick={toggleLoopRange}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                            loopRange.enabled
                              ? 'bg-amber-500 text-black font-bold'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {loopRange.enabled ? 'Active (Looping)' : 'Disabled'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={setPointA}
                          className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition-colors text-left"
                          title="Set Point A to current playback time (Hotkey: '[')"
                        >
                          <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                            Point A <kbd className="text-[9px] bg-black/40 px-1 rounded text-slate-300">[</kbd>
                          </span>
                          <span className="text-xs font-mono text-slate-200">
                            {mediaService.formatDuration(loopRange.start)}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={setPointB}
                          className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition-colors text-left"
                          title="Set Point B to current playback time (Hotkey: ']')"
                        >
                          <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                            Point B <kbd className="text-[9px] bg-black/40 px-1 rounded text-slate-300">]</kbd>
                          </span>
                          <span className="text-xs font-mono text-slate-200">
                            {mediaService.formatDuration(loopRange.end)}
                          </span>
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-400 bg-black/30 p-1.5 rounded-lg border border-white/5">
                        <span className="text-amber-300 font-medium">Tip:</span> Press <kbd className="text-[9px] bg-black/50 px-1 rounded text-slate-200">[</kbd> and <kbd className="text-[9px] bg-black/50 px-1 rounded text-slate-200">]</kbd> or drag timeline handles to adjust loop range.
                      </div>
                    </div>
                  )}
                </div>

                {/* Volume Control Button & Popover */}
                <div
                  className="relative flex items-center shrink-0"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer shrink-0"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>

                  {/* Volume Slider Popover */}
                  {showVolumeSlider && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute bottom-full right-0 mb-2.5 px-3 py-2 rounded-xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-2.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1.5 accent-indigo-400 cursor-pointer"
                      />
                      <span className="font-mono text-xs text-slate-200 min-w-[32px] text-right">
                        {Math.round((isMuted ? 0 : volume) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Playback Speed Pill with Upward Popover */}
                <div className="relative flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={cycleSpeed}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setShowSpeedMenu(!showSpeedMenu);
                    }}
                    className="min-h-[26px] sm:min-h-[28px] px-1.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] sm:text-xs font-mono font-medium text-indigo-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer shadow-sm shrink-0"
                    title="Click to cycle speed, right-click to open all options"
                  >
                    <Gauge className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>{playbackRate}x</span>
                  </button>

                  {/* Speed Selection Popover Menu */}
                  {showSpeedMenu && (
                    <div
                      onPointerDown={(e) => e.stopPropagation()}
                      className="absolute bottom-full right-0 mb-2.5 p-1 rounded-xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-md flex flex-col gap-0.5 z-50 animate-in fade-in zoom-in-95 duration-100 min-w-[85px]"
                    >
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          type="button"
                          onClick={(e) => handleSpeedChange(speed, e)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono text-left transition-colors flex items-center justify-between ${
                            playbackRate === speed
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span>{speed}x</span>
                          {playbackRate === speed && <span className="w-1.5 h-1.5 rounded-full bg-white ml-2" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Generic Web Link Card */
        <div className="w-full h-full min-h-0 p-4 flex flex-col justify-between bg-slate-900/90 overflow-y-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                Web Reference
              </span>
              {card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            <h4 className="text-sm font-semibold text-white line-clamp-2">
              {card.title}
            </h4>

            <p className="text-xs text-slate-400 font-mono break-all line-clamp-2">
              {card.url}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono">Live Web Bookmark</span>
            {card.url && (
              <a
                href={card.url}
                target="_blank"
                rel="noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                className="px-2.5 py-1 rounded-md bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1"
              >
                <span>Visit URL</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
