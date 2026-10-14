import { useState } from "react";
import { geocode, errorMessage } from "../api";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const placeLabel = (p) => [p.name, p.admin1, p.country].filter(Boolean).join(", ");

function Spinner({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
    />
  );
}

export default function RegionPicker({
  region, onSelect, query, setQuery, startYear, endYear, setStartYear, setEndYear,
  minYear, maxYear, onAnalyze, loading,
}) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setSearchError("");
    setResults([]);
    try {
      const found = await geocode(q);
      setResults(found);
      if (found.length === 0) setSearchError("No places found. Try another spelling.");
    } catch (err) {
      setSearchError(errorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  function pick(place) {
    const label = placeLabel(place);
    onSelect({
      lat: String(place.lat),
      lon: String(place.lon),
      label,
      source: "search", // tells the map to fly to this point
      query: label,     // show the full place name in the search box
    });
    setResults([]);
    setSearchError("");
  }

  const setCoord = (key) => (e) =>
    onSelect({
      lat: key === "lat" ? e.target.value : region.lat,
      lon: key === "lon" ? e.target.value : region.lon,
      label: "Custom location",
      source: "manual",
    });

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="hazard" className={labelCls}>Hazard type</label>
        <select id="hazard" className={field} defaultValue="heatwave">
          <option value="heatwave">Heatwave</option>
          <option value="drought" disabled>Drought (coming soon)</option>
          <option value="rain" disabled>Heavy rainfall (coming soon)</option>
        </select>
      </div>

      <form onSubmit={handleSearch}>
        <label htmlFor="city" className={labelCls}>Search a city</label>
        <div className="flex gap-2">
          <input
            id="city"
            className={field}
            placeholder="e.g. Hyderabad"
            value={query}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={searching || query.trim().length < 2}
            className="flex min-w-24 items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? <Spinner /> : "Search"}
          </button>
        </div>
        {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {results.map((p, i) => (
              <li key={`${p.lat}-${p.lon}-${i}`}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                >
                  {placeLabel(p)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      <div>
        <span className={labelCls}>Coordinates</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" step="any" min="-90" max="90"
            aria-label="Latitude" placeholder="Latitude"
            className={field} value={region.lat} onChange={setCoord("lat")}
          />
          <input
            type="number" step="any" min="-180" max="180"
            aria-label="Longitude" placeholder="Longitude"
            className={field} value={region.lon} onChange={setCoord("lon")}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Selected: <span className="font-medium text-slate-700">{region.label}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="start" className={labelCls}>From</label>
          <select id="start" className={field} value={startYear} onChange={(e) => setStartYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="end" className={labelCls}>To</label>
          <select id="end" className={field} value={endYear} onChange={(e) => setEndYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={onAnalyze}
        disabled={loading}
        aria-busy={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading && <Spinner />}
        {loading ? "Analyzing…" : "Analyze"}
      </button>
    </div>
  );
}