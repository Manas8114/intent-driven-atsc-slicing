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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Backend URL - change this to your server IP for direct polling mode
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

export default function App() {
    const [isScanning, setIsScanning] = useState(false);
    const [state, setState] = useState<AIState | null>(null);
    const [signalStrength, setSignalStrength] = useState(-80);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [updateCount, setUpdateCount] = useState(0);
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

    // Simulate BLE scanning by polling backend
    // In production, this would use react-native-ble-plx to scan for advertisements
    const fetchState = useCallback(async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/ble/state`);
            if (response.ok) {
                const data = await response.json();
                setState(data);
                setLastUpdate(new Date());
                setUpdateCount((prev: number) => prev + 1);
                setSignalStrength(-50 + Math.random() * 20); // Simulated RSSI
                triggerPulse();
            }
        } catch (e) {
            // Silently fail - in demo we're polling the backend
        }
    }, [triggerPulse]);

    // Poll for updates when scanning
    useEffect(() => {
        if (isScanning) {
            fetchState();
            const interval = setInterval(fetchState, 2000);
            return () => clearInterval(interval);
        }
    }, [isScanning, fetchState]);

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
});
