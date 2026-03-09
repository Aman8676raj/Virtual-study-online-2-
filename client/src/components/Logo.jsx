import React from 'react';

const Logo = ({ className = "w-8 h-8" }) => {
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" /> {/* Indigo 500 */}
                    <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet 500 */}
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Connected People Design */}
            <g filter="url(#glow)">
                {/* Connecting Lines - Anchored behind the figures */}
                <path
                    d="M50 35 L25 70 L75 70 Z"
                    stroke="url(#logoGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity="0.5"
                />

                {/* Person 1 (Top) */}
                <g>
                    {/* Head */}
                    <circle cx="50" cy="25" r="8" fill="url(#logoGradient)" />
                    {/* Body - Moved up to close gap */}
                    <path d="M36 36 Q50 32 64 36 V44 H36 Z" fill="url(#logoGradient)" />
                </g>

                {/* Person 2 (Bottom Left) */}
                <g>
                    {/* Head */}
                    <circle cx="25" cy="60" r="8" fill="url(#logoGradient)" />
                    {/* Body - Moved up to close gap */}
                    <path d="M11 71 Q25 67 39 71 V79 H11 Z" fill="url(#logoGradient)" />
                </g>

                {/* Person 3 (Bottom Right) */}
                <g>
                    {/* Head */}
                    <circle cx="75" cy="60" r="8" fill="url(#logoGradient)" />
                    {/* Body - Moved up to close gap */}
                    <path d="M61 71 Q75 67 89 71 V79 H61 Z" fill="url(#logoGradient)" />
                </g>
            </g>
        </svg>
    );
};

export default Logo;
