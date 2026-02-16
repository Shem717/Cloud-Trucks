"use client"

import * as React from "react"
import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    ArrowUpDown,
    Bookmark,
    GitCompareArrows,
    Route,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Helper for formatting currency
const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Select column for multi-select
const selectColumn: ColumnDef<any> = {
    id: "select",
    header: ({ table }) => (
        <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
    ),
    cell: ({ row }) => (
        <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
            className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
    ),
    enableSorting: false,
    enableHiding: false,
}

export const columns: ColumnDef<any>[] = [
    selectColumn,
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            return (
                <Badge variant="outline" className={cn("text-[10px] h-5 px-1 uppercase border-white/10",
                    status === 'new' ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/50"
                )}>
                    {status || "New"}
                </Badge>
            )
        }
    },
    {
        accessorKey: "rate",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2 text-xs hover:bg-white/10"
                >
                    Rate
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("rate")) || 0
            const distance = parseFloat(row.original.distance) || 0
            const rpm = distance > 0 ? amount / distance : 0

            return (
                <div className="flex flex-col">
                    <span className="font-bold text-emerald-400 text-sm">{formatCurrency(amount)}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">${rpm.toFixed(2)}/mi</span>
                </div>
            )
        },
    },
    {
        accessorKey: "origin",
        header: "Origin",
        cell: ({ row }) => {
            const city = row.original.origin_city
            const state = row.original.origin_state
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-white">{city}, {state}</span>
                    <span className="text-[10px] text-muted-foreground">DH: {row.original.origin_deadhead_mi || 0}mi</span>
                </div>
            )
        }
    },
    {
        accessorKey: "destination",
        header: "Destination",
        cell: ({ row }) => {
            const city = row.original.dest_city
            const state = row.original.dest_state
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-white">{city}, {state}</span>
                    <span className="text-[10px] text-muted-foreground">DH: {row.original.dest_deadhead_mi || 0}mi</span>
                </div>
            )
        }
    },
    {
        accessorKey: "distance",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2 text-xs hover:bg-white/10"
                >
                    Trip
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            )
        },
        sortingFn: (rowA, rowB) => {
            const a = parseFloat(rowA.original.distance) || 0
            const b = parseFloat(rowB.original.distance) || 0
            return a - b
        },
        cell: ({ row }) => {
            return (
                <div className="font-mono text-white/80">
                    {row.original.distance}mi
                </div>
            )
        }
    },
    {
        accessorKey: "dates",
        header: "Dates",
        cell: ({ row }) => {
            return (
                <div className="flex flex-col text-[10px]">
                    <span className="text-emerald-400">P: {formatDate(row.original.pickup_date)}</span>
                    <span className="text-rose-400">D: {formatDate(row.original.delivery_date)}</span>
                </div>
            )
        }
    },
    {
        accessorKey: "equipment",
        header: "Eq",
        cell: ({ row }) => {
            const eq = Array.isArray(row.original.equipment) ? row.original.equipment[0] : row.original.equipment
            return (
                <span className="font-mono text-[10px] text-white/50 uppercase">
                    {eq ? eq.substring(0, 3) : "UNK"}
                </span>
            )
        }
    },
    {
        accessorKey: "weight",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2 text-xs hover:bg-white/10"
                >
                    Weight
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            )
        },
        sortingFn: (rowA, rowB) => {
            const a = parseFloat(rowA.original.weight) || 0
            const b = parseFloat(rowB.original.weight) || 0
            return a - b
        },
        cell: ({ row }) => {
            const weight = row.original.weight
            return (
                <span className="text-xs text-muted-foreground">
                    {weight ? `${(weight / 1000).toFixed(0)}k` : "-"}
                </span>
            )
        }
    },
]

interface LoadDataTableProps {
    data: any[]
    onRowClick?: (row: any) => void
    selectedId?: string | null
    onSaveSelected?: (rows: any[]) => void
    onCompareSelected?: (rows: any[]) => void
    onAddToRoute?: (rows: any[]) => void
}

export function LoadDataTable({
    data,
    onRowClick,
    selectedId,
    onSaveSelected,
    onCompareSelected,
    onAddToRoute,
}: LoadDataTableProps) {
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

    const selectedCount = Object.keys(rowSelection).filter(k => rowSelection[k]).length

    const getSelectedRows = () => {
        return Object.keys(rowSelection)
            .filter(k => rowSelection[k])
            .map(idx => data[parseInt(idx)])
            .filter(Boolean)
    }

    const clearSelection = () => setRowSelection({})

    return (
        <div className="h-full overflow-auto bg-card/30 backdrop-blur-sm relative">
            <DataTable
                columns={columns}
                data={data}
                onRowClick={onRowClick}
                selectedRowId={selectedId}
                getRowId={(row) => row.id}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
            />

            {/* Floating Action Bar */}
            {selectedCount > 0 && (
                <div className="sticky bottom-4 mx-auto w-fit z-20">
                    <div className="flex items-center gap-2 bg-background/95 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 shadow-2xl shadow-black/50">
                        <span className="text-sm font-medium text-white/70 mr-1">
                            {selectedCount} selected
                        </span>
                        <div className="h-4 w-px bg-white/20" />
                        {onSaveSelected && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1.5 text-xs hover:bg-white/10"
                                onClick={() => onSaveSelected(getSelectedRows())}
                            >
                                <Bookmark className="h-3.5 w-3.5" />
                                Save
                            </Button>
                        )}
                        {onCompareSelected && selectedCount >= 2 && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1.5 text-xs hover:bg-white/10"
                                onClick={() => onCompareSelected(getSelectedRows())}
                            >
                                <GitCompareArrows className="h-3.5 w-3.5" />
                                Compare
                            </Button>
                        )}
                        {onAddToRoute && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                onClick={() => {
                                    onAddToRoute(getSelectedRows())
                                    clearSelection()
                                }}
                            >
                                <Route className="h-3.5 w-3.5" />
                                Add to Route
                            </Button>
                        )}
                        <div className="h-4 w-px bg-white/20" />
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-white/40 hover:text-white hover:bg-white/10"
                            onClick={clearSelection}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
