'use client'

import { useTransition, useState } from 'react'
import { saveCredentials } from '@/app/dashboard/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent, CardFooter } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Loader2, Lock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ConnectForm() {
    const [isPending, startTransition] = useTransition()
    const [outcome, setOutcome] = useState<{ error?: string; success?: string } | null>(null)

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)

        startTransition(async () => {
            const result = await saveCredentials(null, formData)
            setOutcome(result)
        })
    }

    if (outcome?.success) {
        return (
            <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold text-green-700 dark:text-green-300">Connected Successfully</h3>
                        <p className="text-sm text-green-600/80 dark:text-green-400/80">
                            Your CloudTrucks account is linked and ready for scanning.
                        </p>
                    </div>
                </div>
            </CardContent>
        )
    }

    return (
        <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">

                {outcome?.error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{outcome.error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2">
                    <Label htmlFor="ct-email">CloudTrucks Email</Label>
                    <Input id="ct-email" name="email" type="email" placeholder="driver@example.com" required />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="ct-password">CloudTrucks Password</Label>
                    <div className="relative">
                        <Input id="ct-password" name="password" type="password" required className="pr-10" />
                        <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Credentials are encrypted (AES-256) before storage.
                    </p>
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Encrypting & Saving...
                        </>
                    ) : (
                        'Securely Connect Account'
                    )}
                </Button>
            </CardFooter>
        </form>
    )
}
