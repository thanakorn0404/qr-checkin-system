"use client";

import { useMemo, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import type { FeatureGroup as FeatureGroupType } from "leaflet";
import L from "leaflet";

type Box = { north: number; south: number; east: number; west: number };

export default function MapPicker({
  box,
  onChange,
}: {
  box: Box | null;
  onChange: (b: Box) => void;
}) {
  const fgRef = useRef<FeatureGroupType>(null);

  const center = useMemo<[number, number]>(() => {
    if (!box) return [9.14, 99.3333]; // ค่าเริ่มต้น
    return [(box.north + box.south) / 2, (box.east + box.west) / 2];
  }, [box]);

  function setFromLayer(layer: any) {
    const b = layer.getBounds();
    onChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10">
      <MapContainer center={center} zoom={16} style={{ height: 380, width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FeatureGroup ref={fgRef}>
          <EditControl
            position="topright"
            draw={{
              rectangle: true,
              polygon: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
            }}
            edit={{ edit: true, remove: true }}
            onCreated={(e) => setFromLayer(e.layer)}
            onEdited={(e) => {
              e.layers.eachLayer((layer: any) => setFromLayer(layer));
            }}
            onDeleted={() => {
              // ถ้าลบกรอบออก ให้ส่งค่าเดิมไม่ได้ (ผู้ใช้ต้องลากใหม่)
              // คุณจะตั้งเป็น null ก็ได้ถ้าต้องการ
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}
