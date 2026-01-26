import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Animated,
    Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Backend URL - change this to your server IP for direct polling mode
const BACKEND_URL = 'http://192.168.1.40:8000';

// ============================================================================
// REAL PACKET DECODING (Matches backend ble_adapter.py)
// ============================================================================

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
 * Calculate CRC16-CCITT (0xFFFF init, 0x1021 poly) - REAL implementation
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
 * REAL packet decoder - parses the 20-byte hex string locally
 * Matches the backend's ble_adapter.py encoding exactly
 * 
 * Packet Structure:
 * [0]     Version (uint8)
 * [1]     Delivery Mode (uint8): 0=unicast, 1=multicast, 2=broadcast
 * [2]     Coverage % (uint8): 0-100
 * [3]     SNR dB (int8): stored as uint8 with offset 128
 * [4]     Modulation (uint8): 0=QPSK, 1=16QAM, 2=64QAM, 3=256QAM
 * [5]     Power dBm (int8): stored as uint8 with offset 128
 * [6]     Coding Rate (uint8): 0=5/15, 1=7/15, 2=9/15, 3=11/15
 * [7]     Emergency Flag (uint8): 0=normal, 1=emergency
 * [8-9]   Timestamp (uint16 big-endian)
 * [10-11] Hurdle Code (uint16 big-endian)
 * [12-17] Reserved (zeros)
 * [18-19] CRC16 (uint16 big-endian)
 */
function decodeBLEPacket(hexString: string): { state: AIState; crcValid: boolean } | null {
    if (hexString.length < 40) { // 20 bytes = 40 hex chars
        console.log('Packet too short:', hexString.length);
        return null;
    }

    // Convert hex to bytes
    const bytes: number[] = [];
    for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substr(i, 2), 16));
    }

    // Extract fields
    const version = bytes[0];
    const deliveryMode = DELIVERY_MODE_REVERSE[bytes[1]] || 'unknown';
    const coverage = bytes[2];
    const snr = bytes[3] - 128; // Remove offset
    const modulation = MODULATION_REVERSE[bytes[4]] || 'unknown';
    const power = bytes[5] - 128; // Remove offset
    const codingRate = CODING_RATE_REVERSE[bytes[6]] || 'unknown';
    const isEmergency = bytes[7] === 1;
    const timestamp = (bytes[8] << 8) | bytes[9];
    const hurdleCode = (bytes[10] << 8) | bytes[11];
    const activeHurdle = HURDLE_REVERSE[hurdleCode] ?? null;

    // Extract CRC from packet (last 2 bytes)
    const receivedCRC = (bytes[18] << 8) | bytes[19];

    // Calculate CRC of header (first 12 bytes)
    const calculatedCRC = calculateCRC16(bytes.slice(0, 12));
    const crcValid = receivedCRC === calculatedCRC;

    return {
        state: {
            delivery_mode: deliveryMode,
            coverage_percent: coverage,
            snr_db: snr,
            modulation: modulation,
            power_dbm: power,
            coding_rate: codingRate,
            is_emergency: isEmergency,
            active_hurdle: activeHurdle,
        },
        crcValid
    };
}

/**
 * Get intent from hurdle/emergency state (mirrors backend logic)
 */
function deriveIntent(state: AIState): OperatorIntent {
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
        intent_code: Object.keys(INTENT_REVERSE).find(k => INTENT_REVERSE[parseInt(k)] === intent) ? parseInt(Object.keys(INTENT_REVERSE).find(k => INTENT_REVERSE[parseInt(k)] === intent)!) : 7,
        display_name: intent.replace(/_/g, ' ').toUpperCase(),
        description: adj.behavior,
        auto_adjustments: adj,
    };
}

// ============================================================================
// ADVANCED PHYSICS SIMULATION
// ============================================================================

/**
 * Calculate RSSI based on simulated distance (Log-distance path loss model)
 * RSSI = TxPower - 10 * n * log10(distance) - randomFading
 */
