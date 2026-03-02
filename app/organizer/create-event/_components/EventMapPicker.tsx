"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, FeatureGroup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import type { FeatureGroup as LeafletFeatureGroup, LatLngBoundsExpression } from "leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// ✅ แก้ marker icon หาย (บางเครื่อง)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
});
(L.Marker.prototype as any).options.icon = DefaultIcon;

export type GeoBox = { north: number; south: number; east: number; west: number };

const SRU_CENTER = { lat: 9.1400, lng: 99.3350 };
const SRU_ZOOM = 17;

type Preset = { label: string; center: { lat: number; lng: number }; box?: GeoBox };

const PRESETS: Preset[] = [
  { label: "มรภ.สุราษฯ (โซน วค.)", center: SRU_CENTER },
  {
    label: "ตึกมนุษย์ (ตัวอย่าง)",
    center: { lat: 9.1412, lng: 99.3363 },
    box: { north: 9.1418, south: 9.1406, east: 99.3371, west: 99.3356 },
  },
  {
    label: "ตึกวิทยาศาสตร์ (ตัวอย่าง)",
    center: { lat: 9.1392, lng: 99.3346 },
    box: { north: 9.1398, south: 9.1386, east: 99.3353, west: 99.3338 },
  },
];

type SearchItem = { display_name: string; lat: string; lon: string };

async function nominatimSearch(q: string): Promise<SearchItem[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`;
  const res = await fetch(url, { headers: { "Accept-Language": "th" } });
  if (!res.ok) return [];
  return (await res.json()) as SearchItem[];
}

function FlyTo({ center, zoom, bounds }: { center: { lat: number; lng: number }; zoom: number; bounds?: GeoBox }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      const b: LatLngBoundsExpression = [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ];
      map.fitBounds(b, { padding: [18, 18] });
    } else {
      map.flyTo([center.lat, center.lng], zoom, { duration: 0.6 });
    }
  }, [center.lat, center.lng, zoom, bounds, map]);

  return null;
}

export default function EventMapPicker({
  value,
  onChange,
}: {
  value: GeoBox | null;
  onChange: (b: GeoBox | null) => void;
}) {
  const fgRef = useRef<LeafletFeatureGroup | null>(null);

  const [marker, setMarker] = useState(SRU_CENTER);

  // jump control
  const [jump, setJump] = useState<{ center: { lat: number; lng: number }; box?: GeoBox; key: number }>({
    center: SRU_CENTER,
    box: undefined,
    key: 1,
  });

  // search
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);

  function toBoxFromLayer(layer: any): GeoBox {
    const b = layer.getBounds();
    return {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    };
  }

  function clearDrawn() {
    const fg = fgRef.current;
    if (!fg) return;
    fg.clearLayers();
  }

  // ✅ ถ้ามี value จาก parent แล้ว ให้ “วาดกรอบ” ลงบนแผนที่ให้เห็นด้วย
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    clearDrawn();

    if (value) {
      const bounds: LatLngBoundsExpression = [
        [value.south, value.west],
        [value.north, value.east],
      ];
      const rect = L.rectangle(bounds, { weight: 2 });
      rect.addTo(fg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.north, value?.south, value?.east, value?.west]);

  async function onSearch() {
    const keyword = q.trim();
    if (!keyword) return;
    setSearching(true);
    setResults([]);
    const items = await nominatimSearch(keyword).catch(() => []);
    setResults(items);
    setSearching(false);
  }

  function pickResult(it: SearchItem) {
    const lat = Number(it.lat);
    const lng = Number(it.lon);
    setMarker({ lat, lng });
    setJump({ center: { lat, lng }, box: undefined, key: Date.now() });
    setResults([]);
  }

  function pickPreset(p: Preset) {
    setMarker(p.center);
    setJump({ center: p.center, box: p.box, key: Date.now() });

    if (p.box) onChange(p.box);
  }

  // ✅ Draw callbacks
  function onCreated(e: any) {
    // วาดใหม่ → ล้างของเก่าให้เหลือ 1 กรอบ
    const fg = fgRef.current;
    if (fg) {
      fg.eachLayer((layer) => {
        if (layer !== e.layer) fg.removeLayer(layer);
      });
    }

    if (e.layerType === "rectangle") {
      const box = toBoxFromLayer(e.layer);
      onChange(box);
    }
  }

  function onEdited(e: any) {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const box = toBoxFromLayer(layer);
      onChange(box);
    });
  }

  function onDeleted() {
    onChange(null);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-sm text-white/70 mb-2">แผนที่เริ่มต้นที่ มรภ.สุราษฯ (SRU)</div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => pickPreset(p)}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? onSearch() : null)}
          placeholder='ค้นหา เช่น "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี", "ตึกวิทยาศาสตร์"'
          className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none text-sm"
        />
        <button
          onClick={onSearch}
          disabled={searching}
          className="rounded-xl bg-white text-black font-semibold px-4 py-2 text-sm disabled:opacity-60"
        >
          {searching ? "กำลังค้นหา..." : "ค้นหา"}
        </button>
      </div>

      {results.length > 0 ? (
        <div className="mt-2 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
          {results.map((it, idx) => (
            <button
              key={idx}
              onClick={() => pickResult(it)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 border-b border-white/5 last:border-b-0"
            >
              {it.display_name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Map */}
      <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
        <MapContainer center={[SRU_CENTER.lat, SRU_CENTER.lng]} zoom={SRU_ZOOM} style={{ height: 420, width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FlyTo key={jump.key} center={jump.center} zoom={SRU_ZOOM} bounds={jump.box} />

          <Marker position={[marker.lat, marker.lng]} />

          {/* ✅ สำคัญมาก: EditControl ต้องอยู่ใน FeatureGroup และ FeatureGroup ต้องเป็น L.FeatureGroup */}
          <FeatureGroup ref={(ref) => (fgRef.current = ref as any)}>
            <EditControl
              position="topright"
              draw={{
                rectangle: true,
                polygon: false,
                polyline: false,
                circle: false,
                circlemarker: false,
                marker: false,
              }}
              edit={{
                edit: true,
                remove: true,
              }}
              onCreated={onCreated}
              onEdited={onEdited}
              onDeleted={onDeleted}
            />
          </FeatureGroup>
        </MapContainer>
      </div>

      <div className="mt-3 text-xs text-white/60">
        * วิธีใช้: กดไอคอน “สี่เหลี่ยม” แล้วลากบนแผนที่
        <br />
        * ต้องการแก้ไข/ลบ: กดไอคอน “ดินสอ” หรือ “ถังขยะ” ที่มุมขวาบนของแผนที่
      </div>
    </div>
  );
}