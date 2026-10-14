import { useRef, useState } from "react";
import { getSummary, reverseGeocode, csvUrl, errorMessage } from "./api";
import RegionPicker from "./components/RegionPicker";
import MapPicker from "./components/MapPicker";
import Charts from "./components/Charts";
import InsightCards from "./components/InsightCards";

const MIN_YEAR = 1990;
const MAX_YEAR = new Date().getFullYear() - 1; // the current year is incomplete
const MIN_SPAN = 10;
const LOCATING = "Locating…";

function validate(region, startYear, endYear) {
  const lat = Number(region.lat);
  const lon = Number(region.lon);
  if (region.lat === "" || region.lon === "" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "Pick a location: search for a city, click the map, or enter coordinates.";
  }
  if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
  if (lon < -180 || lon > 180) return "Longitude must be between -180 and 180.";
  if (endYear - startYear + 1 < MIN_SPAN) return `Choose a range of at least ${MIN_SPAN} years.`;
  return null;
}

export default function App() {
  const [region, setRegion] = useState({
    lat: "17.385",
    lon: "78.4867",
    label: "Hyderabad, Telangana, India",
    source: "manual",
  });
  const [query, setQuery] = useState("Hyderabad, Telangana, India"); // text in the search box
  const [startYear, setStartYear] = useState(MIN_YEAR);
  const [endYear, setEndYear] = useState(MAX_YEAR);
  const [metric, setMetric] = useState("events");

  const [data, setData] = useState(null);
  const [analyzedLabel, setAnalyzedLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const selection = useRef(0);

  // every way of choosing a location goes through here (search, map click, typed coordinates)
  function selectLocation({ lat, lon, label, source, query: text = "" }) {
    selection.current += 1;
    setRegion({ lat, lon, label, source });
    setQuery(text);
    return selection.current;
  }

  async function handleMapPick(lat, lon) {
    const latStr = lat.toFixed(4);
    const lonStr = lon.toFixed(4);
    const id = selectLocation({ lat: latStr, lon: lonStr, label: LOCATING, source: "map" });

    const place = await reverseGeocode(latStr, lonStr).catch(() => null);
    if (id !== selection.current) return; // the user picked something else meanwhile

    const name = place?.label || null;
    setRegion((prev) => ({ ...prev, label: name || `Map point (${latStr}, ${lonStr})` }));
    setQuery(name || "");
  }

  async function handleAnalyze() {
    const problem = validate(region, startYear, endYear);
    if (problem) {
      setError(problem);
      return;
    }
    const id = ++requestId.current; // ignore responses from older requests
    setLoading(true);
    setError("");
    setData(null);
    try {
      const result = await getSummary({
        lat: Number(region.lat),
        lon: Number(region.lon),
        startYear,
        endYear,
      });
      if (id !== requestId.current) return;
      setData(result);
      setAnalyzedLabel(region.label === LOCATING ? `${region.lat}°, ${region.lon}°` : region.label);
    } catch (err) {
      if (id === requestId.current) setError(errorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-orange-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-bold sm:text-3xl">Climate Hazard Trend Analyzer</h1>
          <p className="mt-1 text-sm text-orange-100 sm:text-base">
            How have heatwaves changed over time in your region?
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold">Choose region and period</h2>
            <RegionPicker
              region={region}
              onSelect={selectLocation}
              query={query}
              setQuery={setQuery}
              startYear={startYear}
              endYear={endYear}
              setStartYear={setStartYear}
              setEndYear={setEndYear}
              minYear={MIN_YEAR}
              maxYear={MAX_YEAR}
              onAnalyze={handleAnalyze}
              loading={loading}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-1 text-lg font-semibold">Or click the map</h2>
            <p className="mb-3 text-sm text-slate-500">Click anywhere to set the location.</p>
            <MapPicker region={region} onPick={handleMapPick} />
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
            <p className="font-medium">Analyzing climate data…</p>
            <p className="max-w-md text-sm text-slate-500">
              The first request for a new location downloads and processes several decades of daily data, which can
              take several seconds. Repeat requests are instant.
            </p>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Choose a location and time range, then click <strong>Analyze</strong>.
          </div>
        )}

        {data && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Results for {analyzedLabel}</h2>
                <p className="text-sm text-slate-500">
                  Grid cell {data.region.lat}°, {data.region.lon}° · {data.start_year}–{data.end_year}
                  {data.cached ? " · served from stored results" : ""}
                </p>
              </div>
              <a
                href={csvUrl({
                  lat: data.region.lat,
                  lon: data.region.lon,
                  startYear: data.start_year,
                  endYear: data.end_year,
                })}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-100"
              >
                Download CSV
              </a>
            </div>

            <Charts data={data} metric={metric} setMetric={setMetric} />
            <InsightCards data={data} metric={metric} />
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-500">
        Weather data by{" "}
        <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo.com
        </a>{" "}
        (CC BY 4.0). Values are modelled grid-cell data, not station observations.
      </footer>
    </div>
  );
}