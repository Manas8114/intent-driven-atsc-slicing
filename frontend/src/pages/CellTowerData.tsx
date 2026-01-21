import { useState, useEffect, useCallback } from 'react';
import {
    Radio, MapPin, AlertTriangle, Activity, RefreshCw,
    Signal, Wifi, TrendingUp, ChevronDown, ChevronUp, Info
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface DatasetStatus {
    available: boolean;
    path?: string;
    size_mb?: number;
    format?: string;
}

interface DatasetStats {
    available: boolean;
    sampled_rows?: number;
    radio_types?: Record<string, number>;
    countries?: Record<string, { name: string; count: number }>;
    lat_range?: [number, number];
    lon_range?: [number, number];
    avg_range_m?: number;
}

interface TowerInfo {
    radio: string;
    mcc: number;
    net: number;
    lat: number;
    lon: number;
    range_km: number;
    samples: number;
}

interface RegionQuery {
    center_lat: number;
    center_lon: number;
    radius_km: number;
    tower_count: number;
    towers: TowerInfo[];
    radio_breakdown: Record<string, number>;
}

interface InterferenceAnalysis {
    point_lat: number;
    point_lon: number;
    total_interference_db: number;
    tower_count: number;
    nearest_tower_km: number | null;
    interference_sources: Array<{
        radio: string;
        distance_km: number;
        interference_dbm: number;
    }>;
    lte_risk: 'high' | 'medium' | 'low';
}

// ============================================================================
// Component
// ============================================================================

export function CellTowerData() {
    const [status, setStatus] = useState<DatasetStatus | null>(null);
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [regionData, setRegionData] = useState<RegionQuery | null>(null);
    const [interference, setInterference] = useState<InterferenceAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'query' | 'interference'>('overview');

    // Query parameters
    const [queryLat, setQueryLat] = useState(52.52);  // Berlin
    const [queryLon, setQueryLon] = useState(13.405);
    const [queryRadius, setQueryRadius] = useState(30);
    const [expandedSection, setExpandedSection] = useState<string | null>('radio');

    const API_BASE = 'http://localhost:8000';

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/cell-towers/status`);
            const data = await res.json();
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch status:', error);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/cell-towers/statistics?sample_size=50000`);
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    const fetchRegion = useCallback(async () => {
        try {
            const res = await fetch(
                `${API_BASE}/cell-towers/region?lat=${queryLat}&lon=${queryLon}&radius_km=${queryRadius}&max_towers=100`
            );
            const data = await res.json();
            setRegionData(data);
        } catch (error) {
            console.error('Failed to fetch region:', error);
        }
    }, [queryLat, queryLon, queryRadius]);

    const fetchInterference = useCallback(async () => {
        try {
            const res = await fetch(
                `${API_BASE}/cell-towers/interference?broadcast_lat=${queryLat}&broadcast_lon=${queryLon}&receiver_lat=${queryLat + 0.05}&receiver_lon=${queryLon + 0.05}&radius_km=${queryRadius}`
            );
            const data = await res.json();
            setInterference(data);
        } catch (error) {
            console.error('Failed to fetch interference:', error);
        }
    }, [queryLat, queryLon, queryRadius]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchStatus(), fetchStats()]);
        setLoading(false);
    }, [fetchStatus, fetchStats]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!status?.available) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    <div>
                        <h3 className="font-semibold text-yellow-800">Dataset Not Found</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            Cell tower data file not found at expected location.
                            Please ensure the OpenCellID CSV is in the data/ directory.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                        <Radio className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Cell Tower Data</h1>
                        <p className="text-sm text-slate-500">Real-world cellular interference modeling</p>
                    </div>
                </div>
                <button
                    onClick={fetchAll}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {/* Dataset Info Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">OpenCellID Dataset</h2>
                        <p className="text-slate-300 text-sm mt-1">
                            {status.size_mb?.toFixed(1)} MB • {stats?.sampled_rows?.toLocaleString()}+ towers sampled
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm text-green-400">Available</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200">
                {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'query', label: 'Region Query', icon: MapPin },
                    { id: 'interference', label: 'Interference Analysis', icon: Signal }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={Radio}
                            label="Total Sampled"
                            value={stats.sampled_rows?.toLocaleString() || '0'}
                            subtext="From 5M+ records"
                        />
                        <StatCard
                            icon={Wifi}
                            label="Radio Types"
                            value={Object.keys(stats.radio_types || {}).length}
                            subtext="GSM, LTE, UMTS..."
                        />
                        <StatCard
                            icon={MapPin}
                            label="Countries"
                            value={Object.keys(stats.countries || {}).length}
                            subtext="By MCC code"
                        />
                        <StatCard
                            icon={TrendingUp}
                            label="Avg Range"
                            value={`${((stats.avg_range_m || 0) / 1000).toFixed(1)} km`}
                            subtext="Tower coverage"
                        />
                    </div>

                    {/* Radio Types Breakdown */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <button
                            onClick={() => setExpandedSection(expandedSection === 'radio' ? null : 'radio')}
                            className="flex items-center justify-between w-full"
                        >
                            <h3 className="text-lg font-semibold text-slate-800">Radio Technology Breakdown</h3>
                            {expandedSection === 'radio' ? <ChevronUp /> : <ChevronDown />}
                        </button>

                        {expandedSection === 'radio' && stats.radio_types && (
                            <div className="mt-4 space-y-2">
                                {Object.entries(stats.radio_types)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([type, count]) => (
                                        <RadioTypeBar
                                            key={type}
                                            type={type}
                                            count={count}
                                            total={stats.sampled_rows || 1}
                                        />
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* LTE Risk Warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-amber-800">LTE 700 MHz Band Adjacency</h4>
                                <p className="text-sm text-amber-700 mt-1">
                                    LTE towers operating in the 700 MHz band are adjacent to ATSC 3.0 broadcast
                                    frequencies (470-698 MHz). This can cause interference that affects
                                    broadcast reception quality.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Query Tab */}
            {activeTab === 'query' && (
                <div className="space-y-6">
                    {/* Query Form */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Search Cell Towers</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label htmlFor="query-latitude" className="block text-sm text-slate-500 mb-1">Latitude</label>
                                <input
                                    id="query-latitude"
                                    type="number"
                                    step="0.001"
                                    value={queryLat}
                                    onChange={(e) => setQueryLat(parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="query-longitude" className="block text-sm text-slate-500 mb-1">Longitude</label>
                                <input
                                    id="query-longitude"
                                    type="number"
                                    step="0.001"
                                    value={queryLon}
                                    onChange={(e) => setQueryLon(parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="query-radius" className="block text-sm text-slate-500 mb-1">Radius (km)</label>
                                <input
                                    id="query-radius"
                                    type="number"
                                    value={queryRadius}
                                    onChange={(e) => setQueryRadius(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={fetchRegion}
                                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Query Results */}
                    {regionData && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    Results: {regionData.tower_count} towers found
                                </h3>
                                <span className="text-sm text-slate-500">
                                    Within {regionData.radius_km} km
                                </span>
                            </div>

                            {/* Radio Breakdown */}
                            <div className="flex gap-2 mb-4">
                                {Object.entries(regionData.radio_breakdown).map(([type, count]) => (
                                    <span
                                        key={type}
                                        className="px-3 py-1 bg-slate-100 rounded-full text-sm"
                                    >
                                        {type}: {count}
                                    </span>
                                ))}
                            </div>

                            {/* Tower Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-2 text-slate-500">Radio</th>
                                            <th className="text-left py-2 text-slate-500">MCC</th>
                                            <th className="text-left py-2 text-slate-500">Location</th>
                                            <th className="text-left py-2 text-slate-500">Range</th>
                                            <th className="text-left py-2 text-slate-500">Samples</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {regionData.towers.slice(0, 10).map((tower, i) => (
                                            <tr key={i} className="border-b border-slate-100">
                                                <td className="py-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tower.radio === 'LTE' ? 'bg-green-100 text-green-700' :
                                                        tower.radio === 'GSM' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        {tower.radio}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-slate-600">{tower.mcc}</td>
                                                <td className="py-2 text-slate-600">
                                                    {tower.lat.toFixed(4)}, {tower.lon.toFixed(4)}
                                                </td>
                                                <td className="py-2 text-slate-600">{tower.range_km.toFixed(1)} km</td>
                                                <td className="py-2 text-slate-600">{tower.samples}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Interference Tab */}
            {activeTab === 'interference' && (
                <div className="space-y-6">
                    {/* Analyze Button */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Interference Analysis</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Analyze cellular interference at a receiver location based on nearby cell towers.
                            Uses path loss modeling and LTE 700MHz band proximity assessment.
                        </p>
                        <button
                            onClick={fetchInterference}
                            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-colors"
                        >
                            Run Analysis
                        </button>
                    </div>

                    {/* Interference Results */}
                    {interference && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white rounded-xl border border-slate-200 p-6">
                                    <div className="text-sm text-slate-500 mb-1">Total Interference</div>
                                    <div className="text-3xl font-bold text-slate-800">
                                        {interference.total_interference_db} dB
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">Aggregate power at receiver</div>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 p-6">
                                    <div className="text-sm text-slate-500 mb-1">Nearest Tower</div>
                                    <div className="text-3xl font-bold text-slate-800">
                                        {interference.nearest_tower_km?.toFixed(2) || 'N/A'} km
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">Distance to closest interferer</div>
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 p-6">
                                    <div className="text-sm text-slate-500 mb-1">LTE Risk Level</div>
                                    <div className="mt-2">
                                        <RiskBadge risk={interference.lte_risk} />
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2">Based on 700MHz band density</div>
                                </div>
                            </div>

                            {/* Top Interferers */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h4 className="font-semibold text-slate-800 mb-4">Top Interference Sources</h4>
                                <div className="space-y-3">
                                    {interference.interference_sources.map((source, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${source.radio === 'LTE' ? 'bg-green-100 text-green-700' :
                                                    source.radio === 'GSM' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-purple-100 text-purple-700'
                                                    }`}>
                                                    {source.radio}
                                                </span>
                                                <span className="text-slate-600">{source.distance_km} km away</span>
                                            </div>
                                            <span className="font-mono text-slate-700">
                                                {source.interference_dbm} dBm
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Interpretation */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-blue-800">Interpretation</h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            {interference.lte_risk === 'high'
                                                ? 'High LTE tower density in this area may cause noticeable interference with ATSC 3.0 broadcasts. Consider adjusting broadcast parameters or using interference mitigation.'
                                                : interference.lte_risk === 'medium'
                                                    ? 'Moderate cellular presence. Some interference expected but manageable with standard approaches.'
                                                    : 'Low cellular interference expected. This is a favorable environment for broadcast reception.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ========================================================================
// Sub-components
// ========================================================================

const RadioTypeBar = ({ type, count, total }: { type: string; count: number; total: number }) => {
    const percentage = (count / total) * 100;
    const colors: Record<string, string> = {
        GSM: 'bg-blue-500',
        LTE: 'bg-green-500',
        UMTS: 'bg-purple-500',
        CDMA: 'bg-orange-500',
        NR: 'bg-cyan-500'
    };

    return (
        <div className="flex items-center gap-3 py-2">
            <span className="w-16 text-sm font-medium text-slate-700">{type}</span>
            <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colors[type] || 'bg-slate-400'} transition-all duration-500`}
                    style={{ width: `${percentage}%` }} // eslint-disable-line react-dom/no-unsafe-inline-styles
                />
            </div>
            <span className="w-20 text-right text-sm text-slate-600">
                {count.toLocaleString()} ({percentage.toFixed(1)}%)
            </span>
        </div>
    );
};

const StatCard = ({ icon: Icon, label, value, subtext }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string
}) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
                <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-slate-500">{label}</span>
        </div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
    </div>
);

const RiskBadge = ({ risk }: { risk: 'high' | 'medium' | 'low' }) => {
    const styles = {
        high: 'bg-red-100 text-red-700 border-red-200',
        medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        low: 'bg-green-100 text-green-700 border-green-200'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[risk]}`}>
            {risk.toUpperCase()} Risk
        </span>
    );
};
