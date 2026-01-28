
import pytest
from kpi_engine import RealTimeKPIEngine

def test_kpi_initialization():
    engine = RealTimeKPIEngine()
    assert engine.coverage == 0.0
    assert engine.total_packets_received == 0

def test_packet_increment():
    engine = RealTimeKPIEngine()
    engine.increment_packet_counts(total=100, lls=10, mmtp=90)
    assert engine.total_packets_received == 100
    assert engine.mmtp_packets_received == 90

def test_packet_loss_calculation():
    engine = RealTimeKPIEngine()
    # 100 received, 10 missing -> 10/100 = 10% loss
    engine.increment_packet_counts(mmtp=100, mmtp_missing=10)
    assert engine.packet_loss_rate == 0.1
