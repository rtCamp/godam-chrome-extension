import React, { useEffect, useRef, useContext, useState } from "react";

import { contentStateContext } from "../context/ContentState";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const Teleprompter = () => {
  const [contentState] = useContext(contentStateContext);
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Derived state
  const enabled = contentState.teleprompterEnabled && contentState.recording;
  const text = contentState.teleprompterText || "";

  // Map speed 10..100 to pixels per second 20..300
  const pxPerSecond = 20 + ((clamp(contentState.teleprompterSpeed || 50, 10, 100) - 10) / 90) * 280;

  useEffect(() => {
    if (!enabled) return;
    if (!trackRef.current) return;
    let raf = 0;
    let last = performance.now();

    const step = (now) => {
      const dt = (now - last) / 1000; // seconds
      last = now;
      if (!isHovered) {
        const el = trackRef.current;
        const current = el.scrollTop || 0;
        el.scrollTop = current + pxPerSecond * dt;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [enabled, isHovered, pxPerSecond, text]);

  if (!enabled) return null;
  if (!text.trim()) return null;

  const positionTop = contentState.teleprompterPosition !== "bottom";
  const width = contentState.teleprompterWidth || 600;
  const fontSize = contentState.teleprompterFontSize || 28;
  const opacity = contentState.teleprompterOpacity ?? 0.85;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        width: width + "px",
        maxWidth: "90vw",
        zIndex: 2147483647,
        top: positionTop ? "24px" : "",
        bottom: !positionTop ? "24px" : "",
        pointerEvents: "auto",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          background: `rgba(0,0,0,${opacity})`,
          color: "#fff",
          borderRadius: 12,
          padding: "12px 16px",
          boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
          overflow: "hidden",
          maxHeight: positionTop ? "30vh" : "35vh",
        }}
      >
        <div
          ref={trackRef}
          style={{
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            maxHeight: positionTop ? "28vh" : "33vh",
          }}
        >
          <div
            style={{
              fontSize: fontSize + "px",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              userSelect: "none",
              paddingRight: 12,
            }}
          >
            {text}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 6,
            gap: 8,
            opacity: 0.85,
          }}
        >
          <div style={{ fontSize: 12 }}>
            {isHovered ? "Scroll paused (hovering)" : "Auto-scroll"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>Speed</span>
            <div
              style={{
                height: 6,
                width: 80,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${clamp(contentState.teleprompterSpeed || 50, 0, 100)}%`,
                  background: "#5aa5ff",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teleprompter; 