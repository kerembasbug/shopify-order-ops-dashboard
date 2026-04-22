import React from "react";
import {
  formatCurrencyScope,
  formatIsoDateLabel,
} from "@/components/dashboard/dashboard-utils";

type DailyTrendPoint = {
  date: string;
  totalOrders: number;
  totalSalesAmount: string;
  chargebackOrdersCount: number;
  currencyCodes: string[];
};

type StorePerformancePoint = {
  storeId: number;
  storeName: string;
  totalOrders: number;
  totalSalesAmount: string;
  chargebackOrdersCount: number;
  fulfilledOrders: number;
  currencyCodes: string[];
};

type AnalyticsPanelsProps = {
  analytics: {
    dailyTrend: DailyTrendPoint[];
    storeBreakdown: StorePerformancePoint[];
  };
};

function getBarHeight(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return 16;
  }

  return Math.max(16, Math.round((value / maxValue) * 100));
}

export function AnalyticsPanels({ analytics }: AnalyticsPanelsProps) {
  const maxDailyOrders = Math.max(0, ...analytics.dailyTrend.map((point) => point.totalOrders));
  const maxStoreOrders = Math.max(0, ...analytics.storeBreakdown.map((point) => point.totalOrders));

  return (
    <section className="analytics-grid" aria-label="Analytics">
      <article className="panel panel--analytics">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Daily trend</p>
            <h2 className="panel__title">Orders by day</h2>
          </div>
        </div>

        {analytics.dailyTrend.length === 0 ? (
          <p className="panel__empty">No order activity in the selected range.</p>
        ) : (
          <div className="trend-chart" role="img" aria-label="Orders by day chart">
            {analytics.dailyTrend.map((point) => (
              <div key={point.date} className="trend-chart__day">
                <div
                  className="trend-chart__bar"
                  style={{ height: `${getBarHeight(point.totalOrders, maxDailyOrders)}%` }}
                />
                <div className="trend-chart__meta">
                  <strong>{point.totalOrders}</strong>
                  <span>{formatIsoDateLabel(point.date)}</span>
                  <small>
                    {
                      formatCurrencyScope(
                        point.totalSalesAmount,
                        point.currencyCodes,
                        "",
                        "No revenue",
                      ).value
                    }
                  </small>
                  {point.chargebackOrdersCount > 0 ? (
                    <small className="trend-chart__chargeback">
                      {point.chargebackOrdersCount} chargeback
                    </small>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="panel panel--analytics">
        <div className="panel__header">
          <div>
            <p className="panel__eyebrow">Store split</p>
            <h2 className="panel__title">All-store performance</h2>
          </div>
        </div>

        {analytics.storeBreakdown.length === 0 ? (
          <p className="panel__empty">No store performance data is available for this filter set.</p>
        ) : (
          <ul className="store-breakdown">
            {analytics.storeBreakdown.map((store) => (
              <li key={store.storeId} className="store-breakdown__item">
                <div className="store-breakdown__header">
                  <div>
                    <strong>{store.storeName}</strong>
                    <span>{store.totalOrders} orders</span>
                  </div>
                  <div className="store-breakdown__totals">
                    <strong>
                      {
                        formatCurrencyScope(
                          store.totalSalesAmount,
                          store.currencyCodes,
                          "",
                          "No revenue",
                        ).value
                      }
                    </strong>
                    <span>{store.fulfilledOrders} fulfilled</span>
                  </div>
                </div>
                <div className="store-breakdown__bar-track">
                  <div
                    className="store-breakdown__bar"
                    style={{ width: `${getBarHeight(store.totalOrders, maxStoreOrders)}%` }}
                  />
                </div>
                <div className="store-breakdown__footer">
                  <span>{store.chargebackOrdersCount} chargeback-tagged</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
