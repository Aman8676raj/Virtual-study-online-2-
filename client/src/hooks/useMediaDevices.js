import { useState, useEffect } from 'react';

const useMediaDevices = () => {
    const [devices, setDevices] = useState({
        audioInputs: [],
        videoInputs: []
    });

    useEffect(() => {
        const getDevices = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn("Media devices not supported or blocked. Please ensure you are running on localhost or HTTPS.");
                return;
            }
            try {
                // Request permission first to ensure labels are available
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
                const videoInputs = allDevices.filter(device => device.kind === 'videoinput');

                setDevices({ audioInputs, videoInputs });
            } catch (error) {
                console.error("Error enumerating devices:", error);
            }
        };

        getDevices();
        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', getDevices);
        }
        return () => {
            if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
                navigator.mediaDevices.removeEventListener('devicechange', getDevices);
            }
        };
    }, []);

    return devices;
};

export default useMediaDevices;
