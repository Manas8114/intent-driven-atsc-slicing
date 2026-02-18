// ============================================================================
// Shared Type Definitions for BLE Receiver
// ============================================================================

export interface AIState {
    delivery_mode: string;
    coverage_percent: number;
    snr_db: number;
    modulation: string;
    power_dbm: number;
    coding_rate: string;
    is_emergency: boolean;
    active_hurdle: string | null;
}

export interface OperatorIntent {
    intent: string;
    intent_code: number;
    display_name: string;
    description: string;
    auto_adjustments: {
        priority: string;
        power_mode: string;
        modulation: string;
        behavior: string;
    };
}

export interface ManualOverrides {
    forceEmergency: boolean;
    snrOffset: number;
    forceMode: string | null;
}

export interface ConstellationPoint {
    x: number;
    y: number;
    isError: boolean;
}
