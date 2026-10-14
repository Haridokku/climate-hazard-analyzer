import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarController, BarElement,
  LineController, LineElement, PointElement, Tooltip, Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale, BarController, BarElement,
  LineController, LineElement, PointElement, Tooltip, Legend
);

export const METRICS = [
  { key: "events", label: "Events per year", axis: "Heatwave events" },
  { key: "heatwave_days", label: "Heatwave days", axis: "Days" },
  { key: "max_duration", label: "Longest event", axis: "Days" },
];

export default function Charts({ data, metric, setMetric }) {
  const m = METRICS.find((x) => x.key === metric);
  const labels = data.yearly.map((r) => r.year);
  const values = data.yearly.map((r) => r[metric]);
  const rolling = data.trends[metric].rolling_5yr;

  const chartData = {
    labels,
    datasets: [
      {
        type: "bar",
        label: m.label,
        data: values,
        backgroundColor: "rgba(249, 115, 22, 0.75)",
        borderRadius: 3,
        order: 2,
      },
      {
        type: "line",
        label: "5-year rolling average",
        data: rolling, // null for the first four years
        borderColor: "#7f1d1d",
        backgroundColor: "#7f1d1d",
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.25,
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { ticks: { maxTicksLimit: 12 }, grid: { display: false } },
      y: { beginAtZero: true, title: { display: true, text: m.axis } },
    },
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Heatwave trend over time</h3>
        <div role="tablist" className="inline-flex rounded-lg bg-slate-100 p-1">
          {METRICS.map((x) => (
            <button
              key={x.key}
              role="tab"
              aria-selected={metric === x.key}
              onClick={() => setMetric(x.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                metric === x.key ? "bg-white text-orange-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72 sm:h-96" role="img" aria-label={`Chart of ${m.label} by year with a 5-year rolling average`}>
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </div>
  );
}