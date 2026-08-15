import { fireEvent, render, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createStudioCustomColors } from '../attributes/customColorModel';
import type {
  AttributeField,
  AttributeGroup,
  AttributeSelection
} from '../attributes/attributeModel';
import { GuidedAttributeForm } from './GuidedAttributeForm';

const groups: AttributeGroup[] = [group('Face', 'Face Shape'), group('Hair', 'Cut / Style')];

describe('GuidedAttributeForm progression', () => {
  it('preserves every coordinated Face selection while later fields change', () => {
    const faceFields: AttributeField[] = [
      field('Face', 'Face Shape', ['face.021']),
      field('Face', 'Eyes', ['eyes.014']),
      field('Face', 'Eyebrows', ['eyebrows.008']),
      field('Face', 'Nose', ['nose.007']),
      field('Face', 'Lips', ['lips.013'])
    ];
    faceFields.forEach(faceField => {
      faceField.options[0]!.tags = ['vertical-drama-lead', 'adult-male'];
    });
    const faceGroup: AttributeGroup = { group: 'Face', fields: faceFields };

    function Harness() {
      const [selections, setSelections] = useState<Record<string, AttributeSelection>>({
        Gender: selection('character.002', 'male man', 'Character'),
        Age: selection('character.004_e20', '21-year-old young adult', 'Character')
      });
      return (
        <GuidedAttributeForm
          groups={[faceGroup]}
          mode="headshot"
          characterType="styled_character"
          selections={selections}
          customColors={createStudioCustomColors()}
          onCustomColorsChange={() => {}}
          onChange={setSelections}
        />
      );
    }

    const { container } = render(<Harness />);
    for (const faceField of faceFields) {
      const select = container.querySelector<HTMLSelectElement>(
        `select[aria-label="${faceField.name}"]`
      );
      expect(select).not.toBeNull();
      fireEvent.change(select!, { target: { value: faceField.options[0]!.id } });
    }

    for (const faceField of faceFields) {
      expect(container.querySelector<HTMLSelectElement>(
        `select[aria-label="${faceField.name}"]`
      )?.value).toBe(faceField.options[0]!.id);
    }
  });

  it('opens one group and advances to the next group', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true })
    });
    Element.prototype.scrollIntoView = vi.fn();

    const { container } = render(
      <GuidedAttributeForm
        groups={groups}
        mode="headshot"
        characterType="styled_character"
        selections={{}}
        customColors={createStudioCustomColors()}
        singleOpen
        showNextActions
        onCustomColorsChange={() => {}}
        onChange={() => {}}
      />
    );

    const details = [...container.querySelectorAll('details')];
    expect(details[0]).toHaveAttribute('open');
    expect(details[1]).not.toHaveAttribute('open');

    const nextButton = details[0]?.querySelector<HTMLButtonElement>(
      '.studio-attribute-group__next button'
    );
    expect(nextButton).not.toBeNull();
    fireEvent.click(nextButton!);
    await waitFor(() => {
      expect(details[0]).not.toHaveAttribute('open');
      expect(details[1]).toHaveAttribute('open');
    });
  });

  it('scrolls and focuses only when selecting a category expands it', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false })
    });
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const { container } = render(
      <GuidedAttributeForm
        groups={groups}
        mode="headshot"
        characterType="styled_character"
        selections={{}}
        customColors={createStudioCustomColors()}
        singleOpen
        showNextActions
        onCustomColorsChange={() => {}}
        onChange={() => {}}
      />
    );

    const details = [...container.querySelectorAll('details')];
    const hairHeading = details[1]?.querySelector<HTMLElement>('summary');
    expect(hairHeading).not.toBeNull();

    fireEvent.click(hairHeading!);

    await waitFor(() => {
      expect(details[0]).not.toHaveAttribute('open');
      expect(details[1]).toHaveAttribute('open');
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start'
      });
      expect(hairHeading).toHaveFocus();
    });

    scrollIntoView.mockClear();
    fireEvent.click(hairHeading!);

    await waitFor(() => {
      expect(details[1]).not.toHaveAttribute('open');
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('skips reference-controlled groups when advancing Simple settings', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true })
    });
    Element.prototype.scrollIntoView = vi.fn();
    const sceneGroups = [
      group('Hair', 'Cut / Style'),
      group('Body', 'Model Build'),
      group('Clothing', 'Outfit Base'),
      group('Pose', 'Pose Intent')
    ];

    const { container } = render(
      <GuidedAttributeForm
        groups={sceneGroups}
        mode="scene"
        characterType="styled_character"
        selections={{}}
        customColors={createStudioCustomColors()}
        references={{ character_reference: '/outputs/reusable-character.png' }}
        characterOutfitBehavior="replaceable"
        singleOpen
        showNextActions
        onCustomColorsChange={() => {}}
        onChange={() => {}}
      />
    );

    const details = [...container.querySelectorAll('details')];
    expect(details[0]).toHaveAttribute('open');

    const nextButton = details[0]?.querySelector<HTMLButtonElement>(
      '.studio-attribute-group__next button'
    );
    expect(nextButton).not.toBeNull();
    fireEvent.click(nextButton!);
    await waitFor(() => {
      expect(details[0]).not.toHaveAttribute('open');
      expect(details[1]).not.toHaveAttribute('open');
      expect(details[2]).toHaveAttribute('open');
    });
  });

  it('supports capability-owned field hiding and bounded option catalogs', () => {
    const cameraGroup: AttributeGroup = {
      group: 'Camera',
      fields: [
        field('Camera', 'Brand', ['camera.brand.modern']),
        field('Camera', 'Motion Blur', ['camera.blur.frozen', 'camera.blur.unbounded'])
      ]
    };

    const { container } = render(
      <GuidedAttributeForm
        groups={[cameraGroup]}
        mode="scene"
        characterType="styled_character"
        selections={{}}
        customColors={createStudioCustomColors()}
        excludedFields={new Set(['Brand'])}
        optionIdsByField={new Map([
          ['Motion Blur', new Set(['camera.blur.frozen'])]
        ])}
        onCustomColorsChange={() => {}}
        onChange={() => {}}
      />
    );

    expect(container.textContent).not.toContain('Brand');
    const select = container.querySelector('select');
    expect(select?.querySelectorAll('option')).toHaveLength(3);
    expect(select?.textContent).toContain('camera.blur.frozen');
    expect(select?.textContent).not.toContain('camera.blur.unbounded');
  });

  it('projects Character Reference gender into dropdown and visual option applicability', () => {
    const bodyField = field('Body', 'Body Silhouette', ['body.female', 'body.neutral', 'body.male']);
    bodyField.options[0]!.tags = ['female-body-silhouette'];
    bodyField.options[0]!.label = 'Female silhouette';
    bodyField.options[1]!.label = 'Neutral silhouette';
    bodyField.options[2]!.tags = ['male-body-silhouette'];
    bodyField.options[2]!.label = 'Male silhouette';

    const { container } = render(
      <GuidedAttributeForm
        groups={[{ group: 'Body', fields: [bodyField] }]}
        mode="scene"
        characterType="styled_character"
        selections={{}}
        presentationGender={selection('character.002', 'male man', 'Character')}
        customColors={createStudioCustomColors()}
        onCustomColorsChange={() => {}}
        onChange={() => {}}
      />
    );

    const labels = [...container.querySelectorAll('select option')].map(option => option.textContent);
    expect(labels).toContain('Male silhouette');
    expect(labels).toContain('Neutral silhouette');
    expect(labels).not.toContain('Female silhouette');
  });
});

function group(groupName: string, fieldName: string): AttributeGroup {
  return {
    group: groupName,
    fields: [{
      name: fieldName,
      control: 'select',
      group: groupName,
      options: [{
        id: `${groupName}.option`,
        category: groupName.toLocaleLowerCase(),
        subcategory: fieldName,
        label: `${groupName} option`,
        group: groupName,
        prompt: `${groupName} option`,
        tags: []
      }]
    }]
  };
}

function field(
  groupName: string,
  fieldName: string,
  optionIds: string[]
): AttributeField {
  return {
    name: fieldName,
    control: 'select',
    group: groupName,
    options: optionIds.map(id => ({
      id,
      category: groupName.toLocaleLowerCase(),
      subcategory: fieldName,
      label: id,
      group: groupName,
      prompt: id,
      tags: []
    }))
  };
}

function selection(
  id: string,
  value: string,
  groupName: string
): AttributeSelection {
  return {
    id,
    value,
    label: value,
    isCustom: false,
    group: groupName,
    category: groupName.toLowerCase(),
    tags: [],
    gptPositiveWords: []
  };
}
