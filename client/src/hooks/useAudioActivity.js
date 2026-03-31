import { useState, useEffect, useRef } from 'react';

export default function useAudioActivity(stream, threshold = 40) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!stream || stream.getAudioTracks().length === 0) {
            setIsSpeaking(false);
            return;
        }

        let audioContext;
        let analyser;
        let microphone;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            // Important: Handle streams with disabled tracks!
            microphone = audioContext.createMediaStreamSource(stream);
            
            analyser.smoothingTimeConstant = 0.8;
            analyser.fftSize = 256;
            
            microphone.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            let speakingFramesCount = 0;
            let silentFramesCount = 0;

            const checkAudio = () => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                
                // Require sustained audio (e.g. 5 consecutive frames above threshold) to avoid clicking noises
                if (average > threshold) {
                    speakingFramesCount++;
                    silentFramesCount = 0;
                    if (speakingFramesCount > 5) {
                        setIsSpeaking(true);
                    }
                } else {
                    silentFramesCount++;
                    speakingFramesCount = 0;
                    // Fast falloff (e.g. 10 frames) so it turns off quickly after speaking stops
                    if (silentFramesCount > 10) {
                        setIsSpeaking(false);
                    }
                }
                
                rafRef.current = requestAnimationFrame(checkAudio);
            };
            
            checkAudio();
        } catch (err) {
            console.error("Audio detection error", err);
        }

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (microphone) microphone.disconnect();
            if (analyser) analyser.disconnect();
            if (audioContext && audioContext.state !== 'closed') audioContext.close();
        };
    }, [stream, threshold]);

    return isSpeaking;
}
