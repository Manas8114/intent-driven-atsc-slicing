export interface RewardComponents {
    coverage: number;
    accuracy: number;
    reliability: number;
    congestion: number;
    stability: number;
}

export interface PPOInternals {
    value_estimate: number;
    confidence_pct: number;
    action_log_prob: number;
    action_mean?: number[];
    action_std?: number[];
}

export interface Interpretation {
    value_insight: string;
    confidence_insight: string;
    action_insight: string;
    advantage_insight: string;
    source: string;
}

export interface AIDecision {
    decision_id: string;
    timestamp: string;
    intent: string;
    action_taken: any;
    reward_signal: number;
    reward_components?: RewardComponents;
    learning_contribution: string;
    ppo_internals?: PPOInternals;
}
