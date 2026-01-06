import React, { useState } from 'react';
import { Button } from './ui/Button';
import { AlertTriangle, WifiOff, Siren, Activity, Layers, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSystem } from '../context/SystemContext';

export function HurdleControls() {
    const { triggerHurdle, activeHurdle, phase } = useSystem();
    const [collapsed, setCollapsed] = useState(false);

    const HURDLES = [
        {
            id: 'coverage_drop',
            label: 'Coverage Drop',
            icon: WifiOff,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            desc: 'Simulate rural shadowing/fading'
        },
        {
            id: 'interference',
            label: 'Interference Spike',
            icon: Activity,
            color: 'text-red-500',
            bg: 'bg-red-50',
            desc: 'Inject noise into channel'
        },
        {
            id: 'spectrum_reduction',
            label: 'Spectrum Crunch',
            icon: Layers,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            desc: 'Limit bandwidth to 4MHz'
        },
        {
            id: 'traffic_surge',
            label: 'Traffic Surge',
            icon: Activity,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            desc: '300% Public Service Load'
        },
        {
            id: 'emergency_escalation',
            label: 'Emergency Alert',
            icon: Siren,
            color: 'text-rose-600',
            bg: 'bg-rose-100',
            desc: 'Trigger AEAT override'
        }
    ];

    return (
        <div className={cn(
            "fixed right-0 top-24 z-40 transition-all duration-300 ease-in-out border-l border-slate-200 bg-white shadow-xl",
            collapsed ? "w-12 h-auto rounded-l-xl" : "w-80 h-[80vh] rounded-l-2xl"
        )}>
            {/* Toggle Handle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -left-3 top-6 bg-white border border-slate-200 p-1.5 rounded-full shadow-md hover:bg-slate-50 text-slate-500 cursor-pointer z-50"
            >
                {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {collapsed ? (
                <div className="flex flex-col items-center py-6 gap-6">
                    <AlertTriangle className="h-6 w-6 text-amber-500 animate-pulse" />
                    <div className="vertical-text text-xs font-bold text-slate-400 tracking-widest uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>
                        Stress Testing
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Live Stress Controls
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Inject adverse conditions to test AI adaptation.
                        </p>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                        {HURDLES.map((h) => {
                            const isActive = activeHurdle === h.id;
                            return (
                                <div
                                    key={h.id}
                                    className={cn(
                                        "group relative border rounded-xl transition-all duration-200",
                                        isActive ? "border-slate-300 bg-slate-50 ring-2 ring-slate-200" : "border-slate-100 hover:border-slate-300 hover:shadow-md bg-white"
                                    )}
                                >
                                    <button
                                        disabled={phase !== 'idle' && phase !== 'broadcasting' && !isActive}
                                        onClick={() => triggerHurdle(h.id)}
                                        className="w-full text-left p-4 flex items-start gap-3"
                                    >
                                        <div className={cn("p-2 rounded-lg shrink-0", h.bg, h.color)}>
                                            <h.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800 text-sm flex items-center justify-between">
                                                {h.label}
                                                {isActive && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 leading-snug">
                                                {h.desc}
                                            </p>
                                        </div>
                                    </button>

                                    {isActive && (
                                        <div className="px-4 pb-3">
                                            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-full animate-progress-indeterminate" />
                                            </div>
                                            <div className="flex justify-between mt-1 text-[10px] uppercase font-bold text-slate-400">
                                                <span>Adapting</span>
                                                <span>Active</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <Button
                            variant="outline"
                            className="w-full text-xs h-8"
                            onClick={() => triggerHurdle('reset')}
                        >
                            Reset Environment
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
