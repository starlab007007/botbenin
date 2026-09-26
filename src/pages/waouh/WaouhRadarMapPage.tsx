import { RadarPanel } from "@/app-mobile/components/radar/RadarPanel";

export default function WaouhRadarMapPage() {
  return (
    <main className="h-full min-h-[100dvh] overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5">
        <RadarPanel query="" />
      </div>
    </main>
  );
}
