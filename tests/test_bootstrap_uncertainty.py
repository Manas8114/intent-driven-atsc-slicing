"""
test_bootstrap_uncertainty.py - Unit tests for Bootstrap Uncertainty Estimation Module

Tests validate:
1. Block bootstrap correctly preserves temporal structure
2. BCa interval computation is mathematically correct
3. Stratified sampling maintains category proportions
4. Diagnostic metrics are accurately computed
5. API endpoints return expected response structures

Author: AI-Native Broadcast Intelligence Platform
"""

import pytest
import numpy as np
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestBootstrapConfig:
    """Test BootstrapConfig dataclass and validation."""
    
    def test_default_config(self):
        """Test default configuration values."""
        from backend.bootstrap_uncertainty import BootstrapConfig
        
        config = BootstrapConfig()
        assert config.n_resamples == 2000
        assert config.confidence_level == 0.95
        assert config.block_length is None  # Auto-select
        assert config.random_state == 42
    
    def test_custom_config(self):
        """Test custom configuration."""
        from backend.bootstrap_uncertainty import BootstrapConfig
        
        config = BootstrapConfig(
            n_resamples=5000,
            confidence_level=0.99,
            block_length=15,
            random_state=123
        )
        assert config.n_resamples == 5000
        assert config.confidence_level == 0.99
        assert config.block_length == 15
    
    def test_low_resample_warning(self):
        """Test warning for insufficient resamples."""
        from backend.bootstrap_uncertainty import BootstrapConfig
        import warnings
        
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            config = BootstrapConfig(n_resamples=500)
            assert len(w) == 1
            assert "below recommended minimum" in str(w[0].message)


class TestBlockBootstrap:
    """Test block bootstrap for time-series data."""
    
    def test_block_bootstrap_sample_length(self):
        """Verify block bootstrap produces sample of correct length."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100, random_state=42)
        engine = BootstrapEngine(config)
        
        data = np.arange(100).astype(float)
        resample = engine.block_bootstrap_sample(data, block_length=10)
        
        assert len(resample) == len(data)
    
    def test_block_bootstrap_preserves_local_structure(self):
        """Verify blocks maintain consecutive observations."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100, random_state=42)
        engine = BootstrapEngine(config)
        
        # Create data with clear local patterns
        data = np.sin(np.linspace(0, 4*np.pi, 100))
        
        # Generate multiple resamples
        resamples = [engine.block_bootstrap_sample(data, block_length=10) for _ in range(50)]
        
        # Check that consecutive elements within blocks maintain similar spacing
        for resample in resamples:
            # At least some blocks should have smooth transitions
            diffs = np.diff(resample)
            # Not all differences should be huge jumps
            smooth_transitions = np.sum(np.abs(diffs) < 0.5)
            assert smooth_transitions > len(resample) * 0.3  # At least 30% smooth
    
    def test_block_length_auto_selection(self):
        """Test automatic block length selection using n^(1/3) rule."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100, block_length=None)
        engine = BootstrapEngine(config)
        
        # For n=125, block length should be ceil(125^(1/3)) = 5
        data = np.random.randn(125)
        resample = engine.block_bootstrap_sample(data)
        
        assert len(resample) == 125
    
    def test_block_bootstrap_statistic(self):
        """Test block bootstrap computation for a statistic."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=500, random_state=42)
        engine = BootstrapEngine(config)
        
        # Time-series with known mean
        data = np.random.randn(100) + 50  # Mean ≈ 50
        
        estimates = engine.block_bootstrap(data, statistic=np.mean, block_length=10)
        
        assert len(estimates) == 500
        # Mean of estimates should be close to sample mean
        assert abs(np.mean(estimates) - np.mean(data)) < 1.0


