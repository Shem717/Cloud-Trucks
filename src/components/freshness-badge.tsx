import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FreshnessBadgeProps {
    ageMin?: number | string;
    className?: string;
}

export function FreshnessBadge({ ageMin, className }: FreshnessBadgeProps) {
    const value = typeof ageMin === 'string' ? parseFloat(ageMin) : ageMin;

    if (value === undefined || value === null || isNaN(value)) return null;

    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let colorClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    let isPulsing = false;

    if (value < 20) {
        variant = "default";
        colorClass = "bg-green-500 text-white hover:bg-green-600 border-transparent shadow shadow-green-500/20";
        isPulsing = true;
    } else if (value < 60) {
        variant = "default";
        colorClass = "bg-emerald-500 text-white hover:bg-emerald-600 border-transparent";
    }

    const formatTime = (min: number) => {
        if (min < 60) return `${Math.floor(min)}m ago`;
        const hours = Math.floor(min / 60);
        return `${hours}h ${Math.floor(min % 60)}m ago`;
    };

    return (
        <Badge 
            variant={variant} 
            className={cn("gap-1.5 font-mono text-xs font-medium transition-all", colorClass, className)}
        >
            <Clock className={cn("h-3 w-3", isPulsing && "animate-pulse")} />
            {formatTime(value)}
            {isPulsing && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
            )}
        </Badge>
    );
}
