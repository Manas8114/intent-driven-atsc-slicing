import React from 'react';
import { ShieldCheck, Clock, CheckCircle, Zap, Cpu, Shield, Radio, Tablet, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSystem } from '../context/SystemContext';

export function TopStatusBar() {
    const { phase, lastDecisionTime, safetyLock } = useSystem();

    // Phase to Timeline Logic
    const timeline = [
        { id: 'parsing', label: 'Intent', icon: Zap },
        { id: 'optimizing', label: 'AI Engine', icon: Cpu },
        { id: 'safety_check', label: 'Safety', icon: Shield },
        { id: 'reconfiguring', label: 'Broadcast', icon: Radio },
        { id: 'broadcasting', label: 'Receiver', icon: Tablet },
    ];

    // Map phase to active index (approximate for linear visualization)
    const getPhaseIndex = (p: string) => {
        switch (p) {
            case 'idle': return -1;
            case 'parsing': return 0;
            case 'optimizing': return 1;
            case 'safety_check': return 2;
            case 'reconfiguring': return 3;
            case 'broadcasting': return 4;
            case 'emergency': return 4; // Emergency hits all
            default: return -1;
        }
    };

    const activeIndex = getPhaseIndex(phase);
    const isEmergency = phase === 'emergency';

    return (
        <header className={cn(
            "h-20 border-b px-6 flex items-center justify-between shadow-sm z-50 relative transition-colors duration-500",
            isEmergency ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
        )}>

            {/* Left: System Pulse */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className={cn(
                        "w-3 h-3 rounded-full absolute top-1 left-1",
                        isEmergency ? "bg-red-600" : (activeIndex >= 0 ? "bg-amber-500" : "bg-emerald-500")
                    )} />
                    <div className={cn(
                        "w-5 h-5 rounded-full border-2 absolute top-0 left-0 animate-ping opacity-75",
                        isEmergency ? "border-red-500" : (activeIndex >= 0 ? "border-amber-500" : "border-emerald-500"),
                        activeIndex >= 0 ? "duration-1000" : "duration-[3000ms]"
                    )} />
                </div>
                <div>
                    <div className={cn("text-sm font-bold uppercase tracking-wider", isEmergency ? "text-red-700" : "text-slate-700")}>
                        {isEmergency ? "EMERGENCY MODE" : (activeIndex >= 0 ? "RECONFIGURING..." : "SYSTEM STABLE")}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                        {phase.toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Center: Live Timeline Bar */}
            <div className="flex-1 max-w-2xl mx-auto">
                <div className="flex items-center justify-between relative">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10" />

                    {timeline.map((step, idx) => {
                        const isActive = idx === activeIndex;
                        const isCompleted = idx < activeIndex || (phase === 'broadcasting' || phase === 'emergency');

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                    isActive ? "border-blue-500 bg-blue-50 scale-110 shadow-lg" :
                                        (isCompleted ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-200 text-slate-300")
                                )}>
                                    {isActive ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> :
                                        (isCompleted ? <CheckCircle className="w-4 h-4" /> : <step.icon className="w-4 h-4" />)
                                    }
                                </div>
                                <span className={cn(
                                    "text-[10px] font-semibold uppercase tracking-wider transition-colors",
                                    isActive ? "text-blue-600" : (isCompleted ? "text-emerald-600" : "text-slate-300")
                                )}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Last Update */}
            <div className="flex items-center gap-4 text-slate-500">
                <div className="text-right">
                    <div className="text-xs font-semibold text-slate-400 uppercase">Last Decision</div>
                    <div className="font-mono text-sm text-slate-700">
                        {lastDecisionTime ? new Date(lastDecisionTime).toLocaleTimeString() : "--:--:--"}
                    </div>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <ShieldCheck className={cn("w-6 h-6", safetyLock ? "text-red-600 animate-pulse" : "text-emerald-500")} />
            </div>
        </header>
    );
}