function calculateRSSI(distance: number, txPower: number = 0): number {
    const n = 2.5; // Path loss exponent (indoor = 2-3, outdoor = 3-4)
    const d0 = 1; // Reference distance (meters)
    const PL_d0 = 40; // Path loss at reference distance (dB)

    if (distance < 0.1) distance = 0.1; // Minimum 10cm

    const pathLoss = PL_d0 + 10 * n * Math.log10(distance / d0);
    const fading = (Math.random() - 0.5) * 6; // Shadow fading ±3dB

    return txPower - pathLoss + fading;
}

/**
 * Calculate Bit Error Rate based on SNR (AWGN Channel Model for QPSK)
 * BER ≈ 0.5 * erfc(sqrt(SNR_linear))
 */
function calculateBER(snrDb: number): number {
    if (snrDb > 15) return 0; // Very good signal, no errors
    if (snrDb < -5) return 0.5; // Complete noise

    // Simplified BER model for QPSK
    // Higher SNR = lower BER (exponential relationship)
    const snrLinear = Math.pow(10, snrDb / 10);
    const ber = 0.5 * Math.exp(-snrLinear / 2);

    return Math.min(0.5, Math.max(0, ber));
}

/**
 * Apply bit errors to packet based on BER
 */
function corruptPacket(hexString: string, ber: number): { corrupted: string; errorCount: number } {
    if (ber <= 0) return { corrupted: hexString, errorCount: 0 };

    const bytes: number[] = [];
    for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substr(i, 2), 16));
    }

    let errorCount = 0;
    const corruptedBytes = bytes.map(byte => {
        let result = byte;
        for (let bit = 0; bit < 8; bit++) {
            if (Math.random() < ber) {
                result ^= (1 << bit);
                errorCount++;
            }
        }
        return result;
    });

    const corrupted = corruptedBytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { corrupted, errorCount };
}

interface AIState {
    delivery_mode: string;
    coverage_percent: number;
    snr_db: number;
    modulation: string;
    power_dbm: number;
    coding_rate: string;
    is_emergency: boolean;
    active_hurdle: string | null;
}

