"use client";
import { useEffect } from "react";
import { motion, useAnimate } from "framer-motion";
import { cn } from "@/utils/cn";

export const TextGenerateEffect = ({
    words,
    className,
    titleClassName,
}: {
    words: string;
    className?: string;
    titleClassName?: string;
}) => {
    const [scope, animate] = useAnimate();
    const wordsArray = words.split(" ");
    useEffect(() => {
        animate(
            "span",
            {
                opacity: 1,
            },
            {
                duration: 2,
                delay: 0.2, // simple stagger
            }
        );
    }, [scope]);

    const renderWords = () => {
        return (
            <motion.div ref={scope}>
                {wordsArray.map((word, idx) => {
                    return (
                        <motion.span
                            key={word + idx}
                            className="dark:text-white text-black opacity-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                        >
                            {word}{" "}
                        </motion.span>
                    );
                })}
            </motion.div>
        );
    };

    return (
        <div className={cn("font-bold", className)}>
            <div className="mt-4">
                <div className={cn("dark:text-white text-black text-2xl leading-snug tracking-wide", titleClassName)}>
                    {renderWords()}
                </div>
            </div>
        </div>
    );
};
