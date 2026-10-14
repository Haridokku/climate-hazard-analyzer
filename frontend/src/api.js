import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// the first request for a new region can take several seconds (fetch + compute), so allow 60s
const api = axios.create({ baseURL: BASE, timeout: 60000 });

export const geocode = (q) =>
  api.get("/api/geocode", { params: { q } }).then((r) => r.data);

const toParams = ({ lat, lon, startYear, endYear }) => ({
  lat,
  lon,
  start_year: startYear,
  end_year: endYear,
});

export const getSummary = (region) =>
  api.get("/api/hazards/heatwave/summary", { params: toParams(region) }).then((r) => r.data);

export const getEvents = (region) =>
  api.get("/api/hazards/heatwave/events", { params: toParams(region) }).then((r) => r.data);

export const csvUrl = (region) => {
  const p = new URLSearchParams(toParams(region));
  return `${BASE}/api/hazards/heatwave/export.csv?${p}`;
};

// turn an API error into a message the UI can show
export const errorMessage = (err) => {
  if (err.response?.status === 429) return "Too many requests. Please wait a minute and try again.";
  if (err.response?.status === 422) return err.response.data?.detail?.[0]?.msg || err.response.data?.detail || "Invalid input.";
  if (err.code === "ECONNABORTED") return "The request timed out. Please try again.";
  return "Something went wrong. Please try again.";
};

export const reverseGeocode = (lat, lon) =>
  api.get("/api/reverse-geocode", { params: { lat, lon } }).then((r) => r.data);