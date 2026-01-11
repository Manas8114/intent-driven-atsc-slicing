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
    Info,
    Car,
    ArrowRightLeft,
    AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import '../styles/telemetry.css';
import { DataExportControls } from '../components/DataExportControls';

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

interface OffloadingData {
    traffic_offloading: {
        unicast_congestion_level: number;
        offload_ratio: number;
        recommended_offload: number;
        unicast_latency_ms: number;
        packet_loss_probability: number;
        latency_reduction_ms: number;
        users_offloaded: number;
        status: string;
    };
    mobility: {
        mobile_user_ratio: number;
        num_mobile_users: number;
        num_static_users: number;
        average_velocity_kmh: number;
        max_velocity_kmh: number;
        mobile_coverage_percent: number;
        static_coverage_percent: number;
        overall_coverage_percent: number;
        simulation_time_s: number;
    };
    ai_explanation: string;
}

// Congestion Gauge Component
function CongestionGauge({ level, label, status }: { level: number; label: string; status: string }) {
    const percentage = level * 100;

    const getStatusClass = () => {
        switch (status) {
            case 'critical': return 'congestion-bar-critical';
            case 'high': return 'congestion-bar-high';
            case 'moderate': return 'congestion-bar-moderate';
            default: return 'congestion-bar-low';
        }
    };

    const getStatusBadgeClass = () => {
        switch (status) {
            case 'critical': return 'status-badge-critical';
            case 'high': return 'status-badge-high';
            case 'moderate': return 'status-badge-moderate';
            default: return 'status-badge-low';
        }
    };

    return (
        <div className="metric-card">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">{label}</span>
                <span className={cn("status-badge", getStatusBadgeClass())}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-2">
                {percentage.toFixed(1)}%
            </div>
            <div className="congestion-bar-container">
                <div
                    className={cn("congestion-bar", getStatusClass())}
                    data-width={Math.min(percentage, 100)}
                />
            </div>
        </div>
    );
}

// Offload Ratio Dial
function OffloadDial({ ratio, reduction, recommended }: { ratio: number; reduction: number; recommended: number }) {
    const percentage = ratio * 100;

    return (
        <div className="metric-card">
            <div className="flex items-center gap-2 mb-2 text-slate-600">
                <ArrowRightLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Broadcast Offload Ratio</span>
            </div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900">{percentage.toFixed(0)}%</span>
                {reduction > 0 && (
                    <span className="text-sm text-emerald-600 mb-1">
                        ↓{reduction.toFixed(0)}ms latency saved
                    </span>
                )}
            </div>
            <div className="offload-bar-container mt-2">
                <div
                    className="offload-bar"
                    data-width={Math.min(percentage, 100)}
                />
                {/* Recommended marker */}
                <div
                    className="offload-marker"
                    data-position={recommended * 100}
                    title={`AI Recommended: ${(recommended * 100).toFixed(0)}%`}
                />
            </div>
            <p className="text-xs text-slate-400 mt-2">
                {ratio > 0.5
                    ? "Traffic has been offloaded from cellular to broadcast to reduce congestion."
                    : ratio > 0.1
                        ? "Partial offloading active to maintain network performance."
                        : "Normal operation - minimal offloading required."}
            </p>
        </div>
    );
}

