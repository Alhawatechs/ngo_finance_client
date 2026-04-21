import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-[0.5px] focus:ring-ring focus:ring-offset-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "text-foreground border",
        success: "bg-green-100 text-green-700",
        warning: "bg-yellow-100 text-yellow-700",
        error: "bg-red-100 text-red-700",
        info: "bg-emerald-100 text-emerald-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Use `<span>` so badges are valid inside `<p>` and other phrasing content (avoids hydration errors). */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Status badge component for consistent status display
interface StatusBadgeProps {
  status: string
}

const statusVariantMap: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  // Approval statuses
  draft: "default",
  submitted: "info",
  pending: "warning",
  pending_approval: "warning",
  approved: "success",
  rejected: "error",
  posted: "success",
  cancelled: "error",
  
  // General statuses
  active: "success",
  inactive: "default",
  suspended: "error",
  
  // Project statuses
  on_hold: "warning",
  completed: "success",
  closed: "default",
  
  // Payment statuses
  paid: "success",
  partially_paid: "warning",
  overdue: "error",
}

const statusLabelMap: Record<string, string> = {
  pending_approval: "Pending Approval",
  partially_paid: "Partially Paid",
  on_hold: "On Hold",
}

function StatusBadge({ status }: StatusBadgeProps) {
  const variant = statusVariantMap[status] || "default"
  const label = statusLabelMap[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
  
  return <Badge variant={variant}>{label}</Badge>
}

export { Badge, badgeVariants, StatusBadge }
