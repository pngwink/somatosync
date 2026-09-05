import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { formatDate } from "../../lib/utils";

interface ActivitySymptomPoint {
  date: string;
  screenHours: number;
  symptomBurden: number;
}

export function ActivitySymptomChart({ data, height = 200 }: { data: ActivitySymptomPoint[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatDate(v)}
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            labelFormatter={(label) => formatDate(label as string)}
            contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="screenHours" name="Screen hours" fill="var(--color-chart-secondary)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="symptomBurden" name="Symptom burden" fill="var(--color-chart-primary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
