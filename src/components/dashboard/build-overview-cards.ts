import type { OverviewCard } from "@/components/dashboard/overview-strip";
import {
  formatCurrency,
  formatCurrencyScope,
  formatIsoDateLabel,
} from "@/components/dashboard/dashboard-utils";

type OverviewData = {
  comparisonRange: {
    currentFrom: string;
    currentTo: string;
    previousFrom: string;
    previousTo: string;
  };
  totalOrders: number;
  totalSalesAmount: string;
  previousSalesAmount: string;
  currencyCodes: string[];
  previousCurrencyCodes: string[];
  deltaDirection: "up" | "down" | "flat";
  deltaPercentageLabel: string;
  fulfilledOrders: number;
  unfulfilledOrders: number;
  openIssuesCount: number;
  ordersWithNotesCount: number;
  chargebackOrdersCount: number;
};

function describeComparisonRange(from: string, to: string) {
  return `${formatIsoDateLabel(from)} to ${formatIsoDateLabel(to)}`;
}

function buildSalesCard(
  amount: string,
  currencyCodes: string[],
  rangeLabel: string,
  periodLabel: string,
  emptyHint: string,
) {
  return formatCurrencyScope(amount, currencyCodes, `${periodLabel}: ${rangeLabel}`, emptyHint);
}

function buildAverageOrderValueCard(overview: OverviewData, currentRangeLabel: string) {
  if (overview.totalOrders <= 0) {
    return {
      label: "Average Order Value",
      value: "—",
      hint: "No orders in the current result set",
      tone: "default" as const,
    };
  }

  const distinctCurrencyCodes = Array.from(
    new Set(
      overview.currencyCodes.filter(
        (currencyCode): currencyCode is string => Boolean(currencyCode),
      ),
    ),
  );

  if (distinctCurrencyCodes.length !== 1) {
    return {
      label: "Average Order Value",
      value: "Multi-currency",
      hint: `AOV is only shown when ${currentRangeLabel} uses one currency.`,
      tone: "default" as const,
    };
  }

  const salesAmount = Number.parseFloat(overview.totalSalesAmount);
  const averageOrderValue = salesAmount / overview.totalOrders;

  return {
    label: "Average Order Value",
    value: formatCurrency(averageOrderValue, distinctCurrencyCodes[0]),
    hint: `Revenue per order in ${currentRangeLabel}`,
    tone: "default" as const,
  };
}

export function buildOverviewCards(overview: OverviewData): OverviewCard[] {
  const currentRangeLabel = describeComparisonRange(
    overview.comparisonRange.currentFrom,
    overview.comparisonRange.currentTo,
  );
  const previousSales = buildSalesCard(
    overview.previousSalesAmount,
    overview.previousCurrencyCodes,
    describeComparisonRange(
      overview.comparisonRange.previousFrom,
      overview.comparisonRange.previousTo,
    ),
    "Previous period",
    "No orders in the previous comparison period",
  );
  const revenueTrend =
    overview.deltaDirection === "up"
      ? {
          direction: "up" as const,
          label: `${overview.deltaPercentageLabel} vs previous`,
        }
      : overview.deltaDirection === "down"
        ? {
            direction: "down" as const,
            label: `${overview.deltaPercentageLabel} vs previous`,
          }
        : {
            direction: "flat" as const,
            label:
              previousSales.value === "—" ? "No comparison yet" : `Previous ${previousSales.value}`,
          };

  return [
    {
      label: "Total Revenue",
      ...buildSalesCard(
        overview.totalSalesAmount,
        overview.currencyCodes,
        currentRangeLabel,
        "Current period",
        "No orders in the current result set",
      ),
      tone: "accent" as const,
      trend: revenueTrend,
    },
    {
      label: "Orders",
      value: overview.totalOrders.toLocaleString("en-US"),
      hint: `${overview.fulfilledOrders.toLocaleString("en-US")} fulfilled in ${currentRangeLabel}`,
      tone: "default" as const,
    },
    buildAverageOrderValueCard(overview, currentRangeLabel),
    {
      label: "Chargeback Watch",
      value: (overview.chargebackOrdersCount ?? 0).toLocaleString("en-US"),
      hint:
        (overview.chargebackOrdersCount ?? 0) > 0
          ? `${overview.chargebackOrdersCount} tagged order(s) need follow-up`
          : `No chargeback-tagged orders in ${currentRangeLabel}`,
      tone: (overview.chargebackOrdersCount ?? 0) > 0 ? "danger" : "default",
    },
  ];
}
