import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import {
    Activity,
    Radio,
    Wifi,
    Shield,
    TrendingUp,
    TrendingDown,
    Minus,
    Cpu,
    Zap,
    RefreshCw,
    Info
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MetricLabel {
    plp_id: string;
    service_type: string;
    priority_level: string;
    mode: string;
    source: string;
}

interface SourceBadge {
    emoji: string;
    label: string;
    color: string;
}

interface TelemetryMetric {
    name: string;
    value: number;
    unit: string;
    labels: MetricLabel;
    timestamp: string;
    description: string;
    source_badge: SourceBadge;
}

interface TelemetryData {
    timestamp: string;
    config_summary: {
        modulation: string;
        code_rate: string;
        mode: string;
    };
    transmission_metrics: TelemetryMetric[];
    receiver_metrics: TelemetryMetric[];
    ai_control_metrics: TelemetryMetric[];
    provenance_legend: Record<string, { emoji: string; description: string }>;
    note: string;
}

export function BroadcastTelemetry() {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchTelemetry = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:8000/telemetry/all');
            if (res.ok) {
                const data = await res.json();
                setTelemetry(data);
            } else {
                setError('Failed to fetch telemetry');
            }
        } catch (err) {
            setError('Connection error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTelemetry();
        if (autoRefresh) {
            const interval = setInterval(fetchTelemetry, 3000);
            return () => clearInterval(interval);
        }
    }, [fetchTelemetry, autoRefresh]);

    const formatValue = (metric: TelemetryMetric): string => {
        if (metric.unit === 'ratio') {
            return `${(metric.value * 100).toFixed(1)}%`;
        }
        if (metric.unit === 'bps') {
            const mbps = metric.value / 1_000_000;
            return `${mbps.toFixed(2)} Mbps`;
        }
        if (metric.unit === 'ms') {
            return `${metric.value.toFixed(0)} ms`;
        }
        if (metric.unit === 'bits/Hz') {
            return `${metric.value.toFixed(2)} bits/Hz`;
        }
        if (metric.unit === 'score') {
            return `${(metric.value * 100).toFixed(1)}%`;
        }
        if (metric.unit === 'count') {
            return metric.value.toFixed(0);
        }
        return metric.value.toFixed(4);
    };

    const getMetricDisplayName = (name: string): string => {
        const displayNames: Record<string, string> = {
            'broadcast_plp_configured_bitrate_bps': 'Configured Throughput',
            'broadcast_plp_effective_bitrate_bps': 'Effective Throughput',
            'broadcast_plp_bits_per_hz': 'Spectral Efficiency',
            'broadcast_emergency_resource_ratio': 'Emergency Resource Share',
            'receiver_service_acquisition_success_ratio': 'Service Acquisition Success',
            'receiver_emergency_alert_completion_ratio': 'Emergency Alert Completion',
            'receiver_alert_time_to_first_byte_ms': 'Time-to-First-Alert',
            'receiver_plp_decode_stability_score': 'PLP Decode Stability',
            'broadcast_reconfig_service_disruption_ms': 'Reconfiguration Disruption',
            'ai_recommendation_acceptance_ratio': 'AI Acceptance Rate',
            'ai_safety_override_total': 'Safety Shield Interventions',
            'ai_emergency_override_total': 'Emergency Overrides',
            'ai_total_recommendations': 'Total AI Recommendations'
        };
        return displayNames[name] || name;
    };

    const getMetricIcon = (name: string) => {
        if (name.includes('emergency')) return <Zap className="h-4 w-4" />;
        if (name.includes('receiver')) return <Wifi className="h-4 w-4" />;
        if (name.includes('broadcast')) return <Radio className="h-4 w-4" />;
        if (name.includes('ai_') || name.includes('safety')) return <Shield className="h-4 w-4" />;
        return <Activity className="h-4 w-4" />;
    };

    const getValueTrend = (metric: TelemetryMetric) => {
        // Determine if higher is better
        const higherIsBetter = [
            'acquisition_success', 'completion_ratio', 'stability',
            'acceptance_ratio', 'throughput', 'bits_per_hz'
        ].some(term => metric.name.includes(term));


        if (metric.unit === 'ratio' || metric.unit === 'score') {
            if (metric.value >= 0.95) {
                return higherIsBetter ?
                    { icon: <TrendingUp className="h-4 w-4" />, color: 'text-emerald-500' } :
                    { icon: <TrendingUp className="h-4 w-4" />, color: 'text-amber-500' };
            }
            if (metric.value >= 0.85) {
                return { icon: <Minus className="h-4 w-4" />, color: 'text-slate-400' };
            }
            return higherIsBetter ?
                { icon: <TrendingDown className="h-4 w-4" />, color: 'text-red-500' } :
                { icon: <TrendingDown className="h-4 w-4" />, color: 'text-emerald-500' };
        }

        return { icon: <Minus className="h-4 w-4" />, color: 'text-slate-400' };
    };

    const SourceBadgeComponent = ({ badge }: { badge: SourceBadge }) => (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-help",
                badge.color === 'purple' && "bg-purple-100 text-purple-700",
                badge.color === 'green' && "bg-emerald-100 text-emerald-700",
                badge.color === 'blue' && "bg-blue-100 text-blue-700",
                badge.color === 'gray' && "bg-slate-100 text-slate-700"
            )}
            title="This metric is derived from receiver-side protocol parsing using libatsc3 or validated digital-twin models."
        >
            {badge.emoji} {badge.label}
        </span>
    );

    const MetricCard = ({ metric }: { metric: TelemetryMetric }) => {
        const trend = getValueTrend(metric);

        return (
            <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-600">
                        {getMetricIcon(metric.name)}
                        <span className="text-sm font-medium">{getMetricDisplayName(metric.name)}</span>
                    </div>
                    <SourceBadgeComponent badge={metric.source_badge} />
                </div>
                <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold text-slate-900">
                        {formatValue(metric)}
                    </div>
                    <div className={cn("flex items-center gap-1", trend.color)}>
                        {trend.icon}
                    </div>
                </div>
                <p
                    className="text-xs text-slate-400 mt-2 cursor-help"
                    title={metric.description}
                >
                    {metric.description.length > 60 ? metric.description.slice(0, 60) + '...' : metric.description}
                </p>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                        Broadcast Telemetry
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Impact-oriented metrics for broadcast operations
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        Auto-refresh
                    </label>
                    <button
                        onClick={fetchTelemetry}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Current Configuration */}
            {telemetry && (
                <Card className="bg-slate-900 text-white">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div>
                                    <span className="text-xs text-slate-400 uppercase">Modulation</span>
                                    <p className="font-mono font-bold text-lg">{telemetry.config_summary.modulation}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 uppercase">Code Rate</span>
                                    <p className="font-mono font-bold text-lg">{telemetry.config_summary.code_rate}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 uppercase">Mode</span>
                                    <p className={cn(
                                        "font-bold text-lg uppercase",
                                        telemetry.config_summary.mode === 'emergency' ? "text-orange-400" : "text-emerald-400"
                                    )}>
                                        {telemetry.config_summary.mode}
                                    </p>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500">
                                Last updated: {new Date(telemetry.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Provenance Legend */}
            {telemetry && (
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">Data Sources:</span>
                    </div>
                    {Object.entries(telemetry.provenance_legend).map(([key, value]) => (
                        <span key={key} className="text-sm text-slate-600">
                            {value.emoji} {value.description}
                        </span>
                    ))}
                </div>
            )}

            {/* Transmission Metrics */}
            {telemetry && (
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Radio className="h-5 w-5 text-blue-500" />
                        Transmission-Side Metrics
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {telemetry.transmission_metrics.map((metric, i) => (
                            <MetricCard key={i} metric={metric} />
                        ))}
                    </div>
                </div>
            )}

            {/* Receiver Metrics */}
            {telemetry && (
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Wifi className="h-5 w-5 text-emerald-500" />
                        Receiver-Side Metrics
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {telemetry.receiver_metrics.map((metric, i) => (
                            <MetricCard key={i} metric={metric} />
                        ))}
                    </div>
                </div>
            )}

            {/* AI & Control Plane Health */}
            {telemetry && (
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-purple-500" />
                        AI & Control-Plane Health
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {telemetry.ai_control_metrics.map((metric, i) => (
                            <MetricCard key={i} metric={metric} />
                        ))}
                    </div>
                </div>
            )}

            {/* Note */}
            {telemetry && (
                <p className="text-xs text-slate-400 italic text-center">
                    {telemetry.note}
                </p>
            )}
        </div>
    );
}
