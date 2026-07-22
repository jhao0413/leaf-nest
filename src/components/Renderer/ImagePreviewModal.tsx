'use client';

import { Button, Modal } from '@heroui/react';
import { Minus, Plus, RefreshCcw, RotateCw, X } from 'lucide-react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { useTranslations } from '@/i18n';
import { useState } from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImagePreviewModal({ isOpen, src, alt, onClose }: ImagePreviewModalProps) {
  const t = useTranslations('ImagePreview');
  const [rotation, setRotation] = useState(0);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop className="bg-black/45 backdrop-blur-sm data-[exiting=true]:duration-200">
        <Modal.Container
          size="full"
          placement="center"
          className="p-0 data-[exiting=true]:duration-200"
        >
          <Modal.Dialog
            className="relative h-dvh max-h-dvh w-screen max-w-none overflow-hidden rounded-none border-0 bg-transparent shadow-none"
            aria-label={t('title')}
          >
            <Modal.Heading className="sr-only">{t('title')}</Modal.Heading>
            <button
              type="button"
              className="absolute inset-0 z-0 cursor-default"
              aria-label={t('closeBackdrop')}
              onClick={onClose}
            />
            <TransformWrapper
              key={src}
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              centerOnInit
              centerZoomedOut
              limitToBounds
              doubleClick={{ disabled: true }}
            >
              {({ state, zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/35 p-2 text-white shadow-lg backdrop-blur">
                    <Button
                      isIconOnly
                      variant="ghost"
                      className="text-white"
                      aria-label={t('zoomIn')}
                      onPress={() => zoomIn()}
                    >
                      <Plus size={20} />
                    </Button>
                    <Button
                      isIconOnly
                      variant="ghost"
                      className="text-white"
                      aria-label={t('zoomOut')}
                      onPress={() => zoomOut(0.25)}
                    >
                      <Minus size={20} />
                    </Button>
                    <Button
                      isIconOnly
                      variant="ghost"
                      className="text-white"
                      aria-label={t('rotate')}
                      onPress={() => setRotation((value) => (value + 90) % 360)}
                    >
                      <RotateCw size={20} />
                    </Button>
                    <Button
                      isIconOnly
                      variant="ghost"
                      className="text-white"
                      aria-label={t('reset')}
                      onPress={() => {
                        setRotation(0);
                        resetTransform();
                      }}
                    >
                      <RefreshCcw size={20} />
                    </Button>
                  </div>

                  <Button
                    isIconOnly
                    variant="ghost"
                    className="absolute right-4 top-4 z-20 bg-black/35 text-white backdrop-blur"
                    aria-label={t('close')}
                    onPress={onClose}
                  >
                    <X size={22} />
                  </Button>

                  <TransformComponent
                    wrapperClass="!pointer-events-none !absolute !inset-0 !z-10 !h-full !w-full"
                    contentClass="!pointer-events-none !flex !h-full !w-full !items-center !justify-center"
                  >
                    <img
                      src={src}
                      alt={alt || t('imageAlt')}
                      draggable={false}
                      className="pointer-events-auto max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-2rem)] select-none object-contain"
                      style={{ transform: `rotate(${rotation}deg)` }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        if (state.scale > 1) resetTransform();
                        else zoomIn(0.75);
                      }}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
