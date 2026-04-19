"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export type PlanComparisonChartRow = {
  plan: string
  members: number
  revenueMillions: number
}

export type RevenueTrendChartRow = {
  month: string
  membership: number
  dropIns: number
  total: number
}

const planComparisonConfig = {
  members: {
    label: "Members",
    color: "var(--chart-1)",
  },
  revenueMillions: {
    label: "Revenue in millions",
    color: "var(--revenue)",
  },
} satisfies ChartConfig

const revenueTrendConfig = {
  membership: {
    label: "Membership",
    color: "var(--revenue)",
  },
  dropIns: {
    label: "Drop-ins",
    color: "var(--chart-1)",
  },
  total: {
    label: "Total",
    color: "var(--opportunity)",
  },
} satisfies ChartConfig

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function PlanComparisonChart({
  data,
}: {
  data: PlanComparisonChartRow[]
}) {
  return (
    <ChartContainer
      config={planComparisonConfig}
      className="h-72 w-full max-w-full overflow-hidden sm:h-80"
    >
      <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="plan"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="members" fill="var(--color-members)" radius={4} />
        <Bar
          dataKey="revenueMillions"
          fill="var(--color-revenueMillions)"
          radius={4}
        />
      </BarChart>
    </ChartContainer>
  )
}

export function RevenueTrendChart({ data }: { data: RevenueTrendChartRow[] }) {
  return (
    <ChartContainer
      config={revenueTrendConfig}
      className="h-72 w-full max-w-full overflow-hidden sm:h-80"
    >
      <LineChart
        accessibilityLayer
        data={data}
        margin={{ left: 0, right: 0, top: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={48}
          tickFormatter={(value) => compactNumberFormatter.format(value)}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Line
          type="monotone"
          dataKey="membership"
          stroke="var(--color-membership)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="dropIns"
          stroke="var(--color-dropIns)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-total)"
          strokeWidth={2.5}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
