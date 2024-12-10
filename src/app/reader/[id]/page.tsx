import { use } from "react";
import ReaderContent from "./ReaderContent";

type ReaderPageProps = {
  params: { id: string };
};

export default function ReaderPage(props: ReaderPageProps) {
  const params = use(Promise.resolve(props.params));
  return <ReaderContent id={params.id} />;
}
