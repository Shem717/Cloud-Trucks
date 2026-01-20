"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { Link2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChainLaw {
    id: string;
    state: string;
    route_name: string;
    description?: string;
    status: 'none' | 'r1' | 'r2' | 'r3';
    statusDescription: string;
    isActive: boolean;
    last_updated: string;
}

interface ChainLawBadgeProps {
    chainLaws?: ChainLaw[];
    className?: string;
}

const statusColors: Record<string, string> = {
    none: 'text-green-500',
    r1: 'text-yellow-500',
    r2: 'text-orange-500',
    r3: 'text-red-500',
};

const statusBgColors: Record<string, string> = {
    none: 'bg-green-500/10',
    r1: 'bg-yellow-500/10',
    r2: 'bg-orange-500/10',
    r3: 'bg-red-500/10',
};

export function ChainLawBadge({ chainLaws, className }: ChainLawBadgeProps) {
    if (!chainLaws || chainLaws.length === 0) return null;

    // Filter to only active chain laws
    const activeChainLaws = chainLaws.filter(law => law.isActive);

    if (activeChainLaws.length === 0) return null;

    // Get the highest severity
    const getHighestSeverity = () => {
        if (activeChainLaws.some(l => l.status === 'r3')) return 'r3';
        if (activeChainLaws.some(l => l.status === 'r2')) return 'r2';
        if (activeChainLaws.some(l => l.status === 'r1')) return 'r1';
        return 'none';
    };

    const severity = getHighestSeverity();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-help",
                        statusBgColors[severity],
                        statusColors[severity],
                        className
                    )}>
                        <Link2 className="h-3 w-3" />
                        <span>⛓️ {severity.toUpperCase()}</span>
                    </span>
                </TooltipTrigger>
                <TooltipContent className="w-72 p-3" side="top">
                    <div className="space-y-2">
                        <div className="font-semibold border-b pb-2 flex items-center gap-2">
                            <span>⛓️</span>
                            Chain Control Active
                        </div>

                        <div className="space-y-2">
                            {activeChainLaws.map(law => (
                                <div
                                    key={law.id}
                                    className={cn(
                                        "p-2 rounded text-xs",
                                        statusBgColors[law.status]
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{law.route_name}</span>
                                        <span className={cn("font-bold", statusColors[law.status])}>
                                            {law.status.toUpperCase()}
                                        </span>
                                    </div>
                                    {law.description && (
                                        <div className="text-muted-foreground mt-1">{law.description}</div>
                                    )}
                                    <div className="text-muted-foreground/50 mt-1">
                                        {law.statusDescription}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-[10px] text-muted-foreground/50 text-right border-t pt-2">
                            Updated: {new Date(activeChainLaws[0]?.last_updated).toLocaleString()}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// Helper hook to fetch chain laws for a route
export function useChainLaws(originState?: string, destState?: string) {
    const [chainLaws, setChainLaws] = React.useState<ChainLaw[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (!originState && !destState) return;

        const fetchChainLaws = async () => {
            setLoading(true);
            try {
                const states = [originState, destState].filter(Boolean);
                const responses = await Promise.all(
                    states.map(state => fetch(`/api/chain-laws?state=${state}`).then(r => r.json()))
                );

                const allLaws = responses.flatMap(r => r.chainLaws || []);
                // Deduplicate by id
                const uniqueLaws = Array.from(new Map(allLaws.map(l => [l.id, l])).values());
                setChainLaws(uniqueLaws);
            } catch (error) {
                console.error('Failed to fetch chain laws:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchChainLaws();
    }, [originState, destState]);

    return { chainLaws, loading };
}
