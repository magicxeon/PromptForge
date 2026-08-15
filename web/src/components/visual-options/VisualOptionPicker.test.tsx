import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { VisualOptionPicker } from './VisualOptionPicker';

const testI18n = i18next.createInstance();
const field = {
  name: 'Pose Intent',
  control: 'select',
  group: 'Pose',
  options: []
};

describe('VisualOptionPicker custom input limits', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'react-ui': {
            'ui.visual.custom': 'Custom write-in',
            'ui.visual.customCharacterCount': '{count} / {limit}; {total} / {totalLimit}',
            'ui.visual.customFieldTooLong': '{count} exceeds {limit}',
            'ui.visual.customPlaceholder': 'Custom {field}',
            'ui.visual.customTotalTooLong': '{count} total exceeds {limit}',
            'ui.visual.lock': 'Lock',
            'ui.visual.select': 'Select',
            'ui.visual.use': 'Use'
          }
        }
      },
      ns: ['react-ui'],
      defaultNS: 'react-ui',
      keySeparator: false,
      interpolation: { escapeValue: false, prefix: '{', suffix: '}' }
    });
  });

  it('sorts dropdown options alphabetically without mutating the field', () => {
    const field = {
      name: 'Test Field',
      control: 'select',
      group: 'Test',
      options: ['Zulu', 'Alpha', 'Bravo'].map(label => ({
        id: label.toLowerCase(),
        category: 'test',
        subcategory: 'Test Field',
        label,
        group: 'Test',
        prompt: label,
        tags: []
      }))
    };
    render(
      <I18nextProvider i18n={testI18n}>
        <VisualOptionPicker field={field} onChange={() => {}} />
      </I18nextProvider>
    );

    expect(screen.getAllByRole('option').map(option => option.textContent))
      .toEqual(['Select Test Field', 'Alpha', 'Bravo', 'Zulu', 'Custom write-in']);
    expect(field.options.map(option => option.label)).toEqual(['Zulu', 'Alpha', 'Bravo']);
  });

  it('sorts matching visual cards by the same visible label', () => {
    const options = ['Zulu', 'Alpha', 'Bravo'].map(label => ({
      id: label.toLowerCase(),
      category: 'test',
      subcategory: 'Test Field',
      label,
      group: 'Test',
      prompt: label,
      tags: []
    }));
    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <VisualOptionPicker
          field={{ name: 'Test Field', control: 'select', group: 'Test', options }}
          visual={{
            kind: 'image',
            size: 'compact',
            items: options.map(option => ({
              option,
              assetId: `asset.${option.id}`,
              imageUrl: `/${option.id}.png`,
              renderMode: 'mask'
            }))
          }}
          onChange={() => {}}
        />
      </I18nextProvider>
    );

    expect([...container.querySelectorAll('.visual-image-option__label')]
      .map(item => item.textContent))
      .toEqual(['Alpha', 'Bravo', 'Zulu']);
  });
  it('preserves a detailed pose and blocks over-limit text without truncation', () => {
    const onChange = vi.fn();
    render(
      <I18nextProvider i18n={testI18n}>
        <VisualOptionPicker
          field={field}
          customInputLimits={{ maxCharactersPerField: 1000, maxCharactersTotal: 2000 }}
          onChange={onChange}
        />
      </I18nextProvider>
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__custom__' } });
    const input = screen.getByRole('textbox');
    const pose = 'A'.repeat(829);
    fireEvent.change(input, { target: { value: pose } });
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: pose }));

    const overLimit = 'B'.repeat(1001);
    fireEvent.change(input, { target: { value: overLimit } });
    expect(input).toHaveValue(overLimit);
    expect(screen.getByRole('button', { name: 'Use' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('1001 exceeds 1000');
  });

  it('renders theme-recolorable visuals through the shared mask card', () => {
    const bodyField = {
      name: 'Body Silhouette',
      control: 'select',
      group: 'Body',
      options: [{
        id: 'body.male_silhouette_01',
        category: 'body',
        subcategory: 'Body Shape',
        label: 'Male lean slim silhouette',
        group: 'Body',
        prompt: 'male lean slim silhouette',
        tags: ['body']
      }]
    };
    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <VisualOptionPicker
          field={bodyField}
          visual={{
            kind: 'image',
            size: 'compact',
            items: [{
              option: bodyField.options[0]!,
              assetId: 'visual.body.male.lean',
              imageUrl: '/assets/visual-character-builder/body.png',
              renderMode: 'mask'
            }]
          }}
          onChange={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(container.querySelector('.visual-image-picker--compact')).not.toBeNull();
    expect(container.querySelector('.visual-option-icon')).not.toBeNull();
    expect(container.querySelector('.visual-image-option img')).toBeNull();
  });

  it('renders normalized product line art through the shared theme mask card', () => {
    const faceField = {
      name: 'Face Shape',
      control: 'select',
      group: 'Face',
      options: [{
        id: 'face.021',
        category: 'face',
        subcategory: 'Face Shape',
        label: 'Sculpted Tapered Face',
        group: 'Face',
        prompt: 'sculpted tapered face',
        tags: ['adult-male']
      }]
    };
    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <VisualOptionPicker
          field={faceField}
          visual={{
            kind: 'image',
            size: 'compact',
            items: [{
              option: faceField.options[0]!,
              assetId: 'visual.face.shape.vertical-drama-male',
              imageUrl: '/assets/visual-character-builder/headshot-v1/face-structure/face-shape/preview/vertical-drama-male-r3.png',
              renderMode: 'mask'
            }]
          }}
          onChange={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.queryByRole('img', { name: 'Sculpted Tapered Face' })).toBeNull();
    expect(container.querySelector('.visual-option-icon')).not.toBeNull();
  });
});
