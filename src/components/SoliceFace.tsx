"use client";

type SoliceFaceProps = {
  state: "idle" | "thinking" | "speaking";
};

export default function SoliceFace({ state }: SoliceFaceProps) {
  const isActive = state === "speaking" || state === "thinking";

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      {/* Bottom layer: Pulsing light */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "url('/ASSETS/ILLUSTRATION/SOLICE/SOLICE.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          animation: isActive
            ? "solice-bg-pulse-active 1.6s ease-in-out infinite"
            : "solice-bg-pulse 5.8s ease-in-out infinite",
        }}
      />

      {/* Top layer: Static transparent model */}
      <div
        className="absolute inset-0 z-10"
        style={{
          backgroundImage:
            "url('/ASSETS/ILLUSTRATION/SOLICE/SOLICE%20TRANSPARENT.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Invisible circular blur disc */}
      <div
        className="absolute left-1/2 top-[42%] z-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "min(54vw, 520px)",
          height: "min(54vw, 520px)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          maskImage:
            "radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 72%)",
        }}
      />
    </div>
  );
}
