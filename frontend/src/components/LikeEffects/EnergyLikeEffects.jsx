import React, { useState, useRef, useCallback } from "react";
import { Heart, ThumbsDown } from "lucide-react";
import "./EnergyLikeEffects.css";

export const PARTICLE_COUNT = 8;
export const SHARD_COUNT = 6;
export const FLOAT_HEART_COUNT = 56;
export const DISLIKE_BURST_COUNT = 40;
export const DOUBLE_TAP_MS = 300;
export const HEART_TOTAL_MS = 4200;

export const noTapHighlight = {
  WebkitTapHighlightColor: "transparent",
  WebkitTouchCallout: "none",
  outline: "none",
  border: "none",
  background: "none",
};

export function OdometerNumber({ value, color }) {
  const [display, setDisplay] = useState(value);
  const [prev, setPrev] = useState(value);
  const [animKey, setAnimKey] = useState(0);
  const dir = useRef(1);

  if (value !== display) {
    dir.current = value > display ? 1 : -1;
    setPrev(display);
    setDisplay(value);
    setAnimKey((k) => k + 1);
  }

  return (
    <span
      className="relative inline-block overflow-hidden text-sm font-semibold tabular-nums"
      style={{ height: "1.2em", width: "2.4ch", color }}
    >
      <span
        key={animKey}
        className="absolute inset-0 flex flex-col"
        style={{
          animation: "odometerRoll 0.42s cubic-bezier(.22,1,.36,1) forwards",
          "--dir": dir.current,
        }}
      >
        <span style={{ order: dir.current === 1 ? 0 : 2 }}>{prev}</span>
        <span style={{ order: 1 }}>{display}</span>
      </span>
    </span>
  );
}

