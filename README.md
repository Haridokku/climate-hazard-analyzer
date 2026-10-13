# Climate Hazard Trend Analyzer

A web app that analyzes historical weather data and shows how heatwaves have changed over time for a chosen location. Built as a case study for the Full-Stack Developer role at Dygnify Ventures.

- **Live app:** TODO
- **API docs:** TODO (backend URL)/docs
- **Demo video:** TODO (optional)

## Features

- Heatwave detection using a calendar-day 95th-percentile definition
- Yearly frequency, duration and intensity summaries
- Trend analysis with Mann-Kendall, Theil-Sen and linear regression, with plain-language insights that state when evidence is weak
- Data-quality reporting (missing days, completeness)
- MongoDB caching of raw weather data and computed results
- Input validation, rate limiting and CORS restrictions
- CSV export of yearly results
- TODO (frontend): city search, map selection, interactive charts

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite, JSX), Chart.js, Leaflet |
| Backend | Python, FastAPI, Motor (async MongoDB), pandas, NumPy, SciPy, pymannkendall, slowapi |
| Database | MongoDB (local for development, Atlas for deployment) |
| Data source | Open-Meteo Historical Weather API |

## Architecture

```
React (Vite)  --->  FastAPI  --->  MongoDB
                        |            - daily_tmax      (raw cached weather, one doc per location-year)
                        |            - hazard_results  (computed analysis, one doc per request key)
                        v
                  Open-Meteo API (only called for years not yet cached)
```

Request flow for `GET /api/hazards/heatwave/summary`:

1. Validate the query parameters and snap coordinates to a 0.25° grid.
2. Look for a stored result in `hazard_results`. If found, return it.
3. Otherwise, load daily data from `daily_tmax`, fetching any missing years from Open-Meteo in one request.
4. Detect heatwaves and compute trends in a worker thread, so the event loop isn't blocked.
5. Store the result in `hazard_results` and return it.

Stored results are keyed with an `ALGO_VERSION`, so changing the hazard logic never serves stale results.

## Data source

**Open-Meteo Historical Weather API** (`temperature_2m_max`, daily, °C). It needs no API key, covers 1940 onward, and returns gap-free modelled data for any coordinate. It is reanalysis data on a grid, not station observations (see Limitations).

## Hazard logic: heatwaves

**Definition:** 3 or more consecutive days on which the daily maximum temperature exceeds the 95th percentile for that calendar day.

- **Calendar-day thresholds.** The threshold is computed per day of the year (for example, one value for 15 May and another for 1 Jan). A single yearly percentile would place every "heatwave" in summer and ignore unusual heat in other seasons.
- **±7 day window.** One calendar day has only 31 samples in a 31-year baseline, which is too few for a stable 95th percentile. Pooling a ±7 day window gives about 465 samples per threshold.
- **Fixed baseline (1990–2020).** Thresholds always come from this period, regardless of the range the user selects. Computing them from the analysis window itself would force about 5% of days to be "hot" in every window and bias the trend.
- **Leap days.** 29 Feb is folded into 28 Feb so calendar days line up across years.
- **Events** are attributed to the year they start in, so a heatwave spanning 31 Dec to 2 Jan is counted once.
- **Per-year metrics:** number of events, total heatwave days, longest event (days), and mean intensity (average degrees above threshold).

## Trend analysis

Each yearly metric (events, heatwave days, longest duration) is tested with:

- **Mann-Kendall** (primary): non-parametric, suitable for count data with many zeros.
- **Theil-Sen slope** with a confidence interval: robust to outlier years.
- **OLS regression**: shown for comparison.
- A 5-year trailing rolling average for charting.

Insights are generated honestly. A trend is described as significant only when Mann-Kendall p < 0.05. When the regression test or the slope's confidence interval disagrees, the text says the evidence is moderate. It also flags when one year dominates the total, and it reports percentage changes only for significant trends, because percentages from a small base mislead.

## Data handling

- **Missing values** are kept as missing, never filled. A missing day breaks a heatwave run, which