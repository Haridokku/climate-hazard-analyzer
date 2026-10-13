import { useEffect } from "react";
import { getSummary } from "./api";

export default function App() {
  useEffect(() => {
    getSummary({ lat: 17.38, lon: 78.48, startYear: 1990, endYear: 2025 })
      .then((d) => console.log(d))
      .catch((e) => console.error(e));
  }, []);
  return <h1>Climate Hazard Trend Analyzer</h1>;
}