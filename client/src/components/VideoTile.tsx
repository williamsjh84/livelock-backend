/**
 * LiveLock — VideoTile component (web)
 * Displays a single video stream in a verification session.
 * Shows avatar fallback when camera is off.
 */
import { useEffect, useRef } from "react";
import { VideoOff, MicOff, Shield } from "lucide-react";

interface VideoTileProps {
  stream: MediaStream | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  name: string;
  type: "local" | "remote";
  isSmall?: boolean;
  className?: string;
}

export function VideoTile({ stream, isCameraOn, isMicOn, name, type, isSmall = false, className = "" }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const showVideo = stream && (type === "remote" ? isCameraOn : isCameraOn);

  return (
    <div className={`relative bg-[#0d1f35] rounded-2xl overflow-hidden border border-white/[0.10] flex items-center justify-center ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={type === "local"}
        className={`w-full h-full object-cover ${showVideo ? "block" : "hidden"} ${type === "local" ? "-scale-x-100" : ""}`}
      />

      {/* Avatar fallback when camera is off */}
      {!showVideo && (
        <div className="flex flex-col items-center gap-2">
          <div className={`rounded-full bg-[#00C9B1]/20 border border-[#00C9B1]/30 flex items-center justify-center ${isSmall ? "w-10 h-10" : "w-16 h-16"}`}>
            <span className={`font-bold text-[#00C9B1] ${isSmall ? "text-sm" : "text-2xl"}`}>{initials}</span>
          </div>
          {!isSmall && (
            <div className="flex items-center gap-1.5 text-white/30 text-[10px]">
              <VideoOff size={11} />
              <span>Camera off</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom bar: name + mic status */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
        <span className={`text-white font-medium truncate ${isSmall ? "text-[9px]" : "text-[11px]"}`}>
          {type === "local" ? `${name} (You)` : name}
        </span>
        {!isMicOn && (
          <div className="flex items-center gap-1 bg-red-500/80 rounded-full px-1.5 py-0.5">
            <MicOff size={9} className="text-white" />
            {!isSmall && <span className="text-[9px] text-white">Muted</span>}
          </div>
        )}
      </div>

      {/* P2P badge on remote tile */}
      {type === "remote" && !isSmall && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#00C9B1]/15 border border-[#00C9B1]/30 rounded-full px-2 py-1">
          <Shield size={9} className="text-[#00C9B1]" />
          <span className="text-[9px] text-[#00C9B1] font-semibold">Peer-to-peer</span>
        </div>
      )}
    </div>
  );
}
