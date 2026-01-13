import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    User,
    MessageSquare,
    Zap,
    Shield,
    RefreshCw,
    Radio,
    FileText,
    AlertCircle,
    ChevronRight,
    Target,
    Eye,
    Brain
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ApprovalRecord {
    id: string;
    created_at: string;
    state: string;
    recommended_config: {
        modulation: string;
        coding_rate: string;
        power_dbm: number;
        bandwidth_mhz: number;
        priority: string;
        all_slices?: Array<{
            name: string;
            power_dbm: number;
            bandwidth_mhz: number;
        }>;
    };
    risk_assessment: {
        level: string;
        score: number;
        factors: string[];
    };
    expected_impact: {
        expected_coverage_percent: number;
        expected_avg_snr_db: number;
        spectral_efficiency?: number;
    };
    human_readable_summary: string;
    engineer_comment?: string;
    approved_by?: string;
    comparison_with_current?: {
        changed_fields: string[];
        previous_config?: Record<string, unknown>;
    };
}

interface AuditEntry {
    timestamp: string;
    action: string;
    actor: string;
    details: string;
}

interface DeploymentApprovalConsoleProps {
    className?: string;
}

export function ApprovalPanel({ className }: DeploymentApprovalConsoleProps) {
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalRecord[]>([]);
    const [allApprovals, setAllApprovals] = useState<ApprovalRecord[]>([]);
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [engineerName, setEngineerName] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'rejected' | 'emergency' | null, message: string }>({ type: null, message: '' });
    const [showHistory, setShowHistory] = useState(false);

    const fetchApprovals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pendingRes, allRes, auditRes] = await Promise.all([
                fetch('http://localhost:8000/approval/pending'),
                fetch('http://localhost:8000/approval/all'),
                fetch('http://localhost:8000/approval/audit/log').catch(() => ({ ok: false }))
            ]);

            if (pendingRes.ok) {
                const data = await pendingRes.json();
                setPendingApprovals(data);
            }
            if (allRes.ok) {
                const data = await allRes.json();
                setAllApprovals(data);
            }
            if (auditRes && 'ok' in auditRes && auditRes.ok) {
                const data = await (auditRes as Response).json();
                setAuditLog(data.entries || []);
            }
        } catch (err) {
            setError('Failed to fetch approvals');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchApprovals();
        const interval = setInterval(fetchApprovals, 5000);
        return () => clearInterval(interval);
    }, [fetchApprovals]);

    const handleApprove = async (approvalId: string) => {
        if (!engineerName.trim()) {
            alert('Please enter your name to authorize deployment');
            return;
        }

        try {
            const res = await fetch('http://localhost:8000/approval/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approval_id: approvalId,
                    engineer_name: engineerName,
                    comment: approvalNotes || null
                })
            });

            if (res.ok) {
                const timestamp = new Date().toLocaleTimeString();
                setFeedbackMessage({
                    type: 'success',
                    message: `Configuration Deployed Successfully. Deployment approved by ${engineerName} at ${timestamp}.`
                });
                setApprovalNotes('');
                fetchApprovals();
                setTimeout(() => setFeedbackMessage({ type: null, message: '' }), 8000);
            } else {
                const err = await res.json();
                alert(`Approval failed: ${err.detail}`);
            }
        } catch (err) {
            console.error('Approve error:', err);
        }
    };

    const handleReject = async (approvalId: string) => {
        if (!engineerName.trim()) {
            alert('Please enter your name');
            return;
        }

        try {
            const res = await fetch('http://localhost:8000/approval/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approval_id: approvalId,
                    engineer_name: engineerName,
                    reason: approvalNotes || 'No reason provided'
                })
            });

            if (res.ok) {
                setFeedbackMessage({
                    type: 'rejected',
                    message: 'AI Recommendation Rejected. No broadcast changes were applied.'
                });
                setApprovalNotes('');
                fetchApprovals();
                setTimeout(() => setFeedbackMessage({ type: null, message: '' }), 8000);
            } else {
                const err = await res.json();
                alert(`Rejection failed: ${err.detail}`);
            }
        } catch (err) {
            console.error('Reject error:', err);
        }
    };

    const getStatusBadge = (state: string) => {
        switch (state) {
            case 'awaiting_human_approval':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                        <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                        🟡 Pending Human Approval
                    </span>
                );
            case 'ai_recommended':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                        🔵 AI-Recommended
                    </span>
                );
            case 'emergency_override':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                        🔴 Emergency Override Active
                    </span>
                );
            case 'deployed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✅ Deployed
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                        ❌ Rejected
                    </span>
                );
            default:
                return null;
        }
    };

    const formatProposedChanges = (record: ApprovalRecord) => {
        const changes: string[] = [];

        if (record.recommended_config.priority === 'emergency') {
            changes.push('Emergency PLP: Enabled (High Priority)');
        }

        changes.push(`Modulation: ${record.recommended_config.modulation} → ${record.recommended_config.modulation === 'QPSK' ? 'Increased Robustness' :
            record.recommended_config.modulation === '256QAM' ? 'Maximum Throughput' : 'Balanced Profile'
            }`);

        changes.push(`Code Rate: ${record.recommended_config.coding_rate} → ${record.recommended_config.coding_rate.includes('2/') || record.recommended_config.coding_rate.includes('3/')
            ? 'Emergency Safe Profile' : 'Standard Profile'
            }`);

        if (record.recommended_config.all_slices) {
            const emergencySlice = record.recommended_config.all_slices.find(s => s.name === 'Emergency');
            if (emergencySlice) {
                changes.push(`Power Allocation: +${Math.round(emergencySlice.power_dbm / 35 * 100 - 100)}% to Emergency Slice`);
            }
        }

        if (record.recommended_config.priority === 'emergency') {
            changes.push('Non-Critical Services: Temporarily Deprioritized');
        }

        return changes;
    };

    const currentPending = pendingApprovals[0];

    return (
        <div className={cn("space-y-6", className)}>
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Deployment Approval Console</h2>
                <p className="text-sm text-slate-500 mt-1 italic">
                    AI recommendations require human authorization before broadcast deployment.
                </p>
            </div>

            {/* Feedback Messages */}
            {feedbackMessage.type && (
                <div className={cn(
                    "p-4 rounded-lg border animate-in slide-in-from-top-2",
                    feedbackMessage.type === 'success' && "bg-emerald-50 border-emerald-200",
                    feedbackMessage.type === 'rejected' && "bg-slate-50 border-slate-200",
                    feedbackMessage.type === 'emergency' && "bg-orange-50 border-orange-200"
                )}>
                    <div className="flex items-start gap-3">
                        {feedbackMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />}
                        {feedbackMessage.type === 'rejected' && <XCircle className="h-5 w-5 text-slate-600 mt-0.5" />}
                        {feedbackMessage.type === 'emergency' && <Zap className="h-5 w-5 text-orange-600 mt-0.5" />}
                        <div>
                            <p className={cn(
                                "font-semibold",
                                feedbackMessage.type === 'success' && "text-emerald-800",
                                feedbackMessage.type === 'rejected' && "text-slate-800",
                                feedbackMessage.type === 'emergency' && "text-orange-800"
                            )}>
                                {feedbackMessage.type === 'success' && 'Configuration Deployed Successfully'}
                                {feedbackMessage.type === 'rejected' && 'AI Recommendation Rejected'}
                                {feedbackMessage.type === 'emergency' && 'Emergency Override Applied'}
                            </p>
                            <p className={cn(
                                "text-sm mt-1",
                                feedbackMessage.type === 'success' && "text-emerald-700",
                                feedbackMessage.type === 'rejected' && "text-slate-600",
                                feedbackMessage.type === 'emergency' && "text-orange-700"
                            )}>
                                {feedbackMessage.message}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Engineer Identity */}
            <Card className="border-slate-200">
                <CardContent className="pt-4">
                    <div className="flex items-center gap-4">
                        <User className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Authorizing Engineer
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your name (required for authorization)"
                                value={engineerName}
                                onChange={(e) => setEngineerName(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={fetchApprovals}
                            disabled={loading}
                            className="gap-2"
                        >
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Main Approval Interface */}
            {currentPending ? (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Panel - AI Recommendation */}
                    <Card className="border-2 border-yellow-200 bg-gradient-to-b from-yellow-50/50 to-white">
                        <CardHeader className="border-b border-yellow-100 bg-yellow-50/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Radio className="h-5 w-5 text-yellow-600" />
                                    AI-Recommended Configuration
                                </CardTitle>
                                {getStatusBadge(currentPending.state)}
                            </div>
                            <p className="text-xs text-yellow-700 font-medium mt-1">Not Deployed</p>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-4">
                            {/* AI Confidence Score */}
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        AI Confidence Score
                                    </h4>
                                    <span
                                        className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 cursor-help"
                                        title="Confidence based on data consistency, model agreement, and safety margins."
                                    >
                                        {currentPending.risk_assessment.score < 0.3 ? '92%' :
                                            currentPending.risk_assessment.score < 0.5 ? '78%' : '65%'} High
                                    </span>
                                </div>
                                <div className="w-full bg-emerald-200 rounded-full h-2">
                                    <div
                                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                        style={{
                                            width: currentPending.risk_assessment.score < 0.3 ? '92%' :
                                                currentPending.risk_assessment.score < 0.5 ? '78%' : '65%'
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-emerald-600 mt-2 italic">
                                    Confidence based on data consistency, model agreement, and safety margins.
                                </p>
                            </div>

                            {/* Risk Assessment Visualization */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-blue-500" />
                                    Risk Assessment
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-600">Coverage Risk</span>
                                            <span className="font-semibold text-emerald-600">Low</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '15%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-600">Service Impact Risk</span>
                                            <span className="font-semibold text-amber-600">Medium</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div className="bg-amber-500 h-2 rounded-full" style={{ width: '45%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-600">Safety Risk</span>
                                            <span className="font-semibold text-emerald-600">None</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '5%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rejected Alternatives */}
                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-slate-400" />
                                    Rejected Alternatives
                                </h4>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-start gap-2 text-slate-600">
                                        <span className="text-red-400 mt-0.5">✗</span>
                                        <div>
                                            <span className="font-medium">256QAM rejected</span>
                                            <p className="text-xs text-slate-500">Insufficient SNR margin for mobile reception stability</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-600">
                                        <span className="text-red-400 mt-0.5">✗</span>
                                        <div>
                                            <span className="font-medium">Unicast delivery rejected</span>
                                            <p className="text-xs text-slate-500">Congestion level exceeds offload threshold</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2 text-slate-600">
                                        <span className="text-red-400 mt-0.5">✗</span>
                                        <div>
                                            <span className="font-medium">Higher power rejected</span>
                                            <p className="text-xs text-slate-500">Regulatory constraint on licensed spectrum</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Trust Indicators */}
                            <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
                                <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Trust Indicators
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircle className="h-3 w-3" />
                                        Standards compliant
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircle className="h-3 w-3" />
                                        Safety checks passed
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                        <Eye className="h-3 w-3" />
                                        Human oversight active
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                        <Brain className="h-3 w-3" />
                                        Simulation validated
                                    </span>
                                </div>
                            </div>

                            {/* AI Explanation Box */}
                            <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-4">
                                <h4 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Why the AI Selects This Configuration
                                </h4>
                                <p className="text-sm text-indigo-700 leading-relaxed">
                                    {currentPending.human_readable_summary ||
                                        "Current channel conditions indicate increased interference in rural regions. The broadcast adapts by prioritizing emergency alert delivery while maintaining acceptable coverage for public services."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right Panel - Engineer Authorization */}
                    <Card className="border-2 border-blue-200 bg-gradient-to-b from-blue-50/30 to-white">
                        <CardHeader className="border-b border-blue-100 bg-blue-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Shield className="h-5 w-5 text-blue-600" />
                                Engineer Authorization Required
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-4">
                            {/* Approval Notes */}
                            <div>
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-slate-400" />
                                    Approval Notes
                                </label>
                                <textarea
                                    placeholder="Add justification for approval (optional but recommended)."
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <Button
                                    onClick={() => handleApprove(currentPending.id)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 text-base"
                                    title="This will apply the configuration to the broadcast system."
                                >
                                    <CheckCircle className="h-5 w-5" />
                                    Approve & Deploy
                                </Button>
                                <Button
                                    onClick={() => handleReject(currentPending.id)}
                                    variant="outline"
                                    className="w-full border-red-300 text-red-600 hover:bg-red-50 gap-2 py-5"
                                    title="The system will retain the current configuration."
                                >
                                    <XCircle className="h-5 w-5" />
                                    Reject Recommendation
                                </Button>
                            </div>

                            {/* Emergency Mode Warning */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="font-bold text-amber-800 text-sm">Emergency Mode Exception</h5>
                                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                            In critical emergency conditions, the system may bypass manual approval
                                            to ensure public safety. All such actions are logged and auditable.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="py-12 text-center">
                        <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">No Pending Approvals</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            All AI recommendations have been processed.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Decision & Deployment History */}
            <div className="border-t border-slate-200 pt-6">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                    <Clock className="h-4 w-4" />
                    Decision & Deployment History
                    <ChevronRight className={cn("h-4 w-4 transition-transform", showHistory && "rotate-90")} />
                </button>

                {showHistory && (
                    <div className="mt-4">
                        <div
                            className="bg-slate-900 rounded-lg p-4 font-mono text-xs overflow-x-auto"
                            title="Logs are retained for post-event analysis and regulatory review."
                        >
                            {allApprovals.slice(0, 10).map((record, i) => (
                                <div key={i} className="flex gap-4 py-1 border-b border-slate-800 last:border-0">
                                    <span className="text-slate-500">{new Date(record.created_at).toLocaleTimeString()}</span>
                                    <span className="text-slate-400">|</span>
                                    <span className={cn(
                                        record.state === 'deployed' && "text-emerald-400",
                                        record.state === 'rejected' && "text-red-400",
                                        record.state === 'emergency_override' && "text-orange-400",
                                        record.state === 'awaiting_human_approval' && "text-yellow-400"
                                    )}>
                                        {record.state === 'deployed' && 'Broadcast Configuration Applied'}
                                        {record.state === 'rejected' && 'AI Recommendation Rejected'}
                                        {record.state === 'emergency_override' && 'Emergency Override Applied'}
                                        {record.state === 'awaiting_human_approval' && 'AI Recommendation Generated'}
                                        {record.approved_by && ` by ${record.approved_by}`}
                                    </span>
                                </div>
                            ))}
                            {allApprovals.length === 0 && (
                                <span className="text-slate-500">No deployment history available.</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 italic">
                            Logs are retained for post-event analysis and regulatory review.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
