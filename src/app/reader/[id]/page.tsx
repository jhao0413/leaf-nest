import ReaderContent from "@/app/reader/[id]/ReaderContent";

type ReaderPageProps = {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function ReaderPage({ params }: Pick<ReaderPageProps, "params">) {
  return <ReaderContent id={params.id} />;
}
