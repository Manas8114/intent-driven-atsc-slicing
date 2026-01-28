import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Activity, Radio, Cpu, Server, Signal, User, ShieldCheck, Tv, BarChart3 } from 'lucide-react';
import { IntentLogTerminal } from '../components/IntentLogTerminal';
import { DriftMonitor } from '../components/DriftMonitor';

export function Overview() {
    const [stats, setStats] = useState({
        coverage: 0,
        alert_reliability: 0,
        latency_ms: 0,
        spectral_efficiency: 0,
        throughput_mbps: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:8000/kpi/live');
                const data = await res.json();
                setStats(data);
            } catch (e) {
                console.error("Failed to fetch live stats", e);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 1000);
        return () => clearInterval(interval);
    }, []);

    const injectDrift = async () => {
        await fetch('http://localhost:8000/drift/inject?offset=1.0', { method: 'POST' });
        alert("Drift Injected! Watch the monitor.");
    };
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    System Overview
                </h2>
                <p className="text-slate-500 mt-2">
                    Real-time architecture utilization and intent-driven data flow.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Drift Monitor takes full width on mobile, 1 col on large screens, positioned first for visibility */}
                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <DriftMonitor />
                    <button
                        onClick={injectDrift}
                        className="mt-2 text-xs text-red-300 hover:text-red-500 w-full text-right opacity-50 hover:opacity-100 transition-opacity"
                        title="Inject Artificial Drift (Demo Only)"
                    >
                        [Inject Drift]
                    </button>
                </div>
                {[
                    { title: 'Coverage', value: `${stats.coverage.toFixed(1)}% `, sub: 'Service Area', icon: Signal, color: 'text-emerald-500' },
                    { title: 'Reliability', value: `${(stats.alert_reliability * 100).toFixed(1)}% `, sub: 'Alert Delivery', icon: ShieldCheck, color: 'text-blue-500' },
                    { title: 'Latency', value: `${stats.latency_ms.toFixed(0)} ms`, sub: 'End-to-End', icon: Activity, color: 'text-purple-500' },
                    { title: 'Throughput', value: `${stats.throughput_mbps.toFixed(2)} Mbps`, sub: 'Broadcast Capacity', icon: BarChart3, color: 'text-orange-500' },
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className={`h - 4 w - 4 ${stat.color} `} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="text-xs text-slate-500">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="min-h-[400px] bg-slate-50/50">
                <CardHeader>
                    <CardTitle>Architecture Data Flow</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8 space-y-8">

                    {/* Data Flow Visualization */}
                    <div className="relative w-full max-w-6xl flex items-center justify-between overflow-x-auto py-4 px-2">

                        {/* Steps */}
                        {[
                            { label: 'Intent', icon: User, color: 'bg-indigo-100 text-indigo-600' },
                            { label: 'AI Policy', icon: Cpu, color: 'bg-purple-100 text-purple-600' },
                            { label: 'Safety Shield', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-600' },
                            { label: 'ATSC Config', icon: Server, color: 'bg-blue-100 text-blue-600' },
                            { label: 'Broadcast', icon: Radio, color: 'bg-orange-100 text-orange-600' },
                            { label: 'Receiver', icon: Tv, color: 'bg-slate-100 text-slate-600' },
                            { label: 'KPIs', icon: BarChart3, color: 'bg-pink-100 text-pink-600' },
                        ].map((step, i, arr) => (
                            <React.Fragment key={i}>
                                <div className="relative z-10 flex flex-col items-center gap-3 min-w-[80px]">
                                    <div className={`h - 14 w - 14 rounded - 2xl ${step.color} flex items - center justify - center shadow - sm border border - white / 50 transition - transform hover: scale - 105`}>
                                        <step.icon className="h-7 w-7" />
                                    </div>
                                    <span className="font-semibold text-xs text-slate-700 text-center">{step.label}</span>
                                    <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100">
                                        Step {i + 1}
                                    </span>
                                </div>

                                {i < arr.length - 1 && (
                                    <div className="flex-1 h-[2px] bg-slate-200 mx-2 relative overflow-hidden rounded-full min-w-[20px]">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent w-1/2 animate-[shimmer_2s_infinite]" />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-8 max-w-4xl">
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600">
                            <strong className="text-slate-900 block mb-1">Current Operation:</strong>
                            The operator intent is translated by the AI Engine into specific PLP configurations (Modulation, Coding Rate), which are then enforced by the ATSC 3.0 Core for optimized broadcast.
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600">
                            <strong className="text-slate-900 block mb-1">Closed-Loop Feedback:</strong>
                            Receiver telemetry (coverage, reliability) is fed back into the AI Engine to continuously adapt operational parameters.
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Real-time Physics Telemetry Terminal */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Radio className="w-5 h-5 text-green-500" />
                        Live Physics Telemetry
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        Real-time signal calculations from the ReceiverAgent - proving the system is processing actual physics data.
                    </p>
                </CardHeader>
                <CardContent>
                    <IntentLogTerminal />
                </CardContent>
            </Card>

            <style>{`
@keyframes shimmer {
    0 % { transform: translateX(-100 %); }
    100 % { transform: translateX(200 %); }
}
`}</style>
        </div>
    );
}

