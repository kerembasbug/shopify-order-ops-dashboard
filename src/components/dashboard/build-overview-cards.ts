import type { OverviewCard } from "@/components/dashboard/overview-strip";
import {
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

export function buildOverviewCards(overview: OverviewData): OverviewCard[] {
  const currentRangeLabel = describeComparisonRange(
    overview.comparisonRange.currentFrom,
    overview.comparisonRange.currentTo,
  );
  const previousRangeLabel = describeComparisonRange(
    overview.comparisonRange.previousFrom,
    overview.comparisonRange.previousTo,
  );

  return [
    {
      label: "Selected Sales",
      ...buildSalesCard(
        overview.totalSalesAmount,
        overview.currencyCodes,
        currentRangeLabel,
        "Current period",
        "No orders in the current result set",
      ),
      tone: "accent" as const,
    },
    {
      label: "Previous Sales",
      ...buildSalesCard(
        overview.previousSalesAmount,
        overview.previousCurrencyCodes,
        previousRangeLabel,
        "Previous period",
        "No orders in the previous comparison period",
      ),
      tone: "default" as const,
    },
    {
      label: "Growth",
      value: overview.deltaPercentageLabel,
      hint: `Compared with ${previousRangeLabel}`,
      tone:
        overview.deltaDirection === "up"
          ? ("success" as const)
          : overview.deltaDirection === "down"
            ? ("danger" as const)
            : ("default" as const),
      trend: {
        direction: overview.deltaDirection,
        label: "Compared with previous period",
      },
    },
    {
      label: "Orders",
      value: overview.totalOrders.toLocaleString("en-US"),
      hint: `Orders in ${currentRangeLabel}`,
      tone: "default" as const,
    },
    {
      label: "Fulfilled",
      value: overview.fulfilledOrders.toLocaleString("en-US"),
      hint: `Fulfilled orders in ${currentRangeLabel}`,
      tone: "success" as const,
    },
    {
      label: "Unfulfilled",
      value: overview.unfulfilledOrders.toLocaleString("en-US"),
      hint: `Unfulfilled orders in ${currentRangeLabel}`,
      tone: "default" as const,
    },
    {
      label: "Open Issues",
      value: overview.openIssuesCount.toLocaleString("en-US"),
      hint: `Open issues in ${currentRangeLabel}`,
      tone: overview.openIssuesCount > 0 ? "danger" : "default",
    },
    {
      label: "Chargebacks",
      value: (overview.chargebackOrdersCount ?? 0).toLocaleString("en-US"),
      hint: `Chargeback-tagged orders in ${currentRangeLabel}`,
      tone: (overview.chargebackOrdersCount ?? 0) > 0 ? "danger" : "default",
    },
  ];
}
