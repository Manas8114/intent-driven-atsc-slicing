import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Shield, User, RefreshCw, MessageSquare, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EngineerAuthProps {
    engineerName: string;
    setEngineerName: (name: string) => void;
    approvalNotes: string;
    setApprovalNotes: (notes: string) => void;
    loading: boolean;
    onApprove: () => void;
    onReject: () => void;
    onRefresh: () => void;
    disabled: boolean;
}

export function EngineerAuth({
    engineerName,
    setEngineerName,
    approvalNotes,
    setApprovalNotes,
    loading,
    onApprove,
    onReject,
    onRefresh,
    disabled
}: EngineerAuthProps) {
    return (
        <Card className="border-2 border-blue-200 bg-gradient-to-b from-blue-50/30 to-white">
            <CardHeader className="border-b border-blue-100 bg-blue-50/50">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Engineer Authorization Required
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
                {/* Engineer Identity */}
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <User className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Authorizing Engineer
                            </label>
                            <input
                                type="text"
                                placeholder="Enter your name (required)"
                                value={engineerName}
                                onChange={(e) => setEngineerName(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={onRefresh}
                            disabled={loading}
                            className="gap-2"
                        >
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>

                    {/* Approval Notes */}
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
                        onClick={onApprove}
                        disabled={disabled || !engineerName.trim()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 py-6 text-base"
                        title="This will apply the configuration to the broadcast system."
                    >
                        <CheckCircle className="h-5 w-5" />
                        Approve & Deploy
                    </Button>
                    <Button
                        onClick={onReject}
                        disabled={disabled || !engineerName.trim()}
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
    );
}
