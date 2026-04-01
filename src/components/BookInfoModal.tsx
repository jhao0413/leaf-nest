import { BookOpen } from 'lucide-react';
import { Modal, Tooltip, TooltipContent, TooltipTrigger } from '@heroui/react';
import dayjs from 'dayjs';
import { useTranslations } from '@/i18n';
import { BookBasicInfoType } from '@/store/bookInfoStore';
import { createBlobUrlFromBinary } from '@/utils/blobUrl';

interface BookInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookInfo: BookBasicInfoType;
}

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
      <span className="font-semibold text-slate-900 dark:text-white">{label}：</span>
      {value}
    </p>
  );
}

export function BookInfoModal({ isOpen, onClose, bookInfo }: BookInfoModalProps) {
  const tModal = useTranslations('BookInfoModal');
  const coverUrl =
    bookInfo.coverUrl || (bookInfo.coverBlob ? createBlobUrlFromBinary(bookInfo.coverBlob) : '');

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop variant="blur">
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog className="border border-white/50 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-neutral-900/95">
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-slate-700 dark:text-slate-200" />
                <Modal.Heading>{tModal('title')}</Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body className="pb-2 text-foreground">
              <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-sm dark:bg-white/5">
                  {coverUrl ? (
                    <img
                      alt={bookInfo.name || 'Book cover'}
                      width={300}
                      height={450}
                      src={coverUrl}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      {bookInfo.name || tModal('title')}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <Tooltip delay={1000}>
                    <TooltipTrigger>
                      <h2 className="mb-4 truncate text-2xl font-bold text-slate-900 dark:text-white font-lxgw">
                        {bookInfo.name}
                      </h2>
                    </TooltipTrigger>
                    <TooltipContent>{bookInfo.name}</TooltipContent>
                  </Tooltip>

                  <div className="space-y-2">
                    <DetailRow label={tModal('author')} value={bookInfo.creator} />
                    <DetailRow label={tModal('language')} value={bookInfo.language} />
                    <DetailRow label={tModal('size')} value={bookInfo.size} />
                    <DetailRow
                      label={tModal('publicationDate')}
                      value={
                        bookInfo.pubdate ? dayjs(bookInfo.pubdate).format('YYYY-MM-DD') : undefined
                      }
                    />
                    <DetailRow label={tModal('publisher')} value={bookInfo.publisher} />
                    <DetailRow label={tModal('identifier')} value={bookInfo.identifier} />
                  </div>
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
