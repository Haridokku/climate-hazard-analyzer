import { METRICS } from "./Charts";

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function InsightCards({ data, metric }) {
  const { yearly, quality, baseline } = data;
  const totalEvents = yearly.reduce((s, r) => s + r.events, 0);
  const totalDays = yearly.reduce((s, r) => s + r.heatwave_days, 0);
  const longest = Math.max(...yearly.map((r) => r.max_duration));
  const trend = data.trends[metric];
  const s = trend.stats;
  const label = METRICS.find((x) => x.key === metric).label;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Heatwave events" value={totalEvents} hint={`${yearly.length} years analyzed`} />
        <Stat label="Heatwave days" value={totalDays} />
        <Stat label="Longest event" value={`${longest} days`} />
        <Stat
          label="Data completeness"
          value={`${quality.completeness_pct}%`}
          hint={`${quality.missing_days} missing of ${quality.days.toLocaleString()} days`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold">Insight: {label.toLowerCase()}</h3>
          {!s.error && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                s.significant ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-700"
              }`}
            >
              {s.significant ? "Statistically significant" : "No significant trend"}
            </span>
          )}
        </div>

        <p className="leading-relaxed text-slate-800">{trend.insight}</p>

        {!s.error && (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">Mann-Kendall test</dt>
              <dd className="font-medium">p = {s.mk_p_value} ({s.mk_trend})</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">Theil-Sen slope per decade</dt>
              <dd className="font-medium">
                {s.sen_slope_per_decade} (CI {s.sen_ci_per_decade[0]} to {s.sen_ci_per_decade[1]})
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-slate-500">Linear regression per decade</dt>
              <dd className="font-medium">{s.ols_slope_per_decade} (p = {s.ols_p_value})</dd>
            </div>
          </dl>
        )}
      </div>

      <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
        <strong>Method:</strong> a heatwave is {baseline.min_duration}+ consecutive days above the {baseline.percentile}th
        percentile of that calendar day's maximum temperature, with thresholds fixed from the {baseline.start}–
        {baseline.end} baseline (±{baseline.window_days}-day window).
      </p>
    </div>
  );
}