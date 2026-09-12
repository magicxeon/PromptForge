import { apiRequest } from '../../../lib/api/apiClient';
import { cinematicSeriesMutationSchema, cinematicSeriesWorkspaceSchema } from '../schemas/cinematicSeriesSchemas';
import type { SeriesCommand } from '../schemas/cinematicSeriesSchemas';

export function getCinematicSeriesWorkspace(projectId: string) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/series`, { schema: cinematicSeriesWorkspaceSchema, cache: 'no-store' });
}

export async function mutateCinematicSeries(projectId: string, projectVersion: number, seriesId: string | undefined, seriesVersion: number | undefined, command: SeriesCommand) {
  if (command.kind === 'create') return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/series`, {
    method: 'POST', body: { title: command.title, expectedProjectVersion: projectVersion }, schema: cinematicSeriesMutationSchema
  });
  if (!seriesId || !seriesVersion) throw new Error('Series workspace is unavailable.');
  const path = `/api/cinematic/series/${encodeURIComponent(seriesId)}`;
  if (command.kind === 'chapter') return apiRequest(`${path}/chapters`, { method: 'POST',
    body: { ...command, expectedVersion: seriesVersion, sourceProjectId: projectId, expectedProjectVersion: projectVersion }, schema: cinematicSeriesMutationSchema });
  const workspace = await apiRequest(command.kind === 'season' ? `${path}/seasons` : path, {
    method: command.kind === 'season' ? 'POST' : 'PATCH', body: { ...command, expectedVersion: seriesVersion }, schema: cinematicSeriesWorkspaceSchema
  });
  return { project: null, workspace };
}