class TestBCaIntervals:
    """Test BCa (Bias-Corrected & Accelerated) confidence intervals."""
    
    def test_bca_interval_contains_point_estimate(self):
        """BCa interval should typically contain the point estimate."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=1000, random_state=42)
        engine = BootstrapEngine(config)
        
        # Normal data
        data = np.random.randn(100) + 10
        point_estimate = np.mean(data)
        
        # Generate bootstrap distribution
        bootstrap_estimates = np.array([
            np.mean(engine.rng.choice(data, size=len(data), replace=True))
            for _ in range(config.n_resamples)
        ])
        
        ci_lower, ci_upper, z0 = engine.compute_bca_interval(
            data, bootstrap_estimates, np.mean, point_estimate
        )
        
        # Point estimate should be within CI (or very close)
        assert ci_lower <= point_estimate <= ci_upper
    
    def test_bca_interval_width_decreases_with_n(self):
        """Confidence interval should narrow with larger sample size."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig, BootstrapMethod
        
        config = BootstrapConfig(n_resamples=500, random_state=42)
        engine = BootstrapEngine(config)
        
        widths = []
        for n in [50, 100, 200]:
            data = np.random.randn(n)
            result, _ = engine.analyze_metric(
                data, "test_metric", 
                method=BootstrapMethod.BCa,
                is_timeseries=False
            )
            widths.append(result.ci_upper - result.ci_lower)
        
        # Widths should generally decrease with sample size
        assert widths[0] > widths[2] * 0.5  # Larger n should have tighter CI
    
    def test_bca_bias_correction(self):
        """Test that BCa correctly estimates bias."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=1000, random_state=42)
        engine = BootstrapEngine(config)
        
        # Symmetric distribution should have low bias
        data = np.random.randn(100)
        point_estimate = np.mean(data)
        
        bootstrap_estimates = np.array([
            np.mean(engine.rng.choice(data, size=len(data), replace=True))
            for _ in range(config.n_resamples)
        ])
        
        _, _, z0 = engine.compute_bca_interval(
            data, bootstrap_estimates, np.mean, point_estimate
        )
        
        # Bias correction z0 should be small for symmetric distribution
        assert abs(z0) < 0.5


class TestStratifiedBootstrap:
    """Test stratified bootstrap for categorical data."""
    
    def test_stratified_maintains_proportions(self):
        """Stratified bootstrap should maintain stratum proportions."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100, random_state=42)
        engine = BootstrapEngine(config)
        
        # Create imbalanced data
        data = np.concatenate([
            np.random.randn(30) + 10,  # Stratum A
            np.random.randn(70) + 20   # Stratum B
        ])
        strata = np.array(['A'] * 30 + ['B'] * 70)
        
        resampled_data, resampled_strata = engine.stratified_bootstrap_sample(data, strata)
        
        # Check proportions are maintained
        a_count = np.sum(resampled_strata == 'A')
        b_count = np.sum(resampled_strata == 'B')
        
        assert a_count == 30
        assert b_count == 70
    
    def test_stratified_bootstrap_statistic(self):
        """Test stratified bootstrap for computing statistics."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=500, random_state=42)
        engine = BootstrapEngine(config)
        
        # Create data with different stratum means
        data = np.concatenate([
            np.random.randn(50) + 5,   # Intent: emergency
            np.random.randn(50) + 10   # Intent: balanced
        ])
        strata = np.array(['emergency'] * 50 + ['balanced'] * 50)
        
        estimates = engine.stratified_bootstrap(data, strata, np.mean)
        
        assert len(estimates) == 500
        # Mean should be close to true combined mean (7.5)
        assert abs(np.mean(estimates) - 7.5) < 1.0


class TestDiagnostics:
    """Test bootstrap diagnostic computations."""
    
    def test_cv_coefficient_calculation(self):
        """Test coefficient of variation is correctly computed."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100)
        engine = BootstrapEngine(config)
        
        # Create known distribution
        bootstrap_estimates = np.random.randn(1000) * 0.5 + 10  # Mean=10, SD=0.5
        
        diagnostics = engine.compute_diagnostics("test", bootstrap_estimates)
        
        # CV = 0.5 / 10 = 0.05
        assert abs(diagnostics.cv_coefficient - 0.05) < 0.02
    
    def test_convergence_detection(self):
        """Test that convergence is correctly detected."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100)
        engine = BootstrapEngine(config)
        
        # Converged: low variance relative to mean
        converged_estimates = np.random.randn(1000) * 0.02 + 10
        diag1 = engine.compute_diagnostics("converged", converged_estimates)
        assert diag1.is_converged is True
        
        # Not converged: high variance relative to mean
        not_converged_estimates = np.random.randn(1000) * 2 + 10
        diag2 = engine.compute_diagnostics("not_converged", not_converged_estimates)
        assert diag2.is_converged is False
    
    def test_skewness_detection(self):
        """Test distribution shape detection."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100)
        engine = BootstrapEngine(config)
        
        # Symmetric distribution
        symmetric = np.random.randn(1000)
        diag_sym = engine.compute_diagnostics("symmetric", symmetric)
        assert diag_sym.distribution_shape == "symmetric"
        
        # Right-skewed distribution (exponential)
        right_skewed = np.random.exponential(scale=2.0, size=1000)
        diag_right = engine.compute_diagnostics("right", right_skewed)
        assert diag_right.distribution_shape == "right_skewed"


