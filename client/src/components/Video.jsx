import React, { useEffect, useRef } from 'react';
import { MicOff, User } from 'lucide-react';

const Video = ({ stream, className, isMuted, isCameraOff, name }) => {
    const ref = useRef();

    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`relative ${className} bg-gray-900 overflow-hidden`}>
            <video
                playsInline
                autoPlay
                ref={ref}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraOff ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Camera Off Placeholder */}
            {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                        <User size={40} className="text-gray-400" />
                    </div>
                </div>
            )}

            {/* Muted Indicator */}
            {isMuted && (
                <div className="absolute bottom-3 right-3 bg-red-500/90 p-1.5 rounded-full shadow-lg backdrop-blur-sm z-10">
                    <MicOff size={14} className="text-white" />
                </div>
            )}
        </div>
    );
};

export default Video;
