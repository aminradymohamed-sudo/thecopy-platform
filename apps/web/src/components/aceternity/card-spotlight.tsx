"use client";
import React, { useRef } from "react";

import { cn } from "@/lib/utils";

type CardSpotlightProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export const CardSpotlight = ({
  children,
  className,
  style,
  ...rest
}: CardSpotlightProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const setOpacity = (value: string) => {
    spotlightRef.current?.style.setProperty("--spotlight-opacity", value);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    div.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
    div.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
  };

  const handleFocus = () => {
    setOpacity("1");
  };

  const handleBlur = () => {
    setOpacity("0");
  };

  const handleMouseEnter = () => {
    setOpacity("1");
  };

  const handleMouseLeave = () => {
    setOpacity("0");
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative overflow-hidden", className)}
      style={
        {
          "--spotlight-x": "0px",
          "--spotlight-y": "0px",
          "--spotlight-opacity": 0,
          ...style,
        } as React.CSSProperties
      }
      {...rest}
    >
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity: "var(--spotlight-opacity)",
          background:
            "radial-gradient(600px circle at var(--spotlight-x) var(--spotlight-y), rgba(255,215,0,0.1), transparent 40%)",
        }}
      />
      {children}
    </div>
  );
};