interface OperatorIntent {
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

// Manual Override Controls for "Packet Injection" Simulation
interface ManualOverrides {
    forceEmergency: boolean;
    snrOffset: number;
    forceMode: string | null;
}

export default function App() {
    const [isScanning, setIsScanning] = useState(false);
    const [state, setState] = useState<AIState | null>(null);
    const [intent, setIntent] = useState<OperatorIntent | null>(null);
    const [rawPacket, setRawPacket] = useState<string | null>(null);
    const [crcValid, setCrcValid] = useState<boolean>(true);
    const [bitErrors, setBitErrors] = useState<number>(0);
    const [signalStrength, setSignalStrength] = useState(-80);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [updateCount, setUpdateCount] = useState(0);

    // NEW: Distance slider for realistic physics
    const [distance, setDistance] = useState(5); // meters

    // NEW: Constellation diagram points (I/Q coordinates)
    const [constellationPoints, setConstellationPoints] = useState<{ x: number, y: number, isError: boolean }[]>([]);

    /**
     * Generate constellation points based on modulation scheme and SNR
     * Real modulation schemes use specific I/Q patterns:
     * - QPSK: 4 points at (±1, ±1)
     * - 16QAM: 16 points in 4x4 grid
     * - 64QAM: 64 points in 8x8 grid
     * - 256QAM: 256 points in 16x16 grid
     * 
     * Noise causes points to scatter from ideal positions
     */
    const generateConstellationPoints = useCallback((modulation: string, snrDb: number, numSymbols: number = 32) => {
        // Ideal constellation points for each modulation
        const idealPoints: { x: number, y: number }[] = [];

        switch (modulation) {
            case 'QPSK':
                // 4 points at corners
                idealPoints.push({ x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 });
                break;
            case '16QAM':
                // 16 points in 4x4 grid
                for (let i = -3; i <= 3; i += 2) {
                    for (let q = -3; q <= 3; q += 2) {
                        idealPoints.push({ x: i / 3, y: q / 3 });
                    }
                }
                break;
            case '64QAM':
                // 64 points in 8x8 grid (simplified to show pattern)
                for (let i = -7; i <= 7; i += 2) {
                    for (let q = -7; q <= 7; q += 2) {
                        idealPoints.push({ x: i / 7, y: q / 7 });
                    }
                }
                break;
            case '256QAM':
                // 256 points in 16x16 grid (simplified)
                for (let i = -15; i <= 15; i += 2) {
                    for (let q = -15; q <= 15; q += 2) {
                        idealPoints.push({ x: i / 15, y: q / 15 });
                    }
                }
                break;
            default:
                // Default to QPSK
                idealPoints.push({ x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 });
        }

        // Calculate noise standard deviation from SNR
        // SNR = 10 * log10(signal_power / noise_power)
        // For normalized signal power = 1: noise_std = 1 / sqrt(SNR_linear)
        const snrLinear = Math.pow(10, snrDb / 10);
        const noiseStd = 1 / Math.sqrt(snrLinear);

        // Generate received symbols with AWGN noise
        const points: { x: number, y: number, isError: boolean }[] = [];
        for (let i = 0; i < numSymbols; i++) {
            // Pick a random ideal point (simulating transmitted symbol)
            const ideal = idealPoints[Math.floor(Math.random() * idealPoints.length)];

            // Add Gaussian noise (Box-Muller transform)
            const u1 = Math.random();
            const u2 = Math.random();
            const noiseI = noiseStd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const noiseQ = noiseStd * Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

            const receivedX = ideal.x + noiseI * 0.3; // Scale noise for visibility
            const receivedY = ideal.y + noiseQ * 0.3;

            // Check if point would be decoded incorrectly (crossed decision boundary)
            const isError = Math.abs(noiseI) > 0.5 || Math.abs(noiseQ) > 0.5;

            points.push({ x: receivedX, y: receivedY, isError });
        }

        return points;
    }, []);

    // Manual Overrides State
    const [showControls, setShowControls] = useState(false);
    const [overrides, setOverrides] = useState<ManualOverrides>({
        forceEmergency: false,
        snrOffset: 0,
        forceMode: null
    });
    const [ws, setWs] = useState<WebSocket | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation when receiving update
    const triggerPulse = useCallback(() => {
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    }, [pulseAnim]);

    // ========================================================================
    // REAL PACKET PROCESSING (No more fetch('/ble/state') cheating!)
    // ========================================================================
    const processPacket = useCallback((packetHex: string) => {
        try {
            // 1. Calculate RSSI based on distance (REAL physics)
            const rssi = calculateRSSI(distance);
            setSignalStrength(rssi);

            // 2. Estimate SNR from RSSI (noise floor = -100 dBm)
            const noiseFloor = -100;
            const estimatedSnr = rssi - noiseFloor;

            // 3. Calculate BER from SNR (REAL AWGN model)
            const ber = calculateBER(estimatedSnr + overrides.snrOffset);

            // 4. Apply bit errors to packet (REAL corruption)
            const { corrupted, errorCount } = corruptPacket(packetHex, ber);

            // 5. DECODE THE PACKET LOCALLY (THE KEY CHANGE!)
            const decoded = decodeBLEPacket(corrupted);

            if (!decoded) {
                console.log('Failed to decode packet');
                return;
            }

            let decodedState = decoded.state;

            // Apply manual overrides
            if (overrides.forceEmergency) {
                decodedState.is_emergency = true;
            }
            if (overrides.forceMode) {
                decodedState.delivery_mode = overrides.forceMode;
            }

            // 6. Derive intent from state (REAL logic)
            const derivedIntent = deriveIntent(decodedState);

            // 7. Update UI
            setState(decodedState);
            setIntent(derivedIntent);
            setRawPacket(corrupted);
            setCrcValid(decoded.crcValid && errorCount === 0);
            setBitErrors(errorCount);
            setLastUpdate(new Date());
            setUpdateCount(prev => prev + 1);
            triggerPulse();

            // 8. Generate constellation diagram points (NEW!)
            const points = generateConstellationPoints(decodedState.modulation, estimatedSnr + overrides.snrOffset);
            setConstellationPoints(points);

            console.log(`Rx: Decoded packet | SNR: ${estimatedSnr.toFixed(1)}dB | BER: ${(ber * 100).toFixed(2)}% | Errors: ${errorCount} | CRC: ${decoded.crcValid ? 'OK' : 'FAIL'}`);

        } catch (e) {
            console.log('Packet processing error:', e);
        }
    }, [triggerPulse, overrides, distance, generateConstellationPoints]);

    // WebSocket Connection & Real-Time Reception
    useEffect(() => {
        if (!isScanning) {
            if (ws) {
                ws.close();
                setWs(null);
            }
            return;
        }

        const socket = new WebSocket(BACKEND_URL.replace('http', 'ws') + '/ws');

        socket.onopen = () => {
            console.log('Receiver: Tuned into Broadcast Frequency');
            setWs(socket);
        };

        socket.onmessage = async (e) => {
            try {
                const message = JSON.parse(e.data);

                // Real-Time Packet Reception
                if (message.type === 'air_interface_packet') {
                    // Packet Arrived!
                    const packetHex = message.data; // Hex string from Advertiser

                    // Decode & Process (Simulating RF Demodulation)
                    await processPacket(packetHex);
                }
            } catch (err) {
                console.log('Rx Error:', err);
            }
        };

        socket.onclose = () => {
            console.log('Receiver: Signal Lost');
            setWs(null);
        };

        return () => {
            socket.close();
        };
    }, [isScanning, processPacket]);

    // Start/Stop scanning
    const toggleScanning = async () => {
        if (!isScanning) {
            if (Platform.OS === 'android') {
                Alert.alert(
                    'BLE Permissions',
                    'Make sure Bluetooth and Location are enabled for BLE scanning.',
                    [{ text: 'OK' }]
                );
            }
            setIsScanning(true);
        } else {
            setIsScanning(false);
            setState(null);
        }
    };

    // Get delivery mode color
    const getModeColor = (mode: string) => {
        switch (mode) {
            case 'broadcast':
                return '#22c55e';
            case 'multicast':
                return '#3b82f6';
            case 'unicast':
                return '#f97316';
            default:
                return '#6b7280';
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>📱 BLE Receiver</Text>
                <Text style={styles.subtitle}>Receiving AI Broadcast Configuration</Text>
            </View>

            {/* Signal Indicator */}
            <Animated.View
                style={[
                    styles.signalContainer,
                    isScanning && styles.signalActive,
                    { transform: [{ scale: pulseAnim }] },
                ]}
            >
                {isScanning ? (
                    <>
                        <Text style={styles.signalIcon}>📡</Text>
                        <Text style={styles.signalText}>Signal: {signalStrength.toFixed(0)} dBm</Text>
                        <Text style={styles.updateCount}>Updates: {updateCount}</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.signalIcon}>📴</Text>
                        <Text style={styles.signalText}>Not Scanning</Text>
                    </>
                )}
            </Animated.View>

            {/* Main Button */}
            <TouchableOpacity
                style={[styles.mainButton, isScanning ? styles.stopButton : styles.startButton]}
                onPress={toggleScanning}
            >
                <Text style={styles.mainButtonText}>
                    {isScanning ? '⏹ STOP SCANNING' : '🔍 START SCANNING'}
                </Text>
            </TouchableOpacity>

            {/* State Display */}
            <ScrollView style={styles.stateContainer} contentContainerStyle={styles.stateContent}>
                {state ? (
                    <>
                        {/* INTENT Display - The Received GOAL */}
                        {intent ? (
                            <View style={styles.intentContainer}>
                                <View style={styles.intentHeader}>
                                    <Text style={styles.intentLabel}>🎯 RECEIVED INTENT</Text>
                                    <View style={styles.liveIndicator}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </View>
                                </View>
                                <Text style={styles.intentValue}>{intent.display_name}</Text>
                                <Text style={styles.intentDescription}>"{intent.description}"</Text>

                                <View style={styles.autoActionBanner}>
                                    <Text style={styles.autoActionTitle}>⚡ AUTO-ADJUSTING RECEIVER:</Text>
                                    <Text style={styles.autoActionText}>
                                        Set priority to {intent.auto_adjustments.priority} &
                                        {intent.auto_adjustments.power_mode === 'MAXIMUM' ? ' boosting gain' : ' optimizing power'}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        {/* PACKET INSPECTOR & INJECTION CONTROLS */}
                        {rawPacket && (
                            <View style={styles.packetSection}>
                                <Text style={styles.sectionHeader}>📦 RAW PACKET INSPECTOR</Text>
                                <View style={[styles.packetContainer, !crcValid && styles.packetContainerError]}>
                                    <Text style={[styles.packetHex, !crcValid && styles.packetHexError]}>
                                        {rawPacket}
                                    </Text>
                                    <View style={styles.packetFooter}>
                                        <Text style={[styles.packetMeta, !crcValid && styles.packetMetaError]}>
                                            Length: 20 bytes • Protocol v1
                                        </Text>
                                        <View style={[styles.crcBadge, crcValid ? styles.crcSuccess : styles.crcFail]}>
                                            <Text style={styles.crcText}>{crcValid ? 'Shield VALID' : 'CRC FAIL'}</Text>
                                        </View>
                                    </View>
                                    {!crcValid && (
                                        <Text style={styles.bitErrorText}>
                                            ⚠️ CORRUPTION DETECTED: {bitErrors} bit errors
                                        </Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.overrideToggle}
                                    onPress={() => setShowControls(!showControls)}
                                >
                                    <Text style={styles.overrideToggleText}>
                                        {showControls ? '🔽 SIMULATE LOCAL PACKET INJECTION' : '▶ SIMULATE LOCAL PACKET INJECTION'}
                                    </Text>
                                </TouchableOpacity>

                                {showControls && (
                                    <View style={styles.controlsContainer}>
                                        <Text style={styles.controlHeader}>Modify Received Data Locally</Text>

                                        {/* Emergency Override */}
                                        <View style={styles.controlRow}>
                                            <Text style={styles.controlLabel}>Force Emergency Flag</Text>
                                            <Switch
                                                value={overrides.forceEmergency}
                                                onValueChange={(val) => setOverrides({ ...overrides, forceEmergency: val })}
                                                trackColor={{ false: "#767577", true: "#ef4444" }}
                                            />
                                        </View>

                                        {/* SNR Offset */}
                                        <View style={styles.controlRow}>
                                            <Text style={styles.controlLabel}>Inject Noise (SNR -10dB)</Text>
                                            <TouchableOpacity
                                                style={[styles.miniBtn, overrides.snrOffset === -10 ? styles.btnActive : styles.btnInactive]}
                                                onPress={() => setOverrides({ ...overrides, snrOffset: overrides.snrOffset === -10 ? 0 : -10 })}
                                            >
                                                <Text style={styles.miniBtnText}>{overrides.snrOffset === -10 ? 'ACTIVE' : 'OFF'}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Mode Override */}
                                        <View style={styles.controlRow}>
                                            <Text style={styles.controlLabel}>Force Broadcast Mode</Text>
                                            <TouchableOpacity
                                                style={[styles.miniBtn, overrides.forceMode === 'broadcast' ? styles.btnActive : styles.btnInactive]}
                                                onPress={() => setOverrides({ ...overrides, forceMode: overrides.forceMode === 'broadcast' ? null : 'broadcast' })}
                                            >
                                                <Text style={styles.miniBtnText}>{overrides.forceMode ? 'FORCED' : 'OFF'}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Distance Control - NEW! */}
                                        <View style={styles.controlRow}>
                                            <Text style={styles.controlLabel}>Distance: {distance}m</Text>
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity
                                                    style={[styles.miniBtn, styles.btnInactive]}
                                                    onPress={() => setDistance(Math.max(1, distance - 5))}
                                                >
                                                    <Text style={styles.miniBtnText}>-5m</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.miniBtn, styles.btnInactive]}
                                                    onPress={() => setDistance(Math.min(100, distance + 5))}
                                                >
                                                    <Text style={styles.miniBtnText}>+5m</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <Text style={styles.controlHint}>
                                            Distance affects RSSI (signal strength) → affects SNR → affects BER → affects packet corruption
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Large Delivery Mode Display */}
                        <View
                            style={[
                                styles.modeContainer,
                                { backgroundColor: getModeColor(state.delivery_mode) + '20' },
                            ]}
                        >
                            <Text style={[styles.modeLabel, { color: getModeColor(state.delivery_mode) }]}>
                                {state.delivery_mode.toUpperCase()}
                            </Text>
                            <Text style={styles.modeSubtitle}>Delivery Mode</Text>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{state.coverage_percent.toFixed(1)}%</Text>
                                <Text style={styles.statLabel}>Coverage</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{state.snr_db.toFixed(1)}</Text>
                                <Text style={styles.statLabel}>SNR (dB)</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{state.modulation}</Text>
                                <Text style={styles.statLabel}>Modulation</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{state.power_dbm.toFixed(1)}</Text>
                                <Text style={styles.statLabel}>Power (dBm)</Text>
                            </View>
                        </View>

                        {/* CONSTELLATION DIAGRAM - NEW! */}
                        <View style={styles.constellationSection}>
                            <Text style={styles.sectionHeader}>📊 I/Q CONSTELLATION DIAGRAM</Text>
                            <Text style={styles.constellationSubtitle}>
                                {state.modulation} • {constellationPoints.filter(p => p.isError).length} symbol errors
                            </Text>
                            <View style={styles.constellationContainer}>
                                {/* Grid lines */}
                                <View style={styles.constellationGridH} />
                                <View style={styles.constellationGridV} />

                                {/* Axis labels */}
                                <Text style={styles.constellationAxisI}>I</Text>
                                <Text style={styles.constellationAxisQ}>Q</Text>

                                {/* Constellation points */}
                                {constellationPoints.map((point, idx) => {
                                    // Convert -1..1 coordinates to 0..100%
                                    const x = ((point.x + 1.2) / 2.4) * 100;
                                    const y = ((1.2 - point.y) / 2.4) * 100; // Flip Y for screen coords
                                    return (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.constellationPoint,
                                                point.isError ? styles.constellationPointError : styles.constellationPointOk,
                                                {
                                                    left: `${Math.max(0, Math.min(96, x))}%`,
                                                    top: `${Math.max(0, Math.min(96, y))}%`,
                                                }
                                            ]}
                                        />
                                    );
                                })}
                            </View>
                            <Text style={styles.constellationHint}>
                                Tight clusters = strong signal • Scattered = noisy channel
                            </Text>
                        </View>

                        {/* Emergency Banner */}
                        {state.is_emergency && (
                            <View style={styles.emergencyBanner}>
                                <Text style={styles.emergencyText}>⚠️ EMERGENCY MODE ACTIVE</Text>
                                <Text style={styles.emergencySubtext}>Priority broadcast enabled</Text>
                            </View>
                        )}

                        {/* Active Hurdle */}
                        {state.active_hurdle && (
                            <View style={styles.hurdleBanner}>
                                <Text style={styles.hurdleLabel}>Active Stress Test</Text>
                                <Text style={styles.hurdleValue}>{state.active_hurdle.replace(/_/g, ' ')}</Text>
                            </View>
                        )}
                    </>
                ) : isScanning ? (
                    <View style={styles.scanningContainer}>
                        <Text style={styles.scanningEmoji}>🔄</Text>
                        <Text style={styles.scanningText}>Scanning for broadcast signal...</Text>
                        <Text style={styles.scanningSubtext}>
                            Looking for BLE advertisements from AI tower
                        </Text>
                    </View>
                ) : (
                    <View style={styles.idleContainer}>
                        <Text style={styles.idleEmoji}>💤</Text>
                        <Text style={styles.idleText}>Tap "Start Scanning" to receive broadcasts</Text>
                    </View>
                )}
            </ScrollView>

            {/* Last Update */}
            {lastUpdate && isScanning && (
                <View style={styles.lastUpdateContainer}>
                    <Text style={styles.lastUpdateText}>
                        Last update: {lastUpdate.toLocaleTimeString()}
                    </Text>
                </View>
            )}

            {/* Footer Disclaimer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Demo: Simulating BLE reception via backend polling
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        paddingTop: 60,
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    signalContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        marginHorizontal: 20,
        borderRadius: 16,
        backgroundColor: '#1e293b',
        marginBottom: 16,
    },
    signalActive: {
        backgroundColor: '#14532d',
    },
    signalIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    signalText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    updateCount: {
        color: '#22c55e',
        fontSize: 12,
        marginTop: 4,
    },
    mainButton: {
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    startButton: {
        backgroundColor: '#2563eb',
    },
    stopButton: {
        backgroundColor: '#dc2626',
    },
    mainButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stateContainer: {
        flex: 1,
        marginHorizontal: 20,
    },
    stateContent: {
        paddingBottom: 20,
    },
    // Intent Styles
    intentContainer: {
        backgroundColor: '#14532d',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#22c55e',
    },
    intentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    intentLabel: {
        color: '#86efac',
        fontSize: 12,
        fontWeight: 'bold',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#22c55e30',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
        marginRight: 4,
    },
    liveText: {
        color: '#22c55e',
        fontSize: 10,
        fontWeight: 'bold',
    },
    intentValue: {
        color: '#22c55e',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    intentDescription: {
        color: '#bbf7d0',
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    autoActionBanner: {
        backgroundColor: '#0f3d1c',
        padding: 12,
        borderRadius: 12,
    },
    autoActionTitle: {
        color: '#fbbf24',
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    autoActionText: {
        color: '#d1fae5',
        fontSize: 12,
    },
    // Packet Inspector Styles
    packetSection: {
        marginBottom: 16,
    },
    sectionHeader: {
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    packetContainer: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    packetContainerError: {
        backgroundColor: '#450a0a',
        borderColor: '#dc2626',
        borderWidth: 1,
    },
    packetHex: {
        color: '#22d3ee',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 10,
        marginBottom: 4,
    },
    packetHexError: {
        color: '#fca5a5',
        textDecorationLine: 'line-through',
    },
    packetFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    packetMeta: {
        color: '#64748b',
        fontSize: 10,
    },
    packetMetaError: {
        color: '#991b1b',
    },
    crcBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    crcSuccess: {
        backgroundColor: '#059669',
    },
    crcFail: {
        backgroundColor: '#dc2626',
    },
    crcText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bitErrorText: {
        color: '#ef4444',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
    },
    overrideToggle: {
        backgroundColor: '#334155',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    overrideToggleText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: 'bold',
    },
    controlsContainer: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    controlHeader: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    controlLabel: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    miniBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    btnActive: {
        backgroundColor: '#ef4444',
    },
    btnInactive: {
        backgroundColor: '#475569',
    },
    miniBtnText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    controlHint: {
        color: '#64748b',
        fontSize: 10,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 4,
    },
    modeContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        borderRadius: 16,
        marginBottom: 16,
    },
    modeLabel: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    modeSubtitle: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statBox: {
        width: '48%',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#64748b',
        fontSize: 11,
        marginTop: 4,
        textTransform: 'uppercase',
    },
    emergencyBanner: {
        backgroundColor: '#7f1d1d',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        alignItems: 'center',
    },
    emergencyText: {
        color: '#fca5a5',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emergencySubtext: {
        color: '#f87171',
        fontSize: 12,
        marginTop: 4,
    },
    hurdleBanner: {
        backgroundColor: '#78350f',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hurdleLabel: {
        color: '#fbbf24',
        fontSize: 12,
    },
    hurdleValue: {
        color: '#fcd34d',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    scanningContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    scanningEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    scanningText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    scanningSubtext: {
        color: '#475569',
        fontSize: 12,
        marginTop: 8,
    },
    idleContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    idleEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    idleText: {
        color: '#64748b',
        fontSize: 14,
        textAlign: 'center',
    },
    lastUpdateContainer: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    lastUpdateText: {
        color: '#475569',
        fontSize: 10,
    },
    footer: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
    },
    footerText: {
        color: '#475569',
        fontSize: 10,
        textAlign: 'center',
    },
    // Constellation Diagram Styles
    constellationSection: {
        marginTop: 16,
        backgroundColor: '#0f172a',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1e3a5f',
    },
    constellationSubtitle: {
        color: '#64748b',
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 8,
    },
    constellationContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#020617',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        position: 'relative',
        overflow: 'hidden',
    },
    constellationGridH: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: 1,
        backgroundColor: '#334155',
    },
    constellationGridV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: 1,
        backgroundColor: '#334155',
    },
    constellationAxisI: {
        position: 'absolute',
        right: 4,
        top: '50%',
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
    },
    constellationAxisQ: {
        position: 'absolute',
        left: '50%',
        top: 4,
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    constellationPoint: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    constellationPointOk: {
        backgroundColor: '#22d3d1',
        shadowColor: '#22d3d1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
    },
    constellationPointError: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
    },
    constellationHint: {
        color: '#475569',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
});
