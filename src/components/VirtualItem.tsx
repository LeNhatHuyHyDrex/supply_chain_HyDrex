"use client";

import React, { useState, useEffect, useRef } from "react";

interface VirtualItemProps {
  children: React.ReactNode;
  estimateHeight?: number;
}

export default function VirtualItem({ children, estimateHeight = 450 }: VirtualItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: "300px", // pre-render buffer for seamless scrolling
      }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: isVisible ? undefined : `${estimateHeight}px`,
        contain: isVisible ? undefined : "strict",
      }}
    >
      {isVisible ? children : null}
    </div>
  );
}
