'use client'

import { useTransition, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Loader2, PlusCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SearchCriteriaFormProps {
    onSuccess?: () => void;
}

export function SearchCriteriaForm({ onSuccess }: SearchCriteriaFormProps) {
    const [isPending, startTransition] = useTransition()
    const [outcome, setOutcome] = useState<{ error?: string; success?: string } | null>(null)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)

        startTransition(async () => {
            try {
                const response = await fetch('/api/criteria', {
                    method: 'POST',
                    body: formData,
                })

                const result = await response.json()

                if (result.error) {
                    setOutcome({ error: result.error })
                } else {
                    setOutcome({ success: 'Search criteria added successfully!' })
                    event.currentTarget.reset()
                    onSuccess?.()
                }
            } catch (error) {
                setOutcome({ error: 'Failed to save search criteria' })
            }
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Add Search Criteria
                </CardTitle>
                <CardDescription>
                    Define parameters for automated load scanning
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {outcome?.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{outcome.error}</AlertDescription>
                        </Alert>
                    )}

                    {outcome?.success && (
                        <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/10 dark:text-green-100 dark:border-green-900">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>{outcome.success}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="origin_city">Origin City</Label>
                            <Input id="origin_city" name="origin_city" placeholder="e.g. Los Angeles" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dest_city">Destination City</Label>
                            <Input id="dest_city" name="dest_city" placeholder="e.g. Phoenix" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="min_rate">Minimum Rate ($)</Label>
                            <Input
                                id="min_rate"
                                name="min_rate"
                                type="number"
                                step="0.01"
                                placeholder="e.g. 500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="equipment_type">Equipment Type</Label>
                            <Select name="equipment_type">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Van">Van</SelectItem>
                                    <SelectItem value="Reefer">Reefer</SelectItem>
                                    <SelectItem value="Flatbed">Flatbed</SelectItem>
                                    <SelectItem value="Dry Van">Dry Van</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="min_weight">Min Weight (lbs)</Label>
                            <Input
                                id="min_weight"
                                name="min_weight"
                                type="number"
                                placeholder="e.g. 5000"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="max_weight">Max Weight (lbs)</Label>
                            <Input
                                id="max_weight"
                                name="max_weight"
                                type="number"
                                placeholder="e.g. 40000"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 rounded-md p-3 text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium">Auto-scanning enabled</p>
                        <p className="text-xs mt-1 text-blue-600 dark:text-blue-300">
                            The system will automatically scan for loads matching these criteria every 15 minutes.
                        </p>
                    </div>
                </CardContent>

                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Criteria
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
