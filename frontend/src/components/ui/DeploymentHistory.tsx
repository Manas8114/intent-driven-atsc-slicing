import { useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ApprovalRecord {
    created_at: string;
    state: string;
    approved_by?: string;
}

interface DeploymentHistoryProps {
    history: ApprovalRecord[];
}

export function DeploymentHistory({ history }: DeploymentHistoryProps) {
    const [showHistory, setShowHistory] = useState(false);

    return (
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
                        <div className="space-y-1">
                            {history.slice(0, 10).map((record, i) => (
                                <div key={i} className="flex gap-4 py-1 border-b border-slate-800 last:border-0 items-center">
                                    <span className="text-slate-500 whitespace-nowrap">
                                        {new Date(record.created_at).toLocaleTimeString()}
                                    </span>
                                    <span className="text-slate-600">|</span>
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
                        </div>
                        {history.length === 0 && (
                            <span className="text-slate-500">No deployment history available.</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 italic">
                        Logs are retained for post-event analysis and regulatory review.
                    </p>
                </div>
            )}
        </div>
    );
}
