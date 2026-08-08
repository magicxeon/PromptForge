import {
  AlignCenter,
  Aperture,
  Camera,
  Feather,
  Megaphone,
  Move,
  Scan,
  ShoppingBag,
  Sparkles,
  WandSparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { ScenePoseRecipe } from '../../generation/schemas/generationSchemas';
import {
  discoverableScenePoseRecipes,
  isScenePoseStyleCompatible,
  localizedSceneRecipeText,
  type ScenePoseControlMode,
  type ScenePoseStyle
} from '../scenePoseRecipeModel';

const iconByPurpose = {
  ecommerce: ShoppingBag,
  lifestyle: Sparkles,
  lookbook: Aperture,
  editorial: Camera,
  campaign: Megaphone
};

const iconByPoseStyle = {
  'pose-style.auto': WandSparkles,
  'pose-style.soft-natural': Feather,
  'pose-style.clean-minimal': AlignCenter,
  'pose-style.confident-editorial': Sparkles,
  'pose-style.dynamic-fashion': Move
};

export function ScenePoseControlPanel({
  mode,
  recipes,
  poseStyles,
  selectedRecipeId,
  selectedPoseStyleId,
  poseStyleEditable,
  selectedRecipeAdjusted,
  onModeChange,
  onSelectRecipe,
  onSelectPoseStyle
}: {
  mode: ScenePoseControlMode;
  recipes: ScenePoseRecipe[];
  poseStyles: ScenePoseStyle[];
  selectedRecipeId: string | null;
  selectedPoseStyleId: string;
  poseStyleEditable: boolean;
  selectedRecipeAdjusted: boolean;
  onModeChange: (mode: ScenePoseControlMode) => void;
  onSelectRecipe: (recipe: ScenePoseRecipe) => void;
  onSelectPoseStyle: (style: ScenePoseStyle) => void;
}) {
  const { t, i18n } = useTranslation('react-ui');
  const visibleRecipes = discoverableScenePoseRecipes(recipes, selectedRecipeId);
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
        <>
        <div className="scene-pose-recipes" role="list">
          {visibleRecipes.map(recipe => {
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
                <span className="scene-pose-recipe__preview">
                  {recipe.previewAsset ? (
                    <img
                      src={recipe.previewAsset}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : <Icon aria-hidden="true" />}
                  <span className="scene-pose-recipe__purpose"><Icon aria-hidden="true" /></span>
                </span>
                <span className="scene-pose-recipe__body">
                  <strong>{localizedSceneRecipeText(recipe.label, i18n.resolvedLanguage || i18n.language)}</strong>
                  <span>{localizedSceneRecipeText(recipe.description, i18n.resolvedLanguage || i18n.language)}</span>
                  {selected ? (
                    <small>{selectedRecipeAdjusted
                      ? t('ui.scene.poseRecipeAdjusted')
                      : t('ui.scene.poseRecipeSelected')}</small>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="scene-pose-style-selector">
          <div className="scene-pose-style-selector__heading">
            <strong>{t('ui.scene.poseStyleTitle')}</strong>
            <span>{t('ui.scene.poseStyleDescription')}</span>
          </div>
          <div
            className="scene-pose-style-options"
            role="radiogroup"
            aria-label={t('ui.scene.poseStyleTitle')}
          >
            {poseStyles.map(style => {
              const Icon = iconByPoseStyle[style.id as keyof typeof iconByPoseStyle] || Sparkles;
              const selected = style.id === selectedPoseStyleId;
              const compatible = isScenePoseStyleCompatible(style, selectedRecipeId);
              const disabled = !compatible || !poseStyleEditable;
              return (
                <button
                  key={style.id}
                  type="button"
                  role="radio"
                  className="scene-pose-style-option"
                  aria-checked={selected}
                  disabled={disabled}
                  title={!compatible
                    ? t('ui.scene.poseStyleUnavailable')
                    : !poseStyleEditable
                      ? t('ui.scene.poseStyleLocked')
                      : undefined}
                  onClick={() => onSelectPoseStyle(style)}
                >
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{localizedSceneRecipeText(style.label, i18n.resolvedLanguage || i18n.language)}</strong>
                    <small>{localizedSceneRecipeText(style.description, i18n.resolvedLanguage || i18n.language)}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        </>
      ) : (
        <p className="scene-pose-controls__advanced-note">{t('ui.scene.poseAdvancedDescription')}</p>
      )}
    </section>
  );
}
