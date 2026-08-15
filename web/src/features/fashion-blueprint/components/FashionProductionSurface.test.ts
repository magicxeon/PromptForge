import { describe, expect, it, vi } from 'vitest';
import type { FashionRun } from '../schemas/fashionSchemas';
import {
  focusFashionProduction,
  toFashionResultItems,
  toFashionViewerItems
} from './fashionProductionPresentation';

describe('FashionProductionSurface normalization', () => {
  const run = {
    id: 'frun_1',
    status: 'partially_completed',
    operations: [
      {
        operationId: 'op_1',
        productItemKey: 'outfit_1',
        productName: 'Blue set',
        jobId: 'job_1',
        status: 'completed',
        result: { imageUrl: '/outputs/job_1.jpg' }
      },
      {
        operationId: 'op_2',
        productItemKey: 'outfit_2',
        productName: 'Red set',
        jobId: 'job_2',
        status: 'failed',
        error: { message: 'Provider failed.' }
      }
    ]
  } as FashionRun;

  it('retains completed and failed operations in the shared grid contract', () => {
    expect(toFashionResultItems(run)).toEqual([
      {
        id: 'job_1',
        imageUrl: '/outputs/job_1.jpg',
        status: 'completed',
        error: undefined,
        label: 'Blue set'
      },
      {
        id: 'job_2',
        imageUrl: undefined,
        status: 'failed',
        error: { message: 'Provider failed.' },
        label: 'Red set'
      }
    ]);
  });

  it('opens only completed image results in the shared viewer', () => {
    expect(toFashionViewerItems(run)).toEqual([
      {
        id: 'job_1',
        imageUrl: '/outputs/job_1.jpg',
        title: 'Blue set',
        generationMode: 'fashion'
      }
    ]);
  });

  it('scrolls and focuses the accepted production surface with reduced-motion support', () => {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.tabIndex = -1;
    section.append(heading);
    section.scrollIntoView = vi.fn();
    heading.focus = vi.fn();

    focusFashionProduction(section, true);

    expect(section.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start'
    });
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
