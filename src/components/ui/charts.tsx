"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// Lazily resolve CSS variable colors (avoids getComputedStyle at module load time
// when CSS variables aren't yet available, which returns #000000 for everything)
const getColor = (cssVar: string): string => {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || "#000000";
};

let _colorsCache: Record<string, string> | null = null;
const COLORS = new Proxy({} as Record<string, string>, {
  get(_, key: string) {
    if (!_colorsCache) {
      _colorsCache = {
        primary: getColor("--primary"),
        accent: getColor("--accent-teal"),
        secondary: getColor("--text-secondary"),
        success: getColor("--text-primary"),
        warning: getColor("--text-muted"),
        danger: getColor("--text-primary"),
      };
    }
    return _colorsCache[key] ?? "#000000";
  },
});

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function ChartContainer({ children, className, title, description }: ChartContainerProps) {
  return (
    <div
      className={cn(
        "w-full p-6 backdrop-blur-sm border rounded-xl bg-[var(--surface-1)] border-[var(--border)]",
        className
      )}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          {description && (
            <p className="text-sm mt-1 text-[var(--text-secondary)]">{description}</p>
          )}
        </div>
      )}
      <div className="w-full h-[300px]">{children}</div>
    </div>
  );
}

interface BarChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey?: string;
  color?: keyof typeof COLORS;
  className?: string;
  title?: string;
  description?: string;
}

export function SimpleBarChart({
  data,
  dataKey,
  nameKey = "name",
  color = "primary",
  className,
  title,
  description,
}: BarChartProps) {
  return (
    <ChartContainer className={className} title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" style={{ stroke: "var(--border)" }} />
          <XAxis dataKey={nameKey} style={{ fontSize: "12px", stroke: "var(--text-muted)" }} />
          <YAxis style={{ fontSize: "12px", stroke: "var(--text-muted)" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-3)",
              border: `1px solid var(--border)`,
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
            }}
          />
          <Bar dataKey={dataKey} fill={COLORS[color]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface LineChartProps {
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey?: string;
  color?: keyof typeof COLORS;
  className?: string;
  title?: string;
  description?: string;
}

export function SimpleLineChart({
  data,
  dataKey,
  nameKey = "name",
  color = "primary",
  className,
  title,
  description,
}: LineChartProps) {
  return (
    <ChartContainer className={className} title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" style={{ stroke: "var(--border)" }} />
          <XAxis dataKey={nameKey} style={{ fontSize: "12px", stroke: "var(--text-muted)" }} />
          <YAxis style={{ fontSize: "12px", stroke: "var(--text-muted)" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-3)",
              border: `1px solid var(--border)`,
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={COLORS[color]}
            strokeWidth={2}
            dot={{ fill: COLORS[color], r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  className?: string;
  title?: string;
  description?: string;
}

export function SimplePieChart({ data, className, title, description }: PieChartProps) {
  const colors = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger];

  return (
    <ChartContainer className={className} title={title} description={description}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props) => {
              const name = props.name || "Unknown";
              const percent = typeof props.percent === "number" ? props.percent : 0;
              return `${name} ${(percent * 100).toFixed(0)}%`;
            }}
            outerRadius={80}
            fill="var(--primary)"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-3)",
              border: `1px solid var(--border)`,
              borderRadius: "0.5rem",
              color: "var(--text-primary)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Mini sparkline chart for trends
interface SparklineProps {
  data: number[];
  color?: keyof typeof COLORS;
  height?: number;
  className?: string;
}

export function Sparkline({ data, color = "primary", height = 40, className }: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={COLORS[color]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Aliases for backwards compatibility
export { SimplePieChart as SimpleChartPie };
export { SimpleLineChart as SimpleChartLine };
