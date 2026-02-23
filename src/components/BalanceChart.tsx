"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, LineStyle, LineSeries } from "lightweight-charts";

type BalanceItem = {
  date: string;
  balanceQuantity: number;
  balanceRatio: number;
};

export function BalanceChart({ data }: { data: BalanceItem[] }) {
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

    // 잔고수량 (왼쪽 축)
    const qtySeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 2,
      priceScaleId: "left",
      title: "잔고수량",
    });
    qtySeries.setData(
      data.map((d) => ({ time: d.date, value: d.balanceQuantity }))
    );

    // 잔고비율 (오른쪽 축)
    const ratioSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      priceScaleId: "right",
      title: "잔고비율(%)",
    });
    ratioSeries.setData(
      data.map((d) => ({ time: d.date, value: d.balanceRatio }))
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
          <span className="inline-block w-3 h-0.5 bg-purple-500" /> 잔고수량
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-amber-500" /> 잔고비율(%)
        </span>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
