import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

function collectStrings(
  value: unknown,
  strings: string[] = [],
  seen = new WeakSet<object>(),
) {
  if (typeof value === "string") {
    strings.push(value);
    return strings;
  }

  if (!value || typeof value !== "object") {
    return strings;
  }

  if (seen.has(value)) {
    return strings;
  }

  seen.add(value);

  for (const child of Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>)) {
    collectStrings(child, strings, seen);
  }

  return strings;
}

describe("buildSourceSearchCondition", () => {
  it("builds an attribution predicate for sourceSearch", async () => {
    const { buildSourceSearchCondition } = await import("@/server/orders/order-service");

    const predicate = buildSourceSearchCondition("meta");
    const serialized = collectStrings(predicate).join(" ");

    expect(predicate).toBeDefined();
    expect(serialized).toContain("%meta%");
    expect(serialized).toMatch(/sales(?:_|)channel/i);
    expect(serialized).toMatch(/referrer(?:_|)host/i);
    expect(serialized).toMatch(/utm(?:_|)source/i);
    expect(serialized).toMatch(/utm(?:_|)medium/i);
    expect(serialized).toMatch(/utm(?:_|)campaign/i);
  });
});
