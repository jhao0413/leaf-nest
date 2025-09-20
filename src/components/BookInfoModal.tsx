import { BookOpen } from "lucide-react";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Image } from "@heroui/image";
import { Tooltip } from "@heroui/tooltip";
import { useTranslations } from "next-intl";
import { BookBasicInfoType } from "@/store/bookInfoStore";
import dayjs from "dayjs";

interface BookInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookInfo: BookBasicInfoType;
}

export const BookInfoModal: React.FC<BookInfoModalProps> = ({ isOpen, onClose, bookInfo }) => {
  const tModal = useTranslations("BookInfoModal");

  return (
    <Modal backdrop="blur" size="2xl" isOpen={isOpen} onClose={onClose} className="pb-6">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>
              <div className="flex items-center">
                <BookOpen size={16} className="mr-2" />
                {tModal("title")}
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="flex">
                <div className="mr-10">
                  <Image
                    isBlurred
                    alt="Event image"
                    width={340}
                    height={480}
                    src={
                      bookInfo.coverBlob ? URL.createObjectURL(new Blob([bookInfo.coverBlob])) : ""
                    }
                  />
                </div>

                <div className="flex flex-col w-1/2">
                  <Tooltip content={bookInfo.name} delay={1000}>
                    <h2 className="font-bold truncate w-[90%] text-2xl font-XiaLuZhenKai mb-2">
                      {bookInfo.name}
                    </h2>
                  </Tooltip>
                  {bookInfo.creator && (
                    <p className="mb-2">
                      <span className="font-bold">{tModal("author")}：</span>
                      {bookInfo.creator}
                    </p>
                  )}
                  {bookInfo.language && (
                    <p className="mb-2">
                      <span className="font-bold">{tModal("language")}：</span>
                      {bookInfo.language}
                    </p>
                  )}
                  {bookInfo.size && (
                    <p className="mb-2">
                      <span className="font-bold">{tModal("size")}：</span>
                      {bookInfo.size}
                    </p>
                  )}
                  {bookInfo.pubdate && (
                    <p className="mb-2">
                      <span className="font-bold">{tModal("publicationDate")}：</span>
                      {dayjs(bookInfo.pubdate).format("YYYY-MM-DD")}
                    </p>
                  )}
                  {bookInfo.publisher && (
                    <p className="mb-2">
                      <span className="font-bold">{tModal("publisher")}：</span>
                      {bookInfo.publisher}
                    </p>
                  )}
                  {bookInfo.identifier && (
                    <p className="mb-2">
                      <span className="font-bold">{tModal("identifier")}：</span>
                      {bookInfo.identifier}
                    </p>
                  )}
                </div>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
