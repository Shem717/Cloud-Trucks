"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
    RowSelectionState,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    onRowClick?: (row: TData) => void
    selectedRowId?: string | null
    getRowId?: (row: TData) => string
    rowSelection?: RowSelectionState
    onRowSelectionChange?: (selection: RowSelectionState) => void
}

export function DataTable<TData, TValue>({
    columns,
    data,
    onRowClick,
    selectedRowId,
    getRowId = (row: any) => row.id,
    rowSelection: externalRowSelection,
    onRowSelectionChange,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({})

    const rowSelection = externalRowSelection ?? internalRowSelection
    const setRowSelection = onRowSelectionChange
        ? (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
            const newValue = typeof updater === 'function' ? updater(rowSelection) : updater
            onRowSelectionChange(newValue)
        }
        : setInternalRowSelection

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onRowSelectionChange: setRowSelection as any,
        enableRowSelection: true,
        state: {
            sorting,
            rowSelection,
        },
    })

    return (
        <div className="rounded-md border border-white/10 bg-black/40 backdrop-blur-xl h-full overflow-auto">
            <Table>
                <TableHeader className="bg-white/5 sticky top-0 z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="border-white/10 hover:bg-white/5">
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id} className="text-xs font-bold text-white/70 h-10">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => {
                            const isSelected = selectedRowId === getRowId(row.original);
                            return (
                                <TableRow
                                    key={row.id}
                                    data-state={isSelected ? "selected" : undefined}
                                    className="border-white/5 hover:bg-white/5 data-[state=selected]:bg-primary/20 data-[state=selected]:border-primary/50 cursor-pointer h-10 font-mono text-xs"
                                    onClick={() => onRowClick && onRowClick(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center text-white/50">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
