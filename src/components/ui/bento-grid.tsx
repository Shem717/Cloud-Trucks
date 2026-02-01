import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

export const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children?: ReactNode;
}) => {
    return (
        <div
            className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto w-full overflow-hidden",
                className
            )}
        >
            {children}
        </div>
    );
};

export const BentoGridItem = ({
    className,
    title,
    description,
    header,
    icon,
    children,
    onClick,
    span = 1,
    isLoading,
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
    children?: ReactNode;
    onClick?: () => void;
    span?: 1 | 2 | 3 | 4; // Span columns
    isLoading?: boolean;
}) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input glass-panel p-4 justify-between flex flex-col space-y-4 overflow-hidden relative",
                span === 2 && "md:col-span-2",
                span === 3 && "md:col-span-3",
                span === 4 && "md:col-span-4",
                // Default span 1 is implied by grid-cols
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-background/80 p-3 rounded-full shadow-lg border border-border">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6 animate-spin text-primary"
                        >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                    </div>
                </div>
            )}
            {header}
            <div className="group-hover/bento:translate-x-2 transition duration-200">
                {icon}
                <div className="font-sans font-bold text-neutral-600 dark:text-neutral-200 mb-2 mt-2">
                    {title}
                </div>
                <div className="font-sans font-normal text-neutral-600 text-xs dark:text-neutral-300">
                    {description}
                </div>
                {children}
            </div>
        </motion.div>
    );
};
