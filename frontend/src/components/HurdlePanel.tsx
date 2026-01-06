import React, { useState } from 'react';
import { SignalLow, WifiOff, Minimize2, Users, AlertTriangle, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { useSystem } from '../context/SystemContext';

export function HurdlePanel() {
    const { triggerHurdle, triggerEmergency, phase, activeHurdle } = useSystem();
    const [isOpen, setIsOpen] = useState(true);

    const isBusy = phase !== 'idle' && phase !== 'broadcasting' && phase !== 'emergency';

    const HURDLES = [
        {
            id: 'coverage_drop',
            label: 'Rural Coverage Drop',
            icon: SignalLow,
            desc: 'Simulate shadowing/fading event (-3dB SNR)',
            color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200'
        },
        {
            id: 'interference',
            label: 'Inject Interference',
            icon: WifiOff,
            desc: 'Add channel noise/spurs (+5dB Noise)',
            color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200'
        },
        {
            id: 'spectrum_reduction',
            label: 'Spectrum Constraint',
            icon: Minimize2,
            desc: 'Limit usable BW to 4 MHz (Regulator)',
            color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200'
        },
        {
            id: 'traffic_surge',
            label: 'Simulate Demand Surge',
            icon: Users,
            desc: 'Spike in public service requests (+200%)',
            color: 'text-orange-600 bg-orange-50 hover:bg-orange-100 border-orange-200'
        }
    ];

    return (
        <div className={cn(
            "fixed right-0 top-20 bottom-8 z-40 bg-white border-l border-slate-200 shadow-xl transition-all duration-300 flex flex-col",
            isOpen ? "w-80" : "w-12"
        )}>
            {/* Toggle Handle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-slate-200 rounded-l-lg shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 z-50"
            >
                {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Header */}
            <div className={cn("p-4 border-b border-slate-100 flex items-center gap-2", !isOpen && "justify-center")}>
                <Activity className={cn("h-5 w-5 text-red-500 animate-pulse")} />
                {isOpen && <h3 className="font-bold text-slate-800">Live Stress Controls</h3>}
            </div>

            {/* Content */}
            <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", !isOpen && "hidden")}>
                <p className="text-xs text-slate-500 mb-4">
                    Inject adverse conditions to test AI adaptation and self-healing.
                </p>

                {HURDLES.map((hurdle) => (
                    <button
                        key={hurdle.id}
                        disabled={isBusy}
                        onClick={() => triggerHurdle(hurdle.id)}
                        className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all duration-200 flex flex-col gap-1 group relative",
                            activeHurdle === hurdle.id ? "ring-2 ring-offset-1 ring-slate-400 opacity-80" : "",
                            hurdle.color,
                            isBusy && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <hurdle.icon className="h-4 w-4" />
                            {hurdle.label}
                        </div>
                        <div className="text-[10px] opacity-70 ml-6">
                            {hurdle.desc}
                        </div>
                        {activeHurdle === hurdle.id && (
                            <span className="absolute top-2 right-2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                            </span>
                        )}
                    </button>
                ))}

                <div className="h-px bg-slate-200 my-4" />

                <button
                    disabled={isBusy}
                    onClick={triggerEmergency}
                    className="w-full text-left p-4 rounded-lg border border-red-200 bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 group"
                >
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <AlertTriangle className="h-5 w-5 animate-bounce group-hover:rotate-12 transition-transform" />
                        ESCALATE TO EMERGENCY
                    </div>
                </button>
            </div>

            {!isOpen && (
                <div className="flex flex-col items-center gap-4 py-4">
                    <AlertTriangle className="h-4 w-4 text-slate-400" />
                    <div className="writing-vertical text-xs font-mono text-slate-400 uppercase tracking-widest">Stress Test</div>
                </div>
            )}
        </div>
    );
}
