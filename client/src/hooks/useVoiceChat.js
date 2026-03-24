import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export default function useVoiceChat({ socket, isSeated }) {
  const [isMuted, setIsMuted] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState([]);
  const [micError, setMicError] = useState(null);

  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioElemsRef = useRef({});

  const cleanupPeer = useCallback((socketId) => {
    if (peersRef.current[socketId]) {
      try { peersRef.current[socketId].close(); } catch {}
      delete peersRef.current[socketId];
    }
    if (audioElemsRef.current[socketId]) {
      try {
        audioElemsRef.current[socketId].pause();
        audioElemsRef.current[socketId].srcObject = null;
        document.body.removeChild(audioElemsRef.current[socketId]);
      } catch {}
      delete audioElemsRef.current[socketId];
    }
  }, []);

  const cleanupAll = useCallback(() => {
    Object.keys(peersRef.current).forEach(id => cleanupPeer(id));
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setSpeakingUsers([]);
  }, [cleanupPeer]);

  // Acquire mic when seated
  useEffect(() => {
    if (!isSeated) {
      cleanupAll();
      return;
    }
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        // If peer connections already exist (late mic init), add tracks now
        Object.entries(peersRef.current).forEach(([, pc]) => {
          stream.getTracks().forEach(track => {
            try { pc.addTrack(track, stream); } catch {}
          });
        });
        setMicError(null);
      })
      .catch(() => {
        if (!cancelled) setMicError('Mikrofon erişimi reddedildi');
      });
    return () => { cancelled = true; };
  }, [isSeated, cleanupAll]);

  // Mute toggle
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
    }
  }, [isMuted]);

  const playRemoteAudio = (socketId, stream) => {
    let audio = audioElemsRef.current[socketId];
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.setAttribute('playsinline', '');
      document.body.appendChild(audio);
      audioElemsRef.current[socketId] = audio;
    }
    audio.srcObject = stream;
    const playPromise = audio.play();
    if (playPromise) playPromise.catch(() => {
      // Retry on user interaction
      const retry = () => { audio.play().catch(() => {}); document.removeEventListener('click', retry); };
      document.addEventListener('click', retry);
    });
  };

  const createPeer = useCallback((targetSocketId, isInitiator) => {
    cleanupPeer(targetSocketId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });
    peersRef.current[targetSocketId] = pc;

    // Add local tracks if stream ready
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('webrtc_ice', { targetSocketId, candidate });
      }
    };

    pc.ontrack = ({ streams }) => {
      const stream = streams && streams[0];
      if (stream) playRemoteAudio(targetSocketId, stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        // Attempt ICE restart
        if (isInitiator && socket) {
          pc.restartIce();
          pc.createOffer({ iceRestart: true, offerToReceiveAudio: true })
            .then(offer => { pc.setLocalDescription(offer); socket.emit('webrtc_offer', { targetSocketId, offer }); })
            .catch(() => {});
        }
      }
    };

    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true })
        .then(offer => {
          pc.setLocalDescription(offer);
          if (socket) socket.emit('webrtc_offer', { targetSocketId, offer });
        })
        .catch(() => {});
    }

    return pc;
  }, [socket, cleanupPeer]);

  // Socket event handlers
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
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    };

    const handlePeerLeft = ({ socketId }) => cleanupPeer(socketId);

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
  }, [socket, createPeer, cleanupPeer]);

  // Cleanup all audio elements on unmount
  useEffect(() => {
    return () => {
      Object.values(audioElemsRef.current).forEach(a => {
        try { a.pause(); a.srcObject = null; document.body.removeChild(a); } catch {}
      });
    };
  }, []);

  const toggleMute = useCallback(() => setIsMuted(m => !m), []);

  return { isMuted, toggleMute, speakingUsers, micError };
}
