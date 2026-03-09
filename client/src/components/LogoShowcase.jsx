import React from 'react';

const LogoOption = ({ id, title, children }) => (
    <div className="flex flex-col items-center gap-4 p-6 glass rounded-3xl border border-white/20 hover:scale-105 transition-transform">
        <div className="w-24 h-24 bg-white/50 rounded-2xl flex items-center justify-center shadow-sm">
            {children}
        </div>
        <div className="text-center">
            <h3 className="font-bold text-gray-800 text-lg mb-1">{title}</h3>
            <p className="text-xs text-gray-500 font-mono">Option {id}</p>
        </div>
    </div>
);

const LogoShowcase = () => {
    return (
        <div className="py-12 w-full">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 font-display">Logo Concepts</h2>
                <p className="text-gray-500">Select your favorite design</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto px-4">

                {/* Option A: Abstract C (Current) */}
                <LogoOption id="A" title="Abstract C">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
                        <defs>
                            <linearGradient id="gradA" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                        <path d="M75 30 C 65 15, 35 15, 25 30 C 10 50, 10 70, 25 85 C 40 100, 70 95, 80 80" stroke="url(#gradA)" strokeWidth="12" strokeLinecap="round" />
                        <circle cx="75" cy="30" r="6" fill="url(#gradA)" />
                    </svg>
                </LogoOption>

                {/* Option B: Hexagon Hive */}
                <LogoOption id="B" title="The Hive">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
                        <defs>
                            <linearGradient id="gradB" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                        </defs>
                        <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" stroke="url(#gradB)" strokeWidth="8" strokeLinejoin="round" />
                        <path d="M50 35 L65 45 L65 65 L50 75 L35 65 L35 45 Z" fill="url(#gradB)" opacity="0.5" />
                        <circle cx="50" cy="55" r="4" fill="white" />
                    </svg>
                </LogoOption>

                {/* Option C: Infinity Flow */}
                <LogoOption id="C" title="Infinity Flow">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
                        <defs>
                            <linearGradient id="gradC" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                        </defs>
                        <path d="M20 50 C 20 20, 50 20, 50 50 C 50 80, 80 80, 80 50 C 80 20, 50 20, 50 50 C 50 80, 20 80, 20 50 Z" stroke="url(#gradC)" strokeWidth="10" strokeLinecap="round" />
                    </svg>
                </LogoOption>

                {/* Option D: Connected Nodes */}
                <LogoOption id="D" title="The Network">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
                        <defs>
                            <linearGradient id="gradD" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                        <circle cx="30" cy="30" r="12" fill="url(#gradD)" />
                        <circle cx="70" cy="30" r="12" fill="url(#gradD)" opacity="0.8" />
                        <circle cx="50" cy="70" r="12" fill="url(#gradD)" opacity="0.6" />
                        <line x1="30" y1="30" x2="70" y2="30" stroke="url(#gradD)" strokeWidth="6" />
                        <line x1="30" y1="30" x2="50" y2="70" stroke="url(#gradD)" strokeWidth="6" />
                        <line x1="70" y1="30" x2="50" y2="70" stroke="url(#gradD)" strokeWidth="6" />
                    </svg>
                </LogoOption>

            </div>
        </div>
    );
};

export default LogoShowcase;
