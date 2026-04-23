import * as SDK from "azure-devops-extension-sdk";
import { getSharedQueries, getQueryDateFields } from "./core/AzureDevOpsClient";
import { CycleTimeSettings, QueryNode, WidgetStatusType } from "./core/types";

function getSettings(widgetSettings: { customSettings?: { data?: string } }): CycleTimeSettings {
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

function getSettingsToSave(): { data: string } {
    const titleEl = document.getElementById('title') as HTMLInputElement | null;
    const queryEl = document.getElementById('query') as HTMLSelectElement | null;
    const cycleTimeStartFieldEl = document.getElementById('cycle-time-start-field') as HTMLSelectElement | null;
    const cycleTimeEndFieldEl = document.getElementById('cycle-time-end-field') as HTMLSelectElement | null;
    const percentilesEl = document.getElementById('percentiles') as HTMLInputElement | null;

    const title = titleEl?.value || 'Cycle Time';
    const query = queryEl?.value || '';
    const cycleTimeStartField = cycleTimeStartFieldEl?.value || '';
    const cycleTimeEndField = cycleTimeEndFieldEl?.value || '';
    const percentilesInput = percentilesEl?.value || '';

    const percentiles = percentilesInput
        .split(',')
        .filter(p => !isNaN(parseInt(p, 10)))
        .join(',');

    return {
        data: JSON.stringify({
            title,
            query,
            cycleTimeStartField,
            cycleTimeEndField,
            percentiles
        })
    };
}

async function loadConfiguration(
    settings: { customSettings?: { data?: string } },
    context: { notify(eventName: string, eventArgs: unknown): void },
    widgetEvent: { ConfigurationChange: string; Args(settings: unknown): unknown }
): Promise<void> {
    const currentSettings = getSettings(settings);

    const querySelect = document.getElementById('query') as HTMLSelectElement | null;
    const titleInput = document.getElementById('title') as HTMLInputElement | null;
    const cycleTimeStartField = document.getElementById('cycle-time-start-field') as HTMLSelectElement | null;
    const cycleTimeEndField = document.getElementById('cycle-time-end-field') as HTMLSelectElement | null;
    const percentilesInput = document.getElementById('percentiles') as HTMLInputElement | null;

    if (!querySelect || !titleInput || !cycleTimeStartField || !cycleTimeEndField || !percentilesInput) {
        return;
    }

    const queries = await getSharedQueries();
    populateQuerySelect(queries, querySelect);

    titleInput.value = currentSettings.title;
    querySelect.value = currentSettings.query;
    percentilesInput.value = currentSettings.percentiles;

    await updateDateFields(currentSettings.cycleTimeStartField, cycleTimeStartField, querySelect.value);
    await updateDateFields(currentSettings.cycleTimeEndField, cycleTimeEndField, querySelect.value);

    titleInput.addEventListener('change', notifyChange);
    querySelect.addEventListener('change', async () => {
        await updateDateFields(cycleTimeStartField.value, cycleTimeStartField, querySelect.value);
        await updateDateFields(cycleTimeEndField.value, cycleTimeEndField, querySelect.value);
        notifyChange();
    });
    cycleTimeStartField.addEventListener('change', notifyChange);
    cycleTimeEndField.addEventListener('change', notifyChange);
    percentilesInput.addEventListener('change', notifyChange);

    function notifyChange(): void {
        const eventName = widgetEvent.ConfigurationChange;
        const eventArgs = widgetEvent.Args(getSettingsToSave());
        context.notify(eventName, eventArgs);
    }
}

function populateQuerySelect(queries: QueryNode[], selectEl: HTMLSelectElement): void {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    selectEl.appendChild(placeholder);

    queries.forEach(query => addQueryToSelect(query, selectEl, 0));
}

function addQueryToSelect(query: QueryNode, selectEl: HTMLSelectElement, level: number): void {
    const option = document.createElement('option');
    option.value = query.id;

    const padding = '\u00A0\u00A0'.repeat(level);
    option.textContent = padding + query.name;

    if (query.isFolder) {
        option.style.fontWeight = 'bold';
        option.disabled = true;
    }

    selectEl.appendChild(option);

    if (query.children?.length > 0) {
        query.children.forEach(child => addQueryToSelect(child, selectEl, level + 1));
    }
}

async function updateDateFields(
    currentValue: string,
    selectEl: HTMLSelectElement,
    queryId: string
): Promise<void> {
    if (!queryId) {
        selectEl.innerHTML = '';
        return;
    }

    const fields = await getQueryDateFields(queryId);

    selectEl.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    selectEl.appendChild(placeholder);

    fields.forEach(field => {
        const option = document.createElement('option');
        option.value = field.referenceName;
        option.textContent = field.name;
        selectEl.appendChild(option);
    });

    if (fields.some(f => f.referenceName === currentValue)) {
        selectEl.value = currentValue;
    } else {
        selectEl.value = '';
    }
}

SDK.init({ loaded: false });
SDK.ready().then(() => {
    SDK.register(SDK.getContributionId(), () => ({
        load: async (
            widgetSettings: { customSettings?: { data?: string } },
            context: { notify(eventName: string, eventArgs: unknown): void },
            widgetEvent: { ConfigurationChange: string; Args(settings: unknown): unknown }
        ) => {
            try {
                await loadConfiguration(widgetSettings, context, widgetEvent);
                return { statusType: WidgetStatusType.Success };
            } catch (e) {
                return { statusType: WidgetStatusType.Failure, message: String(e) };
            }
        },
        onSave: () => {
            return getSettingsToSave();
        }
    }));

    SDK.notifyLoadSucceeded();
});