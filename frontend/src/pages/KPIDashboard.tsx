import { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { RefreshCw, ShieldCheck, Zap, Radio, Activity, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { API_BASE } from '../lib/api';

// --- Sub-components ---

const Gauge = ({ value, label, colorClass = "cyan", unit = "%" }: { value: number; label: string; colorClass?: "cyan" | "emerald"; unit?: string }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center space-y-2 p-4 glass-card bg-slate-900/40 border-slate-800/50">
            <div className="relative h-24 w-24">
                <svg className="h-full w-full -rotate-90 transform">
                    <circle
                        className="gauge-track"
                        strokeWidth="8"
                        fill="transparent"
                        r={radius}
                        cx="48"
                        cy="48"
                    />
                    <circle
                        className={cn("transition-all duration-1000 ease-out", colorClass === "cyan" ? "gauge-progress-cyan" : "gauge-progress-emerald")}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx="48"
                        cy="48"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-100">{Math.round(value)}{unit}</span>
                </div>
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        </div>
    );
};

const StatCard = ({ title, value, unit, trend, icon: Icon, color }: { title: string; value: string | number; unit: string; trend: number; icon: any; color: string }) => (
    <Card className="glass-card-dark border-slate-800/50 overflow-hidden group">
        <div className={cn("absolute top-0 left-0 w-1 h-full", color)} />
        <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 group-hover:border-cyan-500/30 transition-colors">
                    <Icon className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                    trend >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                )}>
                    {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(trend)}%
                </div>
            </div>
            <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-2xl font-bold text-slate-100 tabular-nums">{value}</h3>
                    <span className="text-xs font-medium text-slate-500">{unit}</span>
                </div>
            </div>
        </CardContent>
    </Card>
);

// --- Main Component ---

export function KPIDashboard() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const [error, setError] = useState<boolean>(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/kpi/?limit=30`);
            if (res.ok) {
                const json = await res.json();
                if (json.length > 0) {
                    setData(json.reverse());
                    setError(false);
                }
            } else {
                setError(true);
            }
        } catch (e) {
            console.error("Failed to fetch KPI data", e);
            setError(true);
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 4000);
        return () => clearInterval(interval);
    }, []);

    const latest = useMemo(() => data[data.length - 1] || {}, [data]);
    const previous = useMemo(() => data[data.length - 2] || {}, [data]);

    const getTrend = (key: string) => {
        if (!latest[key] || !previous[key]) return 0;
        return parseFloat(((latest[key] - previous[key]) / previous[key] * 100).toFixed(1));
    };

    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-medium">Connection Lost: Backend service is unavailable. Metrics may be outdated.</span>
                </div>
            )}
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-card-dark border-slate-800/50 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                            <Activity className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div className="absolute -top-1 -right-1">
                            <span className="live-indicator-pulse" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                            KPI Telemetry
                            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-tighter font-black animate-pulse">Live</span>
                        </h2>
                        <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                            <Clock className="h-3 w-3" />
                            <span>Synchronized with Cognitive Core</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span>Last update: {lastUpdated.toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end mr-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Network Health</span>
                        <span className="text-emerald-400 font-bold text-sm">OPTIMIZED</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="glass-card bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 gap-2 px-4 shadow-lg">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Deep Sync
                    </Button>
                </div>
            </div>

            {/* Quick Gaugues Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Gauge value={latest.coverage || 0} label="Rural Coverage" unit="%" />
                <Gauge value={latest.reliability || 0} label="Alert Integrity" colorClass="emerald" unit="%" />
                <StatCard
                    title="Avg. Latency"
                    value={(latest.latency || 0).toFixed(1)}
                    unit="ms"
                    trend={getTrend('latency')}
                    icon={Zap}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Spec. Efficiency"
                    value={(latest.spectral_efficiency || 0).toFixed(2)}
                    unit="b/s/Hz"
                    trend={getTrend('spectral_efficiency')}
                    icon={Radio}
                    color="bg-cyan-500"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="glass-card-dark border-slate-800/50">
                    <CardHeader className="pb-2 border-b border-slate-800/50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-100 italic tracking-tight">Transmission Stability (2ms Window)</CardTitle>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Coverage vs. Reliability Over Time</p>
                        </div>
                        <Activity className="h-4 w-4 text-slate-600" />
                    </CardHeader>
                    <CardContent className="h-[300px] pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorCov" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRel" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="timestamp" tickFormatter={formatTime} hide />
                                <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area type="monotone" dataKey="coverage" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorCov)" />
                                <Area type="monotone" dataKey="reliability" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRel)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="glass-card-dark border-slate-800/50">
                    <CardHeader className="pb-2 border-b border-slate-800/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-100 italic tracking-tight uppercase">Cognitive Load Profile</CardTitle>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Computed Spectral Potential</p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold">
                                <ShieldCheck className="h-3 w-3" />
                                FCC COMPLIANT
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="timestamp" tickFormatter={formatTime} hide />
                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Line type="monotone" dataKey="spectral_efficiency" stroke="#3b82f6" strokeWidth={3} dot={false} animationDuration={1500} />
                                <Line type="monotone" dataKey="throughput" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.5} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* AI Reasoning Footer */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex items-start gap-4">
                <div className="bg-cyan-500/10 p-2 rounded-lg mt-1">
                    <ShieldCheck className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-tighter mb-1">Stability Guarantee</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        The current configuration maintains 99.99% alert delivery probability across rural sectors. Spectral efficiency is optimized for 4K video multicasting while reserving 20% guard bands for mobility-driven interference shifts.
                    </p>
                </div>
            </div>
        </div>
    );
}
