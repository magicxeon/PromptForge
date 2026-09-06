import type { ReactNode } from 'react';

export type DiscoveryStep = {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
};

export function DiscoverySteps({ title, steps }: { title: string; steps: DiscoveryStep[] }) {
  if (!steps.length) return null;
  return (
    <section className="discovery-steps" aria-labelledby="discovery-steps-title">
      <h2 id="discovery-steps-title" className="sr-only">{title}</h2>
      <ol>
        {steps.map((step, index) => (
          <li key={step.id}>
            <span className="discovery-steps__number">{index + 1}</span>
            <span className="discovery-steps__icon">{step.icon}</span>
            <span>
              <strong>{step.title}</strong>
              <small>{step.description}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
