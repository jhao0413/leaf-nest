'use client';
import { Languages } from 'lucide-react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownItem,
  DropdownMenu,
  Button
} from '@heroui/react';
import { useTransition } from 'react';
import { setUserLocale } from '@/hooks/useLocale';
import { Locale } from '@/i18n/config';
import { useLocale } from '@/i18n';
import { useRendererModeStore } from '@/store/rendererModeStore';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const [, startTransition] = useTransition();
  const mode = useRendererModeStore((state) => state.rendererMode);

  function onChange(value: string) {
    const locale = value as Locale;

    startTransition(() => {
      setUserLocale(locale);
    });
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          className="bg-white dark:bg-neutral-900 rounded-sm"
          isIconOnly
          variant={mode === 'single' ? 'outline' : 'secondary'}
        >
          <Languages size={16} />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu
          disallowEmptySelection
          selectionMode="single"
          selectedKeys={[locale]}
          onAction={(key) => onChange(String(key))}
        >
          <DropdownItem id="en">English</DropdownItem>
          <DropdownItem id="zh">简体中文</DropdownItem>
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
