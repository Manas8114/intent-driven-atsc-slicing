import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import {
    AlertTriangle, WifiOff, Siren, Activity, Layers,
    ChevronRight, ChevronLeft, CheckCircle2, Play, FastForward,
    Rewind, RotateCcw, Radio, Car, Zap, Monitor
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSystem } from '../context/SystemContext';

interface DemoEvent {
    timestamp: string;
    event_type: string;
    description: string;
}

export function HurdleControls() {
    const { triggerHurdle, activeHurdle, phase } = useSystem();
    const [collapsed, setCollapsed] = useState(false);
    const [demoMode, setDemoMode] = useState(false);
    const [simSpeed, setSimSpeed] = useState(1.0);
    const [events, setEvents] = useState<DemoEvent[]>([]);
    const [showEventLog, setShowEventLog] = useState(false);

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
            id: 'cellular_congestion',
            label: 'Cellular Congestion',
            icon: Radio,
            color: 'text-cyan-500',
            bg: 'bg-cyan-50',
            desc: 'Spike cellular load to 85%'
        },
        {
            id: 'mobility_surge',
            label: 'Mobility Surge',
            icon: Car,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
            desc: '60% mobile users at 75 km/h'
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

    // Fetch demo events periodically
    useEffect(() => {
        if (demoMode) {
            const fetchEvents = async () => {
                try {
                    const res = await fetch('http://localhost:8000/env/demo-events');
                    if (res.ok) {
                        const data = await res.json();
                        setEvents(data.events || []);
                    }
                } catch (e) {
                    console.error('Failed to fetch demo events', e);
                }
            };
            fetchEvents();
            const interval = setInterval(fetchEvents, 2000);
            return () => clearInterval(interval);
        }
    }, [demoMode]);

    const toggleDemoMode = async () => {
        try {
            const newMode = !demoMode;
            const res = await fetch('http://localhost:8000/env/demo-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newMode })
            });
            if (res.ok) {
                setDemoMode(newMode);
            }
        } catch (e) {
            console.error('Failed to toggle demo mode', e);
        }
    };

    const changeSpeed = async (speed: number) => {
        try {
            const res = await fetch('http://localhost:8000/env/speed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ speed })
            });
            if (res.ok) {
                setSimSpeed(speed);
            }
        } catch (e) {
            console.error('Failed to change speed', e);
        }
    };

    const resetSimulation = async () => {
        try {
            await fetch('http://localhost:8000/env/reset', { method: 'POST' });
            triggerHurdle('reset');
        } catch (e) {
            console.error('Failed to reset', e);
        }
    };

    return (
        <div className={cn(
            "fixed right-0 top-24 z-40 transition-all duration-300 ease-in-out border-l border-slate-200 bg-white shadow-xl",
            collapsed ? "w-12 h-auto rounded-l-xl" : "w-96 h-[85vh] rounded-l-2xl"
        )}>
            {/* Toggle Handle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -left-3 top-6 bg-white border border-slate-200 p-1.5 rounded-full shadow-md hover:bg-slate-50 text-slate-500 cursor-pointer z-50"
                title={collapsed ? "Expand controls" : "Collapse controls"}
            >
                {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {collapsed ? (
                <div className="flex flex-col items-center py-6 gap-6">
                    <AlertTriangle className="h-6 w-6 text-amber-500 animate-pulse" />
                    <div className="vertical-text text-xs font-bold text-slate-400 tracking-widest uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>
                        Demo Controls
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full p-4 overflow-hidden">
                    {/* Demo Mode Toggle */}
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Monitor className="h-5 w-5 text-indigo-500" />
                                <span className="font-bold text-indigo-900">Demo Mode</span>
                            </div>
                            <button
                                onClick={toggleDemoMode}
                                className={cn(
                                    "relative w-12 h-6 rounded-full transition-colors",
                                    demoMode ? "bg-indigo-500" : "bg-slate-300"
                                )}
                                title="Toggle demo mode"
                            >
                                <span className={cn(
                                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                                    demoMode ? "right-1" : "left-1"
                                )} />
                            </button>
                        </div>
                        {demoMode && (
                            <p className="text-xs text-indigo-600 mt-2">
                                Demo annotations active. Events are being logged.
                            </p>
                        )}
                    </div>

                    {/* Simulation Speed Controls */}
                    <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                            Simulation Speed
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => changeSpeed(0.5)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                                    simSpeed === 0.5
                                        ? "bg-blue-500 text-white"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                                title="Slow speed (0.5x)"
                            >
                                <Rewind className="h-4 w-4" />
                                Slow
                            </button>
                            <button
                                onClick={() => changeSpeed(1.0)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                                    simSpeed === 1.0
                                        ? "bg-blue-500 text-white"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                                title="Normal speed (1x)"
                            >
                                <Play className="h-4 w-4" />
                                Normal
                            </button>
                            <button
                                onClick={() => changeSpeed(2.0)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                                    simSpeed === 2.0
                                        ? "bg-blue-500 text-white"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                                title="Fast speed (2x)"
                            >
                                <FastForward className="h-4 w-4" />
                                Fast
                            </button>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="mb-3">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-500" />
                            Stress Testing
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Trigger adverse conditions to demonstrate AI adaptation.
                        </p>
                    </div>

                    {/* Hurdle Buttons */}
                    <div className="space-y-2 flex-1 overflow-y-auto pr-2">
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
                                        className="w-full text-left p-3 flex items-start gap-3"
                                        title={`Trigger ${h.label}`}
                                    >
                                        <div className={cn("p-2 rounded-lg shrink-0", h.bg, h.color)}>
                                            <h.icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-800 text-sm flex items-center justify-between">
                                                <span className="truncate">{h.label}</span>
                                                {isActive && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                                                {h.desc}
                                            </p>
                                        </div>
                                    </button>

                                    {isActive && (
                                        <div className="px-3 pb-2">
                                            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 w-full animate-progress-indeterminate" />
                                            </div>
                                            <div className="flex justify-between mt-1 text-[10px] uppercase font-bold text-slate-400">
                                                <span>AI Adapting</span>
                                                <span>Active</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Demo Event Log (when in demo mode) */}
                    {demoMode && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setShowEventLog(!showEventLog)}
                                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wide"
                            >
                                <span>Event Log ({events.length})</span>
                                <ChevronRight className={cn("h-4 w-4 transition-transform", showEventLog && "rotate-90")} />
                            </button>
                            {showEventLog && events.length > 0 && (
                                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                                    {events.slice(-5).reverse().map((e, i) => (
                                        <div key={i} className="text-xs p-2 bg-slate-50 rounded border border-slate-100">
                                            <div className="flex justify-between text-slate-400">
                                                <span className="font-medium uppercase">{e.event_type}</span>
                                                <span>{new Date(e.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-slate-600 mt-0.5">{e.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reset Button */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <Button
                            variant="outline"
                            className="w-full text-sm h-10 gap-2"
                            onClick={resetSimulation}
                            title="Reset simulation to baseline"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset Simulation
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
