import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfitBadgeProps {
    revenuePerHour?: number | string;
    className?: string;
}

export function ProfitBadge({ revenuePerHour, className }: ProfitBadgeProps) {
    const value = typeof revenuePerHour === 'string' ? parseFloat(revenuePerHour) : revenuePerHour;
    
    if (value === undefined || value === null || isNaN(value) || value <= 0) return null;

    // Color logic based on rough industry standards
    // > $150/hr is excellent, > $100/hr is good, < $100/hr is average
    let colorClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    
    if (value >= 150) {
        colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    } else if (value >= 120) {
        colorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    }

    return (
        <Badge
            variant="outline"
            className={cn("gap-1 font-mono text-xs font-bold border", colorClass, className)}
        >
            <TrendingUp className="h-3 w-3" />
            ${value.toFixed(0)}/hr
        </Badge>
    );
}
