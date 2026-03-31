import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Peer from 'simple-peer';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, MoreHorizontal,
    MessageSquare, Users, MonitorOff, ChevronDown, PenTool
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import Whiteboard from '../components/Whiteboard';
import { useSocket } from '../context/SocketContext';
import API_URL from '../config';
import useMediaDevices from '../hooks/useMediaDevices';
import Chat from '../components/Chat';
import Video from '../components/Video';

const Room = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const socket = useSocket();

    // --- State ---
    const [room, setRoom] = useState(null);
    // Peer Object Structure: { peerID, peer, stream, name, isMuted, isCameraOff, isScreenSharing }
    const [peers, setPeers] = useState([]);
    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null); // Add state for screen stream
    const [activeTab, setActiveTab] = useState('chat');

    const [timeLeft, setTimeLeft] = useState(null);

    // Identity & Roles
    const user = JSON.parse(localStorage.getItem('user'));
    const storedGuestName = localStorage.getItem('guestName');
    const [needsName, setNeedsName] = useState(!user && !storedGuestName);
    const [guestNameInput, setGuestNameInput] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [hostId, setHostId] = useState(null);
    const [isWhiteboardGlobalEnabled, setIsWhiteboardGlobalEnabled] = useState(true);

    // Local State
    const [isMicOn, setIsMicOn] = useState(() => {
        const saved = localStorage.getItem('isMicOn');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isVideoOn, setIsVideoOn] = useState(() => {
        const saved = localStorage.getItem('isVideoOn');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [globalWhiteboard, setGlobalWhiteboard] = useState({ isOpen: false, ownerId: null, ownerName: null });

    const peersRef = useRef([]); // Sync ref for socket callbacks
    const screenTrackRef = useRef(null);
    const currentLocalStreamRef = useRef(null);
    const currentScreenStreamRef = useRef(null);
    
    // Active Speaker Lock & Debounce
    const speakerTimeoutRef = useRef(null);
    const speakerLockIdRef = useRef(null);
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);

    const handleSpeakingStateChange = (peerID, isSpeaking) => {
        if (isSpeaking) {
            // Clear pending assignment
            if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
            
            // Only assign if they speak continuously for 1.5s
            speakerTimeoutRef.current = setTimeout(() => {
                // Ignore if someone else is locked
                if (!speakerLockIdRef.current || speakerLockIdRef.current === peerID) {
                    setActiveSpeakerId(peerID);
                    
                    // Lock them for 3 seconds
                    speakerLockIdRef.current = peerID;
                    setTimeout(() => {
                        if (speakerLockIdRef.current === peerID) {
                            speakerLockIdRef.current = null;
                        }
                    }, 3500); // 3.5 second lock
                }
            }, 1500); 
        } else {
            // Cancel assignment if they stop before 1.5s
            if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
            
            // Wait to clear if they were the active speaker (after lock expires)
            if (activeSpeakerId === peerID && speakerLockIdRef.current !== peerID) {
                setActiveSpeakerId(null);
            }
        }
    };

    useEffect(() => { currentLocalStreamRef.current = localStream; }, [localStream]);
    useEffect(() => { currentScreenStreamRef.current = screenStream; }, [screenStream]);

    const webrtcConfig = useMemo(() => {
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun.relay.metered.ca:80' },
                ...(import.meta.env.VITE_TURN_USERNAME ? [{
                    urls: [
                        "turn:global.relay.metered.ca:80",
                        "turn:global.relay.metered.ca:80?transport=tcp",
                        "turn:global.relay.metered.ca:443",
                        "turns:global.relay.metered.ca:443?transport=tcp"
                    ],
                    username: import.meta.env.VITE_TURN_USERNAME,
                    credential: import.meta.env.VITE_TURN_CREDENTIAL
                }] : [])
            ]
        };
    }, [
        import.meta.env.VITE_TURN_USERNAME,
        import.meta.env.VITE_TURN_CREDENTIAL
    ]);

    // --- Init ---
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/rooms/${roomId}`);
                setRoom(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchRoom();
    }, [roomId]);

    // Timer Logic
    useEffect(() => {
        if (!room?.settings?.timerDuration || !room?.settings?.timerStartTime) return;

        const durationMs = room.settings.timerDuration * 60 * 1000;
        const startTime = new Date(room.settings.timerStartTime).getTime();
        const endTime = startTime + durationMs;

        const updateTimer = () => {
            const now = Date.now();
            const diff = endTime - now;

            if (diff <= 0) {
                setTimeLeft("00:00");
                return;
            }

            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        const interval = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call

        return () => clearInterval(interval);
    }, [room]);

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    };

    // Save media preferences
    useEffect(() => {
        localStorage.setItem('isMicOn', JSON.stringify(isMicOn));
    }, [isMicOn]);

    useEffect(() => {
        localStorage.setItem('isVideoOn', JSON.stringify(isVideoOn));
    }, [isVideoOn]);

    // Cleanup peers and media on unmount
    useEffect(() => {
        return () => {
            if (peersRef.current) {
                peersRef.current.forEach(p => {
                    if (p && p.peer) {
                        try { p.peer.destroy(); } catch (e) { console.error(e); }
                    }
                });
                peersRef.current = [];
            }
            if (currentLocalStreamRef.current) {
                currentLocalStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (currentScreenStreamRef.current) {
                currentScreenStreamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // --- Socket Logic ---
    useEffect(() => {
        if (!socket || needsName) return;

        let isMounted = true;

        const getFallbackMedia = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 640; canvas.height = 480;
            canvas.getContext('2d').fillRect(0, 0, 640, 480);
            const vs = canvas.captureStream(1).getVideoTracks()[0];
            vs.enabled = false;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const dst = ctx.createMediaStreamDestination();
            const oscillator = ctx.createOscillator();
            oscillator.connect(dst);
            const as = dst.stream.getAudioTracks()[0];
            as.enabled = false;
            return new MediaStream([as, vs]);
        };

        let mediaPromise;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast("Insecure network detected. Joining Watch-Only mode.", { icon: '👁️', duration: 5000 });
            mediaPromise = Promise.resolve(getFallbackMedia());
        } else {
            mediaPromise = navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .catch(err => {
                    console.warn("Camera/Mic denied", err);
                    toast.error("Camera/Mic disabled. Joining in Watch-Only mode.");
                    return getFallbackMedia();
                });
        }

        mediaPromise.then(stream => {
            if (!isMounted) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            setLocalStream(stream);

            // Apply saved preferences immediately
            stream.getAudioTracks().forEach(track => track.enabled = isMicOn);
            stream.getVideoTracks().forEach(track => track.enabled = isVideoOn);

            socket.emit("join-room", roomId);

            socket.on("room-full", () => {
                toast.error("Room is full! Maximum 6 users allowed for performance.", { id: 'room-full' });
                navigate("/");
            });

            socket.on("room-details", ({ hostId }) => {
                setHostId(hostId);
                const currentUserId = user?.id || user?._id;
                if (currentUserId && currentUserId === hostId) {
                    setIsHost(true);
                }
            });

            socket.on("whiteboard-access-changed", (isEnabled) => {
                setIsWhiteboardGlobalEnabled(isEnabled);
                if (isEnabled) {
                    toast.success("Host enabled whiteboard access", { id: 'wb-changed' });
                } else {
                    toast.error("Host disabled whiteboard access", { id: 'wb-changed' });
                    if (!user || (user.id !== hostId && user._id !== hostId)) {
                        setGlobalWhiteboard({ isOpen: false, ownerId: null, ownerName: null }); // Force close for participants
                    }
                }
            });

            socket.on("kicked-from-room", () => {
                toast.error("You have been removed from the room by the host.", { id: 'kicked', duration: 4000 });
                navigate('/');
            });

            socket.on("force-mute", (type) => {
                const streamToEffect = localStream || currentLocalStreamRef.current;
                if (type === 'audio' && streamToEffect) {
                    const track = streamToEffect.getAudioTracks()[0];
                    if (track && track.enabled) {
                        track.enabled = false;
                        setIsMicOn(false);
                        socket.emit('toggle-media', { roomId, peerID: socket.id, type: 'audio', status: false });
                        toast.error("The Host muted your microphone", { id: 'force-mute' });
                    }
                }
            });

            socket.on("user-connected", userId => {
                if (peersRef.current.some(p => p.peerID === userId)) {
                    return;
                }

                toast.success(`A user joined`, { id: `join-${userId}`, duration: 2000 });

                const peer = createPeer(userId, socket.id, stream);
                const newPeerObj = {
                    peerID: userId,
                    peer,
                    stream: null, // Stream comes later via peer.on('stream')
                    isMuted: false,
                    isCameraOff: false,
                    isScreenSharing: false
                };
                peersRef.current.push(newPeerObj);
                setPeers(users => [...users, { ...newPeerObj, name: 'Joining...' }]);
            });

            socket.on("user-disconnected", userId => {
                toast(`A user left`, { icon: '👋', id: `leave-${userId}`, duration: 2000 });
                removePeer(userId);
            });

            socket.on("call-user", ({ from, signal, name }) => {
                const existingPeer = peersRef.current.find(p => p.peerID === from);
                if (existingPeer) {
                    // If peer exists, just process the new signal (trickle ICE)
                    console.log("Adding signal to existing peer:", from);
                    existingPeer.peer.signal(signal);
                } else {
                    // New peer connection
                    console.log("Creating new peer for:", from);
                    const peer = addPeer(signal, from, stream);
                    const newPeerObj = {
                        peerID: from,
                        peer,
                        stream: null,
                        name,
                        isMuted: false,
                        isCameraOff: false,
                        isScreenSharing: false
                    };
                    peersRef.current.push(newPeerObj);
                    setPeers(users => [...users, newPeerObj]);
                }
            });

            socket.on("call-accepted", ({ signal, from, name }) => {
                const item = peersRef.current.find(p => p.peerID === from);
                if (item && item.peer) {
                    item.peer.signal(signal);
                    // Update name in state
                    setPeers(users => users.map(u => u.peerID === from ? { ...u, name } : u));
                    // Update ref name too for consistency (optional but good)
                    item.name = name;
                }
            });

            socket.on("media-toggled", ({ peerID, type, status }) => {
                // Update Ref
                const peerObj = peersRef.current.find(p => p.peerID === peerID);
                if (peerObj) {
                    if (type === 'audio') peerObj.isMuted = !status;
                    if (type === 'video') peerObj.isCameraOff = !status;
                    if (type === 'screen') peerObj.isScreenSharing = status;
                }

                // Update State
                setPeers(users => users.map(u => {
                    if (u.peerID === peerID) {
                        return {
                            ...u,
                            isMuted: type === 'audio' ? !status : u.isMuted,
                            isCameraOff: type === 'video' ? !status : u.isCameraOff,
                            isScreenSharing: type === 'screen' ? status : u.isScreenSharing
                        };
                    }
                    return u;
                }));
            });

            socket.on("whiteboard-status", (status) => {
                setGlobalWhiteboard(status);
            });

        }).catch(err => {
            console.error("Access denied for camera/microphone", err);
            if (isMounted) {
                alert("Please enable camera and microphone to join the meeting.");
                navigate('/');
            }
        });
        return () => {
            isMounted = false;
            socket.off("room-full");
            socket.off("room-details");
            socket.off("whiteboard-access-changed");
            socket.off("kicked-from-room");
            socket.off("force-mute");
            socket.off("user-connected");
            socket.off("user-disconnected");
            socket.off("call-user");
            socket.off("call-accepted");
            socket.off("media-toggled");
            socket.off("whiteboard-status");
        };
    }, [socket, roomId, navigate, needsName, webrtcConfig, hostId]);

    // --- WebRTC Helpers ---
    function removePeer(id) {
        const peerObj = peersRef.current.find(p => p.peerID === id);
        if (peerObj && peerObj.peer) {
            try { peerObj.peer.destroy(); } catch (e) { console.error(e); }
        }
        peersRef.current = peersRef.current.filter(p => p.peerID !== id);
        setPeers(users => users.filter(p => p.peerID !== id));
    }

    function createPeer(userToCall, callerID, stream) {
        const peer = new Peer({ initiator: true, trickle: false, stream, config: { ...webrtcConfig, iceTransportPolicy: "all" } });
        
        peer._pc.oniceconnectionstatechange = () => {
            console.log("ICE STATE (createPeer):", peer._pc.iceConnectionState);
            if (peer._pc.iceConnectionState === "failed") {
                console.error("ICE FAILED → TURN not working properly for", userToCall);
            }
        };

        peer.on("signal", signal => {
            console.log("SENDING SIGNAL: call-user", { userToCall, from: callerID });
            const currentUserName = user?.username || user?.name || localStorage.getItem('guestName') || 'Guest';
            socket.emit("call-user", { userToCall, signalData: signal, from: callerID, name: currentUserName });
        });
        peer.on("stream", remoteStream => {
            console.log("STREAM RECEIVED (createPeer)");
            // Update stream in state
            setPeers(users => users.map(u => u.peerID === userToCall ? { ...u, stream: remoteStream } : u));
            // Update ref
            const p = peersRef.current.find(u => u.peerID === userToCall);
            if (p) p.stream = remoteStream;
        });
        peer.on("error", err => {
            console.error("PEER ERROR (createPeer):", err);
            if (err.code === 'ERR_ICE_CONNECTION_FAILURE') {
                console.error("ICE Connection failed for", userToCall);
            }
            removePeer(userToCall);
        });
        peer.on("close", () => {
            removePeer(userToCall);
        });
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({ initiator: false, trickle: false, stream, config: { ...webrtcConfig, iceTransportPolicy: "all" } });
        
        peer._pc.oniceconnectionstatechange = () => {
            console.log("ICE STATE (addPeer):", peer._pc.iceConnectionState);
            if (peer._pc.iceConnectionState === "failed") {
                console.error("ICE FAILED → TURN not working properly for", callerID);
            }
        };

        peer.on("signal", signal => {
            console.log("SENDING SIGNAL: answer-call", { to: callerID });
            const currentUserName = user?.username || user?.name || localStorage.getItem('guestName') || 'Guest';
            socket.emit("answer-call", { signal, to: callerID, name: currentUserName });
        });
        peer.signal(incomingSignal);
        peer.on("stream", remoteStream => {
            console.log("STREAM RECEIVED (addPeer)");
            // Update stream in state
            setPeers(users => users.map(u => u.peerID === callerID ? { ...u, stream: remoteStream } : u));
            // Update ref
            const p = peersRef.current.find(u => u.peerID === callerID);
            if (p) p.stream = remoteStream;
        });
        peer.on("error", err => {
            console.error("PEER ERROR (addPeer):", err);
            if (err.code === 'ERR_ICE_CONNECTION_FAILURE') {
                console.error("ICE Connection failed for", callerID);
            }
            removePeer(callerID);
        });
        peer.on("close", () => {
            removePeer(callerID);
        });
        return peer;
    }

    // --- Media Controls ---
    const { audioInputs, videoInputs } = useMediaDevices();
    const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
    const [selectedVideoDevice, setSelectedVideoDevice] = useState('');

    const toggleMute = () => {
        if (localStream) {
            const track = localStream.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsMicOn(track.enabled);
                socket.emit('toggle-media', { roomId, peerID: socket.id, type: 'audio', status: track.enabled });
            }
        }
    };
    const toggleVideo = () => {
        if (localStream) {
            const track = localStream.getVideoTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsVideoOn(track.enabled);
                socket.emit('toggle-media', { roomId, peerID: socket.id, type: 'video', status: track.enabled });
            }
        }
    };

    const switchAudioDevice = async (deviceId) => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } }, video: false });
            const newAudioTrack = newStream.getAudioTracks()[0];

            const oldAudioTrack = localStream.getAudioTracks()[0];
            if (oldAudioTrack) {
                oldAudioTrack.stop();
                localStream.removeTrack(oldAudioTrack);
            }
            localStream.addTrack(newAudioTrack);

            // Replace for peers
            peersRef.current.forEach(({ peer }) => {
                const senders = peer._pc.getSenders(); // Access underlying RTCPeerConnection
                const sender = senders.find(s => s.track && s.track.kind === 'audio');
                if (sender) {
                    sender.replaceTrack(newAudioTrack);
                }
            });

            // Update State
            setIsMicOn(true); // Assuming switching device un-mutes
            setSelectedAudioDevice(deviceId);

            // Sync Mute state logic if needed (optional: keep previous mute state)
        } catch (err) {
            console.error("Failed to switch audio device", err);
        }
    };

    const switchVideoDevice = async (deviceId) => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: false });
            const newVideoTrack = newStream.getVideoTracks()[0];

            const oldVideoTrack = localStream.getVideoTracks()[0];
            if (oldVideoTrack) {
                oldVideoTrack.stop();
                localStream.removeTrack(oldVideoTrack); // Remove OLD track from local stream
            }
            localStream.addTrack(newVideoTrack); // Add NEW track

            // FORCE state update to trigger re-render
            setLocalStream(new MediaStream(localStream.getTracks()));

            // Replace for peers
            peersRef.current.forEach(({ peer }) => {
                const senders = peer._pc.getSenders();
                const sender = senders.find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(newVideoTrack);
                }
            });

            setIsVideoOn(true);
            setSelectedVideoDevice(deviceId);
        } catch (err) {
            console.error("Failed to switch video device", err);
        }
    };

    const revertToCamera = () => {
        const cameraTrack = localStream.getVideoTracks()[0];
        if (screenTrackRef.current) {
            const oldScreenTrack = screenTrackRef.current;
            peersRef.current.forEach(({ peer }) => {
                try {
                    peer.replaceTrack(oldScreenTrack, cameraTrack, localStream);
                } catch (e) {
                    console.error("Error reverting track:", e);
                }
            });
            oldScreenTrack.stop();
        }
        setScreenStream(null);
        setIsScreenSharing(false);
        screenTrackRef.current = null;
        socket.emit('toggle-media', { roomId, peerID: socket.id, type: 'screen', status: false });
    };

    const shareScreen = () => {
        if (!localStream) {
            console.error("No local stream available.");
            return;
        }

        if (isScreenSharing) {
            revertToCamera();
        } else {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                alert("Your browser does not support screen sharing.");
                return;
            }

            navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(screenStream => {
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;

                const cameraTrack = localStream.getVideoTracks()[0];

                peersRef.current.forEach(({ peer }) => {
                    try {
                        peer.replaceTrack(cameraTrack, screenTrack, localStream);
                    } catch (e) {
                        console.error("Error replacing track on peer:", e);
                    }
                });

                socket.emit('toggle-media', { roomId, peerID: socket.id, type: 'screen', status: true });

                screenTrack.onended = () => {
                    console.log("Screen Share Ended via Browser UI");
                    revertToCamera();
                };

                setScreenStream(screenStream);
                setIsScreenSharing(true);
            }).catch(err => {
                if (err.name !== 'NotAllowedError') console.error("Failed to share screen", err);
            });
        }
    };

    // --- Spotlight Logic ---
    const spotlightUser = useMemo(() => {
        // 1. Priority: Screen Share (Peers)
        const sharingPeer = peers.find(p => p.isScreenSharing);
        if (sharingPeer) return { type: 'peer', data: sharingPeer, reason: 'Screen Sharing' };

        // 2. Priority: Screen Share (Self)
        if (isScreenSharing) return { type: 'local', reason: 'You are sharing screen' };

        // Active speaker does NOT reshuffle DOM anymore!
        // 4. Default: No Spotlight
        return null;
    }, [peers, isScreenSharing]);

    // List of "other" users for the filmstrip
    const filmstripUsers = useMemo(() => {
        if (!spotlightUser && !globalWhiteboard.isOpen) return [];
        let users = [];
        if (globalWhiteboard.isOpen) {
            // Exclude presenter from filmstrip
            if (globalWhiteboard.ownerId !== 'local' && globalWhiteboard.ownerId !== socket?.id) {
                users.push({ type: 'local', isMuted: !isMicOn, isCameraOff: !isVideoOn, name: 'You', peerID: 'local' });
            }
            users.push(...peers.filter(p => p.peerID !== globalWhiteboard.ownerId).map(p => ({ type: 'peer', data: p })));
        } else if (spotlightUser && spotlightUser.type === 'peer') {
            users.push({ type: 'local', isMuted: !isMicOn, isCameraOff: !isVideoOn, name: 'You', peerID: 'local' });
            users.push(...peers.filter(p => p.peerID !== spotlightUser.data.peerID).map(p => ({ type: 'peer', data: p })));
        } else {
            users.push(...peers.map(p => ({ type: 'peer', data: p })));
        }
        return users;
    }, [peers, spotlightUser, isMicOn, isVideoOn, globalWhiteboard, socket]);

    // Grid Layout Computation
    const totalUsers = peers.length + 1;
    let gridCols = 'grid-cols-1';
    let gridRows = 'grid-rows-1';
    if (totalUsers === 2) { gridCols = 'grid-cols-2'; }
    else if (totalUsers >= 3 && totalUsers <= 4) { gridCols = 'grid-cols-2'; gridRows = 'grid-rows-2'; }
    else if (totalUsers >= 5) { gridCols = 'grid-cols-3'; gridRows = 'grid-rows-2'; }

    if (needsName) {
        return (
            <div className="h-screen bg-slate-50 dark:bg-[#1a1b2e] flex items-center justify-center font-sans">
                <div className="bg-white dark:bg-[#1c1c1e] p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-white/10">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Join Room</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Please enter your name to join the session.</p>
                    <input
                        type="text"
                        autoFocus
                        placeholder="Your Name"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white mb-6"
                        value={guestNameInput}
                        onChange={(e) => setGuestNameInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && guestNameInput.trim()) {
                                localStorage.setItem('guestName', guestNameInput.trim());
                                setNeedsName(false);
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            if (guestNameInput.trim()) {
                                localStorage.setItem('guestName', guestNameInput.trim());
                                setNeedsName(false);
                            }
                        }}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        Join Session
                    </button>
                </div>
            </div>
        );
    }

    if (!room) return <div className="h-screen bg-slate-50 dark:bg-[#1c1c1e] text-slate-900 dark:text-white flex items-center justify-center font-sans transition-colors">Loading...</div>;

    const activeStyle = "bg-red-500 text-white shadow-lg shadow-red-900/30";
    const inactiveStyle = "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:border-transparent";

    // Determine local display stream
    const localDisplayStream = isScreenSharing ? screenStream : localStream;

    return (
        <div className="h-screen bg-slate-50 dark:bg-[#1c1c1e] text-slate-900 dark:text-white flex flex-col overflow-hidden font-sans transition-colors duration-300">
            {/* Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-white/10 shrink-0 bg-white/50 dark:bg-[#1c1c1e]/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-2 rounded-lg shadow-sm"><VideoIcon size={20} className="text-white" /></div>
                    <div><h1 className="font-semibold text-sm md:text-base">{room?.name || 'Virtual Meet'}</h1><span className="text-xs text-slate-500 dark:text-gray-400">ID: {room?.roomId}</span></div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Timer Display */}
                    {timeLeft && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg font-mono font-bold animate-pulse">
                            <span>⏱️ {timeLeft}</span>
                        </div>
                    )}

                    <button onClick={copyLink} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-lg text-sm border border-slate-200 dark:border-white/5 transition-colors shadow-sm">
                        <span>🔗 Copy Link</span>
                    </button>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || user?.name || 'Guest'}`} alt="Profile" className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-white/20 bg-white" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden bg-slate-100 dark:bg-black w-full relative">
                {/* Center Video Area */}
                <div className="flex-1 flex flex-col p-4 gap-4 h-full relative" style={{ maxWidth: activeTab ? 'calc(100% - 320px)' : '100%' }}>
                    
                    {/* Spotlight Layout */}
                    {spotlightUser || globalWhiteboard.isOpen ? (
                        <div className="flex flex-col h-full gap-4 w-full">
                            {/* Filmstrip Top */}
                            {filmstripUsers.length > 0 && (
                                <div className="flex gap-4 h-32 md:h-40 shrink-0 overflow-x-auto w-full pb-2 z-10">
                                    {filmstripUsers.map((u, i) => (
                                        <div key={u.type === 'local' ? 'me' : u.data.peerID} className="min-w-[160px] md:min-w-[220px] h-full shadow-md rounded-xl overflow-hidden relative border border-slate-200 dark:border-white/10 shrink-0 bg-black">
                                            {u.type === 'local' ? (
                                                <Video stream={localDisplayStream} isMuted={true} isCameraOff={!isVideoOn && !isScreenSharing} name="You" peerID="local" isActiveSpeaker={activeSpeakerId === 'local'} onSpeakingStateChange={handleSpeakingStateChange} className={`w-full h-full object-cover ${isScreenSharing ? '' : 'transform scale-x-[-1]'}`} />
                                            ) : (
                                                <Video stream={u.data.stream} isMuted={u.data.isMuted} isCameraOff={u.data.isCameraOff} name={u.data.name} peerID={u.data.peerID} isActiveSpeaker={activeSpeakerId === u.data.peerID} onSpeakingStateChange={handleSpeakingStateChange} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Main Spotlight Board */}
                            <div className="flex-1 bg-black rounded-xl overflow-hidden relative shadow-lg border border-slate-200 dark:border-white/10 flex items-center justify-center min-h-[50%]">
                                {globalWhiteboard.isOpen ? (
                                    <div className="w-full h-full relative bg-slate-100 overflow-hidden">
                                        <Whiteboard 
                                            roomId={roomId} 
                                            isPresenter={globalWhiteboard.ownerId === socket?.id} 
                                            canDraw={globalWhiteboard.ownerId === socket?.id || isWhiteboardGlobalEnabled} 
                                            presenterId={globalWhiteboard.ownerId}
                                        />
                                        
                                        {/* Presenter Floating Video overlay */}
                                        {globalWhiteboard.ownerId && (
                                            <div className="absolute top-4 right-4 w-[200px] aspect-[4/3] bg-black rounded-xl shadow-2xl border-2 border-indigo-500 z-[70] overflow-hidden group">
                                                <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-2 text-white text-[10px] z-10 font-bold uppercase tracking-wider truncate">
                                                    {globalWhiteboard.ownerName}
                                                    {globalWhiteboard.ownerId === socket?.id && ' (You)'}
                                                </div>
                                                {globalWhiteboard.ownerId === socket?.id ? (
                                                    <Video stream={localDisplayStream} isMuted={true} isCameraOff={!isVideoOn && !isScreenSharing} className="w-full h-full object-cover transform scale-x-[-1]" />
                                                ) : (
                                                    <Video stream={peers.find(p=>p.peerID===globalWhiteboard.ownerId)?.stream} isMuted={peers.find(p=>p.peerID===globalWhiteboard.ownerId)?.isMuted} isCameraOff={peers.find(p=>p.peerID===globalWhiteboard.ownerId)?.isCameraOff} className="w-full h-full object-cover" />
                                                )}
                                                
                                                {/* Exit Presentation Control */}
                                                {globalWhiteboard.ownerId === socket?.id && (
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20 backdrop-blur-sm">
                                                        <button 
                                                            onClick={() => {
                                                                const togglePayload = { roomId, isOpen: false, ownerId: null, ownerName: null };
                                                                setGlobalWhiteboard(togglePayload);
                                                                socket.emit('toggle-whiteboard-status', togglePayload);
                                                            }}
                                                            className="bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-md"
                                                        >
                                                            Stop Presenting
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* You are presenting badge */}
                                        {globalWhiteboard.ownerId === socket?.id && (
                                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 border border-indigo-500 text-white shadow-xl px-4 py-1.5 rounded-full text-sm font-bold animate-pulse z-[60] flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                You are presenting
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {spotlightUser?.type === 'local' ? (
                                            <Video stream={localDisplayStream} isMuted={true} isCameraOff={!isVideoOn && !isScreenSharing} peerID="local" isActiveSpeaker={activeSpeakerId === 'local'} onSpeakingStateChange={handleSpeakingStateChange} className={`w-full h-full object-contain ${isScreenSharing ? '' : 'transform scale-x-[-1]'}`} />
                                        ) : (
                                            <Video key={spotlightUser?.data.isScreenSharing ? 'screen' : 'cam'} stream={spotlightUser?.data.stream} isMuted={spotlightUser?.data.isMuted} isCameraOff={spotlightUser?.data.isCameraOff} peerID={spotlightUser?.data.peerID} isActiveSpeaker={activeSpeakerId === spotlightUser?.data.peerID} onSpeakingStateChange={handleSpeakingStateChange} className="w-full h-full object-contain" />
                                        )}
                                        {/* Spotlight Tag */}
                                        <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold shadow-lg z-30 text-white flex items-center gap-2">
                                            {spotlightUser?.type === 'local' ? (user?.username || user?.name || storedGuestName || 'You') : spotlightUser?.data.name}
                                            <span className="font-normal opacity-80 text-xs bg-black/30 px-2 py-0.5 rounded">[{spotlightUser?.reason}]</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Grid Layout */
                        <div className={`w-full h-full grid ${gridCols} ${gridRows} gap-4 pb-4`}>
                            {/* Local Video */}
                            <div className="bg-black rounded-xl overflow-hidden relative shadow-md border border-slate-200 dark:border-white/5 flex items-center justify-center">
                                <Video stream={localDisplayStream} isMuted={true} isCameraOff={!isVideoOn && !isScreenSharing} name="You" peerID="local" isActiveSpeaker={activeSpeakerId === 'local'} onSpeakingStateChange={handleSpeakingStateChange} className={`w-full h-full object-cover ${totalUsers === 1 ? 'max-w-4xl max-h-4xl' : ''} ${isScreenSharing ? '' : 'transform scale-x-[-1]'}`} />
                            </div>
                            
                            {/* Peer Videos */}
                            {peers.map(p => (
                                <div key={p.peerID} className="bg-black rounded-xl overflow-hidden relative shadow-md border border-slate-200 dark:border-white/5 flex items-center justify-center">
                                    <Video stream={p.stream} isMuted={p.isMuted} isCameraOff={p.isCameraOff} name={p.name} peerID={p.peerID} isActiveSpeaker={activeSpeakerId === p.peerID} onSpeakingStateChange={handleSpeakingStateChange} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Sidebar (Chat / Participants) */}
                {activeTab && (
                    <div className="w-80 h-full bg-slate-50 dark:bg-[#1a1b2e] border-l border-slate-200 dark:border-white/5 flex flex-col absolute right-0 top-0 shadow-2xl z-40 transition-transform">
                        <div className="p-4 flex gap-2 shrink-0 border-b border-slate-200 dark:border-white/5">
                            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:text-gray-400 dark:hover:bg-white/5'}`}>Chat</button>
                            <button onClick={() => setActiveTab('participants')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'participants' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:text-gray-400 dark:hover:bg-white/5'}`}>People</button>
                            <button onClick={() => setActiveTab(null)} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl" title="Close Panel">✕</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'chat' ? (
                                <Chat roomId={roomId} compact={true} />
                            ) : (
                                <div className="p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <Users size={18} /> In Call ({peers.length + 1})
                                        </h3>
                                    </div>
                                    <ul className="space-y-2">
                                        <li className="flex items-center justify-between bg-white dark:bg-white/5 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-transparent">
                                            <div className="flex flex-col"><span className="font-semibold text-sm text-slate-800 dark:text-gray-200">You {isHost && <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full ml-1 font-bold">Host</span>}</span></div>
                                            <div className="flex gap-2 text-slate-400">
                                                {!isMicOn && <MicOff size={16} className="text-red-400" />}
                                                {!isVideoOn && <VideoOff size={16} className="text-red-400" />}
                                            </div>
                                        </li>
                                        {peers.map((p) => (
                                            <li key={p.peerID} className="flex items-center justify-between bg-white dark:bg-white/5 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-transparent group">
                                                <div className="flex flex-col"><span className="font-semibold text-sm text-slate-800 dark:text-gray-200 truncate max-w-[120px]">{p.name || 'Guest'}</span></div>
                                                <div className="flex items-center gap-2">
                                                    {p.isMuted && <MicOff size={16} className="text-red-400" />}
                                                    {p.isCameraOff && <VideoOff size={16} className="text-red-400" />}
                                                    {isHost && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1 opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-white"><MoreHorizontal size={16} /></button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="bg-white dark:bg-[#1c1c1e] text-slate-900 border-slate-200 dark:text-white min-w-[150px]">
                                                                <DropdownMenuItem className="focus:bg-red-500/20 text-red-500 cursor-pointer" onClick={() => { socket.emit('mute-participant', { roomId, participantId: p.peerID, type: 'audio' }); toast.success(`Muted ${p.name || 'participant'}`); }}>Mute Mic</DropdownMenuItem>
                                                                <DropdownMenuItem className="focus:bg-red-500/20 text-red-500 cursor-pointer" onClick={() => { socket.emit('remove-participant', { roomId, participantId: p.peerID }); toast.success(`Removed ${p.name || 'participant'}`); }}>Remove Participant</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="h-20 px-4 md:px-10 flex items-center justify-between shrink-0 mb-2 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent -mx-4 pb-0 pt-2">
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400 font-mono hidden md:flex">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5 shadow-sm"><span>{roomId}</span><MonitorUp size={14} className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition" /></div>
                </div>
                <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex items-center gap-1 bg-white dark:bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-transparent shadow-sm">
                        <button onClick={toggleMute} className={`p-3 rounded-lg transition-all ${!isMicOn ? 'bg-red-500 text-white' : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                            {!isMicOn ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 px-2 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors"><ChevronDown size={14} /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white min-w-[200px] shadow-xl">
                                <DropdownMenuLabel>Microphone</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10" />
                                {audioInputs.map(device => (
                                    <DropdownMenuItem
                                        key={device.deviceId}
                                        className="focus:bg-white/10 cursor-pointer"
                                        onClick={() => switchAudioDevice(device.deviceId)}
                                    >
                                        <span className={`truncate text-sm ${selectedAudioDevice === device.deviceId ? 'text-indigo-400 font-bold' : ''}`}>{device.label || `Microphone ${device.deviceId.slice(0, 4)}...`}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-white/5 rounded-xl p-1 border border-slate-200 dark:border-transparent shadow-sm">
                        <button onClick={toggleVideo} className={`p-3 rounded-lg transition-all ${!isVideoOn ? 'bg-red-500 text-white' : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                            {isVideoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 px-2 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors"><ChevronDown size={14} /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white dark:bg-[#1c1c1e] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white min-w-[200px] shadow-xl">
                                <DropdownMenuLabel>Camera</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10" />
                                {videoInputs.map(device => (
                                    <DropdownMenuItem
                                        key={device.deviceId}
                                        className="focus:bg-white/10 cursor-pointer"
                                        onClick={() => switchVideoDevice(device.deviceId)}
                                    >
                                        <span className={`truncate text-sm ${selectedVideoDevice === device.deviceId ? 'text-indigo-400 font-bold' : ''}`}>{device.label || `Camera ${device.deviceId.slice(0, 4)}...`}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {isHost && (
                        <div className="hidden md:block">
                            <button 
                                onClick={() => {
                                    const nextState = !isWhiteboardGlobalEnabled;
                                    setIsWhiteboardGlobalEnabled(nextState);
                                    socket.emit('toggle-whiteboard-access', { roomId, isEnabled: nextState });
                                    toast.success(nextState ? 'Whiteboard Enabled for All' : 'Whiteboard Disabled for All', { id: 'host-toggle' });
                                }} 
                                className={`p-4 rounded-xl transition-all shadow-sm ${!isWhiteboardGlobalEnabled ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20'}`}
                                title={isWhiteboardGlobalEnabled ? "Disable Whiteboard for All" : "Enable Whiteboard for All"}
                            >
                                <PenTool size={20} className={!isWhiteboardGlobalEnabled ? "strike-through" : ""} />
                            </button>
                        </div>
                    )}
                    <button onClick={shareScreen} className={`p-4 rounded-xl transition-all shadow-sm ${isScreenSharing ? activeStyle : inactiveStyle}`}>{isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}</button>
                    {(isHost || isWhiteboardGlobalEnabled) ? (
                        <button 
                            onClick={() => {
                                const nextState = !globalWhiteboard.isOpen;
                                const togglePayload = { 
                                    roomId, 
                                    isOpen: nextState, 
                                    ownerId: nextState ? socket.id : null,
                                    ownerName: nextState ? (user?.username || user?.name || storedGuestName || 'Guest') : null
                                };
                                setGlobalWhiteboard(togglePayload);
                                socket.emit('toggle-whiteboard-status', togglePayload);
                            }} 
                            className={`p-4 rounded-xl transition-all shadow-sm ${globalWhiteboard.isOpen ? activeStyle : inactiveStyle}`}
                            title={globalWhiteboard.isOpen ? "Stop Presenting Whiteboard" : "Present Whiteboard to All"}
                        >
                            <PenTool size={20} />
                        </button>
                    ) : (
                        <button disabled className="p-4 rounded-xl transition-all bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed hidden md:block" title="Host disabled whiteboard"><PenTool size={20} /></button>
                    )}
                    <button onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')} className={`p-4 rounded-xl transition-all shadow-sm ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-indigo-600/30' : inactiveStyle}`}><MessageSquare size={20} /></button>
                    <button onClick={() => setActiveTab(activeTab === 'participants' ? null : 'participants')} className={`p-4 rounded-xl transition-all shadow-sm ${activeTab === 'participants' ? 'bg-indigo-600 text-white shadow-indigo-600/30' : inactiveStyle}`}><Users size={20} /></button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-md shadow-red-500/20 flex items-center gap-2">Leave Meet</button>
                </div>
            </div>
        </div>
    );
};

export default Room;
