import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Peer from 'simple-peer';
import {
    Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, MoreHorizontal,
    MessageSquare, Users, MonitorOff, ChevronDown, PenTool
} from 'lucide-react';
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
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

    const peersRef = useRef([]); // Sync ref for socket callbacks
    const screenTrackRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user'));

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

    // Cleanup peers on unmount
    useEffect(() => {
        return () => {
            peersRef.current.forEach(p => p.peer.destroy());
            peersRef.current = [];
        };
    }, []);

    // --- Socket Logic ---
    useEffect(() => {
        if (!socket) return;

        // Use saved state for initial constraints
        // Note: We always request both to start, then toggle tracks immediately if needed
        // This ensures permissions are granted once
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setLocalStream(stream);

            // Apply saved preferences immediately
            stream.getAudioTracks().forEach(track => track.enabled = isMicOn);
            stream.getVideoTracks().forEach(track => track.enabled = isVideoOn);

            socket.emit("join-room", roomId);

            socket.on("user-connected", userId => {
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
                const peerObj = peersRef.current.find(p => p.peerID === userId);
                if (peerObj) { peerObj.peer.destroy(); }
                const newPeers = peersRef.current.filter(p => p.peerID !== userId);
                peersRef.current = newPeers;
                setPeers(newPeers);
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

            socket.on("call-accepted", ({ signal, id, name }) => {
                const item = peersRef.current.find(p => p.peerID === id);
                if (item) {
                    item.peer.signal(signal);
                    // Update name in state
                    setPeers(users => users.map(u => u.peerID === id ? { ...u, name } : u));
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
        });
        return () => {
            socket.off("user-connected");
            socket.off("user-disconnected");
            socket.off("call-user");
            socket.off("call-accepted");
            socket.off("media-toggled");
        };
    }, [socket, roomId]);

    // --- WebRTC Helpers ---
    function createPeer(userToCall, callerID, stream) {
        const peer = new Peer({ initiator: true, trickle: false, stream });
        peer.on("signal", signal => {
            console.log("SENDING SIGNAL: call-user", { userToCall, from: callerID });
            socket.emit("call-user", { userToCall, signalData: signal, from: callerID, name: user?.username || 'Guest' });
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
        });
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({ initiator: false, trickle: false, stream });
        peer.on("signal", signal => {
            console.log("SENDING SIGNAL: answer-call", { to: callerID });
            socket.emit("answer-call", { signal, to: callerID, name: user?.username || 'Guest' });
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

    const shareScreen = () => {
        // Guard clause: Cannot share screen if local stream isn't ready
        if (!localStream) {
            console.error("No local stream available to replace.");
            return;
        }

        if (isScreenSharing) {
            // Stop Sharing Logic
            if (screenTrackRef.current) {
                screenTrackRef.current.stop();
                const cameraTrack = localStream.getVideoTracks()[0];
                console.log("Stopping Screen Share: Replacing track", screenTrackRef.current, "with", cameraTrack);

                peersRef.current.forEach(({ peer }) => {
                    try {
                        peer.replaceTrack(screenTrackRef.current, cameraTrack, localStream);
                    } catch (e) {
                        console.error("Error replacing track:", e);
                    }
                });

                setScreenStream(null);
                setIsScreenSharing(false);
                screenTrackRef.current = null;
                socket.emit('toggle-media', { roomId, peerID: socket.id, type: 'screen', status: false });
            }
        } else {
            // Start Sharing Logic
            // Check if system supports display media
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                alert("Your browser does not support screen sharing.");
                return;
            }

            navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(screenStream => {
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;

                const cameraTrack = localStream.getVideoTracks()[0];
                console.log("Starting Screen Share: Replacing track", cameraTrack, "with", screenTrack);

                peersRef.current.forEach(({ peer }) => {
                    try {
                        // IMPORTANT: simple-peer replaceTrack(old, new, stream)
                        peer.replaceTrack(cameraTrack, screenTrack, localStream);
                    } catch (e) {
                        console.error("Error replacing track on peer:", e);
                    }
                });

                socket.emit('toggle-media', { roomId, peerID: socket.id, type: 'screen', status: true });

                screenTrack.onended = () => {
                    console.log("Screen Share Ended via Browser UI");
                    const cameraTrack = localStream.getVideoTracks()[0];
                    peersRef.current.forEach(({ peer }) => {
                        try {
                            peer.replaceTrack(screenTrack, cameraTrack, localStream);
                        } catch (e) { console.error("Error reverting track:", e); }
                    });
                    setScreenStream(null);
                    setIsScreenSharing(false);
                    socket.emit('toggle-media', { roomId, peerID: socket.id, type: 'screen', status: false });
                };

                setScreenStream(screenStream); // Update state to show screen share locally
                setIsScreenSharing(true);
            }).catch(err => {
                if (err.name === 'NotAllowedError') {
                    console.log("Screen sharing cancelled by user.");
                    // Do nothing, just ignore
                } else {
                    console.error("Failed to share screen", err);
                }
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

        // 3. Fallback: Last Joined Peer (simulated active speaker for now)
        if (peers.length > 0) {
            return { type: 'peer', data: peers[peers.length - 1], reason: 'Active Speaker' };
        }

        // 4. Default: Self
        return { type: 'local', reason: 'You (Active Speaker)' };
    }, [peers, isScreenSharing]);

    // List of "other" users for the filmstrip
    const filmstripUsers = useMemo(() => {
        let users = [];
        // If spotlight is a peer, show ME in filmstrip + other peers
        if (spotlightUser.type === 'peer') {
            users.push({ type: 'local', isMuted: !isMicOn, isCameraOff: !isVideoOn, name: 'You' });
            users.push(...peers.filter(p => p.peerID !== spotlightUser.data.peerID).map(p => ({ type: 'peer', data: p })));
        } else {
            // Local is spotlight, show all peers in filmstrip
            users.push(...peers.map(p => ({ type: 'peer', data: p })));
        }
        return users;
    }, [peers, spotlightUser, isMicOn, isVideoOn]);

    if (!room) return <div className="h-screen bg-[#1c1c1e] text-white flex items-center justify-center">Loading...</div>;

    const activeStyle = "bg-[#ff4f4f] text-white shadow-lg shadow-red-900/30";
    const inactiveStyle = "bg-white/10 text-white hover:bg-white/20";

    // Determine local display stream
    const localDisplayStream = isScreenSharing ? screenStream : localStream;

    return (
        <div className="h-screen bg-[#1c1c1e] text-white flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-2 rounded-lg"><VideoIcon size={20} className="text-white" /></div>
                    <div><h1 className="font-semibold text-sm md:text-base">{room.name}</h1><span className="text-xs text-gray-400">ID: {room.roomId}</span></div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Timer Display */}
                    {timeLeft && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg font-mono font-bold animate-pulse">
                            <span>⏱️ {timeLeft}</span>
                        </div>
                    )}

                    <button onClick={copyLink} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm border border-white/5 transition-colors">
                        <span>🔗 Copy Link</span>
                    </button>
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'Guest'}`} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white/20" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden p-4">
                <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-white/5">
                    {/* Left Panel: Spotlight + Filmstrip */}
                    <ResizablePanel defaultSize={75} minSize={50} className="flex flex-col gap-4 p-2">

                        {/* Filmstrip (Top) - Only existing users, no placeholders */}
                        {filmstripUsers.length > 0 && (
                            <div className="flex gap-4 h-32 shrink-0 overflow-x-auto pb-2 w-full">
                                {filmstripUsers.map((u, i) => (
                                    <div key={u.type === 'local' ? 'me' : u.data.peerID} className="min-w-[200px] w-1/4 bg-gray-800 rounded-xl overflow-hidden relative border border-white/5 shrink-0">
                                        {u.type === 'local' ? (
                                            <>
                                                <Video
                                                    stream={localDisplayStream}
                                                    isMuted={true} // Always mute local video to prevent echo
                                                    isCameraOff={!isVideoOn && !isScreenSharing}
                                                    className={`w-full h-full object-cover ${isScreenSharing ? '' : 'transform scale-x-[-1]'}`}
                                                />
                                                <div className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 bg-indigo-600 rounded">YOU</div>
                                            </>
                                        ) : (
                                            <>
                                                <Video stream={u.data.stream} className="w-full h-full object-cover" isMuted={u.data.isMuted} isCameraOff={u.data.isCameraOff} />
                                                <div className="absolute bottom-2 left-2 text-[10px] font-medium px-2 py-0.5 bg-black/50 rounded backdrop-blur-sm truncate max-w-[80%]">{u.data.name}</div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Main Spotlight Area */}
                        <div className="flex-1 bg-gray-900 rounded-3xl overflow-hidden relative border border-white/5 shadow-2xl w-full flex items-center justify-center">
                            {isWhiteboardOpen ? (
                                <div className="w-full h-full bg-white relative">
                                    <Whiteboard roomId={roomId} />
                                    <button
                                        onClick={() => setIsWhiteboardOpen(false)}
                                        className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg z-50 hover:bg-red-600 transition"
                                    >
                                        <ChevronDown className="transform rotate-180" size={20} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {spotlightUser.type === 'local' ? (
                                        <div className="w-full h-full relative group">
                                            <Video
                                                stream={localDisplayStream}
                                                isMuted={true}
                                                isCameraOff={!isVideoOn && !isScreenSharing}
                                                className={`w-full h-full object-contain ${isScreenSharing ? '' : 'transform scale-x-[-1]'}`}
                                            />
                                            {(!isVideoOn || isScreenSharing) && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                    {isScreenSharing ? null : <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold">{user?.username?.[0]?.toUpperCase()}</div>}
                                                </div>
                                            )}
                                            {isScreenSharing && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                    <p className="text-indigo-400 font-mono bg-black/50 px-4 py-2 rounded">You are sharing your screen</p>
                                                </div>
                                            )}
                                            {/* Local Status Indicators */}
                                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-2 rounded-full flex items-center gap-4 z-20">
                                                <div className="flex items-center gap-2 text-sm text-gray-200">{isMicOn ? <Mic size={14} className="text-green-400" /> : <MicOff size={14} className="text-red-400" />} Mic</div>
                                                <div className="flex items-center gap-2 text-sm text-gray-200">{isVideoOn ? <VideoIcon size={14} className="text-green-400" /> : <VideoOff size={14} className="text-red-400" />} Cam</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full relative">
                                            <Video
                                                key={spotlightUser.data.isScreenSharing ? 'screen' : 'cam'}
                                                stream={spotlightUser.data.stream}
                                                className="w-full h-full object-contain"
                                                isMuted={spotlightUser.data.isMuted}
                                                isCameraOff={spotlightUser.data.isCameraOff}
                                            />
                                        </div>
                                    )}

                                    <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold shadow-lg z-30">
                                        {spotlightUser.type === 'local' ? user?.username || 'You' : spotlightUser.data.name}
                                        <span className="font-normal opacity-80 text-xs ml-2">({spotlightUser.reason})</span>
                                    </div>
                                </>
                            )}
                        </div>

                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-white/10 hover:bg-white/20 transition-colors w-1.5" />

                    {/* Right Panel: Sidebar */}
                    <ResizablePanel defaultSize={25} minSize={20} maxSize={50} className="bg-[#1c1c1e] flex flex-col">
                        <div className="p-4 flex gap-2 shrink-0">
                            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Group</button>
                            <button onClick={() => setActiveTab('participants')} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === 'participants' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Personal</button>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <div className="absolute inset-0 pb-20">
                                {activeTab === 'chat' ? (<Chat roomId={roomId} compact={true} theme="dark" />) : (
                                    <div className="p-6 text-center text-gray-500 mt-10">
                                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                                        <h3 className="text-lg font-medium text-white mb-2">Participants ({peers.length + 1})</h3>
                                        <ul className="text-left space-y-2">
                                            <li className="flex items-center justify-between p-2 bg-white/5 rounded-lg"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span>You</span></div><div className="flex gap-2">{!isMicOn && <MicOff size={14} className="text-red-400" />}{!isVideoOn && <VideoOff size={14} className="text-red-400" />}</div></li>
                                            {peers.map((p, i) => (<li key={p.peerID} className="flex items-center justify-between p-2 bg-white/5 rounded-lg"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span className="truncate max-w-[120px]">{p.name || `Participant ${i + 1}`}</span></div><div className="flex gap-2">{p.isMuted && <MicOff size={14} className="text-red-400" />}{p.isCameraOff && <VideoOff size={14} className="text-red-400" />}</div></li>))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Bottom Controls */}
            <div className="h-20 px-4 md:px-10 flex items-center justify-between shrink-0 mb-2">
                <div className="flex items-center gap-4 text-sm text-gray-400 font-mono hidden md:flex">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5"><span>{roomId}</span><MonitorUp size={14} className="cursor-pointer hover:text-white" /></div>
                </div>
                <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
                        <button onClick={toggleMute} className={`p-3 rounded-lg transition-all ${!isMicOn ? 'bg-[#ff4f4f] text-white' : 'text-white hover:bg-white/10'}`}>
                            {!isMicOn ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 px-2 text-gray-400 hover:text-white rounded transition-colors"><ChevronDown size={14} /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#1c1c1e] border-white/10 text-white min-w-[200px]">
                                <DropdownMenuLabel>Microphone</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
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

                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
                        <button onClick={toggleVideo} className={`p-3 rounded-lg transition-all ${!isVideoOn ? 'bg-[#ff4f4f] text-white' : 'text-white hover:bg-white/10'}`}>
                            {isVideoOn ? <VideoIcon size={20} /> : <VideoOff size={20} />}
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 px-2 text-gray-400 hover:text-white rounded transition-colors"><ChevronDown size={14} /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#1c1c1e] border-white/10 text-white min-w-[200px]">
                                <DropdownMenuLabel>Camera</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
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

                    <button onClick={shareScreen} className={`p-4 rounded-xl transition-all ${isScreenSharing ? activeStyle : inactiveStyle}`}>{isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}</button>
                    <button onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)} className={`p-4 rounded-xl transition-all ${isWhiteboardOpen ? activeStyle : inactiveStyle}`}><PenTool size={20} /></button>
                    <button className="p-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/30"><MessageSquare size={20} /></button>
                    <button className="p-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"><MoreHorizontal size={20} /></button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="px-6 py-3 bg-[#ff4f4f] hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 flex items-center gap-2">Leave Meet</button>
                </div>
            </div>
        </div>
    );
};

export default Room;
