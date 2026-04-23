import * as SDK from "azure-devops-extension-sdk";
import { getClient } from "azure-devops-extension-api";
import { WorkItemTrackingRestClient, FieldType } from "azure-devops-extension-api/WorkItemTracking";
import { QueryNode, QueryColumn, HistogramBucket, CycleTimeSettings } from "./types";

let projectFields: { referenceName: string; type: number }[] = [];

export function init(): Promise<void> {
    const client = getClient(WorkItemTrackingRestClient);
    const projectId = SDK.getWebContext().project.id;

    return client.getFields(projectId).then(fields => {
        projectFields = fields.map(field => ({
            referenceName: field.referenceName,
            type: field.type
        }));
    });
}

export async function getSharedQueries(): Promise<QueryNode[]> {
    const client = getClient(WorkItemTrackingRestClient);
    const projectId = SDK.getWebContext().project.id;

    const root = await client.getQuery(projectId, 'Shared Queries', 2, 2);
    return root.children ?? [];
}

export async function getQueryDateFields(queryId: string): Promise<QueryColumn[]> {
    const client = getClient(WorkItemTrackingRestClient);
    const projectId = SDK.getWebContext().project.id;

    const query = await client.getQuery(projectId, queryId, 2, 2);

    return query.columns?.filter(column => {
        const projectField = projectFields.find(f => f.referenceName === column.referenceName);
        return projectField?.type === FieldType.DateTime;
    }) ?? [];
}

export async function getQueryWiql(queryId: string): Promise<{ wiql: string; type: number }> {
    const client = getClient(WorkItemTrackingRestClient);
    const projectId = SDK.getWebContext().project.id;

    const query = await client.getQuery(projectId, queryId, 2, 2);

    return {
        wiql: query.wiql,
        type: query.queryType
    };
}

export async function getItems(wiql: string, asOf?: Date): Promise<Record<string, unknown>[]> {
    const client = getClient(WorkItemTrackingRestClient);
    const projectId = SDK.getWebContext().project.id;

    const cleanedQuery = getCleanedQuery(wiql, asOf);
    const result = await client.queryByWiql({ query: cleanedQuery }, projectId);
    const ids = result.workItems.map(r => r.id);

    if (ids.length === 0) {
        return [];
    }

    return getWorkItemsById(ids, extractSelectedFields(wiql));
}

export async function fetchCycleTimeData(settings: CycleTimeSettings): Promise<HistogramBucket[]> {
    if (!settings.query) {
        return [];
    }

    const query = await getQueryWiql(settings.query);
    const items = await getItems(query.wiql);

    const cycleTimes = items
        .map(item => {
            const startValue = item[settings.cycleTimeStartField];
            const endValue = item[settings.cycleTimeEndField];

            if (startValue && endValue && startValue !== '' && endValue !== '') {
                const startDate = new Date(startValue as string);
                const endDate = new Date(endValue as string);
                return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
            }
            return null;
        })
        .filter((ct): ct is number => ct !== null);

    if (cycleTimes.length === 0) {
        return [];
    }

    const groups = cycleTimes.reduce<Record<number, number>>((a, c) => {
        a[c] = (a[c] || 0) + 1;
        return a;
    }, {});

    const min = Math.min(...cycleTimes);
    const max = Math.max(...cycleTimes);

    const result: HistogramBucket[] = [];
    for (let index = min; index <= max; index++) {
        result.push({ cycleTime: index, items: groups[index] ?? 0 });
    }

    return result;
}

function getCleanedQuery(query: string, asOf?: Date): string {
    let cleanedQuery = query.replace(/SELECT\s+([\s\S]+?)\s+FROM/i, 'SELECT [System.Id] FROM');

    if (asOf !== undefined && asOf !== null) {
        cleanedQuery += ` ASOF '${asOf.toISOString().split('T')[0]}'`;
    }

    return cleanedQuery;
}

export function extractSelectedFields(wiql: string): string[] {
    const match = /SELECT\s+([\s\S]+?)\s+FROM/i.exec(wiql);
    if (!match) return [];

    return match[1]
        .split(',')
        .map(s => s.trim().replace(/^\[|\]$/g, ''))
        .filter(s => s && s.toUpperCase() !== 'SYSTEM.ID');
}

async function getWorkItemsById(ids: number[], fields: string[]): Promise<Record<string, unknown>[]> {
    const client = getClient(WorkItemTrackingRestClient);

    const batches: Promise<Record<string, unknown>[]>[] = [];
    for (let i = 0; i < ids.length; i += 50) {
        const pack = ids.slice(i, i + 50);
        batches.push(
            client.getWorkItems(pack, undefined, fields).then(
                items => items.map(item => {
                    const itemWithFields: Record<string, unknown> = { ...item.fields, id: item.id };
                    return itemWithFields;
                })
            )
        );
    }

    const results = await Promise.all(batches);
    return results.flat();
}