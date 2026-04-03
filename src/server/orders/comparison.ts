const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type ComparisonDirection = "up" | "down" | "flat";

type ComparisonWindow = {
  dateFrom: string;
  dateTo: string;
};

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
  return `${value
    .toFixed(1)
    .replace(/\.0$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1")}%`;
}

function normalizeCurrentWindow(filters: {
  dateFrom: string | null;
  dateTo: string | null;
}): ComparisonWindow {
  if (filters.dateFrom || filters.dateTo) {
    const selectedDate = filters.dateFrom ?? filters.dateTo ?? formatUtcDate(new Date());

    return {
      dateFrom: filters.dateFrom ?? selectedDate,
      dateTo: filters.dateTo ?? selectedDate,
    };
  }

  const todayUtc = parseUtcDate(formatUtcDate(new Date()));
  const dateTo = todayUtc;
  const dateFrom = addUtcDays(dateTo, -29);

  return {
    dateFrom: formatUtcDate(dateFrom),
    dateTo: formatUtcDate(dateTo),
  };
}

export function resolveComparisonRange(filters: {
  dateFrom: string | null;
  dateTo: string | null;
}) {
  const current = normalizeCurrentWindow(filters);
  const currentFrom = parseUtcDate(current.dateFrom);
  const currentTo = parseUtcDate(current.dateTo);
  const rangeLengthInDays =
    Math.round((currentTo.getTime() - currentFrom.getTime()) / DAY_IN_MS) + 1;
  const previousTo = addUtcDays(currentFrom, -1);
  const previousFrom = addUtcDays(previousTo, -(rangeLengthInDays - 1));

  return {
    current,
    previous: {
      dateFrom: formatUtcDate(previousFrom),
      dateTo: formatUtcDate(previousTo),
    },
  };
}

export function getDeltaState(currentAmount: string, previousAmount: string) {
  const current = Number.parseFloat(currentAmount);
  const previous = Number.parseFloat(previousAmount);

  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return {
      direction: "flat" as const,
      percentageLabel: "0%",
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
      percentageLabel: "0%",
    };
  }

  return {
    direction: delta > 0 ? ("up" as const) : ("down" as const),
    percentageLabel: formatPercentageLabel(Math.abs((delta / previous) * 100)),
  };
}
