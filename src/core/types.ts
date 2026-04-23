export interface CycleTimeSettings {
    title: string;
    query: string;
    cycleTimeStartField: string;
    cycleTimeEndField: string;
    percentiles: string;
}

export interface HistogramBucket {
    cycleTime: number;
    items: number;
}

export interface QueryNode {
    id: string;
    name: string;
    path: string;
    isFolder: boolean;
    children: QueryNode[];
}

export interface QueryColumn {
    referenceName: string;
    name: string;
}

export const WidgetStatusType = {
    Success: 1,
    PartialFailure: 2,
    Failure: 3
} as const;

export interface PercentilesPluginOptions {
    values: number[];
    color?: string;
    lineWidth?: number;
}