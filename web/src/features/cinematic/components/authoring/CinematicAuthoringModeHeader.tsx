import { CinematicControlLevel } from '../CinematicControlLevel';

type Props = {
  mode: 'simple' | 'advanced';
  label: string;
  helpText: string;
  onChange: (mode: 'simple' | 'advanced') => void;
};

export function CinematicAuthoringModeHeader({ mode, label, helpText, onChange }: Props) {
  return <div className="cinematic-director-mode">
    <CinematicControlLevel mode={mode} label={label} helpText={helpText} onChange={onChange} />
  </div>;
}