// Mobile Users Indicator
function MobileUsersIndicator({
    numMobile,
    numStatic,
    avgVelocity,
    maxVelocity,
    mobileCoverage,
    staticCoverage,
    simulationTime
}: {
    numMobile: number;
    numStatic: number;
    avgVelocity: number;
    maxVelocity: number;
    mobileCoverage: number;
    staticCoverage: number;
    simulationTime: number;
}) {
    return (
        <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-slate-600">
                    <Car className="h-4 w-4" />
                    <span className="text-sm font-medium">Moving Receivers</span>
                </div>
                <span className="text-xs text-slate-400">
                    t = {simulationTime.toFixed(0)}s
                </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
                <div>
                    <div className="text-xl font-bold text-slate-900">{numMobile}</div>
                    <div className="text-xs text-slate-500">Mobile</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-slate-900">{numStatic}</div>
                    <div className="text-xs text-slate-500">Static</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-slate-900">{avgVelocity.toFixed(0)}</div>
                    <div className="text-xs text-slate-500">Avg km/h</div>
                </div>
                <div>
                    <div className={cn(
                        "text-xl font-bold",
                        mobileCoverage >= 90 ? "text-emerald-600" :
                            mobileCoverage >= 70 ? "text-yellow-600" : "text-red-600"
                    )}>
                        {mobileCoverage.toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-500">Mobile Cov</div>
                </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Static Coverage: {staticCoverage.toFixed(0)}%</span>
                    <span className="text-slate-500">Max Speed: {maxVelocity.toFixed(0)} km/h</span>
                </div>
            </div>
        </div>
    );
}

// AI Explanation Banner
function AIExplanationBanner({ explanation }: { explanation: string }) {
    const isWarning = explanation.includes('⚠️') || explanation.includes('🚨');

    return (
        <div className={cn(
            "rounded-lg border p-4 mb-4",
            isWarning
                ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
                : "bg-gradient-to-r from-emerald-50 to-cyan-50 border-emerald-200"
        )}>
            <div className="flex items-start gap-3">
                {isWarning ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                    <Cpu className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                    <h4 className={cn(
                        "font-medium mb-1",
                        isWarning ? "text-amber-900" : "text-emerald-900"
                    )}>
                        AI Adaptation Status
                    </h4>
                    <p className={cn(
                        "text-sm",
                        isWarning ? "text-amber-800" : "text-emerald-800"
                    )}>
                        {explanation}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function BroadcastTelemetry() {
    const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
    const [offloadingData, setOffloadingData] = useState<OffloadingData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchTelemetry = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch both telemetry and offloading data in parallel
            const [telemetryRes, offloadingRes] = await Promise.all([
                fetch('http://localhost:8000/telemetry/all'),
                fetch('http://localhost:8000/telemetry/offloading')
            ]);

            if (telemetryRes.ok) {
                const data = await telemetryRes.json();
                setTelemetry(data);
            }

            if (offloadingRes.ok) {
                const data = await offloadingRes.json();
                setOffloadingData(data);
            }

            if (!telemetryRes.ok && !offloadingRes.ok) {
                setError('Failed to fetch telemetry data');
            }
        } catch (err) {
            setError('Connection error - is the backend running?');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTelemetry();
        if (autoRefresh) {
            const interval = setInterval(fetchTelemetry, 2000); // Update every 2 seconds
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
            title="This metric is derived from receiver-side protocol parsing or validated digital-twin models."
        >
            {badge.emoji} {badge.label}
        </span>
    );

    const MetricCard = ({ metric }: { metric: TelemetryMetric }) => {
        const trend = getValueTrend(metric);

        return (
            <div className="metric-card hover:shadow-md transition-shadow">
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
                        Real-time traffic offloading and mobility metrics
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <DataExportControls />
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        Auto-refresh (2s)
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
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* AI Explanation Banner */}
            {offloadingData && (
                <AIExplanationBanner explanation={offloadingData.ai_explanation} />
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
                                {offloadingData && (
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase">Coverage</span>
                                        <p className="font-mono font-bold text-lg text-cyan-400">
                                            {offloadingData.mobility.overall_coverage_percent.toFixed(0)}%
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="text-xs text-slate-500">
                                Last updated: {new Date(telemetry.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Traffic Offloading Section */}
            {offloadingData && (
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-cyan-500" />
                        Traffic Offloading (Cellular → Broadcast)
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <CongestionGauge
                            level={offloadingData.traffic_offloading.unicast_congestion_level}
                            label="Cellular Network Congestion"
                            status={offloadingData.traffic_offloading.status}
                        />
                        <OffloadDial
                            ratio={offloadingData.traffic_offloading.offload_ratio}
                            reduction={offloadingData.traffic_offloading.latency_reduction_ms}
                            recommended={offloadingData.traffic_offloading.recommended_offload}
                        />
                        <div className="metric-card">
                            <div className="flex items-center gap-2 mb-2 text-slate-600">
                                <Activity className="h-4 w-4" />
                                <span className="text-sm font-medium">Unicast Performance</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                                <div>
                                    <div className="text-xl font-bold text-slate-900">
                                        {offloadingData.traffic_offloading.unicast_latency_ms.toFixed(0)}ms
                                    </div>
                                    <div className="text-xs text-slate-500">Latency</div>
                                </div>
                                <div>
                                    <div className={cn(
                                        "text-xl font-bold",
                                        offloadingData.traffic_offloading.packet_loss_probability < 0.02 ? "text-emerald-600" :
                                            offloadingData.traffic_offloading.packet_loss_probability < 0.05 ? "text-yellow-600" : "text-red-600"
                                    )}>
                                        {(offloadingData.traffic_offloading.packet_loss_probability * 100).toFixed(2)}%
                                    </div>
                                    <div className="text-xs text-slate-500">Packet Loss</div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                                Users offloaded: {offloadingData.traffic_offloading.users_offloaded}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobility Section */}
            {offloadingData && (
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Car className="h-5 w-5 text-amber-500" />
                        Connected Vehicles / Mobility
                    </h3>
                    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                        <MobileUsersIndicator
                            numMobile={offloadingData.mobility.num_mobile_users}
                            numStatic={offloadingData.mobility.num_static_users}
                            avgVelocity={offloadingData.mobility.average_velocity_kmh}
                            maxVelocity={offloadingData.mobility.max_velocity_kmh}
                            mobileCoverage={offloadingData.mobility.mobile_coverage_percent}
                            staticCoverage={offloadingData.mobility.static_coverage_percent}
                            simulationTime={offloadingData.mobility.simulation_time_s}
                        />
                        <div className="metric-card bg-gradient-to-br from-slate-50 to-slate-100">
                            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                                <Radio className="h-4 w-4" />
                                Coverage Comparison
                            </h4>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">Static Receivers</span>
                                        <span className="font-medium">{offloadingData.mobility.static_coverage_percent.toFixed(1)}%</span>
                                    </div>
                                    <div className="coverage-bar-container">
                                        <div
                                            className="coverage-bar coverage-bar-static"
                                            data-width={offloadingData.mobility.static_coverage_percent}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">Mobile Receivers</span>
                                        <span className="font-medium">{offloadingData.mobility.mobile_coverage_percent.toFixed(1)}%</span>
                                    </div>
                                    <div className="coverage-bar-container">
                                        <div
                                            className="coverage-bar coverage-bar-mobile"
                                            data-width={offloadingData.mobility.mobile_coverage_percent}
                                        />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                Coverage stability for moving receivers at speeds up to {offloadingData.mobility.max_velocity_kmh.toFixed(0)} km/h
                            </p>
                        </div>
                    </div>
                </div>
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
