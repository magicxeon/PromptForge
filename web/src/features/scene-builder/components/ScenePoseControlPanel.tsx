import { Aperture, Camera, Scan, ShoppingBag, Sparkles, WandSparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { ScenePoseRecipe } from '../../generation/schemas/generationSchemas';
import {
  localizedSceneRecipeText,
  type ScenePoseControlMode
} from '../scenePoseRecipeModel';

const iconByPurpose = {
  ecommerce: ShoppingBag,
  lifestyle: Sparkles,
  lookbook: Aperture,
  editorial: Camera
};

export function ScenePoseControlPanel({
  mode,
  recipes,
  selectedRecipeId,
  selectedRecipeAdjusted,
  onModeChange,
  onSelectRecipe
}: {
  mode: ScenePoseControlMode;
  recipes: ScenePoseRecipe[];
  selectedRecipeId: string | null;
  selectedRecipeAdjusted: boolean;
  onModeChange: (mode: ScenePoseControlMode) => void;
  onSelectRecipe: (recipe: ScenePoseRecipe) => void;
}) {
  const { t, i18n } = useTranslation('react-ui');
  return (
    <section className="scene-pose-controls" aria-labelledby="scene-pose-controls-title">
      <div className="scene-pose-controls__heading">
        <div>
          <h2 id="scene-pose-controls-title">{t('ui.scene.poseControlsTitle')}</h2>
          <p>{t('ui.scene.poseControlsDescription')}</p>
        </div>
        <div className="scene-pose-controls__mode" role="group" aria-label={t('ui.scene.poseControlMode')}>
          <Button
            size="sm"
            variant={mode === 'simple' ? 'primary' : 'secondary'}
            icon={<WandSparkles aria-hidden="true" />}
            aria-pressed={mode === 'simple'}
            onClick={() => onModeChange('simple')}
          >
            {t('ui.scene.poseSimple')}
          </Button>
          <Button
            size="sm"
            variant={mode === 'advanced' ? 'primary' : 'secondary'}
            icon={<Scan aria-hidden="true" />}
            aria-pressed={mode === 'advanced'}
            onClick={() => onModeChange('advanced')}
          >
            {t('ui.scene.poseAdvanced')}
          </Button>
        </div>
      </div>

      {mode === 'simple' ? (
        <div className="scene-pose-recipes" role="list">
          {recipes.map(recipe => {
            const Icon = iconByPurpose[recipe.purpose as keyof typeof iconByPurpose] || Sparkles;
            const selected = recipe.id === selectedRecipeId;
            return (
              <button
                key={recipe.id}
                type="button"
                role="listitem"
                className="scene-pose-recipe"
                aria-pressed={selected}
                onClick={() => onSelectRecipe(recipe)}
              >
                <span className="scene-pose-recipe__icon"><Icon aria-hidden="true" /></span>
                <strong>{localizedSceneRecipeText(recipe.label, i18n.resolvedLanguage || i18n.language)}</strong>
                <span>{localizedSceneRecipeText(recipe.description, i18n.resolvedLanguage || i18n.language)}</span>
                {selected ? (
                  <small>{selectedRecipeAdjusted
                    ? t('ui.scene.poseRecipeAdjusted')
                    : t('ui.scene.poseRecipeSelected')}</small>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="scene-pose-controls__advanced-note">{t('ui.scene.poseAdvancedDescription')}</p>
      )}
    </section>
  );
}
