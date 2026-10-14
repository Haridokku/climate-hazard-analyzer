import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite does not resolve Leaflet's default marker image paths, so set them explicitly
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng.wrap(); // keep longitude within -180..180
      onPick(lat, lng);
    },
  });
  return null;
}

// fly to the location only after a city search, not after a map click
function FlyTo({ lat, lon, enabled }) {
  const map = useMap();
  useEffect(() => {
    if (enabled && lat !== null && lon !== null) {
      map.flyTo([lat, lon], Math.max(map.getZoom(), 7));
    }
  }, [map, lat, lon, enabled]);
  return null;
}

export default function MapPicker({ region, setRegion }) {
  const lat = region.lat !== "" && Number.isFinite(Number(region.lat)) ? Number(region.lat) : null;
  const lon = region.lon !== "" && Number.isFinite(Number(region.lon)) ? Number(region.lon) : null;
  const hasPoint = lat !== null && lon !== null;

  return (
    <MapContainer
      center={hasPoint ? [lat, lon] : [20.5937, 78.9629]}
      zoom={hasPoint ? 6 : 4}
      scrollWheelZoom
      className="h-80 w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler
        onPick={(la, lo) =>
          setRegion({ lat: la.toFixed(4), lon: lo.toFixed(4), label: "Selected on map", source: "map" })
        }
      />
      <FlyTo lat={lat} lon={lon} enabled={region.source === "search"} />
      {hasPoint && <Marker position={[lat, lon]} />}
    </MapContainer>
  );
}