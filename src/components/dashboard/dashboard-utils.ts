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
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
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
