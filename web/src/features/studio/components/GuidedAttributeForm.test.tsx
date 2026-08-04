import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

    fireEvent.click(screen.getByRole('button', { name: 'ui.studio.nextSettings' }));
    await waitFor(() => {
      expect(details[0]).not.toHaveAttribute('open');
      expect(details[1]).toHaveAttribute('open');
    });
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
