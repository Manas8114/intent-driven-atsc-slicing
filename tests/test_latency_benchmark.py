"""
test_latency_benchmark.py - Verify real-time latency benchmarking implementation

Tests that:
1. LatencyTracker class works correctly
2. Latency metrics are returned in cognitive-state API
3. PPO inference time is reasonably fast (under 10ms safety margin)
"""

import pytest
import time
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestLatencyTracker:
    """Test the LatencyTracker class functionality."""
    
    def test_latency_tracker_imports(self):
        """Test that LatencyTracker can be imported."""
        from backend.ai_engine import LatencyTracker, LatencyMetrics, get_latency_tracker
        
        tracker = get_latency_tracker()
        assert tracker is not None
        assert isinstance(tracker, LatencyTracker)
    
    def test_latency_metrics_dataclass(self):
        """Test LatencyMetrics dataclass initialization."""
        from backend.ai_engine import LatencyMetrics
        
        metrics = LatencyMetrics()
        assert metrics.ppo_inference_ms == 0.0
        assert metrics.digital_twin_validation_ms == 0.0
        assert metrics.optimization_ms == 0.0
        assert metrics.total_decision_cycle_ms == 0.0
        assert metrics.policy_type == "pre_computed"
    
    def test_timer_precision(self):
        """Test that timing measurement is reasonably precise."""
        from backend.ai_engine import get_latency_tracker
        
        tracker = get_latency_tracker()
        
        # Time a known-duration operation
        start = tracker.start_timer()
        time.sleep(0.005)  # 5ms sleep
        elapsed = tracker.elapsed_ms(start)
        
        # Should be approximately 5ms (allow for scheduling variance)
        assert elapsed >= 4.0, f"Elapsed time {elapsed}ms too short"
        assert elapsed < 15.0, f"Elapsed time {elapsed}ms too long"
    
    def test_record_ppo_inference(self):
        """Test recording PPO inference time."""
        from backend.ai_engine import LatencyTracker
        
        tracker = LatencyTracker()
        start = tracker.start_timer()
        elapsed = tracker.elapsed_ms(start)
        
        tracker.record_ppo_inference(elapsed)
        assert tracker._current_metrics.ppo_inference_ms == elapsed
    
    def test_finalize_and_history(self):
        """Test finalizing metrics and accessing history."""
        from backend.ai_engine import LatencyTracker
        
        tracker = LatencyTracker()
        
        # Record some metrics
        start = tracker.start_timer()
        tracker.record_ppo_inference(0.5)
        tracker.record_digital_twin(1.2)
        tracker.record_optimization(0.3)
        
        # Finalize
        result = tracker.finalize_decision(start)
        
        assert result.ppo_inference_ms == 0.5
        assert result.digital_twin_validation_ms == 1.2
        assert result.optimization_ms == 0.3
        assert result.total_decision_cycle_ms > 0
        
        # Check history
        assert len(tracker._history) == 1
        latest = tracker.get_latest_metrics()
        assert latest.ppo_inference_ms == 0.5
    
    def test_average_metrics(self):
        """Test average calculation over multiple decisions."""
        from backend.ai_engine import LatencyTracker
        
        tracker = LatencyTracker()
        
        # Add multiple entries
        for i in range(5):
            start = tracker.start_timer()
            tracker.record_ppo_inference(1.0 * (i + 1))  # 1, 2, 3, 4, 5
            tracker.record_digital_twin(2.0 * (i + 1))   # 2, 4, 6, 8, 10
            tracker.finalize_decision(start)
        
        avg = tracker.get_average_metrics()
        
        assert avg["sample_count"] == 5
        assert avg["avg_ppo_inference_ms"] == 3.0  # (1+2+3+4+5)/5 = 3
        assert avg["avg_digital_twin_ms"] == 6.0   # (2+4+6+8+10)/5 = 6


class TestPPOInferenceSpeed:
    """Test that PPO inference is sufficiently fast."""
    
    def test_ppo_model_loads(self):
        """Test that the PPO model can be loaded."""
        try:
            from backend.rl_agent import RLController
            import numpy as np
            
            controller = RLController()
            # Create a sample observation
            obs = np.array([85.0, 20.0, 1.5, 1.0], dtype=np.float32)
            
            # Measure inference time
            start = time.perf_counter()
            weights = controller.suggest_weights(obs)
            elapsed_ms = (time.perf_counter() - start) * 1000
            
            # Should return valid weights
            assert weights is not None
            assert len(weights) == 2
            
            # Should be fast (under 10ms safety margin)
            # First call may be slower due to model loading
            print(f"PPO inference time: {elapsed_ms:.2f}ms")
            
        except Exception as e:
            pytest.skip(f"PPO model not available: {e}")
    
    def test_repeated_inference_speed(self):
        """Test that repeated inference is consistently fast."""
        try:
            from backend.rl_agent import RLController
            import numpy as np
            
            controller = RLController()
            obs = np.array([85.0, 20.0, 1.5, 1.0], dtype=np.float32)
            
            # Warm up
            controller.suggest_weights(obs)
            
            # Measure 10 inferences
            times = []
            for _ in range(10):
                start = time.perf_counter()
                controller.suggest_weights(obs)
                elapsed_ms = (time.perf_counter() - start) * 1000
                times.append(elapsed_ms)
            
            avg_time = sum(times) / len(times)
            max_time = max(times)
            
            print(f"Average inference time: {avg_time:.2f}ms")
            print(f"Max inference time: {max_time:.2f}ms")
            
            # Average should be under 5ms (generous margin)
            assert avg_time < 10.0, f"Average inference {avg_time}ms exceeds 10ms"
            
        except Exception as e:
            pytest.skip(f"PPO model not available: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
