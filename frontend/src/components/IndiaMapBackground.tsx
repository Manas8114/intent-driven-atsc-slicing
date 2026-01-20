/**
 * IndiaMapBackground - A stunning broadcast-themed animated India map background
 * Features: Signal waves, broadcast towers, network connections, and pulsing cities
 */
export function IndiaMapBackground() {
    // Major Indian cities with broadcast significance (approximate positions on SVG viewBox)
    const cities = [
        { id: 'delhi', name: 'Delhi', x: 280, y: 180, major: true },
        { id: 'mumbai', name: 'Mumbai', x: 185, y: 340, major: true },
        { id: 'chennai', name: 'Chennai', x: 290, y: 460, major: true },
        { id: 'kolkata', name: 'Kolkata', x: 380, y: 280, major: true },
        { id: 'bengaluru', name: 'Bengaluru', x: 255, y: 440, major: true },
        { id: 'hyderabad', name: 'Hyderabad', x: 270, y: 380, major: false },
        { id: 'ahmedabad', name: 'Ahmedabad', x: 180, y: 260, major: false },
        { id: 'pune', name: 'Pune', x: 200, y: 360, major: false },
        { id: 'jaipur', name: 'Jaipur', x: 240, y: 200, major: false },
        { id: 'lucknow', name: 'Lucknow', x: 310, y: 210, major: false },
        { id: 'bhopal', name: 'Bhopal', x: 265, y: 280, major: false },
        { id: 'patna', name: 'Patna', x: 355, y: 230, major: false },
    ];

    // Network connections between cities
    const connections = [
        ['delhi', 'mumbai'],
        ['delhi', 'kolkata'],
        ['delhi', 'jaipur'],
        ['delhi', 'lucknow'],
        ['mumbai', 'chennai'],
        ['mumbai', 'bengaluru'],
        ['mumbai', 'pune'],
        ['mumbai', 'ahmedabad'],
        ['chennai', 'bengaluru'],
        ['chennai', 'hyderabad'],
        ['kolkata', 'patna'],
        ['bengaluru', 'hyderabad'],
        ['bhopal', 'delhi'],
        ['bhopal', 'mumbai'],
    ];

    const getCityById = (id: string) => cities.find(c => c.id === id);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

            {/* Animated grid overlay */}
            <div className="absolute inset-0 opacity-10 map-grid-pattern" />

            {/* Radial glow effect */}
            <div className="absolute inset-0 map-radial-glow" />

            {/* SVG India Map with broadcast elements */}
            <svg
                viewBox="0 0 500 600"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    {/* Gradient for India outline */}
                    <linearGradient id="indiaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
                    </linearGradient>

                    {/* Glow filter for cities */}
                    <filter id="cityGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Signal wave animation filter */}
                    <filter id="signalGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Animated gradient for connections */}
                    <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0">
                            <animate attributeName="offset" values="0;1;0" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.8">
                            <animate attributeName="offset" values="0.5;1.5;0.5" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0">
                            <animate attributeName="offset" values="1;2;1" dur="3s" repeatCount="indefinite" />
                        </stop>
                    </linearGradient>

                    {/* Radial gradient for broadcast signals */}
                    <radialGradient id="signalRadial" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* India Map Outline (Simplified polygon) */}
                <path
                    d="M 250 50
             C 280 55, 320 70, 340 90
             L 360 110 L 390 140 L 410 170
             L 400 200 L 390 220 L 385 250
             L 395 280 L 400 310 L 390 340
             L 380 370 L 360 400 L 340 440
             L 320 470 L 300 490 L 280 510
             L 260 520 L 240 515 L 220 500
             L 200 480 L 185 460 L 175 430
             L 160 400 L 150 370 L 155 340
             L 160 310 L 165 280 L 170 250
             L 175 220 L 180 190 L 185 160
             L 195 130 L 210 100 L 230 70
             L 250 50"
                    fill="none"
                    stroke="url(#indiaGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-60"
                >
                    <animate
                        attributeName="stroke-dasharray"
                        values="0,2000;2000,0"
                        dur="4s"
                        repeatCount="1"
                        fill="freeze"
                    />
                </path>

                {/* Inner glow for India shape */}
                <path
                    d="M 250 50
             C 280 55, 320 70, 340 90
             L 360 110 L 390 140 L 410 170
             L 400 200 L 390 220 L 385 250
             L 395 280 L 400 310 L 390 340
             L 380 370 L 360 400 L 340 440
             L 320 470 L 300 490 L 280 510
             L 260 520 L 240 515 L 220 500
             L 200 480 L 185 460 L 175 430
             L 160 400 L 150 370 L 155 340
             L 160 310 L 165 280 L 170 250
             L 175 220 L 180 190 L 185 160
             L 195 130 L 210 100 L 230 70
             L 250 50"
                    fill="url(#indiaGradient)"
                    className="opacity-5"
                />

                {/* Network connections with animated data flow */}
                {connections.map(([from, to], idx) => {
                    const fromCity = getCityById(from);
                    const toCity = getCityById(to);
                    if (!fromCity || !toCity) return null;

                    return (
                        <g key={`connection-${idx}`}>
                            {/* Base connection line */}
                            <line
                                x1={fromCity.x}
                                y1={fromCity.y}
                                x2={toCity.x}
                                y2={toCity.y}
                                stroke="rgba(59, 130, 246, 0.2)"
                                strokeWidth="1"
                                strokeDasharray="4,4"
                            />
                            {/* Animated data pulse */}
                            <circle r="3" fill="#3B82F6" filter="url(#signalGlow)">
                                <animateMotion
                                    dur={`${2 + idx * 0.3}s`}
                                    repeatCount="indefinite"
                                    path={`M ${fromCity.x},${fromCity.y} L ${toCity.x},${toCity.y}`}
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0.8;0.3;0.8"
                                    dur={`${2 + idx * 0.3}s`}
                                    repeatCount="indefinite"
                                />
                            </circle>
                        </g>
                    );
                })}

                {/* Broadcast signal waves from major cities */}
                {cities.filter(c => c.major).map((city, idx) => (
                    <g key={`signals-${city.id}`}>
                        {[1, 2, 3].map((ring) => (
                            <circle
                                key={`signal-${city.id}-${ring}`}
                                cx={city.x}
                                cy={city.y}
                                r="5"
                                fill="none"
                                stroke="#3B82F6"
                                strokeWidth="1"
                                opacity="0"
                            >
                                <animate
                                    attributeName="r"
                                    values="5;35;50"
                                    dur="3s"
                                    begin={`${ring * 0.8 + idx * 0.3}s`}
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="opacity"
                                    values="0.6;0.2;0"
                                    dur="3s"
                                    begin={`${ring * 0.8 + idx * 0.3}s`}
                                    repeatCount="indefinite"
                                />
                            </circle>
                        ))}
                    </g>
                ))}

                {/* City nodes */}
                {cities.map((city) => (
                    <g key={city.id} filter="url(#cityGlow)">
                        {/* Outer glow ring */}
                        <circle
                            cx={city.x}
                            cy={city.y}
                            r={city.major ? 12 : 8}
                            fill="rgba(59, 130, 246, 0.1)"
                            stroke="rgba(59, 130, 246, 0.3)"
                            strokeWidth="1"
                        >
                            <animate
                                attributeName="r"
                                values={city.major ? "12;15;12" : "8;10;8"}
                                dur="2s"
                                repeatCount="indefinite"
                            />
                        </circle>

                        {/* Core city dot */}
                        <circle
                            cx={city.x}
                            cy={city.y}
                            r={city.major ? 5 : 3}
                            fill={city.major ? "#3B82F6" : "#06B6D4"}
                            className="drop-shadow-lg"
                        >
                            <animate
                                attributeName="opacity"
                                values="1;0.7;1"
                                dur="1.5s"
                                repeatCount="indefinite"
                            />
                        </circle>

                        {/* Broadcast tower icon for major cities */}
                        {city.major && (
                            <g transform={`translate(${city.x - 6}, ${city.y - 20})`}>
                                <path
                                    d="M 6 20 L 6 8 M 3 10 L 6 6 L 9 10 M 1 6 L 6 0 L 11 6"
                                    fill="none"
                                    stroke="#10B981"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <animate
                                        attributeName="opacity"
                                        values="1;0.6;1"
                                        dur="2s"
                                        repeatCount="indefinite"
                                    />
                                </path>
                            </g>
                        )}

                        {/* City label */}
                        <text
                            x={city.x}
                            y={city.y + (city.major ? 28 : 18)}
                            textAnchor="middle"
                            className="text-[8px] font-mono uppercase tracking-wider"
                            fill={city.major ? "#60A5FA" : "#94A3B8"}
                        >
                            {city.name}
                        </text>
                    </g>
                ))}

                {/* Decorative corner elements */}
                <g className="opacity-40">
                    {/* Top-left corner */}
                    <path
                        d="M 30 30 L 30 60 M 30 30 L 60 30"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    {/* Top-right corner */}
                    <path
                        d="M 470 30 L 470 60 M 470 30 L 440 30"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    {/* Bottom-left corner */}
                    <path
                        d="M 30 570 L 30 540 M 30 570 L 60 570"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    {/* Bottom-right corner */}
                    <path
                        d="M 470 570 L 470 540 M 470 570 L 440 570"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </g>

                {/* Header text */}
                <text
                    x="250"
                    y="580"
                    textAnchor="middle"
                    className="text-[10px] font-mono uppercase tracking-[0.3em]"
                    fill="#475569"
                >
                    ATSC 3.0 Broadcast Coverage Network
                </text>

                {/* Floating data packets animation */}
                {[...Array(6)].map((_, i) => (
                    <rect
                        key={`packet-${i}`}
                        width="4"
                        height="4"
                        fill="#10B981"
                        opacity="0.6"
                        rx="1"
                    >
                        <animateMotion
                            dur={`${4 + i}s`}
                            repeatCount="indefinite"
                            path={`M ${150 + i * 30},${100 + i * 50} Q ${250},${300} ${350 - i * 20},${450 - i * 30}`}
                        />
                        <animate
                            attributeName="opacity"
                            values="0;0.8;0"
                            dur={`${4 + i}s`}
                            repeatCount="indefinite"
                        />
                    </rect>
                ))}
            </svg>

            {/* Scanline effect overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] map-scanline-effect" />

            {/* Vignette effect */}
            <div className="absolute inset-0 map-vignette-effect" />
        </div>
    );
}

export default IndiaMapBackground;
