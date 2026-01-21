export interface RewardComponents {
    coverage: number;
    accuracy: number;
    reliability: number;
    congestion: number;
    stability: number;
}

export interface AIDecision {
    decision_id: string;
    timestamp: string;
    intent: string;
    action_taken: unknown;
    reward_signal: number;
    reward_components?: RewardComponents;
    learning_contribution: string;
    focus_region?: string;
}
