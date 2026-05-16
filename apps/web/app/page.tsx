import { ProductShell } from '../components/layout/product-shell';
import { Button, Card } from '../components/ui/design-system';

export default function HomePage() {
  return (
    <ProductShell activePath="/">
      <section className="home-preview">
        <p className="home-preview__eyebrow">Your learning journey</p>
        <h1>Your guide to mastering problem-solving</h1>
        <p>
          Clear path. Steady practice. Help when you&apos;re stuck. A record of how far you&apos;ve
          come.
        </p>
        <div className="home-preview__actions">
          <a href="/setup">
            <Button>Get Set Up</Button>
          </a>
          <a href="/learn">
            <Button variant="secondary">Open Learning Space</Button>
          </a>
        </div>
      </section>

      <section className="home-preview__cards" aria-label="How code-sherpa helps">
        <Card title="Pick your path" description="Choose what to learn and generate a route." />
        <Card
          title="Tackle exercises"
          description="Practice with local files, tests, and progress."
        />
        <Card
          title="Get guidance"
          description="Ask your Sherpa for hints, explanations, and visuals."
        />
      </section>
    </ProductShell>
  );
}
