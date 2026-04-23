export function extractSelectedFields(wiql: string): string[] {
    const match = /SELECT\s+([\s\S]+)\s+FROM\s+/i.exec(wiql);
    if (!match) return [];

    return match[1]
        .split(',')
        .map(s => {
            let field = s.trim();
            field = field.replace(/\/\*[\s\S]*?\*\//g, '').trim();
            const asIdx = field.toUpperCase().lastIndexOf(' AS ');
            if (asIdx !== -1) {
                field = field.substring(0, asIdx);
            }
            field = field.replace(/^\[|\]$/g, '').trim();
            return field;
        })
        .filter(s => s.length > 0 && s.toUpperCase() !== 'SYSTEM.ID');
}

export function getCleanedQuery(query: string, asOf?: Date): string {
    let cleanedQuery = query.replace(/SELECT\s+[\s\S]+\s+FROM\s+/i, 'SELECT [System.Id] FROM ');

    if (asOf !== undefined && asOf !== null) {
        cleanedQuery += ` ASOF '${asOf.toISOString().split('T')[0]}'`;
    }

    return cleanedQuery;
}

export function calcCycleTimeDays(start: Date, end: Date, inclusive: boolean = true): number {
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return inclusive ? days + 1 : days;
}

export function isValidDate(value: unknown): boolean {
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === 'string') return value !== '' && !isNaN(Date.parse(value));
    return false;
}