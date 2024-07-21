"use client";
import Link from "next/link";

import { Languages, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as React from "react";
import {useLocale, useTranslations} from 'next-intl';
import LocaleSwitcher from '@/components/login/localeSwitcher';
import { ModeToggle } from "@/components/login/themeModeToggle";
import { useTheme } from "next-themes";
import { useRouter } from 'next/navigation';
import { toast } from "sonner"

export default function LoginPage() {
  const t = useTranslations('Login');
  const locale = useLocale();
  const {theme} = useTheme();
  const router = useRouter();

  const handleLogin = () => {
    toast.success('Jhao, Good evening!')
    router.push('/');
    
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Leaf-Nest</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                type="string"
                placeholder={t('usernamePlaceholder')}
                required
                className="focus:outline-none"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">{t('password')}</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <Input id="password" type="password" required className="focus:outline-none" placeholder={t('passwordPlaceholder')} />
            </div>
            <Button type="submit" className="w-full" onClick={handleLogin}>
              {t('login')}
            </Button>
          </div>
          <div className="flex justify-center gap-20 mt-10">
            <LocaleSwitcher localeValue={locale} />
            <ModeToggle theme={theme} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
