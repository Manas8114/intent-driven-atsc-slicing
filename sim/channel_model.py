import math
from typing import Tuple


def hata_path_loss(frequency_mhz: float, distance_km: float, tx_height_m: float = 30.0, rx_height_m: float = 1.5) -> float:
    """Calculate simplified Hata model path loss for rural environments.

    Args:
        frequency_mhz: Carrier frequency in MHz (e.g., 600 for UHF).
        distance_km: Distance between transmitter and receiver in kilometers.
        tx_height_m: Transmitter antenna height (default 30 m).
        rx_height_m: Receiver antenna height (default 1.5 m).

    Returns:
        Path loss in dB.
    """
    if frequency_mhz <= 0 or distance_km <= 0:
        raise ValueError("Frequency and distance must be positive numbers")
    # Hata model for rural area
    a_hr = (1.1 * math.log10(frequency_mhz) - 0.7) * rx_height_m - (1.56 * math.log10(frequency_mhz) - 0.8)
    loss = (69.55 + 26.16 * math.log10(frequency_mhz) - 13.82 * math.log10(tx_height_m) - a_hr +
            (44.9 - 6.55 * math.log10(tx_height_m)) * math.log10(distance_km))
    return loss


def received_power(tx_power_dbm: float, frequency_mhz: float, distance_km: float, tx_height_m: float = 30.0, rx_height_m: float = 1.5) -> float:
    """Estimate received signal power (dBm) using Hata path loss.
    """
    path_loss = hata_path_loss(frequency_mhz, distance_km, tx_height_m, rx_height_m)
    return tx_power_dbm - path_loss

if __name__ == "__main__":
    # Simple sanity check
    print(f"Path loss @ 600 MHz, 10 km: {hata_path_loss(600, 10):.2f} dB")
    print(f"Received power @ 30 dBm TX: {received_power(30, 600, 10):.2f} dBm")