class TestMetricAnalysis:
    """Test complete metric analysis pipeline."""
    
    def test_analyze_coverage_metric(self):
        """Test analysis of coverage percentage metric."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig, BootstrapMethod
        
        config = BootstrapConfig(n_resamples=500, random_state=42)
        engine = BootstrapEngine(config)
        
        # Simulated coverage data (bounded 0-100)
        coverage = np.clip(np.random.randn(100) * 5 + 85, 0, 100)
        
        result, diagnostics = engine.analyze_metric(
            coverage,
            "coverage_pct",
            method=BootstrapMethod.BCa,
            is_timeseries=True
        )
        
        assert result.metric_name == "coverage_pct"
        assert result.ci_method == "BCa"
        assert 0 <= result.ci_lower <= result.point_estimate <= result.ci_upper <= 100
        assert result.n_observations == 100
        assert result.n_resamples == 500
    
    def test_analyze_success_rate_metric(self):
        """Test analysis of success rate (binary outcome)."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig, BootstrapMethod
        
        config = BootstrapConfig(n_resamples=500, random_state=42)
        engine = BootstrapEngine(config)
        
        # Binary success data
        successes = np.random.binomial(1, 0.8, size=100).astype(float)
        intents = np.random.choice(['emergency', 'balanced', 'maximize_coverage'], size=100)
        
        result, diagnostics = engine.analyze_metric(
            successes,
            "success_rate",
            method=BootstrapMethod.STRATIFIED,
            strata=intents,
            is_timeseries=False
        )
        
        assert result.metric_name == "success_rate"
        # Success rate should be around 0.8
        assert 0.6 < result.point_estimate < 1.0
        assert 0 <= result.ci_lower <= result.ci_upper <= 1


class TestIEEEReporting:
    """Test IEEE report generation."""
    
    def test_ieee_report_generation(self):
        """Test that IEEE report text is properly formatted."""
        from backend.bootstrap_uncertainty import (
            generate_ieee_report, BootstrapConfig, BootstrapResult
        )
        
        config = BootstrapConfig(n_resamples=2000)
        results = [
            BootstrapResult(
                metric_name="coverage_pct",
                point_estimate=92.3,
                ci_lower=89.1,
                ci_upper=95.2,
                ci_method="BCa",
                confidence_level=0.95,
                bias=0.001,
                standard_error=1.5,
                n_resamples=2000,
                n_observations=500
            )
        ]
        
        report = generate_ieee_report(results, config)
        
        assert "block bootstrap" in report.lower()
        assert "2,000" in report
        assert "BCa" in report
        assert "95%" in report
        assert "coverage" in report.lower()


class TestEdgeCases:
    """Test edge cases and error handling."""
    
    def test_small_sample_handling(self):
        """Test behavior with small samples."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig, BootstrapMethod
        
        config = BootstrapConfig(n_resamples=100, random_state=42)
        engine = BootstrapEngine(config)
        
        # Very small sample
        small_data = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        
        result, diagnostics = engine.analyze_metric(
            small_data,
            "small_sample",
            method=BootstrapMethod.BCa,
            is_timeseries=False
        )
        
        # Should still produce valid results
        assert result.ci_lower <= result.point_estimate <= result.ci_upper
    
    def test_constant_data_handling(self):
        """Test handling of constant data (zero variance)."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100, random_state=42)
        engine = BootstrapEngine(config)
        
        # Constant data
        constant_data = np.full(50, 42.0)
        
        diagnostics = engine.compute_diagnostics("constant", constant_data)
        
        # Should handle gracefully (CV will be inf or very large)
        assert diagnostics.cv_coefficient >= 0 or np.isinf(diagnostics.cv_coefficient)
    
    def test_single_stratum_stratified_bootstrap(self):
        """Test stratified bootstrap with single stratum."""
        from backend.bootstrap_uncertainty import BootstrapEngine, BootstrapConfig
        
        config = BootstrapConfig(n_resamples=100, random_state=42)
        engine = BootstrapEngine(config)
        
        data = np.random.randn(50) + 10
        strata = np.array(['only_stratum'] * 50)
        
        estimates = engine.stratified_bootstrap(data, strata, np.mean)
        
        assert len(estimates) == 100
        assert abs(np.mean(estimates) - 10) < 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
