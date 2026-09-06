import { Play } from 'lucide-react';

export type EditorialTutorial = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  durationLabel?: string;
};

export function EditorialTutorialRail({
  eyebrow,
  title,
  sampleLabel,
  items
}: {
  eyebrow: string;
  title: string;
  sampleLabel: string;
  items: EditorialTutorial[];
}) {
  if (!items.length) return null;
  return (
    <section className="editorial-tutorial" aria-labelledby="editorial-tutorial-title">
      <header>
        <span>{eyebrow}</span>
        <h2 id="editorial-tutorial-title">{title}</h2>
      </header>
      <div className="editorial-tutorial__rail">
        {items.map(item => (
          <article key={item.id} className="editorial-tutorial__item">
            <div className="editorial-tutorial__media">
              <img src={item.imageUrl} alt="" loading="lazy" />
              <span className="editorial-tutorial__play" aria-hidden="true"><Play /></span>
              <span className="editorial-tutorial__sample">{sampleLabel}</span>
              {item.durationLabel ? <span className="editorial-tutorial__duration">{item.durationLabel}</span> : null}
            </div>
            <div className="editorial-tutorial__copy">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
