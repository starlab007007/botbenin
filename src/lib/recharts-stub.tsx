// Lightweight stub replacing `recharts` to avoid production bundle issues.
// Renders a simple placeholder instead of charts. Keeps the same import surface.
import * as React from "react";

const Placeholder: React.FC<React.PropsWithChildren<any>> = ({ children }) => (
  <div className="w-full h-full min-h-[120px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md p-4">
    {children ?? "Graphique indisponible"}
  </div>
);

const Noop: React.FC<any> = () => null;

export const ResponsiveContainer: React.FC<any> = ({ children }) => (
  <div className="w-full h-full">{typeof children === "function" ? null : <Placeholder />}</div>
);

export const LineChart = Placeholder;
export const BarChart = Placeholder;
export const PieChart = Placeholder;
export const AreaChart = Placeholder;
export const RadarChart = Placeholder;
export const ComposedChart = Placeholder;
export const ScatterChart = Placeholder;

export const Line = Noop;
export const Bar = Noop;
export const Pie = Noop;
export const Cell = Noop;
export const Area = Noop;
export const Radar = Noop;
export const Scatter = Noop;
export const XAxis = Noop;
export const YAxis = Noop;
export const ZAxis = Noop;
export const CartesianGrid = Noop;
export const PolarGrid = Noop;
export const PolarAngleAxis = Noop;
export const PolarRadiusAxis = Noop;
export const Tooltip = Noop;
export const Legend = Noop;
export const Label = Noop;
export const LabelList = Noop;
export const ReferenceLine = Noop;
export const ReferenceArea = Noop;
export const ReferenceDot = Noop;
export const Brush = Noop;
export const Sector = Noop;
export const Rectangle = Noop;
export const Surface = Noop;
export const Symbols = Noop;
export const Funnel = Noop;
export const FunnelChart = Placeholder;
export const Treemap = Placeholder;
export const Sankey = Placeholder;

export default {};
