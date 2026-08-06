import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createStudioCustomColors } from '../attributes/customColorModel';
import type { AttributeGroup } from '../attributes/attributeModel';
import { GuidedAttributeForm } from './GuidedAttributeForm';

const groups: AttributeGroup[] = [group('Face', 'Face Shape'), group('Hair', 'Cut / Style')];

describe('GuidedAttributeForm progression', () => {
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

function field(groupName: string, fieldName: string, optionIds: string[]) {
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
