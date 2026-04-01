import React, { useEffect, useRef } from 'react';
import { MicOff, User } from 'lucide-react';
import useAudioActivity from '../hooks/useAudioActivity';

const Video = ({ stream, className = '', isMuted, isCameraOff, name, onSpeakingStateChange, peerID, isActiveSpeaker, isLocal }) => {
    const ref = useRef();
    const isSpeaking = useAudioActivity(stream);

    useEffect(() => {
        if (ref.current) {
            if (stream) {
                ref.current.srcObject = stream;
                ref.current.onloadedmetadata = () => {
                    ref.current.play().catch(e => console.warn("Autoplay blocked:", e));
                };
            }
            ref.current.muted = Boolean(isLocal || peerID === 'local');
        }
    }, [stream, isLocal, peerID]);

    useEffect(() => {
        if (onSpeakingStateChange) {
            onSpeakingStateChange(peerID, isSpeaking);
        }
    }, [isSpeaking, onSpeakingStateChange, peerID]);

    return (
        <div className={`relative ${className} bg-slate-100 dark:bg-gray-900 overflow-hidden rounded-xl border-[3px] transition-all duration-300 ${isActiveSpeaker && !isMuted ? 'border-[#6366f1] shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'border-transparent'}`}>
            <video
                playsInline
                autoPlay
                ref={ref}
                muted={isLocal || peerID === 'local'}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Camera Off Placeholder */}
            {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-gray-800 transition-colors">
                    <div className="w-20 h-20 rounded-full bg-slate-300 dark:bg-gray-700 flex items-center justify-center shadow-inner">
                        <User size={40} className="text-slate-500 dark:text-gray-400" />
                    </div>
                </div>
            )}

            {/* Name Banner */}
            <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-lg backdrop-blur-sm z-10 flex items-center gap-2 max-w-[80%]">
                {isSpeaking && !isMuted && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>}
                <span className="text-white text-xs md:text-sm font-medium truncate">{name || 'Guest'}</span>
            </div>

            {/* Muted Indicator */}
            {isMuted && (
                <div className="absolute top-3 right-3 bg-red-500/90 p-1.5 rounded-full shadow-lg backdrop-blur-sm z-10">
                    <MicOff size={14} className="text-white" />
                </div>
            )}
        </div>
    );
};

export default Video;
