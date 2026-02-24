"use client";

import { useState, useRef, useEffect } from "react";

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
  const [pos, setPos] = useState<"top" | "bottom">("top");
  const tipRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      // 위에 공간이 부족하면 아래로
      setPos(rect.top < 80 ? "bottom" : "top");
    }
  }, [show]);

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShow(true)}
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
      {show && (
        <div
          ref={tipRef}
          className={`absolute z-50 w-56 px-3 py-2 text-xs font-normal text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg leading-relaxed whitespace-normal ${
            pos === "top"
              ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
              : "top-full mt-2 left-1/2 -translate-x-1/2"
          }`}
        >
          {text}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-zinc-700 rotate-45 ${
              pos === "top"
                ? "top-full -mt-1 border-b border-r"
                : "bottom-full -mb-1 border-t border-l"
            }`}
          />
        </div>
      )}
    </span>
  );
}
