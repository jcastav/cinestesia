"use client";

import type HlsJs from "hls.js";
import { useEffect, useRef, useState } from "react";

interface PlayerProps {
  src: string;
  title: string;
}

export function Player({ src, title }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let hls: HlsJs | undefined;
    let cancelled = false;

    async function setup(): Promise<void> {
      const video = videoRef.current;
      if (!video) {
        return;
      }

      const { default: Hls } = await import("hls.js");

      if (cancelled) {
        return;
      }

      if (Hls.isSupported()) {
        hls = new Hls();

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error("Error de reproducción Hls.js:", data);
          if (data.fatal) {
            setErrorMessage("No se pudo reproducir el contenido.");
            hls?.destroy();
          }
        });

        hls.loadSource(src);
        hls.attachMedia(video);
        return;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        return;
      }

      setErrorMessage("Este navegador no soporta reproducción HLS.");
    }

    setup().catch((error: unknown) => {
      console.error("No se pudo inicializar el reproductor:", error);
      setErrorMessage("No se pudo inicializar el reproductor.");
    });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  if (errorMessage) {
    return (
      <div
        role="alert"
        className="flex aspect-video w-full items-center justify-center rounded-lg border border-red-900 bg-red-950 p-6 text-center text-red-200"
      >
        {errorMessage}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      preload="metadata"
      aria-label={title}
      className="aspect-video w-full rounded-lg bg-black"
    />
  );
}
