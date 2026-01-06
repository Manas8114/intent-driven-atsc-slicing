import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertTriangle, Siren, ShieldCheck, Radio, CheckCircle, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSystem } from '../context/SystemContext';

export function EmergencyMode() {
    const { phase, triggerEmergency, cancelEmergency, receiversReached, safetyLock } = useSystem();
    const isActive = phase === 'emergency';

    return (
        <div className={cn(
            "space-y-6 animate-in fade-in duration-500 min-h-screen",
            isActive ? "bg-red-50/30 -m-8 p-8" : "" // Expand to full edges visually if possible, or just color
        )}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-red-600 flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8" />
                        Emergency Override
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Hard-constraint handling for life-safety communications.
                    </p>
                </div>

                {isActive && (
                    <div className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-full font-bold animate-pulse shadow-lg shadow-red-500/40">
                        <Siren className="h-5 w-5 animate-bounce" />
                        BROADCAST ACTIVE
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Control Card */}
                <Card className={cn(
                    "border-2 transition-all duration-500",
                    isActive ? "border-red-500 shadow-red-200 shadow-xl bg-white" : "border-slate-200"
                )}>
                    <CardHeader>
                        <CardTitle>Manual Trigger</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
                        <Button
                            size="lg"
                            variant={isActive ? "secondary" : "danger"}
                            className={cn(
                                "h-40 w-40 rounded-full text-2xl font-bold border-8 transition-all duration-300 transform active:scale-95",
                                isActive ? "border-slate-200 bg-slate-100 text-slate-900" : "border-red-200 ring-4 ring-red-50 bg-red-600 hover:bg-red-700 hover:scale-105 shadow-2xl hover:shadow-red-500/50"
                            )}
                            onClick={isActive ? cancelEmergency : triggerEmergency}
                        >
                            {isActive ? "STOP" : "ACTIVATE"}
                        </Button>
                        <p className="text-sm text-slate-500 text-center max-w-xs font-medium">
                            {isActive
                                ? "Broadcast active. Press to restore normal operations."
                                : "Pressing this will immediately reconfigure the network (Latency < 500ms)."
                            }
                        </p>
                    </CardContent>
                </Card>

                {/* Real-time Status & Telemetry */}
                <div className="space-y-6">
                    {/* Impact Counter */}
                    <Card className={cn("transition-colors", isActive ? "bg-slate-900 text-white border-slate-800" : "bg-white")}>
                        <CardHeader className="pb-2">
                            <CardTitle className={cn("text-sm", isActive ? "text-slate-400" : "text-slate-500")}>
                                Confirmed Receivers Reached
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2">
                                <div className="text-5xl font-mono font-bold tracking-tighter tabular-nums">
                                    {isActive ? receiversReached.toLocaleString() : "0"}
                                </div>
                                {isActive && <div className="mb-2 text-emerald-500 animate-pulse text-xs font-bold">● LIVE</div>}
                            </div>
                            {isActive && (
                                <div className="mt-2 text-xs text-slate-400">
                                    Data source: 5G/ATSC Return Channel
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timeline Verification */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-slate-500">Delivery Chain Verification</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { label: "Alert Generated", active: isActive },
                                { label: "PLP 0 Reconfigured (Robust)", active: isActive && safetyLock },
                                { label: "Frame Broadcast", active: isActive },
                                { label: "Receiver Decoded (AEAT)", active: isActive && receiversReached > 12050 }
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-5 w-5 rounded-full flex items-center justify-center border transition-all duration-500",
                                        step.active ? "bg-emerald-500 border-emerald-600 text-white" : "bg-slate-100 border-slate-200 text-slate-300"
                                    )}>
                                        <CheckCircle className="h-3 w-3" />
                                    </div>
                                    <span className={cn(
                                        "text-sm font-medium transition-colors",
                                        step.active ? "text-slate-900" : "text-slate-400"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
