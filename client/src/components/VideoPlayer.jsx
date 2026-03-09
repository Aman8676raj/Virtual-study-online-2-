import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { useSocket } from '../context/SocketContext';

const VideoPlayer = ({ roomId }) => {
    const socket = useSocket();
    const [stream, setStream] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [callerSignal, setCallerSignal] = useState(null);
    const [caller, setCaller] = useState('');
    const [idToCall, setIdToCall] = useState('');

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
            });

        if (!socket) return;

        socket.on('call-user', ({ from, name: callerName, signal }) => {
            setCallAccepted(false);
            setCaller(from);
            setCallerSignal(signal);
        });

        // Listen for new users to call them (Mesh topology simplified: just calling the new user)
        // In a real app with >2 users, this needs more complex logic (Mesh or SFU)
        socket.on('user-connected', (userId) => {
            setIdToCall(userId);
        });

    }, [socket]);

    const callUser = (id) => {
        const peer = new Peer({ initiator: true, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('call-user', {
                userToCall: id,
                signalData: data,
                from: socket.id,
                name: 'User' // TODO: Get name
            });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        socket.on('call-accepted', (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new Peer({ initiator: false, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('answer-call', { signal: data, to: caller });
        });

        peer.on('stream', (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    const shareScreen = () => {
        navigator.mediaDevices.getDisplayMedia({ cursor: true })
            .then((screenStream) => {
                const screenTrack = screenStream.getVideoTracks()[0];

                if (connectionRef.current) {
                    const sender = connectionRef.current.replaceTrack(
                        stream.getVideoTracks()[0],
                        screenTrack,
                        stream
                    );
                }

                if (myVideo.current) {
                    myVideo.current.srcObject = screenStream;
                }

                screenTrack.onended = () => {
                    if (connectionRef.current) {
                        connectionRef.current.replaceTrack(
                            screenTrack,
                            stream.getVideoTracks()[0],
                            stream
                        );
                    }
                    if (myVideo.current) {
                        myVideo.current.srcObject = stream;
                    }
                };
            });
    };

    const toggleMute = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                // Force re-render to update UI icon if needed (though local state is better)
            }
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
            }
        }
    };

    return (
        <div className="flex flex-col items-center w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {stream && (
                    <div className="relative group">
                        <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800">
                            <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                            You
                        </div>
                        <div className="absolute bottom-3 right-3 flex gap-2">
                            <button onClick={toggleMute} className="bg-white/90 hover:bg-white text-blue-500 p-2 rounded-full backdrop-blur-sm transition shadow-sm hover:shadow-md">
                                🎤
                            </button>
                            <button onClick={toggleVideo} className="bg-white/90 hover:bg-white text-blue-500 p-2 rounded-full backdrop-blur-sm transition shadow-sm hover:shadow-md">
                                📷
                            </button>
                        </div>
                    </div>
                )}
                {callAccepted && !callEnded && (
                    <div className="relative group">
                        <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800">
                            <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                            Peer
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 flex flex-wrap gap-4 justify-center items-center">
                {callerSignal && !callAccepted && (
                    <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-lg border border-blue-100 animate-pulse">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">Incoming Call</span>
                        <button onClick={answerCall} className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition shadow-sm">
                            Answer
                        </button>
                    </div>
                )}
                {idToCall && !callAccepted && (
                    <button
                        onClick={() => callUser(idToCall)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium transition shadow-md flex items-center gap-2"
                    >
                        <span>📞</span> Call User
                    </button>
                )}
                <button
                    onClick={shareScreen}
                    className="bg-white border border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-500 px-6 py-2.5 rounded-full font-medium transition shadow-sm flex items-center gap-2"
                >
                    <span>🖥️</span> Share Screen
                </button>
            </div>
        </div>
    );
};

export default VideoPlayer;
