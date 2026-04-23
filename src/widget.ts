import * as SDK from "azure-devops-extension-sdk";
import Chart from "chart.js/auto";
import { fetchCycleTimeData, init as initClient } from "./core/AzureDevOpsClient";
import { CycleTimeSettings, HistogramBucket, WidgetStatusType, PercentilesPluginOptions } from "./core/types";
import { percentilesPlugin } from "./core/percentilesPlugin";

Chart.register(percentilesPlugin);

export function getSettings(widgetSettings: { customSettings?: { data?: string } }): CycleTimeSettings {
    const raw = widgetSettings.customSettings?.data;
    const settings = raw ? JSON.parse(raw) : {};

    return {
        title: settings?.title ?? 'Cycle Time',
        query: settings?.query ?? '',
        cycleTimeStartField: settings?.cycleTimeStartField ?? '',
        cycleTimeEndField: settings?.cycleTimeEndField ?? '',
        percentiles: settings?.percentiles ?? ''
    };
}

export function getChartConfiguration(data: HistogramBucket[], percentiles: string) {
    const percentileValues = percentiles && percentiles !== ''
        ? percentiles.split(',').map(p => parseInt(p, 10))
        : [];

    return {
        type: 'bar' as const,
        data: {
            labels: data.map(d => d.cycleTime),
            datasets: [
                {
                    label: "Items",
                    backgroundColor: "#79AEC8",
                    borderColor: "#417690",
                    data: data.map(d => d.items)
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 3,
            scales: {
                y: { title: { text: 'Items', display: true } },
                x: { title: { text: 'Cycle Times', display: true } }
            },
            plugins: {
                title: { display: false },
                legend: { display: false },
                tooltip: { enabled: false }
            }
        },
        plugins: [{
            afterDatasetsDraw: (chart: Chart<'bar'>, _args: Record<string, never>, _opts: PercentilesPluginOptions, _cancelable: false) => {
                const pluginOpts: PercentilesPluginOptions = { values: percentileValues };
                percentilesPlugin.afterDatasetsDraw?.(chart, _args, pluginOpts, _cancelable);
            }
        }]
    };
}

export async function renderWidget(widgetSettings: { customSettings?: { data?: string } }): Promise<void> {
    const settings = getSettings(widgetSettings);
    const titleEl = document.getElementById('title');
    const chartEl = document.getElementById('chart') as HTMLCanvasElement;
    const messageEl = document.getElementById('message');

    if (titleEl) {
        titleEl.textContent = settings.title;
    }

    const data = await fetchCycleTimeData(settings);

    if (chartEl?.parentElement) {
        chartEl.parentElement.style.display = 'block';
    }
    if (messageEl) {
        messageEl.style.display = 'none';
    }

    if (data.length === 0) {
        if (chartEl?.parentElement) {
            chartEl.parentElement.style.display = 'none';
        }
        if (messageEl) {
            messageEl.style.display = 'inline';
            messageEl.textContent = "There aren't data to show";
        }
        return;
    }

    new Chart(chartEl, getChartConfiguration(data, settings.percentiles) as never);
}

SDK.init({ loaded: false });
SDK.ready().then(() => {
    initClient();

    SDK.register(SDK.getContributionId(), () => ({
        load: async (widgetSettings: { customSettings?: { data?: string } }) => {
            try {
                await renderWidget(widgetSettings);
                return { statusType: WidgetStatusType.Success };
            } catch (e) {
                return { statusType: WidgetStatusType.Failure, message: String(e) };
            }
        },
        reload: async (widgetSettings: { customSettings?: { data?: string } }) => {
            try {
                await renderWidget(widgetSettings);
                return { statusType: WidgetStatusType.Success };
            } catch (e) {
                return { statusType: WidgetStatusType.Failure, message: String(e) };
            }
        }
    }));

    SDK.notifyLoadSucceeded();
});