import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useSystem } from '../context/SystemContext';
import { MapPin, Wifi, ZapOff } from 'lucide-react';

export function PLPVisualization() {
    const { activeIntent, activeHurdle, phase } = useSystem();
    const [selectedPlp, setSelectedPlp] = useState<number | null>(null);

    // Dynamic PLP Configuration based on Intent AND Hurdles
    const { plps, totalUsedBw } = useMemo(() => {
        const isEmergency = activeIntent === 'ensure_emergency_reliability' || activeIntent === 'EMERGENCY_ALERT';
        const isRural = activeIntent === 'maximize_coverage';
        const isSpectrumStart = activeHurdle === 'spectrum_reduction';

        let widths = [1.0, 3.5, 1.5]; // Default Total 6.0
        let mods = ["QPSK", "64QAM", "16QAM"];
        let codes = ["1/2", "3/4", "7/15"];

        if (isEmergency) {
            widths = [3.0, 2.0, 1.0];
            mods = ["QPSK", "16QAM", "QPSK"];
            codes = ["1/2", "3/5", "1/2"];
        } else if (isRural) {
            widths = [1.5, 3.0, 1.5];
            mods = ["QPSK", "16QAM", "QPSK"];
        }

        // Apply Hurdle Constraints
        if (isSpectrumStart) {
            // Shrink mechanism: Preserve PLP0 (Safety), shrink others
            widths[0] = Math.min(widths[0], 1.5); // Cap safety slightly if huge, but usually priority
            widths[1] = 1.5; // Massive cut to Core
            widths[2] = 1.0; // Cut Mobility
            // Total = ~4.0
        }

        // Calculate start positions
        const starts = [0, widths[0], widths[0] + widths[1]];
        const totalUsed = widths.reduce((a, b) => a + b, 0);

        const plpData = [
            {
                id: 0,
                name: "Emergency / Signaling",
                start: starts[0],
                width: widths[0],
                color: "fill-red-500",
                mod: isSpectrumStart ? "QPSK" : mods[0],
                code: codes[0],
                protectionLevel: "Maximum",
                desc: "Critical alerts and signaling (LLS/SLT)."
            },
            {
                id: 1,
                name: "Core Broadcast (HD)",
                start: starts[1],
                width: widths[1],
                color: "fill-blue-500",
                mod: isSpectrumStart ? "16QAM" : mods[1],
                code: codes[1],
                protectionLevel: "Standard",
                desc: "Main video/audio streams."
            },
            {
                id: 2,
                name: "Mobility / Fallback",
                start: starts[2],
                width: widths[2],
                color: "fill-emerald-500",
                mod: mods[2],
                code: codes[2],
                protectionLevel: "High",
                desc: "Robust automobile/mobile reception."
            },
        ];

        return { plps: plpData, totalUsedBw: totalUsed };
    }, [activeIntent, activeHurdle]);

    const totalChannelBw = 6.0;

    // Signal Reach Simulation
    const signalRadius = useMemo(() => {
        if (activeHurdle === 'coverage_drop') return 100; // Shrink significantly
        if (activeIntent === 'maximize_coverage') return 180;
        if (activeIntent === 'ensure_emergency_reliability') return 220;
        return 140;
    }, [activeIntent, activeHurdle]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative min-h-screen">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Spectrum Slicing</h2>
                <p className="text-slate-500 mt-2">Physical Layer Pipe (PLP) allocation. Real-time reallocation engine active.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Spectrum View */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            RF Channel 36 Allocation
                            <div className="flex gap-2">
                                {activeHurdle === 'interference' && (
                                    <span className="text-xs font-bold bg-purple-100 text-purple-600 px-2 py-1 rounded animate-pulse">
                                        INTERFERENCE DETECTED
                                    </span>
                                )}
                                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                                    {phase === 'reconfiguring' ? 'MORPHING...' : `${totalUsedBw.toFixed(1)} MHz / 6.0 MHz`}
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-12">
                        <div className="w-full relative">
                            <svg viewBox="0 0 600 120" className="w-full h-32 drop-shadow-sm select-none overflow-visible">
                                {/* Base Channel (Empty) */}
                                <rect x="0" y="20" width="600" height="80" rx="4" className="fill-slate-100 stroke-slate-200" strokeWidth="1" />

                                {/* Pattern Definitions */}
                                <defs>
                                    <pattern id="noisePattern" width="8" height="8" patternUnits="userSpaceOnUse">
                                        <path d="M0 0L8 8M8 0L0 8" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
                                    </pattern>
                                    <pattern id="blockedPattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                        <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="8" opacity="0.3" />
                                    </pattern>
                                </defs>

                                {/* PLP Blocks */}
                                {plps.map((plp) => {
                                    const x = (plp.start / totalChannelBw) * 600;
                                    const w = (plp.width / totalChannelBw) * 600;
                                    const isSelected = selectedPlp === plp.id;

                                    return (
                                        <g key={plp.id} onClick={() => setSelectedPlp(plp.id)} className="group cursor-pointer">
                                            <rect
                                                x={x}
                                                y="20"
                                                width={w}
                                                height="80"
                                                className={`transition-all duration-1000 ease-in-out ${plp.color} stroke-white stroke-2 ${isSelected ? 'opacity-100 ring-2' : 'opacity-80 group-hover:opacity-90'}`}
                                                style={{ width: w, x }} // React style interpolation for smoother width Anim
                                            />
                                            <text
                                                x={x + w / 2}
                                                y="65"
                                                textAnchor="middle"
                                                className="fill-white text-xs font-bold pointer-events-none transition-all duration-1000 ease-in-out"
                                                style={{ x: x + w / 2 }}
                                            >
                                                {plp.name.split(' ')[0]}
                                            </text>

                                            {/* Interference Overlay */}
                                            {activeHurdle === 'interference' && (
                                                <rect
                                                    x={x} y="20" width={w} height="80"
                                                    fill="url(#noisePattern)"
                                                    className="animate-pulse"
                                                />
                                            )}
                                        </g>
                                    );
                                })}

                                {/* Regulatory Constraint Block (Blocked Spectrum) */}
                                {activeHurdle === 'spectrum_reduction' && (
                                    <g className="animate-in fade-in duration-1000">
                                        <rect
                                            x={(totalUsedBw / totalChannelBw) * 600}
                                            y="20"
                                            width={((totalChannelBw - totalUsedBw) / totalChannelBw) * 600}
                                            height="80"
                                            fill="url(#blockedPattern)"
                                            className="stroke-slate-300 stroke-dasharray-4"
                                        />
                                        <text x="550" y="65" className="fill-slate-400 text-xs font-bold text-center" textAnchor="middle">
                                            REGULATOR BLOCKED
                                        </text>
                                    </g>
                                )}
                            </svg>

                            {/* Frequency Labels */}
                            <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono px-1">
                                <span>602 MHz</span>
                                <span className="text-center w-full">Center Frequency</span>
                                <span>608 MHz</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Signal Reach Overlay */}
                <Card className="bg-slate-900 border-slate-800 text-slate-100 overflow-hidden relative">
                    <CardHeader>
                        <CardTitle className="text-slate-300 text-sm flex justify-between">
                            Signal Coverage
                            {activeHurdle === 'coverage_drop' && <span className="text-amber-500 font-bold animate-pulse">! LOW SNR</span>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-[200px] relative">
                        <div className="absolute inset-0 opacity-20"
                            style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                        />

                        <div className="z-10 bg-white text-slate-900 p-2 rounded-full shadow-xl">
                            {activeHurdle === 'interference' ? <ZapOff className="h-6 w-6 text-purple-600" /> : <MapPin className="h-6 w-6" />}
                        </div>

                        <div
                            className="absolute rounded-full border transition-all duration-1000 ease-out"
                            style={{
                                width: signalRadius * 2,
                                height: signalRadius * 2,
                                borderColor: activeHurdle === 'coverage_drop' ? 'rgba(245, 158, 11, 0.5)' : (activeIntent === 'ensure_emergency_reliability' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.3)'),
                                backgroundColor: activeHurdle === 'coverage_drop' ? 'rgba(245, 158, 11, 0.1)' : (activeIntent === 'ensure_emergency_reliability' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)')
                            }}
                        >
                            <div className="absolute inset-0 animate-ping rounded-full border border-current opacity-20 duration-[2000ms]" />
                        </div>

                        <div className="absolute bottom-4 left-4 text-xs font-mono text-slate-400">
                            Radius: ~{Math.round(signalRadius / 2)} km
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PLP Details Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                {plps.map(plp => (
                    <Card
                        key={plp.id}
                        className={`transition-all duration-500 ${selectedPlp === plp.id ? 'ring-2 ring-blue-500' : ''}`}
                        onClick={() => setSelectedPlp(plp.id)}
                    >
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${plp.color.replace('fill-', 'bg-')}`} />
                                <CardTitle className="text-sm">{plp.name}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{plp.mod}</div>
                            <div className="text-xs text-slate-500">Code Rate: {plp.code}</div>
                            <div className="mt-2 text-xs font-mono bg-slate-50 p-1 rounded inline-block">
                                BW: {plp.width.toFixed(2)} MHz
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
