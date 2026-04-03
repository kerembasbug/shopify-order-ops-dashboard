export function formatCurrency(amount: string | number, currencyCode?: string | null) {
  const numericAmount = typeof amount === "number" ? amount : Number.parseFloat(amount);

  if (!Number.isFinite(numericAmount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode ?? "USD",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatCurrencyScope(
  amount: string | number,
  currencyCodes: string[],
  hint: string,
  emptyHint = "No orders in the current result set",
) {
  const distinctCurrencyCodes = Array.from(
    new Set(currencyCodes.filter((currencyCode): currencyCode is string => Boolean(currencyCode))),
  );

  if (distinctCurrencyCodes.length === 0) {
    return {
      value: "—",
      hint: emptyHint,
    };
  }

  if (distinctCurrencyCodes.length === 1) {
    return {
      value: formatCurrency(amount, distinctCurrencyCodes[0]),
      hint,
    };
  }

  return {
    value: "Multi-currency",
    hint: `${hint} Currency mix prevents a reliable total.`,
  };
}

function parseIsoDateOnly(value: string) {
  const parts = value.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));

  if (![year, month, day].every(Number.isFinite)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function formatIsoDateLabel(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? parseIsoDateOnly(value)
        : new Date(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value: Date | string | null | undefined) {
  return formatIsoDateLabel(value);
}

export function formatStatusLabel(value: string | null | undefined) {
  if (!value) {
    return "Unspecified";
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatDuration(startedAt: Date | string | null | undefined, finishedAt: Date | string | null | undefined) {
  if (!startedAt) {
    return "—";
  }

  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const end = finishedAt
    ? finishedAt instanceof Date
      ? finishedAt
      : new Date(finishedAt)
    : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "—";
  }

  const diff = Math.max(0, end.getTime() - start.getTime());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatLandingPageLabel(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const url = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? new URL(trimmed)
      : new URL(trimmed, "https://orders.local");
    const pathWithSearch = `${url.pathname}${url.search}`;

    if (pathWithSearch && pathWithSearch !== "/") {
      return pathWithSearch;
    }

    return url.hostname;
  } catch {
    return trimmed;
  }
}

export function formatUtmSummary(
  utmSource: string | null | undefined,
  utmMedium: string | null | undefined,
  utmCampaign: string | null | undefined,
) {
  const parts = [utmSource, utmMedium, utmCampaign]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);

  return parts.join(" / ");
}

export function buildPathWithParams(
  pathname: string,
  currentQuery: string,
  patches: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams(currentQuery);

  for (const [key, value] of Object.entries(patches)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function removeQueryParam(pathname: string, currentQuery: string, key: string) {
  const params = new URLSearchParams(currentQuery);
  params.delete(key);

  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function formatList(items: string[]) {
  if (items.length === 0) {
    return "None";
  }

  return items.join(", ");
}
