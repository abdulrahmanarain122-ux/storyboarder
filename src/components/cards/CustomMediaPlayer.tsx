import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { CanvasCard, LoopRange } from '../../types/canvas';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  RotateCcw,
  Gauge,
  ChevronUp,
  BookmarkPlus,
  Repeat,
  X,
} from 'lucide-react';
import { mediaService } from '../../services/mediaService';
import { useCanvasStore } from '../../store/canvasStore';

interface CustomMediaPlayerProps {
  card: CanvasCard;
  mediaType: 'video' | 'audio';
  src: string;
}

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

export const CustomMediaPlayer: React.FC<CustomMediaPlayerProps> = ({
  card,
  mediaType,
  src,
}) => {
  const storeCard = useCanvasStore((s) => s.cards[card.id]);
  const currentCard = storeCard || card;
  const selectedCardId = useCanvasStore((s) => s.selectedCardId);
  const isCardSelected = selectedCardId === card.id;

  const pinVideoTimestamp = useCanvasStore((s) => s.pinVideoTimestamp);
  const setLoopRangeStore = useCanvasStore((s) => s.setLoopRange);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showLoopPopover, setShowLoopPopover] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Auto-hide controls state
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isControlsHovered, setIsControlsHovered] = useState(false);

  // Surface click tracking & ripple flash state
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const pointerDownTime = useRef<number>(0);
  const [flashState, setFlashState] = useState<{ type: 'play' | 'pause' | 'bookmark'; id: number } | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const parsedMetaDuration = currentCard.metadata?.duration
    ? mediaService.parseDuration(currentCard.metadata.duration)
    : 0;

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

  // Reset 2.5s inactivity hide timer for video controls
  const resetInactivityTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Only auto-hide if video is actively playing and not interacting with controls or menus
    if (
      isPlaying &&
      mediaType === 'video' &&
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
  }, [isPlaying, mediaType, isControlsHovered, showVolumeSlider, showSpeedMenu, showLoopPopover, isScrubbing]);

  // Handle mouse move across player container
  const handleMouseMove = () => {
    resetInactivityTimer();
  };

  // Handle mouse leave from player container
  const handleMouseLeave = () => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    setShowVolumeSlider(false);
    setShowSpeedMenu(false);
    setShowLoopPopover(false);
    setIsControlsHovered(false);

    if (isPlaying && mediaType === 'video') {
      setIsControlsVisible(false);
    }
  };

  // Synchronize inactivity timer on playback state changes
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

  // Jump to specific time and resume playback
  const jumpToTime = useCallback((time: number) => {
    const el = mediaRef.current;
    if (!el) return;
    const clampedTime = Math.max(0, Math.min(el.duration || time, time));
    el.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    el.play().catch(() => {});
    setIsPlaying(true);
    triggerFlash('play');
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Respond to store seekMedia requests (via seekNonce)
  const prevNonceRef = useRef<number | undefined>(currentCard.playbackState?.seekNonce);
  useEffect(() => {
    const state = currentCard.playbackState;
    if (!state || state.seekNonce === undefined) return;
    if (state.seekNonce !== prevNonceRef.current) {
      prevNonceRef.current = state.seekNonce;
      if (state.seekTarget !== undefined) {
        jumpToTime(state.seekTarget);
      }
    }
  }, [currentCard.playbackState, jumpToTime]);

  // Sync state with HTML media element & handle continuous A-B looping
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      const cur = el.currentTime;
      if (!isScrubbing) {
        setCurrentTime(cur);
      }

      // Check A/B looping boundary
      const curLoop = useCanvasStore.getState().cards[card.id]?.loopRange;
      if (curLoop?.enabled && curLoop.end > curLoop.start) {
        if (cur >= curLoop.end) {
          el.currentTime = curLoop.start;
          setCurrentTime(curLoop.start);
          if (el.paused) {
            el.play().catch(() => {});
          }
        } else if (cur < curLoop.start - 0.3) {
          el.currentTime = curLoop.start;
          setCurrentTime(curLoop.start);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(el.duration);
      if (mediaType === 'video' && 'videoWidth' in el && el.videoWidth > 0 && el.videoHeight > 0) {
        useCanvasStore.getState().autoSyncMediaAspectRatio(card.id, el.videoWidth, el.videoHeight);
      }
    };

    if (el.readyState >= 1) {
      if (el.duration) setDuration(el.duration);
      if (mediaType === 'video' && 'videoWidth' in el && el.videoWidth > 0 && el.videoHeight > 0) {
        useCanvasStore.getState().autoSyncMediaAspectRatio(card.id, el.videoWidth, el.videoHeight);
      }
    }

    const handleEnded = () => {
      const curLoop = useCanvasStore.getState().cards[card.id]?.loopRange;
      if (curLoop?.enabled && curLoop.end > curLoop.start) {
        el.currentTime = curLoop.start;
        setCurrentTime(curLoop.start);
        el.play().catch(() => {});
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
        setIsControlsVisible(true);
      }
    };

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('ended', handleEnded);

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('ended', handleEnded);
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    };
  }, [card.id, isScrubbing, mediaType]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const el = mediaRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      triggerFlash('pause');
    } else {
      // If loop is enabled and current time is outside interval, jump to start
      if (loopRange.enabled && loopRange.end > loopRange.start) {
        if (el.currentTime >= loopRange.end || el.currentTime < loopRange.start) {
          el.currentTime = loopRange.start;
          setCurrentTime(loopRange.start);
        }
      }
      el.play().catch(() => {});
      setIsPlaying(true);
      triggerFlash('play');
    }
  };

  // Surface click detection for video viewport (guards against canvas drag)
  const handleSurfacePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    pointerDownTime.current = Date.now();
  };

  const handleSurfacePointerUp = (e: React.PointerEvent) => {
    if (!pointerDownPos.current || e.button !== 0) return;
    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    const elapsed = Date.now() - pointerDownTime.current;
    pointerDownPos.current = null;

    // Movement under 6px and under 450ms is an intentional click, not a card drag
    if (dx < 6 && dy < 6 && elapsed < 450) {
      togglePlay();
    }
  };

  // Continuous Scrubber Drag & Click Handling
  const updateScrubPosition = (clientX: number) => {
    const el = mediaRef.current;
    const scrubber = scrubberRef.current;
    if (!el || !scrubber || !effectiveDuration) return;

    const rect = scrubber.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * effectiveDuration;
    el.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setIsScrubbing(true);
    resetInactivityTimer();
    updateScrubPosition(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.stopPropagation();
      moveEvent.preventDefault();
      updateScrubPosition(moveEvent.clientX);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      upEvent.stopPropagation();
      upEvent.preventDefault();
      setIsScrubbing(false);
      resetInactivityTimer();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Bookmark / Pin Timestamp Action
  const handlePinTimestamp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = mediaRef.current?.currentTime ?? currentTime;
    pinVideoTimestamp(card.id, cur);
    triggerFlash('bookmark');
    resetInactivityTimer();
  };

  // A/B Loop Controls
  const setPointA = useCallback((targetTime?: number) => {
    const t = targetTime !== undefined ? targetTime : (mediaRef.current?.currentTime ?? currentTime);
    const rounded = Math.round(t * 10) / 10;
    const curLoop = useCanvasStore.getState().cards[card.id]?.loopRange || loopRange;
    const currentEnd = curLoop.end > rounded ? curLoop.end : Math.min(effectiveDuration || rounded + 5, rounded + 3);
    setLoopRangeStore(card.id, {
      enabled: true,
      start: rounded,
      end: Math.max(rounded + 0.5, currentEnd),
    });
    resetInactivityTimer();
  }, [card.id, currentTime, effectiveDuration, loopRange, resetInactivityTimer, setLoopRangeStore]);

  const setPointB = useCallback((targetTime?: number) => {
    const t = targetTime !== undefined ? targetTime : (mediaRef.current?.currentTime ?? currentTime);
    const rounded = Math.round(t * 10) / 10;
    const curLoop = useCanvasStore.getState().cards[card.id]?.loopRange || loopRange;
    const currentStart = curLoop.start < rounded ? curLoop.start : Math.max(0, rounded - 3);
    setLoopRangeStore(card.id, {
      enabled: true,
      start: currentStart,
      end: Math.max(currentStart + 0.5, rounded),
    });
    resetInactivityTimer();
  }, [card.id, currentTime, loopRange, resetInactivityTimer, setLoopRangeStore]);

  const toggleLoopRange = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const curLoop = useCanvasStore.getState().cards[card.id]?.loopRange || loopRange;
    const nextEnabled = !curLoop.enabled;
    let nextStart = curLoop.start;
    let nextEnd = curLoop.end;

    if (nextEnabled) {
      if (nextEnd <= nextStart || nextEnd === 0) {
        nextStart = Math.max(0, Math.floor(currentTime));
        nextEnd = Math.min(effectiveDuration || 10, nextStart + 5);
      }
      if (mediaRef.current && (currentTime < nextStart || currentTime >= nextEnd)) {
        mediaRef.current.currentTime = nextStart;
        setCurrentTime(nextStart);
        mediaRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }

    setLoopRangeStore(card.id, {
      enabled: nextEnabled,
      start: nextStart,
      end: nextEnd,
    });
    resetInactivityTimer();
  }, [card.id, currentTime, effectiveDuration, loopRange, resetInactivityTimer, setLoopRangeStore]);

  // Dragging A / B Scrubber Handles
  const handleLoopHandlePointerDown = (handle: 'A' | 'B', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resetInactivityTimer();

    const scrubber = scrubberRef.current;
    if (!scrubber || !effectiveDuration) return;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.stopPropagation();
      moveEvent.preventDefault();
      const rect = scrubber.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const targetTime = Math.round(pos * effectiveDuration * 10) / 10;
      const curLoop = useCanvasStore.getState().cards[card.id]?.loopRange || loopRange;

      if (handle === 'A') {
        const clampedStart = Math.min(targetTime, Math.max(0, curLoop.end - 0.5));
        setLoopRangeStore(card.id, {
          ...curLoop,
          start: clampedStart,
        });
        if (mediaRef.current) {
          mediaRef.current.currentTime = clampedStart;
          setCurrentTime(clampedStart);
        }
      } else {
        const clampedEnd = Math.max(targetTime, Math.min(effectiveDuration, curLoop.start + 0.5));
        setLoopRangeStore(card.id, {
          ...curLoop,
          end: clampedEnd,
        });
        if (mediaRef.current) {
          mediaRef.current.currentTime = clampedEnd;
          setCurrentTime(clampedEnd);
        }
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      upEvent.stopPropagation();
      upEvent.preventDefault();
      resetInactivityTimer();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Keyboard Shortcuts: '[' for Point A, ']' for Point B, 'l' or 'L' to toggle loop window
  useEffect(() => {
    if (!isCardSelected || mediaType !== 'video') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.key === '[') {
        e.preventDefault();
        setPointA();
      } else if (e.key === ']') {
        e.preventDefault();
        setPointB();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        toggleLoopRange();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCardSelected, mediaType, setPointA, setPointB, toggleLoopRange]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = mediaRef.current;
    if (!el) return;

    const nextMuted = !isMuted;
    el.muted = nextMuted;
    setIsMuted(nextMuted);
    resetInactivityTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const el = mediaRef.current;
    if (!el) return;

    const newVol = parseFloat(e.target.value);
    el.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      el.muted = false;
      setIsMuted(false);
    }
    resetInactivityTimer();
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    handleSpeedChange(nextSpeed, e);
  };

  const handleSpeedChange = (speed: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const el = mediaRef.current;
    if (el) {
      el.playbackRate = speed;
    }
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    resetInactivityTimer();
  };

  const restartMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = mediaRef.current;
    if (!el) return;
    const startTime = loopRange.enabled ? loopRange.start : 0;
    el.currentTime = startTime;
    setCurrentTime(startTime);
    el.play().catch(() => {});
    setIsPlaying(true);
    triggerFlash('play');
    resetInactivityTimer();
  };

  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const loopStartPercent = effectiveDuration > 0 ? (loopRange.start / effectiveDuration) * 100 : 0;
  const loopEndPercent = effectiveDuration > 0 ? (loopRange.end / effectiveDuration) * 100 : 100;
  const loopWidthPercent = Math.max(0, loopEndPercent - loopStartPercent);

  // Compute control bar visibility
  const shouldShowControls =
    mediaType === 'audio' ||
    !isPlaying ||
    isControlsHovered ||
    showVolumeSlider ||
    showSpeedMenu ||
    showLoopPopover ||
    isScrubbing ||
    isControlsVisible;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        setIsControlsVisible(true);
        resetInactivityTimer();
      }}
      onMouseLeave={handleMouseLeave}
      className={`w-full h-full min-h-0 relative flex flex-col justify-between overflow-hidden select-none group/player ${
        mediaType === 'audio' ? 'bg-[#FFFFFF]' : 'bg-[#18181B]'
      }`}
    >
      {/* 1. Underlying Media Element & Surface Interaction */}
      {mediaType === 'video' ? (
        <div
          onPointerDown={handleSurfacePointerDown}
          onPointerUp={handleSurfacePointerUp}
          className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden cursor-pointer"
          title={isPlaying ? 'Click to Pause' : 'Click to Play'}
        >
          {src ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={src}
              playsInline
              loop={false}
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <div className="text-xs text-slate-500 font-mono pointer-events-none">No video stream</div>
          )}

          {/* Center Play Button Badge when Paused */}
          {!isPlaying && src && !flashState && (
            <div className="absolute z-10 w-14 h-14 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl shadow-rose-950/80 pointer-events-none transition-transform group-hover/player:scale-110">
              <Play className="w-6 h-6 fill-white translate-x-0.5 text-white" />
            </div>
          )}

          {/* Animated Center Ripple Flash Badge on Surface Click or Bookmark Pin */}
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
        </div>
      ) : (
        src ? (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={src}
            preload="metadata"
          />
        ) : null
      )}

      {/* 2. Audio Waveform Spectrum Visualization (for Audio Media) */}
      {mediaType === 'audio' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-center px-3.5 py-3 relative">
          {/* Equalizer Spectrum Bars */}
          <div className="flex items-end justify-between w-full flex-1 bg-[#F8F7F4] rounded-xl border border-black/8 px-2.5 py-2 gap-1 min-h-[44px] max-h-[96px]">
            {[45, 75, 90, 35, 100, 60, 85, 40, 95, 70, 50, 85, 65, 30, 90, 75, 55, 95, 40, 80, 60, 45, 90, 70].map(
              (baseHeight, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPlaying
                      ? 'bg-[#C93B1D]'
                      : 'bg-[#18181B]/20 group-hover/player:bg-[#C93B1D]/50'
                  }`}
                  style={{
                    height: isPlaying
                      ? `${Math.max(15, (baseHeight * (idx % 2 === 0 ? 1.25 : 0.75) + (currentTime * 10) % 30) % 100)}%`
                      : `${baseHeight * 0.7}%`,
                  }}
                />
              )
            )}
          </div>
        </div>
      )}

      {/* 3. Pinned Bottom Player Controls Bar */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsControlsHovered(true)}
        onMouseLeave={() => setIsControlsHovered(false)}
        className={`z-20 w-full flex flex-col gap-1.5 transition-opacity duration-300 ${
          mediaType === 'video'
            ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-6 pb-2 px-2 sm:px-2.5'
            : 'relative bg-[#F8F7F4] border-t border-black/8 px-3 pb-2.5 pt-2'
        } ${shouldShowControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Progress Bar / Scrubber Timeline with Dual A/B Handles & Bookmark Pips */}
        <div
          ref={scrubberRef}
          onPointerDown={handleScrubberPointerDown}
          className="group/scrub relative w-full h-[20px] -my-0.5 flex items-center cursor-pointer select-none touch-none"
        >
          {/* Track Bar (Expands on hover/scrub) */}
          <div
            className={`relative w-full rounded-full transition-all duration-150 ${
              mediaType === 'audio' ? 'bg-black/15' : 'bg-white/25'
            } ${
              isScrubbing ? 'h-[7px]' : 'h-[4px] group-hover/scrub:h-[7px]'
            }`}
          >
            {/* A/B Loop Shaded Range Highlight */}
            {loopRange.enabled && effectiveDuration > 0 && (
              <div
                className="absolute top-0 bottom-0 bg-amber-400/35 border-l-2 border-r-2 border-amber-500 pointer-events-none rounded z-0"
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
                    jumpToTime(bm.time);
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
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                mediaType === 'audio'
                  ? 'hover:bg-black/8 text-[#18181B]'
                  : 'hover:bg-white/15 text-white'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current shrink-0" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5 shrink-0" />
              )}
            </button>

            {/* Restart from Beginning Button */}
            <button
              type="button"
              onClick={restartMedia}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                mediaType === 'audio'
                  ? 'hover:bg-black/8 text-[#52525B] hover:text-[#18181B]'
                  : 'hover:bg-white/15 text-slate-300 hover:text-white'
              }`}
              title={loopRange.enabled ? 'Restart from Point A' : 'Restart from beginning'}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            </button>

            {/* Time Stamp Typography */}
            <span
              className={`font-mono text-[11px] sm:text-xs font-medium tracking-tight whitespace-nowrap pl-0.5 select-none shrink-0 ${
                mediaType === 'audio' ? 'text-[#18181B]' : 'text-slate-200'
              }`}
            >
              {mediaService.formatDuration(currentTime)}
              <span className={mediaType === 'audio' ? 'text-[#71717A] mx-0.5' : 'text-slate-500 mx-0.5'}>/</span>
              {mediaService.formatDuration(effectiveDuration)}
            </span>
          </div>

          {/* Right Controls: Bookmark Pinning, A/B Loop Pill, Volume & Speed */}
          <div className="flex items-center gap-1 shrink-0 relative ml-auto">
            {/* Bookmark / Pin Timestamp Button (Video Only) */}
            {mediaType === 'video' && (
              <button
                type="button"
                onClick={handlePinTimestamp}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white/15 text-slate-300 hover:text-amber-400 transition-colors flex items-center justify-center cursor-pointer relative group/pin shrink-0"
                title={`Bookmark Timestamp (${mediaService.formatDuration(currentTime)}) & Spawn/Append Note`}
              >
                <BookmarkPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover/pin:scale-110 transition-transform shrink-0" />
              </button>
            )}

            {/* A/B Loop Tool Toggle Pill & Popover (Video Only) */}
            {mediaType === 'video' && (
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
                        onClick={() => setPointA()}
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
                        onClick={() => setPointB()}
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
            )}

            {/* Volume Control Button & Popover */}
            <div
              className="relative flex items-center shrink-0"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                type="button"
                onClick={toggleMute}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                  mediaType === 'audio'
                    ? 'hover:bg-black/8 text-[#52525B] hover:text-[#18181B]'
                    : 'hover:bg-white/15 text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#C93B1D] shrink-0" />
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
                className={`min-h-[26px] sm:min-h-[28px] px-1.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-mono font-medium transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
                  mediaType === 'audio'
                    ? 'bg-black/5 hover:bg-black/10 text-[#18181B]'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="Click to cycle speed, right-click to open all options"
              >
                <Gauge className={`w-3 h-3 shrink-0 ${mediaType === 'audio' ? 'text-[#C93B1D]' : 'text-white/80'}`} />
                <span>{playbackRate}x</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`w-3.5 h-[26px] sm:h-[28px] flex items-center justify-center rounded-r transition-colors cursor-pointer -ml-1 shrink-0 ${
                  mediaType === 'audio' ? 'text-[#52525B] hover:text-[#18181B]' : 'text-slate-400 hover:text-white'
                }`}
                title="Open speed menu"
              >
                <ChevronUp className="w-3 h-3" />
              </button>

              {/* Horizontal Segmented Speed Bar */}
              {showSpeedMenu && (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-2.5 p-1 rounded-xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-1 z-50 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
                >
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={(e) => handleSpeedChange(speed, e)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                        playbackRate === speed
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/50'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
