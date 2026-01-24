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
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto",
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
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
    children?: ReactNode;
    onClick?: () => void;
    span?: 1 | 2 | 3 | 4; // Span columns
}) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input glass-panel p-4 justify-between flex flex-col space-y-4",
                span === 2 && "md:col-span-2",
                span === 3 && "md:col-span-3",
                span === 4 && "md:col-span-4",
                // Default span 1 is implied by grid-cols
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
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
