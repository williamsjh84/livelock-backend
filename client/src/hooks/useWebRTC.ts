/**
 * LiveLock — WebRTC hook for browser (web app)
 *
 * Peer-to-peer video/audio for verification sessions.
 * Uses the browser's native RTCPeerConnection and getUserMedia APIs.
 * Video is always peer-to-peer — never touches the server.
 *
 * Behaviour:
 *   - Audio (mic) auto-starts when session becomes active
 *   - Camera is user-initiated via startCamera()
 *   - Signaling is relayed through the existing Socket.io session room
 *
 * Compatible with Chrome, Firefox, Safari, and Edge.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

// STUN + TURN servers — same as native app
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "2c74aa0b0e33d87e88e1f76c",
    credential: "XPb0YCewfF4RVDY3",
  },
  {
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
    username: "2c74aa0b0e33d87e88e1f76c",
    credential: "XPb0YCewfF4RVDY3",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "2c74aa0b0e33d87e88e1f76c",
    credential: "XPb0YCewfF4RVDY3",
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "2c74aa0b0e33d87e88e1f76c",
    credential: "XPb0YCewfF4RVDY3",
  },
];

export interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  isRemoteCameraOn: boolean;
  isRemoteMicOn: boolean;
  isConnected: boolean;
  permissionDenied: boolean;
  startCamera: () => Promise<void>;
  toggleCamera: () => void;
  toggleMic: () => void;
  stopMedia: () => void;
}

interface UseWebRTCOptions {
  sessionId: string | null;
  socketRef: React.MutableRefObject<Socket | null>;
  isInitiator: boolean;
  enabled: boolean;
}

export function useWebRTC({ sessionId, socketRef, isInitiator, enabled }: UseWebRTCOptions): WebRTCState {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const mediaReadyRef = useRef(false);
  const listeningRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isRemoteCameraOn, setIsRemoteCameraOn] = useState(true);
  const [isRemoteMicOn, setIsRemoteMicOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    mediaReadyRef.current = false;
    pendingOfferRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsCameraOn(false);
    setIsMicOn(false);
    setIsConnected(false);
  }, []);

  const createPC = useCallback(() => {
    pcRef.current?.close();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add existing local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }

    pc.ontrack = e => {
      if (e.streams?.[0]) setRemoteStream(e.streams[0]);
    };

    pc.onicecandidate = e => {
      if (e.candidate && socketRef.current && sessionId) {
        socketRef.current.emit("webrtc:ice-candidate", { sessionId, candidate: e.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === "connected");
    };

    pcRef.current = pc;
    return pc;
  }, [sessionId, socketRef]);

  const startCall = useCallback(async () => {
    const sock = socketRef.current;
    if (!sock || !sessionId) return;
    const pc = createPC();
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);
    sock.emit("webrtc:offer", { sessionId, offer });
  }, [createPC, sessionId, socketRef]);

  // Start audio only — called automatically when session becomes active
  const startAudio = useCallback(async () => {
    if (mediaReadyRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      mediaReadyRef.current = true;
      setLocalStream(stream);
      setIsMicOn(true);
      setPermissionDenied(false);

      // Add tracks to existing PC if any
      if (pcRef.current) {
        stream.getTracks().forEach(t => pcRef.current!.addTrack(t, stream));
      }

      if (isInitiator && socketRef.current && sessionId) await startCall();

      // Handle pending offer
      if (!isInitiator && pendingOfferRef.current && socketRef.current && sessionId) {
        const pending = pendingOfferRef.current;
        pendingOfferRef.current = null;
        const pc = createPC();
        await pc.setRemoteDescription(pending);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit("webrtc:answer", { sessionId, answer });
      }
    } catch (err) {
      console.warn("[WebRTC] Audio start failed:", err);
      if ((err as DOMException).name === "NotAllowedError") setPermissionDenied(true);
    }
  }, [isInitiator, sessionId, socketRef, startCall, createPC]);

  // Add camera to existing audio stream (user-initiated)
  const startCamera = useCallback(async () => {
    try {
      let newStream: MediaStream;
      if (localStreamRef.current) {
        // Add video track to existing audio stream
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: false });
        const videoTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(videoTrack);

        // Add to peer connection
        if (pcRef.current) {
          pcRef.current.addTrack(videoTrack, localStreamRef.current);
          // Renegotiate if we're the initiator
          if (isInitiator) {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            socketRef.current?.emit("webrtc:offer", { sessionId, offer });
          }
        }

        setLocalStream(localStreamRef.current);
        setIsCameraOn(true);
      } else {
        // No audio yet — start both together
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: true,
        });
        localStreamRef.current = newStream;
        mediaReadyRef.current = true;
        setLocalStream(newStream);
        setIsCameraOn(true);
        setIsMicOn(true);

        if (pcRef.current) {
          newStream.getTracks().forEach(t => pcRef.current!.addTrack(t, newStream));
        }
        if (isInitiator && socketRef.current && sessionId) await startCall();
      }
      setPermissionDenied(false);
    } catch (err) {
      console.warn("[WebRTC] Camera start failed:", err);
      if ((err as DOMException).name === "NotAllowedError") setPermissionDenied(true);
    }
  }, [isInitiator, sessionId, socketRef, startCall]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current || !sessionId) return;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCameraOn(track.enabled);
    socketRef.current?.emit("webrtc:video-toggle", { sessionId, enabled: track.enabled });
  }, [sessionId, socketRef]);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current || !sessionId) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicOn(track.enabled);
    socketRef.current?.emit("webrtc:audio-toggle", { sessionId, enabled: track.enabled });
  }, [sessionId, socketRef]);

  // Auto-start audio when session becomes active
  useEffect(() => {
    if (enabled && sessionId && !mediaReadyRef.current) {
      startAudio();
    }
    if (!enabled) stopMedia();
  }, [enabled, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach WebRTC signaling listeners to the socket
  useEffect(() => {
    if (!sessionId || !enabled) return;

    // Poll until socket is connected (may take a few ms after session start)
    let cleanup: (() => void) | undefined;
    const attach = () => {
      const sock = socketRef.current;
      if (!sock || listeningRef.current) return;
      listeningRef.current = true;

      const handleOffer = async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
        const s = socketRef.current;
        if (!s || !sessionId) return;
        if (!mediaReadyRef.current) { pendingOfferRef.current = offer; return; }
        const pc = createPC();
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit("webrtc:answer", { sessionId, answer });
      };

      const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(answer);
      };

      const handleIce = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (!pcRef.current) return;
        try { await pcRef.current.addIceCandidate(candidate); } catch { /* ignore */ }
      };

      sock.on("webrtc:offer", handleOffer);
      sock.on("webrtc:answer", handleAnswer);
      sock.on("webrtc:ice-candidate", handleIce);
      sock.on("webrtc:video-toggle", ({ enabled: e }: { enabled: boolean }) => setIsRemoteCameraOn(e));
      sock.on("webrtc:audio-toggle", ({ enabled: e }: { enabled: boolean }) => setIsRemoteMicOn(e));

      cleanup = () => {
        sock.off("webrtc:offer", handleOffer);
        sock.off("webrtc:answer", handleAnswer);
        sock.off("webrtc:ice-candidate", handleIce);
        sock.off("webrtc:video-toggle");
        sock.off("webrtc:audio-toggle");
        listeningRef.current = false;
      };
    };

    attach();
    const poll = setInterval(() => { if (!listeningRef.current) attach(); else clearInterval(poll); }, 100);

    return () => { clearInterval(poll); cleanup?.(); };
  }, [sessionId, enabled, createPC, socketRef]);

  return {
    localStream, remoteStream,
    isCameraOn, isMicOn, isRemoteCameraOn, isRemoteMicOn,
    isConnected, permissionDenied,
    startCamera, toggleCamera, toggleMic, stopMedia,
  };
}
