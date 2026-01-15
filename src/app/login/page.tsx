import { login, signup } from './auth/actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">CloudTrucks Scout</CardTitle>
                    <CardDescription>Login or create an account to start tracking loads</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button formAction={login} className="w-full">Log In</Button>
                            <Button formAction={signup} variant="outline" className="w-full">Sign Up</Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="text-sm text-gray-500 justify-center">
                    Secure, automated loadboard monitoring.
                </CardFooter>
            </Card>
        </div>
    )
}
