import React, { useState, useEffect, useRef } from 'react';

interface SignalRayProps {
    towerPosition: { x: number; y: number };
    devicePositions: Array<{ id: string; x: number; y: number; name: string }>;
    containerWidth: number;
    containerHeight: number;
}

const API_BASE = 'http://localhost:8000';

export const SignalRayOverlay: React.FC<SignalRayProps> = ({
    towerPosition,
    devicePositions,
    containerWidth,
    containerHeight,
}) => {
    const [quality, setQuality] = useState<'good' | 'fair' | 'poor'>('fair');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Fetch current signal quality
    useEffect(() => {
        const fetchQuality = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/telemetry/physics`);
                const data = await res.json();
                if (data.physics_log) {
                    setQuality(data.physics_log.quality || 'fair');
                    setQuality(data.physics_log.quality || 'fair');
                }
            } catch {
                // Silent fail
            }
        };

        fetchQuality();
        const interval = setInterval(fetchQuality, 500);
        return () => clearInterval(interval);
    }, []);

    // Draw signal rays on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const render = () => {
            // Clear canvas
            ctx.clearRect(0, 0, containerWidth, containerHeight);

            // Get color based on quality
            const getColor = () => {
                switch (quality) {
                    case 'good': return { r: 34, g: 197, b: 94, a: 0.6 };  // green-500
                    case 'fair': return { r: 234, g: 179, b: 8, a: 0.5 };   // yellow-500
                    case 'poor': return { r: 239, g: 68, b: 68, a: 0.7 };   // red-500
                    default: return { r: 156, g: 163, b: 175, a: 0.4 };     // gray-400
                }
            };

            const color = getColor();

            // Draw rays from tower to each device
            devicePositions.forEach((device, index) => {
                const startX = towerPosition.x;
                const startY = towerPosition.y;
                const endX = device.x;
                const endY = device.y;

                // Create gradient along the ray
                const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
                gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`);
                gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`);

                // Draw the ray
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();

                // Draw animated pulse along the ray (simulation of data flow)
                const pulsePosition = (Date.now() / 1000 + index * 0.5) % 1;
                const pulseX = startX + (endX - startX) * pulsePosition;
                const pulseY = startY + (endY - startY) * pulsePosition;

                ctx.beginPath();
                ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
                ctx.fill();

                // Draw glow effect
                ctx.beginPath();
                ctx.arc(pulseX, pulseY, 8, 0, Math.PI * 2);
                const glowGradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 8);
                glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`);
                glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = glowGradient;
                ctx.fill();
            });

            // Draw tower indicator
            ctx.beginPath();
            ctx.arc(towerPosition.x, towerPosition.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();

            animationId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationId);
    }, [quality, towerPosition, devicePositions, containerWidth, containerHeight]);

    return (
        <canvas
            ref={canvasRef}
            width={containerWidth}
            height={containerHeight}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 10 }}
        />
    );
};

export default SignalRayOverlay;
