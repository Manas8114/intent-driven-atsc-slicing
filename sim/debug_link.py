import sys
from pathlib import Path

# Ensure project root is on PYTHONPATH
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from sim.channel_model import hata_path_loss, received_power
from sim.plp_success import plp_success_probability

def debug():
    freq = 600.0
    dist = 10.0
    tx_power = 30.0 # dBm
    noise_floor = -100.0
    
    loss = hata_path_loss(freq, dist)
    rx = received_power(tx_power, freq, dist)
    snr = rx - noise_floor
    
    print(f"Frequency: {freq} MHz")
    print(f"Distance: {dist} km")
    print(f"TX Power: {tx_power} dBm")
    print(f"Path Loss: {loss:.2f} dB")
    print(f"RX Power: {rx:.2f} dBm")
    print(f"Noise Floor: {noise_floor} dBm")
    print(f"SNR: {snr:.2f} dB")
    
    plp_config = {
        "modulation": "QPSK",
        "coding_rate": "1/2"
    }
    prob = plp_success_probability(plp_config, snr)
    print(f"PLP Success Prob (QPSK 1/2): {prob:.4f}")

if __name__ == "__main__":
    debug()
