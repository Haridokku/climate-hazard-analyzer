
Use a fixed baseline period for the threshold. If the threshold were computed from the same window you are analyzing, the trend would be biased.

Only request completed years (up to 2025) for now, because the current year is incomplete and would otherwise be cached with missing days.
The missing count in the test output is the start of your data-quality reporting.

Why calendar-day percentiles: a single yearly 95th percentile would put every “heatwave” in summer and say nothing about unusual heat in winter.
±7 day window: a single calendar day has only 31 samples in the baseline, which is too noisy for a 95th percentile. The window gives about 465 samples.
Missing data: a missing day breaks a run (conservative, so we never invent heatwave days). Be ready to explain this.
Events are attributed to their start year, so a heatwave spanning 31 Dec to 2 Jan counts once.
Limitation: Open-Meteo data is modelled reanalysis on a grid, not station observations, so values can differ from a local weather station.

the first events include 30 Jan–1 Feb at 32.8°C and 13–18 Sep at 32.7°C. Those aren’t hot in absolute terms. They count because the rule is relative to that calendar day’s 95th percentile, which is what the brief’s definition does. You could add an optional minimum absolute temperature later. For now, state the behaviour as a stated assumption.