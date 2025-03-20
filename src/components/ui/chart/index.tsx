
import * as RechartsPrimitive from "recharts"

import { ChartContainer } from "./ChartContainer"
import { ChartTooltipContent } from "./ChartTooltipContent"
import { ChartLegendContent } from "./ChartLegendContent"
import { ChartStyle } from "./ChartStyle"

const ChartTooltip = RechartsPrimitive.Tooltip
const ChartLegend = RechartsPrimitive.Legend

export type { ChartConfig } from "./types"
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
