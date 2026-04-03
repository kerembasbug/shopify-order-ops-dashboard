const fulfillmentValues = new Set(["all", "fulfilled", "unfulfilled"]);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export type OrderFilters = {
  storeId: number | null;
  fulfillment: "all" | "fulfilled" | "unfulfilled";
  hasIssues: boolean;
  hasNotes: boolean;
  search: string;
  sourceSearch: string;
  dateFrom: string | null;
  dateTo: string | null;
};

function parseStoreId(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = Number.parseInt(value.trim(), 10);

  return Number.isFinite(normalized) ? normalized : null;
}

function parseDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (
    !isoDatePattern.test(normalized) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  ) {
    return null;
  }

  return normalized;
}

export function parseOrderFilters(searchParams: URLSearchParams): OrderFilters {
  const fulfillment = (searchParams.get("fulfillment") ?? "all").trim().toLowerCase();
  const normalizedFulfillment = fulfillmentValues.has(fulfillment)
    ? (fulfillment as OrderFilters["fulfillment"])
    : "all";

  return {
    storeId: parseStoreId(searchParams.get("store")),
    fulfillment: normalizedFulfillment,
    hasIssues: searchParams.get("issues") === "true",
    hasNotes: searchParams.get("notes") === "true",
    search: (searchParams.get("search") ?? "").trim(),
    sourceSearch: (searchParams.get("source") ?? "").trim(),
    dateFrom: parseDateValue(searchParams.get("from")),
    dateTo: parseDateValue(searchParams.get("to")),
  };
}
