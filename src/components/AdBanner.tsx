"use client";

import { useEffect, useRef } from "react";

// 카카오 애드핏 배너
export function KakaoAdFit({
  unitId,
  width = 320,
  height = 100,
  className = "",
}: {
  unitId: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (!containerRef.current) return;
    if (!unitId) return;

    initialized.current = true;

    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", unitId);
    ins.setAttribute("data-ad-width", String(width));
    ins.setAttribute("data-ad-height", String(height));
    containerRef.current.appendChild(ins);

    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;
    containerRef.current.appendChild(script);
  }, [unitId, width, height]);

  if (!unitId) return null;

  return <div ref={containerRef} className={className} />;
}

// 구글 애드센스 배너
export function GoogleAdSense({
  adSlot,
  adFormat = "auto",
  className = "",
}: {
  adSlot: string;
  adFormat?: string;
  className?: string;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded yet
    }
  }, []);

  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  if (!adClient || !adSlot) return null;

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// 통합 광고 배너 - 페이지당 카카오 애드핏은 1회만 (같은 unit ID 중복 불가)
// header → 카카오 애드핏 우선, footer/content → 애드센스 우선
export function AdBanner({
  position = "content",
  className = "",
}: {
  position?: "header" | "content" | "footer";
  className?: string;
}) {
  const kakaoUnitId = process.env.NEXT_PUBLIC_KAKAO_ADFIT_UNIT_ID?.trim();
  const adsenseSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID?.trim();

  // 둘 다 설정 안 되어 있으면 렌더링하지 않음
  if (!kakaoUnitId && !adsenseSlot) return null;

  const sizeMap = {
    header: { width: 300, height: 250 },
    content: { width: 300, height: 250 },
    footer: { width: 300, height: 250 },
  };

  const size = sizeMap[position];

  // header 위치에만 카카오 애드핏 (페이지당 1개), 나머지는 애드센스
  const useKakao = position === "header" && !!kakaoUnitId;

  return (
    <div className={`flex justify-center ${className}`}>
      {useKakao ? (
        <KakaoAdFit unitId={kakaoUnitId!} width={size.width} height={size.height} />
      ) : adsenseSlot ? (
        <GoogleAdSense adSlot={adsenseSlot} />
      ) : null}
    </div>
  );
}
