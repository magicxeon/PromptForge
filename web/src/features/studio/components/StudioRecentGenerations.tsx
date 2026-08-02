import { GenerationLibrary } from '../../history/components/GenerationLibrary';

export function StudioRecentGenerations({ limit = 12 }: { limit?: number }) {
  return <GenerationLibrary variant="compact" limit={limit} />;
}
