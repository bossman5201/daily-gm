'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { Calendar } from 'lucide-react';

/**
 * GitHub-style heat map showing GM activity.
 * Blue = GM'd that day, Red = missed (active streak day with no GM), Empty = before first GM.
 */

const CELL_SIZE = 12;
const GAP = 2;
const WEEKS_TO_SHOW = 20; // ~5 months on mobile

export function HeatMap() {
    const { address, isConnected } = useAccount();
    const [gmDays, setGmDays] = React.useState<Set<string>>(new Set());
    const [firstGmDate, setFirstGmDate] = React.useState<Date | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!address || !isConnected) return;

        const fetchGmDays = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/stats?type=heatmap&address=${address}&t=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) throw new Error('Fetch failed');
                const data = await res.json();

                if (data && data.length > 0) {
                    const days = new Set<string>();
                    data.forEach((e: { block_timestamp: number }) => {
                        const d = new Date(e.block_timestamp * 1000);
                        const localDateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                        days.add(localDateStr);
                    });
                    setGmDays(days);

                    const firstDate = new Date((data[0] as { block_timestamp: number }).block_timestamp * 1000);
                    firstDate.setHours(0, 0, 0, 0); // Strip time-of-day so the first day's cell isn't filtered out
                    setFirstGmDate(firstDate);
                }
            } catch (err) {
                console.error('HeatMap fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGmDays();

        const handleOptimisticUpdate = () => {
            setTimeout(fetchGmDays, 1000);
        };
        window.addEventListener('optimistic-update', handleOptimisticUpdate);

        return () => {
            window.removeEventListener('optimistic-update', handleOptimisticUpdate);
        };
    }, [address, isConnected]);

    if (!isConnected || !address) return null;

    // Build grid of days (last N weeks)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: Date; dateStr: string }[] = [];
    const totalDays = WEEKS_TO_SHOW * 7;

    for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const localDateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({ date: d, dateStr: localDateStr });
    }

    // Group into weeks (columns)
    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    const getColor = (dateStr: string, date: Date) => {
        if (gmDays.has(dateStr)) return 'bg-[#0052FF]'; // Blue = GM'd
        if (!firstGmDate || date < firstGmDate) return 'bg-white/5'; // Before first GM
        if (date > today) return 'bg-white/5'; // Future
        return 'bg-red-500/40'; // Red = missed
    };

    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
        const firstDay = week[0];
        if (firstDay && firstDay.date.getMonth() !== lastMonth) {
            lastMonth = firstDay.date.getMonth();
            monthLabels.push({
                label: firstDay.date.toLocaleString('en', { month: 'short' }),
                col: colIdx,
            });
        }
    });

    return (
        <div className="w-full max-w-md mt-8">
            <div className="flex items-center gap-2 mb-3 justify-center">
                <Calendar className="w-4 h-4 text-[#0052FF]" />
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">GM Activity</h3>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/5 overflow-x-auto">
                {isLoading ? (
                    <div className="h-[108px] flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Month labels */}
                        <div className="flex mb-1" style={{ paddingLeft: 0 }}>
                            {monthLabels.map((m, i) => (
                                <span
                                    key={i}
                                    className="text-[9px] text-white/30 font-medium"
                                    style={{
                                        position: 'relative',
                                        left: m.col * (CELL_SIZE + GAP),
                                    }}
                                >
                                    {m.label}
                                </span>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex gap-[2px]">
                            {weeks.map((week, colIdx) => (
                                <div key={colIdx} className="flex flex-col gap-[2px]">
                                    {week.map((day) => (
                                        <div
                                            key={day.dateStr}
                                            title={`${day.dateStr}${gmDays.has(day.dateStr) ? ' ✅ GM' : ''}`}
                                            className={`rounded-sm transition-colors ${getColor(day.dateStr, day.date)}`}
                                            style={{ width: CELL_SIZE, height: CELL_SIZE }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 mt-3 text-[9px] text-white/30">
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-[#0052FF]" />
                                <span>GM&apos;d</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-red-500/40" />
                                <span>Missed</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-sm bg-white/5 border border-white/10" />
                                <span>N/A</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
