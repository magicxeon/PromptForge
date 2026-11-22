import {useInfiniteQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {MediaImage} from "../../../components/media/MediaImage";
import {listHistory, ProcessingSpinner, useActor} from "../../../lib/canonical";
import {Dialog} from "../../dub-sub/Dialog";

export function OpeningFramePicker({choose, close, pending, error}: {
  choose: (jobId: string) => void; close: () => void; pending: boolean; error: string;
}) {
  const {t} = useTranslation("storyPrompt");
  const {identityScope} = useActor();
  const history = useInfiniteQuery({
    queryKey: ["story-opening-frame-history", identityScope], initialPageParam: null as string | null,
    queryFn: ({pageParam}) => listHistory(pageParam), getNextPageParam: page => page.hasMore ? page.nextCursor : undefined
  });
  const images = history.data?.pages.flatMap(page => page.items).filter(image => image.imageUrl);
  return <Dialog label={t("framePicker")} onClose={() => {if (!pending) close();}}>
    <div className="story-dialog"><h2>{t("framePicker")}</h2>
      {(history.isFetching || pending) && <ProcessingSpinner/>}
      {history.error && <p role="alert">{history.error.message} <button onClick={() => void history.refetch()}>{t("retry")}</button></p>}
      {error && <p role="alert">{error}</p>}
      {images?.length === 0 && <p>{t("noImages")}</p>}
      <div className="story-frame-options">{images?.map(image =>
        <button disabled={pending} key={image.id} onClick={() => choose(image.id)}>
          <MediaImage src={image.thumbnailUrl || image.imageUrl} alt={image.submodel || image.id}/>
        </button>)}</div>
      {history.hasNextPage && <button disabled={pending || history.isFetching} onClick={() => void history.fetchNextPage()}>{t("next")}</button>}
      <footer><button disabled={pending} onClick={close}>{t("close", {ns:"story"})}</button></footer>
    </div>
  </Dialog>;
}
