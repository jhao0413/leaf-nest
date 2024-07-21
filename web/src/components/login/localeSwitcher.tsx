"use client";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as React from "react";
import {useTransition} from 'react';
import {getUserLocale, setUserLocale} from '@/hooks/use-locale';
import { Locale } from "@/i18-config";

type Props = {
    localeValue: string;
};

export default function LocaleSwitcher({localeValue}: Props) {
    const [isPending, startTransition] = useTransition();

    function onChange(value: string) {
        console.log(value);
        
        const locale = value as Locale;
        startTransition(() => {
            setUserLocale(locale);
        });
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Languages className="cursor-pointer" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-10">
                <DropdownMenuRadioGroup
                value={localeValue}
                onValueChange={onChange}
                >
                <DropdownMenuRadioItem value="en">
                    English
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="zh">
                    简体中文
                </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
