import { useBookInfoStore } from '@/store/bookInfoStore';
import { useFontStore, useRendererConfigStore } from '@/store/fontConfigStore';
import { useRendererModeStore } from '@/store/rendererModeStore';
import { Button, Slider } from '@heroui/react';
import { ALargeSmall, AArrowDown, AArrowUp } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { useState } from 'react';
import { createPortal } from 'react-dom';

const FontConfig: React.FC = () => {
  const t = useTranslations('Renderer');
  const [isOpen, setIsOpen] = useState(false);
  const mode = useRendererModeStore((state) => state.rendererMode);
  const rendererConfig = useRendererConfigStore((state) => state.rendererConfig);
  const setRendererConfig = useRendererConfigStore((state) => state.setRendererConfig);
  const { zhFontFamilies, enFontFamilies } = useFontStore((state) => state);
  const bookInfo = useBookInfoStore((state) => state.bookInfo);
  const cuurentFontFamilies = bookInfo.language === 'zh' ? zhFontFamilies : enFontFamilies;

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleOverlayClick = () => {
    setIsOpen(false);
  };

  const onFontSizeChange = (value: number) => {
    setRendererConfig({
      ...rendererConfig,
      fontSize: value
    });
  };

  const onFontFamilyChange = (value: string) => {
    const fontInfo = cuurentFontFamilies.find((font) => font.value === value);
    setRendererConfig({
      ...rendererConfig,
      fontFamily: value,
      fontUrl: fontInfo?.url || '',
      fontFormat: fontInfo?.format || ''
    });
  };

  const overlay = (
    <>
      <button
        type="button"
        className={`fixed top-0 left-0 w-screen h-screen bg-black bg-zinc-500/50 z-20 transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleOverlayClick}
        aria-label="Close font settings"
      />
      <div
        className={`w-auto h-auto p-5 bg-white dark:bg-neutral-800 fixed bottom-[calc(7vh-32px)] [--accent:var(--eclipse)] [--accent-foreground:var(--snow)] [--focus:var(--eclipse)] dark:[--accent:var(--snow)] dark:[--accent-foreground:var(--eclipse)] dark:[--focus:var(--snow)] ${
          mode === 'single' ? 'right-0 sm:right-1/4' : 'right-[10%]'
        } z-30 rounded-2xl transition-opacity duration-500 transform ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } shadow-md`}
      >
        <div className="flex items-center gap-2 mb-2">
          <AArrowDown className="text-2xl" />
          <Slider
            step={2}
            maxValue={26}
            minValue={16}
            value={[rendererConfig.fontSize]}
            onChange={(value) => onFontSizeChange(Array.isArray(value) ? value[0] : value)}
            className="max-w-md"
          >
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <AArrowUp className="text-2xl" />
        </div>
        <div className="text-sm text-center mb-2">
          {t('fontSize')}: {rendererConfig.fontSize}px
        </div>
        <p className="mt-2">{t('fontFamily')}</p>
        <div className="grid gap-2 grid-cols-2">
          {cuurentFontFamilies.map((font) => (
            <button
              key={font.value}
              type="button"
              className={`min-w-36 rounded-xl p-1 mt-2 font-${font.value} text-base ${
                rendererConfig.fontFamily === font.value
                  ? 'border border-neutral-900 bg-neutral-900 text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 dark:focus-visible:ring-white'
                  : 'border border-neutral-200 bg-white/85 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:border-neutral-600 dark:bg-neutral-700/80 dark:text-neutral-100 dark:hover:bg-neutral-700 dark:focus-visible:ring-white'
              }`}
              style={{ fontFamily: font.value }}
              onClick={() => onFontFamilyChange(font.value)}
            >
              {font.value === 'sans' ? t('defaultFont') : font.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      <Button
        className="mt-4 h-12 w-12 rounded-full bg-white shadow-md dark:bg-neutral-900"
        isIconOnly
        variant="outline"
        onPress={handleMenuClick}
        aria-label={isOpen ? 'Close font settings' : 'Open font settings'}
      >
        <ALargeSmall className="!size-6" />
      </Button>
      {createPortal(overlay, document.body)}
    </>
  );
};

export default FontConfig;
