import { useState, useCallback } from 'react';
import { Camera, FileJson, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';

interface TelemetryExportData {
    timestamp: string;
    config: Record<string, unknown>;
    telemetry: Record<string, unknown>;
    offloading: Record<string, unknown>;
    events: Array<{
        timestamp: string;
        event_type: string;
        description: string;
    }>;
}

/**
 * Data Export Controls component for telemetry page.
 * Provides JSON/CSV export and screenshot capture.
 */
export function DataExportControls() {
    const [exporting, setExporting] = useState(false);
    const [lastExport, setLastExport] = useState<string | null>(null);

    const collectData = useCallback(async (): Promise<TelemetryExportData> => {
        const [telemetryRes, offloadingRes, eventsRes] = await Promise.all([
            fetch('http://localhost:8000/telemetry/all'),
            fetch('http://localhost:8000/telemetry/offloading'),
            fetch('http://localhost:8000/env/demo-events')
        ]);

        const telemetry = telemetryRes.ok ? await telemetryRes.json() : {};
        const offloading = offloadingRes.ok ? await offloadingRes.json() : {};
        const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };

        return {
            timestamp: new Date().toISOString(),
            config: telemetry.config_summary || {},
            telemetry,
            offloading,
            events: eventsData.events || []
        };
    }, []);

    const exportJSON = useCallback(async () => {
        setExporting(true);
        try {
            const data = await collectData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `atsc_telemetry_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setLastExport('JSON exported successfully');
        } catch (e) {
            console.error('Export failed:', e);
            setLastExport('Export failed');
        } finally {
            setExporting(false);
        }
    }, [collectData]);

    const exportCSV = useCallback(async () => {
        setExporting(true);
        try {
            const data = await collectData();

            // Flatten data for CSV
            const rows: string[][] = [];
            rows.push(['Metric', 'Value', 'Timestamp']);

            // Add offloading metrics
            if (data.offloading?.traffic_offloading) {
                const to = data.offloading.traffic_offloading as Record<string, unknown>;
                Object.entries(to).forEach(([key, value]) => {
                    rows.push([`offloading.${key}`, String(value), data.timestamp]);
                });
            }

            // Add mobility metrics
            if (data.offloading?.mobility) {
                const mob = data.offloading.mobility as Record<string, unknown>;
                Object.entries(mob).forEach(([key, value]) => {
                    rows.push([`mobility.${key}`, String(value), data.timestamp]);
                });
            }

            // Add events
            data.events.forEach((e, i) => {
                rows.push([`event.${i}.${e.event_type}`, e.description, e.timestamp]);
            });

            const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `atsc_telemetry_${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            setLastExport('CSV exported successfully');
        } catch (e) {
            console.error('Export failed:', e);
            setLastExport('Export failed');
        } finally {
            setExporting(false);
        }
    }, [collectData]);

    const captureScreenshot = useCallback(async () => {
        setExporting(true);
        try {
            // Use html2canvas if available, otherwise just notify
            if (typeof window !== 'undefined') {
                // For now, trigger browser's print dialog as fallback
                const data = await collectData();
                const printContent = `
                    <html>
                    <head><title>ATSC Telemetry Snapshot</title></head>
                    <body style="font-family: sans-serif; padding: 20px;">
                        <h1>ATSC 3.0 Telemetry Snapshot</h1>
                        <p>Timestamp: ${data.timestamp}</p>
                        <h2>Configuration</h2>
                        <pre>${JSON.stringify(data.config, null, 2)}</pre>
                        <h2>Traffic Offloading</h2>
                        <pre>${JSON.stringify(data.offloading?.traffic_offloading, null, 2)}</pre>
                        <h2>Mobility</h2>
                        <pre>${JSON.stringify(data.offloading?.mobility, null, 2)}</pre>
                        <h2>Recent Events</h2>
                        <pre>${JSON.stringify(data.events.slice(-10), null, 2)}</pre>
                    </body>
                    </html>
                `;
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(printContent);
                    printWindow.document.close();
                    printWindow.print();
                }
                setLastExport('Print dialog opened');
            }
        } catch (e) {
            console.error('Screenshot failed:', e);
            setLastExport('Screenshot failed');
        } finally {
            setExporting(false);
        }
    }, [collectData]);

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={exportJSON}
                disabled={exporting}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                    "border border-slate-200 text-slate-600 hover:bg-slate-50",
                    exporting && "opacity-50 cursor-not-allowed"
                )}
                title="Export telemetry as JSON"
            >
                <FileJson className="h-3.5 w-3.5" />
                JSON
            </button>
            <button
                onClick={exportCSV}
                disabled={exporting}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                    "border border-slate-200 text-slate-600 hover:bg-slate-50",
                    exporting && "opacity-50 cursor-not-allowed"
                )}
                title="Export telemetry as CSV"
            >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
            </button>
            <button
                onClick={captureScreenshot}
                disabled={exporting}
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                    "border border-slate-200 text-slate-600 hover:bg-slate-50",
                    exporting && "opacity-50 cursor-not-allowed"
                )}
                title="Capture dashboard snapshot"
            >
                <Camera className="h-3.5 w-3.5" />
                Snapshot
            </button>
            {lastExport && (
                <span className="text-xs text-slate-400 ml-2">{lastExport}</span>
            )}
        </div>
    );
}
