"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

export function Tooltip({
  text,
  children,
  className = "",
}: {
  text: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, pos: "top" as "top" | "bottom" });
  const wrapRef = useRef<HTMLSpanElement>(null);

  const handleEnter = useCallback(() => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const pos = rect.top < 100 ? "bottom" : "top";
      setCoords({
        x: centerX,
        y: pos === "top" ? rect.top : rect.bottom,
        pos,
      });
    }
    setShow(true);
  }, []);

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <svg
        className="w-3.5 h-3.5 ml-1 text-zinc-500 shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
      {show &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: coords.x,
              top: coords.pos === "top" ? coords.y - 8 : coords.y + 8,
              transform:
                coords.pos === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
              zIndex: 9999,
            }}
            className="w-56 px-3 py-2 text-xs font-normal text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg leading-relaxed whitespace-normal"
          >
            {text}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-zinc-700 rotate-45 ${
                coords.pos === "top"
                  ? "top-full -mt-1 border-b border-r"
                  : "bottom-full -mb-1 border-t border-l"
              }`}
            />
          </div>,
          document.body
        )}
    </span>
  );
}
