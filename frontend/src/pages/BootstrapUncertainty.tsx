import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
    BarChart3, TrendingUp, AlertCircle, CheckCircle2,
    FileText, RefreshCw, Activity, Target,
    ArrowUpRight, Info, BookOpen
} from 'lucide-react';
import { API_BASE } from '../lib/api';

// ============================================================================
// Type Definitions
// ============================================================================

interface BootstrapResult {
    metric_name: string;
    point_estimate: number;
    ci_lower: number;
    ci_upper: number;
    ci_method: string;
    confidence_level: number;
    bias: number;
    standard_error: number;
    n_resamples: number;
    n_observations: number;
}

interface BootstrapDiagnostic {
    metric_name: string;
    cv_coefficient: number;
    skewness: number;
    kurtosis: number;
    normality_pvalue: number;
    is_converged: boolean;
    distribution_shape: string;
}

interface BootstrapAnalysis {
    timestamp: string;
    config: {
        n_resamples: number;
        confidence_level: number;
        block_length: string | number;
    };
    results: BootstrapResult[];
    diagnostics: BootstrapDiagnostic[];
    ieee_report_text: string;
    data_characteristics: {
        n_timeline_points: number;
        n_decisions: number;
        unique_intents: string[];
    };
}

interface DiagnosticsResponse {
    timestamp: string;
    overall_status: string;
    all_converged: boolean;
    convergence_threshold: number;
    diagnostics: BootstrapDiagnostic[];
    recommendations: string[];
}

// ============================================================================
// Utility Components
// ============================================================================

