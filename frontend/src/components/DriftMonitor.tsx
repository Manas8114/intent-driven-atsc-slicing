
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { AlertTriangle, Activity, CheckCircle, Lock } from 'lucide-react';

interface DriftMetrics {
    coverage_error: number;
    snr_residual_db: number;
    reward_drift: number;
    confidence: number;
}

interface DriftStatus {
    status: string;
    action_taken: string;
    message: string;
    metrics: DriftMetrics;
    is_artificial_injection: boolean;
}

export function DriftMonitor() {
    const [driftData, setDriftData] = useState<DriftStatus | null>(null);

    useEffect(() => {
        const fetchDrift = async () => {
            try {
                const res = await fetch('http://localhost:8000/drift/status');
                const data = await res.json();
                setDriftData(data);
            } catch (err) {
                console.error("Failed to fetch drift status", err);
            }
        };

        fetchDrift();
        const interval = setInterval(fetchDrift, 1000); // Polling every second for real-time update
        return () => clearInterval(interval);
    }, []);

    if (!driftData) return <div className="animate-pulse bg-slate-100 h-32 rounded-lg"></div>;

    const isDrifting = driftData.status === "DRIFT_DETECTED";
    const statusColor = isDrifting ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200";
    const iconColor = isDrifting ? "text-red-600" : "text-emerald-600";
    const StatusIcon = isDrifting ? AlertTriangle : CheckCircle;

    return (
        <Card className={`${statusColor} transition-colors duration-500`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <StatusIcon className={`w-5 h-5 ${iconColor}`} />
                    <CardTitle className="text-slate-800">Sim-to-Real Drift Monitor</CardTitle>
                </div>
                {isDrifting && (
                    <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold animate-pulse">
                        <Lock className="w-3 h-3" /> AI FROZEN
                    </span>
                )}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <p className={`text-sm font-medium ${isDrifting ? "text-red-700" : "text-emerald-700"}`}>
                        {driftData.message}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                        <MetricBox
                            label="Cov Error"
                            value={`${(driftData.metrics.coverage_error * 100).toFixed(1)}%`}
                            isBad={driftData.metrics.coverage_error > 0.1}
                        />
                        <MetricBox
                            label="SNR Resid"
                            value={`${driftData.metrics.snr_residual_db.toFixed(1)} dB`}
                            isBad={driftData.metrics.snr_residual_db > 2.0}
                        />
                        <MetricBox
                            label="Confidence"
                            value={`${(driftData.metrics.confidence * 100).toFixed(0)}%`}
                            isBad={false}
                        />
                    </div>

                    {driftData.is_artificial_injection && (
                        <div className="text-[10px] text-center text-slate-400 uppercase tracking-wider font-mono">
                            Demo Mode: Artificial Drift Injected
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function MetricBox({ label, value, isBad }: { label: string, value: string, isBad: boolean }) {
    return (
        <div className={`p-2 rounded border ${isBad ? "bg-red-100 border-red-300 text-red-900" : "bg-white border-slate-200 text-slate-700"}`}>
            <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    );
}
