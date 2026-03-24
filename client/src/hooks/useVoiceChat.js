import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function useVoiceChat({ socket, isSeated }) {
  const [isMuted, setIsMuted] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState([]);
  const [micError, setMicError] = useState(null);

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioElemsRef = useRef({});
  const analyserTimerRef = useRef(null);
  const speakingRef = useRef({});

  const cleanupPeer = (socketId) => {
    if (peersRef.current[socketId]) {
      peersRef.current[socketId].close();
      delete peersRef.current[socketId];
    }
    if (audioElemsRef.current[socketId]) {
      audioElemsRef.current[socketId].pause();
      audioElemsRef.current[socketId].srcObject = null;
      delete audioElemsRef.current[socketId];
    }
  };

  const cleanupAll = () => {
    Object.keys(peersRef.current).forEach(cleanupPeer);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (analyserTimerRef.current) {
      clearInterval(analyserTimerRef.current);
      analyserTimerRef.current = null;
    }
    setSpeakingUsers([]);
  };

  useEffect(() => {
    if (!isSeated) {
      cleanupAll();
      return;
    }
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        stream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
        setMicError(null);
      })
      .catch(err => {
        if (!cancelled) setMicError('Mikrofon erişimi reddedildi');
      });
    return () => {
      cancelled = true;
      cleanupAll();
    };
  }, [isSeated]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }
  }, [isMuted]);

  const createPeer = useCallback((targetSocketId, isInitiator) => {
    cleanupPeer(targetSocketId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current[targetSocketId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket?.emit('webrtc_ice', { targetSocketId, candidate });
    };

    pc.ontrack = ({ streams }) => {
      if (!streams[0]) return;
      let audio = audioElemsRef.current[targetSocketId];
      if (!audio) {
        audio = new window.Audio();
        audio.autoplay = true;
        audioElemsRef.current[targetSocketId] = audio;
      }
      audio.srcObject = streams[0];
      audio.play().catch(() => {});
    };

    if (isInitiator) {
      pc.createOffer()
        .then(offer => { pc.setLocalDescription(offer); socket?.emit('webrtc_offer', { targetSocketId, offer }); })
        .catch(() => {});
    }

    return pc;
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleNewPeer = ({ socketId }) => {
      createPeer(socketId, true);
    };

    const handleOffer = async ({ fromSocketId, offer }) => {
      const pc = createPeer(fromSocketId, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { targetSocketId: fromSocketId, answer });
      } catch {}
    };

    const handleAnswer = async ({ fromSocketId, answer }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc) { try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } catch {} }
    };

    const handleIce = async ({ fromSocketId, candidate }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc && candidate) { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {} }
    };

    const handlePeerLeft = ({ socketId }) => {
      cleanupPeer(socketId);
    };

    socket.on('webrtc_new_peer', handleNewPeer);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice', handleIce);
    socket.on('webrtc_peer_left', handlePeerLeft);

    return () => {
      socket.off('webrtc_new_peer', handleNewPeer);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice', handleIce);
      socket.off('webrtc_peer_left', handlePeerLeft);
    };
  }, [socket, createPeer]);

  const toggleMute = useCallback(() => setIsMuted(m => !m), []);

  return { isMuted, toggleMute, speakingUsers, micError };
}
