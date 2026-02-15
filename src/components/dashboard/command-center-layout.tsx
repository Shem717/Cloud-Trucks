import { cn } from "@/utils/cn";
import React from "react";

export const CommandCenterLayout = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div className={cn("grid grid-cols-12 gap-4 h-[calc(100vh-80px)]", className)}>
            {children}
        </div>
    );
};

export const CommandSidebar = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div className={cn("col-span-12 lg:col-span-3 border-r border-white/10 p-4 overflow-y-auto", className)}>
            {children}
        </div>
    );
};

export const CommandFeed = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div className={cn("col-span-12 lg:col-span-6 overflow-y-auto px-2 scrollbar-hide", className)}>
            {children}
        </div>
    );
};

export const CommandPanel = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div className={cn("col-span-12 lg:col-span-3 border-l border-white/10 p-4 hidden lg:block overflow-y-auto", className)}>
            {children}
        </div>
    );
};
