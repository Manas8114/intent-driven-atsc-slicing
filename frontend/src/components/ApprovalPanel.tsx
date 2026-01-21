import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/Card';
import { CheckCircle, XCircle, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { ApprovalCard } from './ui/ApprovalCard';
import { API_BASE } from '../lib/api';
import { EngineerAuth } from './ui/EngineerAuth';
import { DeploymentHistory } from './ui/DeploymentHistory';

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
}

interface DeploymentApprovalConsoleProps {
    className?: string;
}

export function ApprovalPanel({ className }: DeploymentApprovalConsoleProps) {
    const [pendingApprovals, setPendingApprovals] = useState<ApprovalRecord[]>([]);
    const [allApprovals, setAllApprovals] = useState<ApprovalRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [engineerName, setEngineerName] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'rejected' | 'emergency' | null, message: string }>({ type: null, message: '' });

    const fetchApprovals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [pendingRes, allRes] = await Promise.all([
                fetch(`${API_BASE}/approval/pending`),
                fetch(`${API_BASE}/approval/all`)
            ]);

            if (pendingRes.ok) {
                const data = await pendingRes.json();
                setPendingApprovals(data);
            }
            if (allRes.ok) {
                const data = await allRes.json();
                setAllApprovals(data);
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

    const handleApprove = async () => {
        if (!engineerName.trim() || !pendingApprovals[0]) return;
        const approvalId = pendingApprovals[0].id;

        try {
            const res = await fetch(`${API_BASE}/approval/approve`, {
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

    const handleReject = async () => {
        if (!engineerName.trim() || !pendingApprovals[0]) return;
        const approvalId = pendingApprovals[0].id;

        try {
            const res = await fetch(`${API_BASE}/approval/reject`, {
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
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">🔵 AI-Recommended</span>;
            case 'emergency_override':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">🔴 Emergency Override</span>;
            case 'deployed':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">✅ Deployed</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">❌ Rejected</span>;
            default:
                return null;
        }
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
                            <p className="font-semibold text-slate-800">
                                {feedbackMessage.type === 'success' && 'Configuration Deployed Successfully'}
                                {feedbackMessage.type === 'rejected' && 'AI Recommendation Rejected'}
                                {feedbackMessage.type === 'emergency' && 'Emergency Override Applied'}
                            </p>
                            <p className="text-sm mt-1 text-slate-600">{feedbackMessage.message}</p>
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

            {/* Main Approval Interface */}
            {currentPending ? (
                <div className="grid md:grid-cols-2 gap-6">
                    <ApprovalCard
                        pendingApproval={currentPending}
                        getStatusBadge={getStatusBadge}
                    />
                    <EngineerAuth
                        engineerName={engineerName}
                        setEngineerName={setEngineerName}
                        approvalNotes={approvalNotes}
                        setApprovalNotes={setApprovalNotes}
                        loading={loading}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRefresh={fetchApprovals}
                        disabled={false}
                    />
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

            {/* Decision History */}
            <DeploymentHistory history={allApprovals} />
        </div>
    );
}
