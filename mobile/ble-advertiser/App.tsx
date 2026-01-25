import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Backend URL - change this to your server IP
const BACKEND_URL = 'http://192.168.1.40:8000';

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

interface BLEPacket {
    hex_string: string;
    base64: string;
    size_bytes: number;
}

export default function App() {
    const [isAdvertising, setIsAdvertising] = useState(false);
    const [state, setState] = useState<AIState | null>(null);
    const [packet, setPacket] = useState<BLEPacket | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Fetch state from backend
    const fetchState = useCallback(async () => {
        try {
            const [stateRes, packetRes] = await Promise.all([
                fetch(`${BACKEND_URL}/ble/state`),
                fetch(`${BACKEND_URL}/ble/packet`),
            ]);

            if (stateRes.ok && packetRes.ok) {
                const stateData = await stateRes.json();
                const packetData = await packetRes.json();
                setState(stateData);
                setPacket(packetData);
                setLastUpdate(new Date());
                setError(null);
            } else {
                setError('Failed to fetch from backend');
            }
        } catch (e) {
            setError(`Connection error: ${e}`);
        }
    }, []);

    // Poll for updates when advertising
    useEffect(() => {
        fetchState();

        if (isAdvertising) {
            const interval = setInterval(fetchState, 2000);
            return () => clearInterval(interval);
        }
    }, [isAdvertising, fetchState]);

    // Start/Stop advertising
    const toggleAdvertising = async () => {
        if (!isAdvertising) {
            // Check permissions first
            if (Platform.OS === 'android') {
                // Note: In real implementation, use PermissionsAndroid
                Alert.alert(
                    'BLE Permissions',
                    'Make sure Bluetooth and Location are enabled for BLE advertising.',
                    [{ text: 'OK' }]
                );
            }

            setIsAdvertising(true);
            // Note: Real BLE advertising requires native module integration
            // For demo, we'll simulate by fetching state and showing it
            Alert.alert(
                'Demo Mode',
                'BLE advertising simulated. In production, this would use react-native-ble-plx to broadcast the packet.',
                [{ text: 'OK' }]
            );
        } else {
            setIsAdvertising(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>📡 BLE Broadcast Tower</Text>
                <Text style={styles.subtitle}>AI Control-Plane Signaling Demo</Text>
            </View>

            {/* Status Indicator */}
            <View style={[styles.statusContainer, isAdvertising ? styles.statusActive : styles.statusInactive]}>
                <View style={[styles.statusDot, isAdvertising && styles.statusDotActive]} />
                <Text style={styles.statusText}>
                    {isAdvertising ? 'BROADCASTING' : 'IDLE'}
                </Text>
            </View>

            {/* Main Button */}
            <TouchableOpacity
                style={[styles.mainButton, isAdvertising ? styles.stopButton : styles.startButton]}
                onPress={toggleAdvertising}
            >
                <Text style={styles.mainButtonText}>
                    {isAdvertising ? '⏹ STOP BROADCASTING' : '▶ START BROADCASTING'}
                </Text>
            </TouchableOpacity>

            {/* State Display */}
            <ScrollView style={styles.stateContainer}>
                {state ? (
                    <>
                        <View style={styles.stateRow}>
                            <Text style={styles.stateLabel}>Delivery Mode</Text>
                            <Text style={[styles.stateValue, styles.highlight]}>
                                {state.delivery_mode.toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.stateRow}>
                            <Text style={styles.stateLabel}>Coverage</Text>
                            <Text style={styles.stateValue}>{state.coverage_percent.toFixed(1)}%</Text>
                        </View>
                        <View style={styles.stateRow}>
                            <Text style={styles.stateLabel}>SNR</Text>
                            <Text style={styles.stateValue}>{state.snr_db.toFixed(1)} dB</Text>
                        </View>
                        <View style={styles.stateRow}>
                            <Text style={styles.stateLabel}>Modulation</Text>
                            <Text style={styles.stateValue}>{state.modulation}</Text>
                        </View>
                        <View style={styles.stateRow}>
                            <Text style={styles.stateLabel}>Power</Text>
                            <Text style={styles.stateValue}>{state.power_dbm.toFixed(1)} dBm</Text>
                        </View>
                        {state.is_emergency && (
                            <View style={styles.emergencyBanner}>
                                <Text style={styles.emergencyText}>⚠️ EMERGENCY MODE ACTIVE</Text>
                            </View>
                        )}
                        {state.active_hurdle && (
                            <View style={styles.hurdleRow}>
                                <Text style={styles.hurdleLabel}>Active Hurdle</Text>
                                <Text style={styles.hurdleValue}>{state.active_hurdle}</Text>
                            </View>
                        )}
                    </>
                ) : (
                    <Text style={styles.loadingText}>Connecting to backend...</Text>
                )}

                {/* Packet Preview */}
                {packet && (
                    <View style={styles.packetContainer}>
                        <Text style={styles.packetTitle}>BLE Packet ({packet.size_bytes} bytes)</Text>
                        <Text style={styles.packetHex}>{packet.hex_string}</Text>
                    </View>
                )}

                {/* Last Update */}
                {lastUpdate && (
                    <Text style={styles.lastUpdate}>
                        Last update: {lastUpdate.toLocaleTimeString()}
                    </Text>
                )}
            </ScrollView>

            {/* Error Display */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {/* Footer Disclaimer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    BLE is used as control-plane signaling demo, not RF transmission
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
        marginBottom: 20,
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
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginHorizontal: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    statusActive: {
        backgroundColor: '#166534',
    },
    statusInactive: {
        backgroundColor: '#334155',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#64748b',
        marginRight: 8,
    },
    statusDotActive: {
        backgroundColor: '#22c55e',
    },
    statusText: {
        color: '#fff',
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    mainButton: {
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
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
    stateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    stateLabel: {
        color: '#94a3b8',
        fontSize: 14,
    },
    stateValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    highlight: {
        color: '#22c55e',
    },
    emergencyBanner: {
        backgroundColor: '#7f1d1d',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        alignItems: 'center',
    },
    emergencyText: {
        color: '#fca5a5',
        fontWeight: 'bold',
    },
    hurdleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        backgroundColor: '#1e293b',
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    hurdleLabel: {
        color: '#f59e0b',
        fontSize: 12,
    },
    hurdleValue: {
        color: '#fbbf24',
        fontSize: 12,
        fontWeight: 'bold',
    },
    packetContainer: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    packetTitle: {
        color: '#64748b',
        fontSize: 10,
        marginBottom: 8,
    },
    packetHex: {
        color: '#22d3ee',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 10,
    },
    lastUpdate: {
        color: '#475569',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 16,
    },
    loadingText: {
        color: '#64748b',
        textAlign: 'center',
        marginTop: 40,
    },
    errorContainer: {
        backgroundColor: '#7f1d1d',
        padding: 12,
        marginHorizontal: 20,
        borderRadius: 8,
        marginBottom: 10,
    },
    errorText: {
        color: '#fca5a5',
        fontSize: 12,
        textAlign: 'center',
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
});
