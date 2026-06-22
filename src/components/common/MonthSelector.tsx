"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { getCurrentFeeYear } from "@/lib/fee-year";

interface MonthSelectorProps {
    selectedMonth: number;
    onMonthChange: (month: number) => void;
    year?: number;
    className?: string;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function MonthSelector({
    selectedMonth,
    onMonthChange,
    year = getCurrentFeeYear(),
    className = "",
}: MonthSelectorProps) {
    const [direction, setDirection] = useState<"left" | "right" | null>(null);

    // Calculate max allowed month (Current Month + 1)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const maxMonth = year === currentYear ? Math.min(11, currentMonth + 1) : 11; // Allow up to next month in the current year

    const handlePrev = () => {
        if (selectedMonth > 0) {
            setDirection("left");
            onMonthChange(selectedMonth - 1);
        }
    };

    const handleNext = () => {
        if (selectedMonth < maxMonth) {
            setDirection("right");
            onMonthChange(selectedMonth + 1);
        }
    };

    // Reset animation direction after render
    useEffect(() => {
        const timer = setTimeout(() => setDirection(null), 300);
        return () => clearTimeout(timer);
    }, [selectedMonth]);

    return (
        <div className={`flex items-center justify-between surface-glass rounded-xl p-2 ${className}`}>
            <button
                onClick={handlePrev}
                disabled={selectedMonth <= 0}
                className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous Month"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center overflow-hidden relative h-8 min-w-[100px] sm:min-w-[140px]">
                <div
                    key={selectedMonth}
                    className={`absolute inset-0 flex items-center justify-center font-[family-name:var(--font-space)] text-lg tracking-wider text-white uppercase
            ${direction === "left" ? "animate-slide-in-left" : direction === "right" ? "animate-slide-in-right" : "animate-fade-in"}`}
                >
                    {MONTHS[selectedMonth]} <span className="text-[var(--text-muted)] ml-2 text-sm">{year}</span>
                </div>
            </div>

            <button
                onClick={handleNext}
                disabled={selectedMonth >= maxMonth} // Disable if at max allowed month
                className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next Month"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}
