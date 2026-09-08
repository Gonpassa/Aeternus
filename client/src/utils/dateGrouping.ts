export const monthLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { day: '2-digit' });

export const groupByMonth = <T extends { date: string }>(items: T[]): Array<[string, T[]]> => {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const key = monthLabel(item.date);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  });
  return Array.from(groups.entries());
};