function MetricCard({ result }: { result: BootstrapResult }) {
    const isPercentage = result.metric_name.includes('pct') ||
        result.metric_name.includes('rate') ||
        result.metric_name.includes('coverage');

    const formatValue = (val: number) => {
        if (isPercentage && val <= 1) return `${(val * 100).toFixed(1)}%`;
        if (isPercentage) return `${val.toFixed(1)}%`;
        return val.toFixed(3);
    };

    const ciWidth = result.ci_upper - result.ci_lower;
    const precision = ciWidth / result.point_estimate * 100;

    return (
        <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500 capitalize">
                            {result.metric_name.replace(/_/g, ' ')}
                        </p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">
                            {formatValue(result.point_estimate)}
                        </p>
                    </div>
                    <div className={`p-2 rounded-lg ${precision < 10 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                        <Target className={`h-5 w-5 ${precision < 10 ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                </div>

                {/* Confidence Interval Visualization */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{formatValue(result.ci_lower)}</span>
                        <span className="font-medium text-slate-700">
                            {(result.confidence_level * 100).toFixed(0)}% CI
                        </span>
                        <span>{formatValue(result.ci_upper)}</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden relative">
                        {/* Confidence interval bar */}
                        <div
                            className="absolute h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                            style={{
                                left: '10%',
                                width: '80%'
                            }}
                        />
                        {/* Point estimate marker */}
                        <div
                            className="absolute top-0 w-1 h-full bg-slate-900"
                            style={{ left: '50%', transform: 'translateX(-50%)' }}
                        />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-100 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 uppercase">Method</p>
                        <p className="text-xs font-semibold text-slate-700">{result.ci_method}</p>
                    </div>
                    <div className="bg-slate-100 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 uppercase">SE</p>
                        <p className="text-xs font-semibold text-slate-700">{result.standard_error.toFixed(3)}</p>
                    </div>
                    <div className="bg-slate-100 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 uppercase">Bias</p>
                        <p className={`text-xs font-semibold ${Math.abs(result.bias) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {result.bias > 0 ? '+' : ''}{result.bias.toFixed(4)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DiagnosticCard({ diagnostic }: { diagnostic: BootstrapDiagnostic }) {
    return (
        <div className={`p-4 rounded-lg border ${diagnostic.is_converged
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
            }`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {diagnostic.is_converged ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                    )}
                    <span className="font-medium capitalize">
                        {diagnostic.metric_name.replace(/_/g, ' ')}
                    </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${diagnostic.is_converged
                    ? 'bg-emerald-200 text-emerald-800'
                    : 'bg-amber-200 text-amber-800'
                    }`}>
                    {diagnostic.is_converged ? 'Converged' : 'Needs More Samples'}
                </span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                    <p className="text-slate-500 text-xs">CV</p>
                    <p className={`font-mono font-medium ${diagnostic.cv_coefficient < 0.05 ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                        {diagnostic.cv_coefficient.toFixed(4)}
                    </p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs">Skewness</p>
                    <p className="font-mono font-medium text-slate-700">
                        {diagnostic.skewness.toFixed(3)}
                    </p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs">Kurtosis</p>
                    <p className="font-mono font-medium text-slate-700">
                        {diagnostic.kurtosis.toFixed(3)}
                    </p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs">Shape</p>
                    <p className="font-medium text-slate-700 capitalize">
                        {diagnostic.distribution_shape.replace(/_/g, ' ')}
                    </p>
                </div>
            </div>
        </div>
    );
}

function DistributionChart({ diagnostic }: { diagnostic: BootstrapDiagnostic }) {
    // Simulated normal distribution visualization
    const bars = 20;
    const heights = Array.from({ length: bars }, (_, i) => {
        const x = (i - bars / 2) / (bars / 4);
        // Apply skewness effect
        const skewFactor = 1 + diagnostic.skewness * 0.1 * (i / bars - 0.5);
        return Math.exp(-x * x / 2) * skewFactor * 100;
    });
    const maxHeight = Math.max(...heights);

    return (
        <div className="flex items-end justify-center gap-0.5 h-20">
            {heights.map((h, i) => (
                <div
                    key={i}
                    className="w-2 bg-blue-400 rounded-t transition-all hover:bg-blue-500"
                    style={{ height: `${(h / maxHeight) * 100}%` }}
                />
            ))}
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function BootstrapUncertainty() {
    const [analysis, setAnalysis] = useState<BootstrapAnalysis | null>(null);
    const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'results' | 'diagnostics' | 'report'>('results');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [analysisRes, diagnosticsRes] = await Promise.all([
                fetch(`${API_BASE}/bootstrap/analysis`),
                fetch(`${API_BASE}/bootstrap/diagnostics`)
            ]);

            const analysisData = await analysisRes.json();
            const diagnosticsRawData = await diagnosticsRes.json();

            if (analysisData.status === 'insufficient_data') {
                setError(analysisData.message);
                setAnalysis(null);
            } else {
                setAnalysis(analysisData);
            }

            if (diagnosticsRawData.status !== 'insufficient_data') {
                setDiagnosticsData(diagnosticsRawData);
            }
        } catch (err) {
            setError('Failed to fetch bootstrap analysis. Is the backend running?');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <BarChart3 className="h-16 w-16 text-blue-500 animate-bounce" />
                    <span className="text-slate-500">Computing Bootstrap Analysis...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-blue-600" />
                        Bootstrap Uncertainty Analysis
                    </h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Publication-quality statistical inference • BCa confidence intervals
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                    title="Refresh analysis"
                >
                    <RefreshCw className="h-5 w-5 text-slate-600" />
                </button>
            </div>

            {/* Error or No Data State */}
            {error && (
                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-amber-900">Insufficient Data for Bootstrap</h3>
                                <p className="text-amber-700 mt-1">{error}</p>
                                <p className="text-sm text-amber-600 mt-3">
                                    Run more AI decision simulations to accumulate at least 10 data points for reliable bootstrap estimation.
                                </p>
                                <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-300">
                                    <p className="text-sm font-medium text-amber-800 mb-2">
                                        🧪 Demo Mode: Seed Simulated Data
                                    </p>
                                    <p className="text-xs text-amber-700 mb-3">
                                        For demonstration purposes, you can generate synthetic data to test the bootstrap analysis.
                                        <strong> This is NOT real data</strong> - it is programmatically generated.
                                    </p>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await fetch(`${API_BASE}/learning/seed-demo`, { method: 'POST' });
                                                await fetchData();
                                            } catch (err) {
                                                console.error('Failed to seed demo data:', err);
                                            }
                                        }}
                                        className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                                    >
                                        ⚠️ Seed Simulated Data (Demo Only)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Simulated Data Warning Banner */}
            {analysis && analysis.data_characteristics.unique_intents.some(i =>
                ['maximize_coverage', 'minimize_latency', 'balanced', 'emergency'].includes(i)
            ) && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-red-800">⚠️ SIMULATED DATA - NOT REAL</h4>
                            <p className="text-sm text-red-700">
                                The bootstrap analysis below is based on <strong>programmatically generated simulation data</strong> for demonstration purposes only.
                                It does not represent actual system performance or real broadcast decisions.
                            </p>
                        </div>
                    </div>
                )}

            {/* Tab Navigation */}
            {analysis && (
                <>
                    <div className="flex gap-2 border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('results')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'results'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <TrendingUp className="h-4 w-4 inline mr-1" />
                            Results & CIs
                        </button>
                        <button
                            onClick={() => setActiveTab('diagnostics')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'diagnostics'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Activity className="h-4 w-4 inline mr-1" />
                            Diagnostics
                        </button>
                        <button
                            onClick={() => setActiveTab('report')}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'report'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <FileText className="h-4 w-4 inline mr-1" />
                            IEEE Report
                        </button>
                    </div>

                    {/* Results Tab */}
                    {activeTab === 'results' && (
                        <div className="space-y-6">
                            {/* Configuration Summary */}
                            <Card className="bg-slate-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Info className="h-4 w-4 text-slate-500" />
                                            <span className="text-slate-600">
                                                B = <span className="font-semibold">{analysis.config.n_resamples.toLocaleString()}</span> resamples
                                            </span>
                                        </div>
                                        <div className="text-slate-400">|</div>
                                        <div className="text-slate-600">
                                            Block length: <span className="font-semibold">{analysis.config.block_length}</span>
                                        </div>
                                        <div className="text-slate-400">|</div>
                                        <div className="text-slate-600">
                                            N = <span className="font-semibold">{analysis.data_characteristics.n_decisions}</span> decisions
                                        </div>
                                        <div className="text-slate-400">|</div>
                                        <div className="text-slate-600">
                                            Intents: {analysis.data_characteristics.unique_intents.join(', ') || 'N/A'}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Metric Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {analysis.results.map((result) => (
                                    <MetricCard key={result.metric_name} result={result} />
                                ))}
                            </div>

                            {/* Interpretation Guide */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        How to Interpret BCa Confidence Intervals
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-slate-600 space-y-2">
                                    <p>
                                        <strong>BCa (Bias-Corrected & Accelerated)</strong> intervals correct for:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li><strong>Bias:</strong> When the bootstrap distribution is shifted from the true parameter</li>
                                        <li><strong>Acceleration:</strong> When standard error varies with parameter value (skewed distributions)</li>
                                    </ul>
                                    <p className="mt-3">
                                        A <strong>95% CI of [89.1, 95.2]</strong> means: if we repeated the experiment many times and
                                        computed CIs, 95% of those intervals would contain the true population value.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Diagnostics Tab */}
                    {activeTab === 'diagnostics' && (
                        <div className="space-y-6">
                            {/* Overall Status */}
                            {diagnosticsData && (
                                <Card className={`${diagnosticsData.all_converged
                                    ? 'bg-emerald-50 border-emerald-200'
                                    : 'bg-amber-50 border-amber-200'
                                    }`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {diagnosticsData.all_converged ? (
                                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                                ) : (
                                                    <AlertCircle className="h-6 w-6 text-amber-600" />
                                                )}
                                                <div>
                                                    <h3 className={`font-semibold ${diagnosticsData.all_converged ? 'text-emerald-900' : 'text-amber-900'
                                                        }`}>
                                                        Bootstrap Status: {diagnosticsData.overall_status.replace(/_/g, ' ').toUpperCase()}
                                                    </h3>
                                                    <p className={`text-sm ${diagnosticsData.all_converged ? 'text-emerald-700' : 'text-amber-700'
                                                        }`}>
                                                        Convergence threshold: CV &lt; {diagnosticsData.convergence_threshold}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Diagnostic Cards */}
                            <div className="space-y-4">
                                {analysis.diagnostics.map((diag) => (
                                    <div key={diag.metric_name} className="space-y-3">
                                        <DiagnosticCard diagnostic={diag} />
                                        <Card className="p-4">
                                            <h4 className="text-sm font-medium text-slate-600 mb-2">
                                                Bootstrap Distribution Shape
                                            </h4>
                                            <DistributionChart diagnostic={diag} />
                                            <p className="text-xs text-slate-500 text-center mt-2">
                                                {diag.distribution_shape === 'symmetric'
                                                    ? 'Approximately normal - percentile intervals acceptable'
                                                    : `${diag.distribution_shape.replace('_', ' ')} - BCa correction recommended`}
                                            </p>
                                        </Card>
                                    </div>
                                ))}
                            </div>

                            {/* Recommendations */}
                            {diagnosticsData?.recommendations && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <ArrowUpRight className="h-4 w-4 text-blue-500" />
                                            Recommendations
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2">
                                            {diagnosticsData.recommendations.map((rec, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                                    <span className="text-blue-500 mt-0.5">•</span>
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* IEEE Report Tab */}
                    {activeTab === 'report' && (
                        <div className="space-y-6">
                            {/* Methods Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        IEEE Methods Section (Ready to Copy)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-slate-50 p-4 rounded-lg font-serif text-sm leading-relaxed text-slate-800 border border-slate-200">
                                        {analysis.ieee_report_text}
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(analysis.ieee_report_text)}
                                        className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Copy to Clipboard
                                    </button>
                                </CardContent>
                            </Card>

                            {/* Results Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium">
                                        Results Table (IEEE Format)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-semibold">Metric</th>
                                                    <th className="px-4 py-2 text-center font-semibold">M</th>
                                                    <th className="px-4 py-2 text-center font-semibold">95% CI</th>
                                                    <th className="px-4 py-2 text-center font-semibold">SE</th>
                                                    <th className="px-4 py-2 text-center font-semibold">N</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {analysis.results.map((r) => (
                                                    <tr key={r.metric_name} className="border-b border-slate-100">
                                                        <td className="px-4 py-3 capitalize">
                                                            {r.metric_name.replace(/_/g, ' ')}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            {r.point_estimate.toFixed(3)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            [{r.ci_lower.toFixed(3)}, {r.ci_upper.toFixed(3)}]
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono">
                                                            {r.standard_error.toFixed(4)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {r.n_observations}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Citation */}
                            <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="p-4">
                                    <h4 className="font-semibold text-blue-900 mb-2">Suggested Citation</h4>
                                    <p className="text-sm text-blue-800 font-serif">
                                        Bootstrap confidence intervals computed using the bias-corrected and accelerated (BCa)
                                        method (Efron & Tibshirani, 1993). Block bootstrap resampling was employed to preserve
                                        temporal autocorrelation in the KPI time-series (Künsch, 1989).
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Bootstrap vs Bayesian */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Info className="h-4 w-4 text-slate-500" />
                                        Why Bootstrap Over Bayesian?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-slate-600 space-y-3">
                                    <p>
                                        For this analysis context (N ≈ {analysis.data_characteristics.n_decisions} decisions),
                                        bootstrap is preferred because:
                                    </p>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <span><strong>No prior required:</strong> Avoids subjective prior specification for broadcast KPIs</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <span><strong>Distribution-free:</strong> Works for bounded [0,1] metrics without parametric assumptions</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <span><strong>IEEE standard:</strong> Frequentist CIs are the conventional reporting format for publications</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <span><strong>Adequate sample:</strong> N &gt; 30 provides stable bootstrap estimates</span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 py-4">
                Block Bootstrap • BCa Intervals • Stratified Sampling • Publication-Quality Statistical Inference
            </div>
        </div>
    );
}
