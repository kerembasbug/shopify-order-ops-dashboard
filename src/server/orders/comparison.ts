const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type ComparisonDirection = "up" | "down" | "flat";

function parseUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_IN_MS);
}

function formatPercentageLabel(value: number) {
  return `${value.toFixed(1)}%`;
}

function normalizeCurrentWindow(filters: {
  dateFrom: string | null;
  dateTo: string | null;
}) {
  if (filters.dateFrom || filters.dateTo) {
    const selectedDate = filters.dateFrom ?? filters.dateTo ?? formatUtcDate(new Date());

    return {
      currentFrom: filters.dateFrom ?? selectedDate,
      currentTo: filters.dateTo ?? selectedDate,
    };
  }

  const todayUtc = parseUtcDate(formatUtcDate(new Date()));
  const dateTo = todayUtc;
  const dateFrom = addUtcDays(dateTo, -29);

  return {
    currentFrom: formatUtcDate(dateFrom),
    currentTo: formatUtcDate(dateTo),
  };
}

export function resolveComparisonRange(filters: {
  dateFrom: string | null;
  dateTo: string | null;
}) {
  const current = normalizeCurrentWindow(filters);
  const currentFrom = parseUtcDate(current.currentFrom);
  const currentTo = parseUtcDate(current.currentTo);
  const rangeLengthInDays =
    Math.round((currentTo.getTime() - currentFrom.getTime()) / DAY_IN_MS) + 1;
  const previousTo = addUtcDays(currentFrom, -1);
  const previousFrom = addUtcDays(previousTo, -(rangeLengthInDays - 1));

  return {
    currentFrom: current.currentFrom,
    currentTo: current.currentTo,
    previousFrom: formatUtcDate(previousFrom),
    previousTo: formatUtcDate(previousTo),
  };
}

export function getDeltaState(currentAmount: string, previousAmount: string) {
  const current = Number.parseFloat(currentAmount);
  const previous = Number.parseFloat(previousAmount);

  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return {
      direction: "flat" as const,
      percentageLabel: "—",
    };
  }

  if (previous === 0) {
    if (current > 0) {
      return {
        direction: "up" as const,
        percentageLabel: "New",
      };
    }

    return {
      direction: "flat" as const,
      percentageLabel: "0%",
    };
  }

  const delta = current - previous;

  if (delta === 0) {
    return {
      direction: "flat" as const,
      percentageLabel: "0.0%",
    };
  }

  const percentage = (delta / previous) * 100;

  if (Math.abs(percentage) < 0.1) {
    return {
      direction: "flat" as const,
      percentageLabel: "0.0%",
    };
  }

  return {
    direction: delta > 0 ? ("up" as const) : ("down" as const),
    percentageLabel: formatPercentageLabel(Math.abs(percentage)),
  };
}
