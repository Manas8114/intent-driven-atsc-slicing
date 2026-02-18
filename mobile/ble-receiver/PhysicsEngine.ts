// ============================================================================
// Physics Simulation Module
// Log-distance path loss, AWGN BER, and packet corruption models
// ============================================================================

/**
 * Calculate RSSI based on simulated distance (Log-distance path loss model)
 * RSSI = TxPower - 10 * n * log10(distance) - randomFading
 */
export function calculateRSSI(distance: number, txPower: number = 0): number {
    const n = 2.5;   // Path loss exponent (indoor = 2-3, outdoor = 3-4)
    const d0 = 1;    // Reference distance (meters)
    const PL_d0 = 40; // Path loss at reference distance (dB)

    if (distance < 0.1) distance = 0.1;

    const pathLoss = PL_d0 + 10 * n * Math.log10(distance / d0);
    const fading = (Math.random() - 0.5) * 6; // Shadow fading ±3dB

    return txPower - pathLoss + fading;
}

/**
 * Calculate Bit Error Rate based on SNR (AWGN Channel Model for QPSK)
 * BER ≈ 0.5 * erfc(sqrt(SNR_linear))
 */
export function calculateBER(snrDb: number): number {
    if (snrDb > 15) return 0;
    if (snrDb < -5) return 0.5;

    const snrLinear = Math.pow(10, snrDb / 10);
    const ber = 0.5 * Math.exp(-snrLinear / 2);

    return Math.min(0.5, Math.max(0, ber));
}

/**
 * Apply bit errors to packet based on BER
 */
export function corruptPacket(hexString: string, ber: number): { corrupted: string; errorCount: number } {
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

/**
 * Generate constellation diagram points based on modulation scheme and SNR.
 *
 * - QPSK: 4 points at (±1, ±1)
 * - 16QAM: 16 points in 4×4 grid
 * - 64QAM: 64 points in 8×8 grid
 * - 256QAM: 256 points in 16×16 grid
 */
export function generateConstellationPoints(
    modulation: string,
    snrDb: number,
    numSymbols: number = 32
): { x: number; y: number; isError: boolean }[] {
    const idealPoints: { x: number; y: number }[] = [];

    switch (modulation) {
        case 'QPSK':
            idealPoints.push({ x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 });
            break;
        case '16QAM':
            for (let i = -3; i <= 3; i += 2) {
                for (let q = -3; q <= 3; q += 2) {
                    idealPoints.push({ x: i / 3, y: q / 3 });
                }
            }
            break;
        case '64QAM':
            for (let i = -7; i <= 7; i += 2) {
                for (let q = -7; q <= 7; q += 2) {
                    idealPoints.push({ x: i / 7, y: q / 7 });
                }
            }
            break;
        case '256QAM':
            for (let i = -15; i <= 15; i += 2) {
                for (let q = -15; q <= 15; q += 2) {
                    idealPoints.push({ x: i / 15, y: q / 15 });
                }
            }
            break;
        default:
            idealPoints.push({ x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 });
    }

    const snrLinear = Math.pow(10, snrDb / 10);
    const noiseStd = 1 / Math.sqrt(snrLinear);

    const points: { x: number; y: number; isError: boolean }[] = [];
    for (let i = 0; i < numSymbols; i++) {
        const ideal = idealPoints[Math.floor(Math.random() * idealPoints.length)];

        // Box-Muller transform for Gaussian noise
        const u1 = Math.random();
        const u2 = Math.random();
        const noiseI = noiseStd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const noiseQ = noiseStd * Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

        const receivedX = ideal.x + noiseI * 0.3;
        const receivedY = ideal.y + noiseQ * 0.3;

        const isError = Math.abs(noiseI) > 0.5 || Math.abs(noiseQ) > 0.5;
        points.push({ x: receivedX, y: receivedY, isError });
    }

    return points;
}
