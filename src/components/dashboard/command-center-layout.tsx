import { cn } from "@/utils/cn";
import React from "react";

export const CommandCenterLayout = ({
    children,
    className,
    sidebarCollapsed = false,
    panelCollapsed = false,
}: {
    children: React.ReactNode;
    className?: string;
    sidebarCollapsed?: boolean;
    panelCollapsed?: boolean;
}) => {
    return (
        <div
            className={cn("grid gap-4 h-[calc(100vh-80px)] transition-all duration-300 ease-in-out", className)}
            style={{
                gridTemplateColumns: `
                    ${sidebarCollapsed ? '60px' : '320px'} 
                    1fr 
                    ${panelCollapsed ? '0px' : '350px'}
                `
            }}
        >
            {children}
        </div>
    );
};

export const CommandSidebar = ({
    children,
    className,
    collapsed = false,
}: {
    children: React.ReactNode;
    className?: string;
    collapsed?: boolean;
}) => {
    return (
        <div className={cn(
            "border-r border-white/10 overflow-hidden transition-all duration-300 ease-in-out",
            collapsed ? "px-2 items-center flex flex-col pt-4" : "p-4 overflow-y-auto",
            className
        )}>
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
        <div className={cn("overflow-y-auto px-2 scrollbar-hide", className)}>
            {children}
        </div>
    );
};

export const CommandPanel = ({
    children,
    className,
    collapsed = false,
}: {
    children: React.ReactNode;
    className?: string;
    collapsed?: boolean;
}) => {
    return (
        <div className={cn(
            "border-l border-white/10 overflow-hidden transition-all duration-300 ease-in-out hidden lg:block",
            collapsed ? "w-0 p-0 border-none" : "w-full p-4 overflow-y-auto",
            className
        )}>
            <div className={cn("min-w-[320px]", collapsed && "hidden")}>
                {children}
            </div>
        </div>
    );
};
