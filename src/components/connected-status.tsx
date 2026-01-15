'use client'

import { disconnectAccount } from '@/app/dashboard/actions'
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { CheckCircle2, ShieldCheck, Trash2 } from "lucide-react"

export function ConnectedStatus({ lastValidated }: { lastValidated: string | null }) {
    return (
        <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
                <div className="relative">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black rounded-full p-1 border border-border">
                        <CheckCircle2 className="w-5 h-5 text-green-500 fill-current" />
                    </div>
                </div>

                <div className="text-center space-y-1">
                    <h3 className="font-semibold text-lg">Active Connection</h3>
                    <p className="text-sm text-muted-foreground">
                        Your credentials are encrypted and active.
                    </p>
                    {lastValidated && (
                        <p className="text-xs text-muted-foreground pt-1">
                            Last check: {new Date(lastValidated).toLocaleDateString()}
                        </p>
                    )}
                </div>

                <form action={disconnectAccount} className="w-full">
                    <Button variant="outline" className="w-full hover:bg-destructive/10 border-destructive/50 text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Disconnect Account
                    </Button>
                </form>
            </div>
        </CardContent>
    )
}
