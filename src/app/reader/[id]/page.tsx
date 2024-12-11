import ReaderContent from "@/app/reader/[id]/ReaderContent";
type ReaderPageProps = {
  params: { id: string };
};

export default async function ReaderPage(props: ReaderPageProps) {
  return <ReaderContent id={props.params.id} />;
}