export function makeFloatingHeart(index, originX, originY, containerWidth, containerHeight) {
  const destX = 10 + Math.random() * Math.max(containerWidth - 20, 1);
  const dx = destX - originX;
  const rise = 30 + Math.random() * 90;
  const fall = containerHeight - originY + 40 + Math.random() * 30;
  const rot = (Math.random() * 2 - 1) * 70;
  const size = 14 + Math.random() * 18;
  const duration = 1600 + Math.random() * 1500;
  const delay = Math.random() * 700;
  const colors = ["#fb7185", "#f97316", "#ef4444", "#f43f5e"];
  return {
    id: `${index}-${Math.random().toString(36).slice(2)}`,
    originX,
    originY,
    rise,
    fall,
    dx,
    rot,
    size,
    duration,
    delay,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

export function makeButtonHeart(index, originX, originY, centerY, containerWidth, containerHeight) {
  const targetX = 10 + Math.random() * Math.max(containerWidth - 20, 1);
  const targetY = centerY + (Math.random() * 2 - 1) * 55;
  const dx = targetX - originX;
  const rise = originY - targetY;
  const fall = containerHeight - targetY + 40 + Math.random() * 30;
  const drift = (Math.random() * 2 - 1) * 40;
  const rot = (Math.random() * 2 - 1) * 70;
  const size = 14 + Math.random() * 18;
  const duration = 1700 + Math.random() * 1300;
  const delay = Math.random() * 500;
  const colors = ["#fb7185", "#f97316", "#ef4444", "#f43f5e"];
  return {
    id: `btn-${index}-${Math.random().toString(36).slice(2)}`,
    toCenter: true,
    originX,
    originY,
    rise,
    fall,
    dx,
    drift,
    rot,
    size,
    duration,
    delay,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

export function makeButtonDislikeThumb(index, originX, originY, centerY, containerWidth, containerHeight) {
  const targetX = 10 + Math.random() * Math.max(containerWidth - 20, 1);
  const targetY = centerY + (Math.random() * 2 - 1) * 55;
  const dx = targetX - originX;
  const rise = originY - targetY;
  const fall = containerHeight - targetY + 40 + Math.random() * 30;
  const drift = (Math.random() * 2 - 1) * 40;
  const rot = (Math.random() * 2 - 1) * 90;
  const size = 12 + Math.random() * 14;
  const duration = 1700 + Math.random() * 1300;
  const delay = Math.random() * 500;
  const colors = ["#94a3b8", "#64748b", "#cbd5e1", "#475569"];
  return {
    id: `btnthumb-${index}-${Math.random().toString(36).slice(2)}`,
    kind: "thumb",
    toCenter: true,
    originX,
    originY,
    rise,
    fall,
    dx,
    drift,
    rot,
    size,
    duration,
    delay,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

export function FloatingHeartsOverlay({ floatingHearts }) {
  if (!floatingHearts || floatingHearts.length === 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {floatingHearts.map((h) =>
        h.kind === "thumb" ? (
          <ThumbsDown
            key={h.id}
            size={h.size}
            strokeWidth={0}
            className="absolute pointer-events-none gravity-heart"
            style={{
              left: `${h.originX}px`,
              top: `${h.originY}px`,
              fill: h.color,
              "--dx": `${h.dx}px`,
              "--rise": `${h.rise}px`,
              "--fall": `${h.fall}px`,
              "--drift": `${h.drift || 0}px`,
              "--rot": `${h.rot}deg`,
              animationName: h.toCenter ? "centerRiseAndFall" : "riseAndFall",
              animationDuration: `${h.duration}ms`,
              animationDelay: `${h.delay}ms`,
            }}
          />
        ) : (
          <Heart
            key={h.id}
            size={h.size}
            strokeWidth={0}
            className="absolute pointer-events-none gravity-heart"
            style={{
              left: `${h.originX}px`,
              top: `${h.originY}px`,
              fill: h.color,
              "--dx": `${h.dx}px`,
              "--rise": `${h.rise}px`,
              "--fall": `${h.fall}px`,
              "--drift": `${h.drift || 0}px`,
              "--rot": `${h.rot}deg`,
              animationName: h.toCenter ? "centerRiseAndFall" : "riseAndFall",
              animationDuration: `${h.duration}ms`,
              animationDelay: `${h.delay}ms`,
            }}
          />
        )
      )}
    </div>
  );
}

export function useEnergyLikeEffects(cardRef, mediaRef) {
  const [charging, setCharging] = useState(false);
  const [cracking, setCracking] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [pulse, setPulse] = useState(false);
  const chargeTimeout = useRef(null);
  const floatTimeout = useRef(null);
  const pulseTimeout = useRef(null);
  const lastTapRef = useRef(0);

  const vibrate = useCallback((pattern) => {
    let ok = false;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        ok = navigator.vibrate(pattern);
      } catch (err) {
        ok = false;
      }
    }
    if (!ok) {
      setPulse(true);
      clearTimeout(pulseTimeout.current);
      pulseTimeout.current = setTimeout(() => setPulse(false), 180);
    }
  }, []);

  const triggerLikeEffect = useCallback((targetElement) => {
    setBurstKey((k) => k + 1);
    setCharging(true);
    vibrate(35);
    clearTimeout(chargeTimeout.current);
    chargeTimeout.current = setTimeout(() => setCharging(false), 750);

    const cardEl = cardRef?.current;
    const mediaEl = mediaRef?.current || cardEl;
    if (!cardEl || !targetElement) return;

    const cardRect = cardEl.getBoundingClientRect();
    const mediaRect = mediaEl ? mediaEl.getBoundingClientRect() : cardRect;
    const originRect = targetElement.getBoundingClientRect();

    const originX = originRect.left + originRect.width / 2 - cardRect.left;
    const originY = originRect.top + originRect.height / 2 - cardRect.top;
    const centerY = mediaRect.top + mediaRect.height / 2 - cardRect.top;

    const newParticles = Array.from({ length: FLOAT_HEART_COUNT }).map((_, i) =>
      makeButtonHeart(i, originX, originY, centerY, cardRect.width, cardRect.height)
    );

    setFloatingHearts((prev) => [...prev, ...newParticles]);
    clearTimeout(floatTimeout.current);
    floatTimeout.current = setTimeout(() => setFloatingHearts([]), HEART_TOTAL_MS);
  }, [cardRef, mediaRef, vibrate]);

  const triggerDislikeEffect = useCallback((targetElement) => {
    setCracking(true);
    setTimeout(() => setCracking(false), 500);
    vibrate([30, 40, 30]);

    const cardEl = cardRef?.current;
    const mediaEl = mediaRef?.current || cardEl;
    if (!cardEl || !targetElement) return;

    const cardRect = cardEl.getBoundingClientRect();
    const mediaRect = mediaEl ? mediaEl.getBoundingClientRect() : cardRect;
    const originRect = targetElement.getBoundingClientRect();

    const originX = originRect.left + originRect.width / 2 - cardRect.left;
    const originY = originRect.top + originRect.height / 2 - cardRect.top;
    const centerY = mediaRect.top + mediaRect.height / 2 - cardRect.top;

    const newParticles = Array.from({ length: DISLIKE_BURST_COUNT }).map((_, i) =>
      makeButtonDislikeThumb(i, originX, originY, centerY, cardRect.width, cardRect.height)
    );

    setFloatingHearts((prev) => [...prev, ...newParticles]);
    clearTimeout(floatTimeout.current);
    floatTimeout.current = setTimeout(() => setFloatingHearts([]), HEART_TOTAL_MS);
  }, [cardRef, mediaRef, vibrate]);

  const triggerDoubleTap = useCallback((e) => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < DOUBLE_TAP_MS;
    lastTapRef.current = now;
    if (!isDoubleTap) return false;

    const cardEl = cardRef?.current;
    const cardRect = cardEl ? cardEl.getBoundingClientRect() : null;
    const containerWidth = cardRect ? cardRect.width : 300;
    const containerHeight = cardRect ? cardRect.height : 300;
    const originX = cardRect && e ? e.clientX - cardRect.left : containerWidth / 2;
    const originY = cardRect && e ? e.clientY - cardRect.top : containerHeight / 2;

    const newHearts = Array.from({ length: FLOAT_HEART_COUNT }).map((_, i) =>
      makeFloatingHeart(i, originX, originY, containerWidth, containerHeight)
    );

    setFloatingHearts((prev) => [...prev, ...newHearts]);
    clearTimeout(floatTimeout.current);
    floatTimeout.current = setTimeout(() => setFloatingHearts([]), HEART_TOTAL_MS);

    vibrate(40);
    return true;
  }, [cardRef, vibrate]);

  return {
    charging,
    cracking,
    burstKey,
    floatingHearts,
    pulse,
    vibrate,
    triggerLikeEffect,
    triggerDislikeEffect,
    triggerDoubleTap,
  };
}
