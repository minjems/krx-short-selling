"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  HistogramSeries,
} from "lightweight-charts";

type FlowItem = {
  date: string;
  netValue: number;
};

type InvestorFlowData = Record<string, FlowItem[]>;

type InvestorKey = "9000" | "7050" | "8000";

const TABS: { key: InvestorKey; label: string }[] = [
  { key: "9000", label: "외국인" },
  { key: "7050", label: "기관" },
  { key: "8000", label: "개인" },
];

export function InvestorFlowChart({ data }: { data: InvestorFlowData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<InvestorKey>("9000");

  const chartData = data[active] || [];
  const hasData = Object.values(data).some((arr) => arr.length > 0);

  useEffect(() => {
    if (!containerRef.current || chartData.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "#27272a" },
        horzLines: { color: "#27272a" },
      },
      width: containerRef.current.clientWidth,
      height: 300,
      rightPriceScale: {
        borderColor: "#3f3f46",
      },
      timeScale: {
        borderColor: "#3f3f46",
        timeVisible: false,
      },
      crosshair: {
        horzLine: { style: LineStyle.Dotted },
        vertLine: { style: LineStyle.Dotted },
      },
    });

    const series = chart.addSeries(HistogramSeries, {
      priceScaleId: "right",
      title: "순매수대금",
    });

    series.setData(
      chartData.map((d) => ({
        time: d.date,
        value: d.netValue / 100_000_000, // 억원 단위
        color: d.netValue >= 0 ? "#ef444499" : "#3b82f699",
      }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartData, active]);

  if (!hasData) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/60" />{" "}
            순매수
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-blue-500/60" />{" "}
            순매도
          </span>
          <span className="text-zinc-600 ml-1">(억원)</span>
        </div>
        <div className="flex gap-1 ml-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                active === tab.key
                  ? "bg-zinc-100 text-zinc-900 font-medium"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
