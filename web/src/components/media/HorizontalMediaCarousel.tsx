import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils/cn';

type ViewAllAction = {
  href: string;
  label: string;
};

export function HorizontalMediaCarousel({
  heading,
  toolbar,
  children,
  itemClassName,
  viewAll,
  previousLabel,
  nextLabel,
  ariaLabel
}: {
  heading: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  itemClassName?: string;
  viewAll?: ViewAllAction | null;
  previousLabel: string;
  nextLabel: string;
  ariaLabel: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const itemCount = Children.count(children) + (viewAll ? 1 : 0);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    setCanScrollBack(viewport.scrollLeft > 1);
    setCanScrollForward(viewport.scrollLeft < maximum - 1);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    updateScrollState();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [itemCount, updateScrollState]);

  function scroll(direction: -1 | 1) {
    const viewport = viewportRef.current;
    const firstItem = viewport?.querySelector<HTMLElement>('[data-carousel-item]');
    if (!viewport || !firstItem) return;
    const gap = Number.parseFloat(getComputedStyle(viewport).columnGap || '0') || 0;
    const distance = (firstItem.getBoundingClientRect().width + gap) * 2;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollBy({
      left: direction * distance,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  }

  return (
    <div className="horizontal-media-carousel">
      <div className="horizontal-media-carousel__header">
        <div className="horizontal-media-carousel__heading">{heading}</div>
        <div className="horizontal-media-carousel__actions">
          {toolbar}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={previousLabel}
            title={previousLabel}
            disabled={!canScrollBack}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={nextLabel}
            title={nextLabel}
            disabled={!canScrollForward}
            onClick={() => scroll(1)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="horizontal-media-carousel__viewport"
        role="region"
        aria-label={ariaLabel}
        onScroll={updateScrollState}
      >
        {Children.map(children, (child, index) => (
          <div
            key={index}
            data-carousel-item
            className={cn('horizontal-media-carousel__item', itemClassName)}
          >
            {child}
          </div>
        ))}
        {viewAll ? (
          <div
            data-carousel-item
            className={cn(
              'horizontal-media-carousel__item horizontal-media-carousel__view-all',
              itemClassName
            )}
          >
            <Link to={viewAll.href}>
              <span>{viewAll.label}</span>
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
