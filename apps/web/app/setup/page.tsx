import { ProductShell } from '../../components/layout/product-shell';
import { Button, Card, Pill, StatusBanner } from '../../components/ui/design-system';

export default function SetupPage() {
  return (
    <ProductShell activePath="/setup">
      <section className="setup-preview">
        <div className="setup-preview__header">
          <p className="home-preview__eyebrow">Get Set Up</p>
          <h1>Connect what you need, then start learning</h1>
        </div>
        <StatusBanner tone="success" title="All systems ready — you're good to go!">
          Your local assistant, practice folder, and preferences will be configured here.
        </StatusBanner>
        <div className="setup-preview__cards">
          <Card
            title="AI Assistant"
            description="The guide that answers questions and builds exercises"
          >
            <Pill tone="warning">Configure</Pill>
          </Card>
          <Card title="Practice Folder" description="Where your work and progress are saved">
            <Pill tone="warning">Configure</Pill>
          </Card>
          <Card title="Preferences" description="Language, safety choices, and exercise settings">
            <Pill tone="neutral">Not set</Pill>
          </Card>
        </div>
        <a href="/learn">
          <Button>Go to Learning Space</Button>
        </a>
      </section>
    </ProductShell>
  );
}
