'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fuel, Truck, Calculator } from "lucide-react";

interface FuelSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentMpg: number;
    currentFuelPrice: number;
    onSave: (mpg: number, price: number) => void;
}

export function FuelSettingsDialog({ open, onOpenChange, currentMpg, currentFuelPrice, onSave }: FuelSettingsDialogProps) {
    const [mpg, setMpg] = useState(currentMpg.toString());
    const [price, setPrice] = useState(currentFuelPrice.toString());

    useEffect(() => {
        if (open) {
            setMpg(currentMpg.toString());
            setPrice(currentFuelPrice.toString());
        }
    }, [open, currentMpg, currentFuelPrice]);

    const handleSave = () => {
        const newMpg = parseFloat(mpg);
        const newPrice = parseFloat(price);
        if (!isNaN(newMpg) && !isNaN(newPrice) && newMpg > 0) {
            onSave(newMpg, newPrice);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] glass-panel bg-slate-950/90 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                        <Fuel className="h-6 w-6 text-amber-500" />
                        Fuel Profitability Settings
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Configure your truck's efficiency to calculate true net profit per load.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="mpg" className="text-right text-slate-300 font-mono text-xs uppercase tracking-wider">
                            MPG
                        </Label>
                        <div className="col-span-3 relative">
                            <Truck className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                id="mpg"
                                type="number"
                                step="0.1"
                                value={mpg}
                                onChange={(e) => setMpg(e.target.value)}
                                className="pl-9 bg-slate-900/50 border-slate-700 text-slate-100 focus:border-amber-500"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Average Miles Per Gallon</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right text-slate-300 font-mono text-xs uppercase tracking-wider">
                            Fuel Price
                        </Label>
                        <div className="col-span-3 relative">
                            <div className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">$</div>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="pl-9 bg-slate-900/50 border-slate-700 text-slate-100 focus:border-amber-500"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Average Cost per Gallon</p>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200/80 flex gap-2">
                        <Calculator className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                            This will display <strong>Net Profit</strong> on every card:
                            <br />
                            <code>(Rate - ((Dist / {mpg}) * ${price}))</code>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 hover:bg-slate-800 text-slate-300">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white">
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
