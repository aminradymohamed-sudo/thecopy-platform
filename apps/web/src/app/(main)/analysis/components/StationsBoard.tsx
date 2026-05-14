"use client";

import { cn } from "@/lib/utils";

import {
  STATION_DESCRIPTIONS,
  type StationId,
  type StationState,
} from "../lib/types";

import { StationCard } from "./StationCard";

interface Props {
  stations: StationState[];
  selectedStationId: StationId;
  canRetry: boolean;
  onSelectStation: (stationId: StationId) => void;
  onRetry: (stationId: StationId) => void;
}

export function StationsBoard({
  stations,
  selectedStationId,
  canRetry,
  onSelectStation,
  onRetry,
}: Props) {
  const selectedStation =
    stations.find((station) => station.id === selectedStationId) ?? stations[0];

  if (!selectedStation) return null;

  return (
    <section className="space-y-4" aria-label="محطات التحليل">
      <div
        className="flex gap-2 overflow-x-auto rounded-2xl border border-white/12 bg-[#0a0f1d] p-2"
        role="tablist"
        aria-label="محطات التحليل"
      >
        {stations.map((station) => {
          const selected = station.id === selectedStation.id;
          return (
            <button
              key={station.id}
              id={`analysis-station-tab-${station.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`analysis-station-panel-${station.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelectStation(station.id)}
              className={cn(
                "min-w-[190px] rounded-xl border px-3 py-2 text-right text-xs transition-colors",
                selected
                  ? "border-sky-300/45 bg-sky-400/18 text-white"
                  : "border-white/10 bg-white/5 text-white/72 hover:border-white/24 hover:bg-white/9 hover:text-white"
              )}
            >
              <span className="block text-[11px] text-white/58">
                المحطة {station.id}
              </span>
              <span className="mt-1 block font-semibold">{station.name}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`analysis-station-panel-${selectedStation.id}`}
        role="tabpanel"
        aria-labelledby={`analysis-station-tab-${selectedStation.id}`}
        className="rounded-2xl border border-white/12 bg-[#0b1020] p-4 text-right"
      >
        <p className="text-xs font-semibold text-sky-200">المحطة المختارة</p>
        <h3 className="mt-2 text-lg font-bold text-white">
          {selectedStation.name}
        </h3>
        <p className="mt-2 text-sm leading-7 text-white/72">
          {STATION_DESCRIPTIONS[selectedStation.id]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stations.map((s) => (
          <StationCard
            key={s.id}
            station={s}
            selected={s.id === selectedStation.id}
            canRetry={canRetry}
            onRetry={onRetry}
          />
        ))}
      </div>
    </section>
  );
}
