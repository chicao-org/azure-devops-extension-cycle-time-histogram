import type { Plugin } from 'chart.js';

export interface PercentilesPluginOptions {
    values: number[];
    color?: string;
    lineWidth?: number;
}

export const percentilesPlugin: Plugin<'bar'> = {
    id: 'percentiles',
    afterDatasetsDraw(chart, _args, options, _cancelable) {
        const opts = options as PercentilesPluginOptions | undefined;
        const values = opts?.values ?? [];
        const color = opts?.color ?? '#ff0000';
        const lineWidth = opts?.lineWidth ?? 2;

        if (!values.length) return;

        const meta = chart.getDatasetMeta(0);
        const bars = meta.data;
        const totals = (chart.data.datasets[0].data as number[]).reduce((acc, n) => acc + (n ?? 0), 0);
        if (totals === 0) return;

        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.textAlign = 'center';

        for (const pct of values) {
            const target = Math.floor((pct / 100) * totals);
            let running = 0;
            let idx = 0;
            while (idx < bars.length) {
                running += (chart.data.datasets[0].data[idx] as number) ?? 0;
                if (running >= target) break;
                idx++;
            }

            const bar = bars[idx];
            if (!bar) continue;

            ctx.beginPath();
            ctx.moveTo(bar.x, chartArea.top + 24);
            ctx.lineTo(bar.x, chartArea.bottom);
            ctx.stroke();

            ctx.fillText(`${pct}%`, bar.x, chartArea.top + 12);
        }

        ctx.restore();
    }
};