import { sql } from "drizzle-orm";
import { orders } from "@/db/schema";

const chargebackNeedles = ["chargeback", "charge back", "dispute"];

export function hasChargebackTag(tags: string[] | null | undefined) {
  if (!Array.isArray(tags)) {
    return false;
  }

  return tags.some((tag) => {
    const normalized = tag.trim().toLowerCase();
    return chargebackNeedles.some((needle) => normalized.includes(needle));
  });
}

export function getChargebackTagExistsSql() {
  return sql<boolean>`exists (
    select 1
    from jsonb_array_elements_text(${orders.tagsJson}) as tag(value)
    where lower(tag.value) like '%chargeback%'
      or lower(tag.value) like '%charge back%'
      or lower(tag.value) like '%dispute%'
  )`;
}
