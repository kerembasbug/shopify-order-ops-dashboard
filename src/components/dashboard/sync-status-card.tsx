import { formatDateTime, formatDuration, formatStatusLabel } from "@/components/dashboard/dashboard-utils";

type SyncRunItem = {
  id: number;
  storeName: string;
  triggerType: string;
  status: string;
  startedAt: Date | string;
  finishedAt: Date | string | null;
  ordersScanned: number;
  ordersChanged: number;
  errorMessage: string | null;
};

type SyncStatusCardProps = {
  runs: SyncRunItem[];
};

export function SyncStatusCard({ runs }: SyncStatusCardProps) {
  return (
    <section className="panel panel--sync">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">Sync health</p>
          <h2 className="panel__title">Recent runs</h2>
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="panel__empty">No sync runs yet. Trigger a manual refresh to seed history.</p>
      ) : (
        <ul className="sync-run-list">
          {runs.map((run) => (
            <li key={run.id} className="sync-run-item">
              <div className="sync-run-item__heading">
                <div>
                  <p className="sync-run-item__store">{run.storeName}</p>
                  <p className="sync-run-item__meta">
                    {formatStatusLabel(run.triggerType)} • {formatDateTime(run.startedAt)}
                  </p>
                </div>
                <span
                  className={`status-pill status-pill--${run.status === "failed" ? "danger" : run.status === "succeeded" ? "success" : "muted"}`}
                >
                  {formatStatusLabel(run.status)}
                </span>
              </div>

              <dl className="sync-run-item__stats">
                <div>
                  <dt>Scanned</dt>
                  <dd>{run.ordersScanned}</dd>
                </div>
                <div>
                  <dt>Changed</dt>
                  <dd>{run.ordersChanged}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{formatDuration(run.startedAt, run.finishedAt)}</dd>
                </div>
              </dl>

              {run.errorMessage ? (
                <p className="sync-run-item__error">{run.errorMessage}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
