"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, LineStyle, LineSeries } from "lightweight-charts";

type VolumeItem = {
  date: string;
  shortRatio: number;
  closePrice: number;
};

export function ShortRatioChart({ data }: { data: VolumeItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

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
      leftPriceScale: {
        visible: true,
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

    // 주가 라인 (왼쪽 축)
    const priceSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      priceScaleId: "left",
      title: "종가",
    });
    priceSeries.setData(
      data
        .filter((d) => d.closePrice > 0)
        .map((d) => ({ time: d.date, value: d.closePrice }))
    );

    // 공매도 비중 라인 (오른쪽 축)
    const ratioSeries = chart.addSeries(LineSeries, {
      color: "#ef4444",
      lineWidth: 2,
      priceScaleId: "right",
      title: "공매도비중(%)",
    });
    ratioSeries.setData(
      data.map((d) => ({ time: d.date, value: d.shortRatio }))
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
  }, [data]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-blue-500" /> 종가
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-red-500" /> 공매도비중(%)
        </span>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
