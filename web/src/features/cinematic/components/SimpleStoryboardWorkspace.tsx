import { Plus } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { ApiError } from '../../../lib/api/apiError';
import { createCinematicSimpleScene } from '../api/cinematicApi';
import type { CinematicProject, CinematicScene, CinematicShot } from '../schemas/cinematicSchemas';
import { SimpleStoryboardRow } from './SimpleStoryboardRow';
import { ClipBundleDownload } from './produce/ClipBundleDownload';
import { SceneEnvironmentControl } from './SceneEnvironmentControl';

export type SimpleStoryboardWorkspaceProps = {
  project: CinematicProject;
  onProjectChanged: (project: CinematicProject) => void;
  onProjectRefresh?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  renderImage: (scene: CinematicScene, shot: CinematicShot, blockedReason: string | null) => ReactNode;
  renderVideo: (scene: CinematicScene, shot: CinematicShot, blockedReason: string | null) => ReactNode;
};

export function SimpleStoryboardWorkspace(props: SimpleStoryboardWorkspaceProps) {
  return <SimpleStoryboardSession key={`${props.project.ownerUserId}:${props.project.id}`} {...props} />;
}

function SimpleStoryboardSession(props: SimpleStoryboardWorkspaceProps) {
  const { project, onProjectChanged, onProjectRefresh, onDirtyChange } = props;
  const { t } = useTranslation('cinematic');
  const rows = [...project.scenes].sort((a, b) => a.orderKey - b.orderKey).flatMap((scene, sceneIndex) => {
    const order = new Map(scene.shotOrder.map((id, index) => [id, index]));
    return [...scene.shots].sort((a, b) => (order.get(a.id) ?? a.orderKey) - (order.get(b.id) ?? b.orderKey))
      .map((shot, shotIndex) => ({ scene, shot, sceneIndex, shotIndex, key: `${scene.id}:${shot.id}` }));
  });
  const [activeKey, setActiveKey] = useState<string | null>(rows[0]?.key || null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [dirtyRows, setDirtyRows] = useState<ReadonlySet<string>>(() => new Set());
  const dirtyListener = useRef(onDirtyChange);
  dirtyListener.current = onDirtyChange;
  const reportRowDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyRows(current => {
      if (current.has(key) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const hasDirtyRows = dirtyRows.size > 0;
  useEffect(() => { onDirtyChange?.(hasDirtyRows); }, [hasDirtyRows, onDirtyChange]);
  useEffect(() => () => { dirtyListener.current?.(false); }, []);
  const mutationLock = useRef(false);
  const createKey = useRef<string | null>(null);
  const mounted = useRef(true);
  const currentProject = useRef(project);
  currentProject.current = project;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const selectedKey = rows.some(row => row.key === activeKey) ? activeKey : rows[0]?.key || null;

  function beginMutation() {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    setBusy(true);
    return true;
  }

  function endMutation() {
    mutationLock.current = false;
    if (mounted.current) setBusy(false);
  }

  async function addScene() {
    if (project.scenes.length >= 24 || !beginMutation()) return;
    setAdding(true);
    setAddError(null);
    try {
      // Retain the key after ambiguous network failure so retry cannot create a second Scene.
      createKey.current ||= crypto.randomUUID();
      const next = await createCinematicSimpleScene(project.id, {
        expectedVersion: project.version, idempotencyKey: createKey.current
      });
      if (!mounted.current) return;
      const created = next.scenes.find(scene => !project.scenes.some(old => old.id === scene.id));
      if (created?.shots[0]) setActiveKey(`${created.id}:${created.shots[0].id}`);
      createKey.current = null;
      if (next.version >= currentProject.current.version) onProjectChanged(next);
      else onProjectRefresh?.();
    } catch (reason) {
      if (mounted.current) setAddError(reason instanceof ApiError && reason.status === 409
        ? 'cinematic.manual.addConflict' : 'cinematic.manual.addFailed');
    } finally {
      if (mounted.current) setAdding(false);
      endMutation();
    }
  }

  return <section className="cinematic-manual" aria-label={t('cinematic.manual.workspace')}>
    <header className="cinematic-manual__toolbar">
      <h2>{t('cinematic.manual.workspace')}</h2>
      <span>{t('cinematic.manual.rowCount', { count: rows.length })}</span>
    </header>
    {!rows.length ? <p className="cinematic-manual__empty">{t('cinematic.manual.empty')}</p> : null}
    <div className="cinematic-manual__rows">
      {rows.map(({ key, ...row }) => <Fragment key={key}>
        {row.shotIndex === 0 ? <SceneEnvironmentControl project={project} scene={row.scene}
          disabled={busy || hasDirtyRows} onProjectRefresh={onProjectRefresh} /> : null}
        <SimpleStoryboardRow {...props} {...row}
        rowKey={key} onRowDirtyChange={reportRowDirty}
        active={selectedKey === key} mutationPending={busy}
        beginMutation={beginMutation} endMutation={endMutation}
        onActivate={() => setActiveKey(key)} /></Fragment>)}
    </div>
    <footer className="cinematic-manual__footer">
      <Button type="button" icon={adding ? <ProcessingSpinner /> : <Plus aria-hidden="true" />}
        disabled={busy || project.scenes.length >= 24} onClick={() => void addScene()}>
        {t(adding ? 'cinematic.manual.adding' : 'cinematic.manual.addScene')}
      </Button>
      <ClipBundleDownload projectId={project.id} version={project.version} />
      {adding ? <span role="status">{t('cinematic.manual.adding')}</span> : null}
      {project.scenes.length >= 24 ? <span>{t('cinematic.manual.sceneLimit')}</span> : null}
      {addError ? <div className="cinematic-manual__error" role="alert">
        <span>{t(addError)}</span>
        {onProjectRefresh ? <Button type="button" size="sm" disabled={busy} onClick={onProjectRefresh}>
          {t('cinematic.manual.refresh')}
        </Button> : null}
      </div> : null}
    </footer>
  </section>;
}
