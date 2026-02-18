// ============================================================================
// Packet Decoding & Intent Derivation
// Matches backend ble_adapter.py encoding exactly
// ============================================================================

import type { AIState, OperatorIntent } from './types';

// Decoding maps (reverse of backend encoding)
const DELIVERY_MODE_REVERSE: Record<number, string> = { 0: 'unicast', 1: 'multicast', 2: 'broadcast' };
const MODULATION_REVERSE: Record<number, string> = { 0: 'QPSK', 1: '16QAM', 2: '64QAM', 3: '256QAM' };
const CODING_RATE_REVERSE: Record<number, string> = { 0: '5/15', 1: '7/15', 2: '9/15', 3: '11/15' };
const HURDLE_REVERSE: Record<number, string | null> = {
    0: null, 1: 'coverage_drop', 2: 'interference', 3: 'spectrum_reduction',
    4: 'traffic_surge', 5: 'emergency_escalation', 6: 'cellular_congestion',
    7: 'mobility_surge', 8: 'monsoon', 9: 'flash_crowd', 10: 'tower_failure'
};
const INTENT_REVERSE: Record<number, string> = {
    0: 'maximize_coverage', 1: 'maximize_throughput', 2: 'minimize_latency',
    3: 'emergency_response', 4: 'power_efficient', 5: 'rural_priority',
    6: 'urban_dense', 7: 'balanced'
};

/**
 * Calculate CRC16-CCITT (0xFFFF init, 0x1021 poly)
 */
function calculateCRC16(bytes: number[]): number {
    let crc = 0xFFFF;
    for (const byte of bytes) {
        crc ^= (byte << 8);
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc;
}

/**
 * Decode a 20-byte hex-encoded BLE packet into AIState.
 *
 * Packet structure:
 * [0]     Version (uint8)
 * [1]     Delivery Mode (uint8)
 * [2]     Coverage % (uint8)
 * [3]     SNR dB (int8, offset 128)
 * [4]     Modulation (uint8)
 * [5]     Power dBm (int8, offset 128)
 * [6]     Coding Rate (uint8)
 * [7]     Emergency Flag (uint8)
 * [8-9]   Timestamp (uint16 big-endian)
 * [10-11] Hurdle Code (uint16 big-endian)
 * [12-17] Reserved (zeros)
 * [18-19] CRC16 (uint16 big-endian)
 */
export function decodeBLEPacket(hexString: string): { state: AIState; crcValid: boolean } | null {
    if (hexString.length < 40) {
        console.log('Packet too short:', hexString.length);
        return null;
    }

    const bytes: number[] = [];
    for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substr(i, 2), 16));
    }

    const deliveryMode = DELIVERY_MODE_REVERSE[bytes[1]] || 'unknown';
    const coverage = bytes[2];
    const snr = bytes[3] - 128;
    const modulation = MODULATION_REVERSE[bytes[4]] || 'unknown';
    const power = bytes[5] - 128;
    const codingRate = CODING_RATE_REVERSE[bytes[6]] || 'unknown';
    const isEmergency = bytes[7] === 1;
    const hurdleCode = (bytes[10] << 8) | bytes[11];
    const activeHurdle = HURDLE_REVERSE[hurdleCode] ?? null;

    const receivedCRC = (bytes[18] << 8) | bytes[19];
    const calculatedCRC = calculateCRC16(bytes.slice(0, 12));
    const crcValid = receivedCRC === calculatedCRC;

    return {
        state: {
            delivery_mode: deliveryMode,
            coverage_percent: coverage,
            snr_db: snr,
            modulation,
            power_dbm: power,
            coding_rate: codingRate,
            is_emergency: isEmergency,
            active_hurdle: activeHurdle,
        },
        crcValid
    };
}

/**
 * Derive operator intent from AI state (mirrors backend logic).
 */
export function deriveIntent(state: AIState): OperatorIntent {
    let intent = 'balanced';
    if (state.is_emergency) intent = 'emergency_response';
    else if (state.active_hurdle === 'flash_crowd' || state.active_hurdle === 'traffic_surge') intent = 'maximize_throughput';
    else if (state.active_hurdle === 'coverage_drop' || state.active_hurdle === 'tower_failure') intent = 'maximize_coverage';
    else if (state.active_hurdle === 'monsoon' || state.active_hurdle === 'interference') intent = 'rural_priority';
    else if (state.active_hurdle === 'cellular_congestion') intent = 'urban_dense';

    const adjustments: Record<string, { priority: string; power_mode: string; modulation: string; behavior: string }> = {
        'emergency_response': { priority: 'EMERGENCY', power_mode: 'MAXIMUM', modulation: 'ROBUST (QPSK)', behavior: 'Override all - emergency broadcast' },
        'maximize_coverage': { priority: 'COVERAGE', power_mode: 'MAXIMUM', modulation: 'ROBUST (QPSK)', behavior: 'Extend reach to all users' },
        'maximize_throughput': { priority: 'SPEED', power_mode: 'ADAPTIVE', modulation: 'HIGH-ORDER (256QAM)', behavior: 'Prioritize data rate' },
        'rural_priority': { priority: 'RURAL', power_mode: 'MAXIMUM', modulation: 'ROBUST (QPSK)', behavior: 'Focus on underserved areas' },
        'urban_dense': { priority: 'URBAN', power_mode: 'ADAPTIVE', modulation: 'HIGH-ORDER (256QAM)', behavior: 'High-density optimization' },
        'balanced': { priority: 'BALANCED', power_mode: 'STANDARD', modulation: 'BALANCED (64QAM)', behavior: 'Normal operation' },
    };

    const adj = adjustments[intent] || adjustments['balanced'];

    return {
        intent,
        intent_code: parseInt(Object.keys(INTENT_REVERSE).find(k => INTENT_REVERSE[parseInt(k)] === intent) || '7'),
        display_name: intent.replace(/_/g, ' ').toUpperCase(),
        description: adj.behavior,
        auto_adjustments: adj,
    };
}
