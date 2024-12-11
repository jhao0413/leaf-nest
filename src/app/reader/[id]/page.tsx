import ReaderContent from "@/app/reader/[id]/ReaderContent";

type Props = {
  params: { id: string };
};

export default async function ReaderPage({ params }: Props) {
  return <ReaderContent id={params.id} />;
}
