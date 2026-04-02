export type OverviewCard = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "success" | "danger" | "accent";
};

const toneClassNames: Record<NonNullable<OverviewCard["tone"]>, string> = {
  default: "overview-card--default",
  success: "overview-card--success",
  danger: "overview-card--danger",
  accent: "overview-card--accent",
};

export function OverviewStrip({ cards }: { cards: OverviewCard[] }) {
  return (
    <section className="overview-strip" aria-label="Overview">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`overview-card ${toneClassNames[card.tone ?? "default"]}`}
        >
          <p className="overview-card__label">{card.label}</p>
          <p className="overview-card__value">{card.value}</p>
          <p className="overview-card__hint">{card.hint}</p>
        </article>
      ))}
    </section>
  );
}
