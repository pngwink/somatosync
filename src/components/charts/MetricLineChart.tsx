import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { formatDate } from "../../lib/utils";

interface MetricPoint {
  date: string;
  value: number | null;
}

interface MetricLineChartProps {
  data: MetricPoint[];
  unit?: string;
  reference?: number;
  referenceLabel?: string;
  height?: number;
  color?: string;
  domain?: [number, number];
}

export function MetricLineChart({ data, unit, reference, referenceLabel = "First assessment", height = 160, color = "var(--color-chart-primary)", domain }: MetricLineChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatDate(v)}
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis domain={domain ?? ["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            formatter={((value: number | undefined) => [`${value ?? "—"}${unit ? ` ${unit}` : ""}`, "Value"]) as any}
            labelFormatter={(label) => formatDate(label as string)}
            contentStyle={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {reference != null && (
            <ReferenceLine y={reference} stroke="var(--color-chart-baseline)" strokeDasharray="3 3" label={{ value: referenceLabel, fontSize: 10, fill: "var(--color-text-tertiary)", position: "insideTopLeft" }} />
          )}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.25} dot={{ r: 3 }} connectNulls animationDuration={450} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
