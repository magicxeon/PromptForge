type Props = {
  ready: boolean;
  readyMessage: string;
  incompleteMessage: string;
};

export function CinematicReadinessSummary({ ready, readyMessage, incompleteMessage }: Props) {
  return <p className={`cinematic-director-simple-status${ready ? ' is-ready' : ''}`} role="status">
    {ready ? readyMessage : incompleteMessage}
  </p>;
}
