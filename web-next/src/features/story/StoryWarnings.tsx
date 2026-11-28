import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

export function StoryWarnings({messages}: {messages: readonly (string | false | undefined)[]}) {
  const {t} = useTranslation("story");
  const notes = [...new Set(messages.filter((message): message is string => Boolean(message)))];
  if (!notes.length) return null;
  return <aside className="story-warnings" role="status">
    <TriangleAlert size={19} aria-hidden="true"/>
    <div><strong>{t("warningHeading")}</strong>
      {notes.length === 1 ? <p>{notes[0]}</p> :
        <ul>{notes.map(note => <li key={note}>{note}</li>)}</ul>}
    </div>
  </aside>;
}
