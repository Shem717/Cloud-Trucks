import { createClient } from '@/utils/supabase/server';
import { RouteBuilderStitch } from './stitch-layout';
import { ThemeToggle } from "@/components/theme-toggle"

export default async function RoutePlanningPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
                        Route Master
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Finalize your trip. Reorder stops, review navigation, and maximize your profit per mile.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </div>

            <RouteBuilderStitch />
        </div>
    );
}
