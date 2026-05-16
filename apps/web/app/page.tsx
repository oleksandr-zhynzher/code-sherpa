import { Logo } from '../components/ui/design-system';

const learnerCards = [
  {
    description:
      'Preparing for technical interviews with structured practice and real problem patterns.',
    icon: '↗',
    title: 'Career builders',
  },
  {
    description:
      'Building solid foundations with guided exercises that fill the gaps in self-directed learning.',
    icon: '◇',
    title: 'Self-taught developers',
  },
  {
    description:
      'Staying current and expanding expertise with fresh challenges across new problem domains.',
    icon: '◆',
    title: 'Skill sharpeners',
  },
];

const summitSteps = [
  {
    description:
      'Choose what to learn — algorithms, data structures, system design, or a custom route.',
    number: '01',
    title: 'Pick your path',
  },
  {
    description: 'Practice with real problems that build understanding, not just pattern matching.',
    number: '02',
    title: 'Tackle exercises',
  },
  {
    description:
      'Ask your Sherpa when stuck — hints, not answers. Build the skill of working through difficulty.',
    number: '03',
    title: 'Get guidance',
  },
  {
    description:
      "See how far you've climbed. Review your route, revisit past camps, celebrate milestones.",
    number: '04',
    title: 'Track progress',
  },
];

export default function HomePage() {
  return (
    <main className="home-page">
      <nav aria-label="Home navigation" className="home-nav">
        <Logo />
        <a className="cs-button cs-button--primary" href="/learn">
          Start Learning
        </a>
      </nav>

      <section className="home-hero">
        <img alt="" className="home-hero__image" src="/images/generated-1778944760160.png" />
        <div className="home-hero__overlay" />
        <div className="home-hero__content">
          <p className="home-eyebrow">Your learning journey</p>
          <h1>Your guide to mastering problem-solving</h1>
          <p>
            Clear path. Steady practice. Help when you&apos;re stuck. A record of how far
            you&apos;ve come.
          </p>
          <a className="cs-button cs-button--primary home-hero__cta" href="/learn">
            Start Your Journey
          </a>
        </div>
      </section>

      <div className="home-hairline" />

      <section className="home-section">
        <div className="home-section__header">
          <p className="home-eyebrow">Who it&apos;s for</p>
          <h2>Built for learners who want to grow</h2>
        </div>
        <div className="home-card-row">
          {learnerCards.map((card) => (
            <article className="home-learner-card" key={card.title}>
              <span aria-hidden="true">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-section--trail">
        <div className="home-section__header home-section__header--wide">
          <p className="home-eyebrow">How it works</p>
          <h2>Four steps to the summit</h2>
        </div>
        <div className="home-step-row">
          {summitSteps.map((step) => (
            <article className="home-step" key={step.number}>
              <strong>{step.number}</strong>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-sherpa">
        <div className="home-section__header home-section__header--wide">
          <p className="home-eyebrow">The Sherpa difference</p>
          <h2>A guide, not a judge</h2>
        </div>
        <div className="home-sherpa__grid">
          <div className="home-sherpa__copy">
            <p>
              Learning to solve problems is a climb — and every climber needs a guide who knows the
              mountain. Code-sherpa walks beside you, offering hints when you&apos;re stuck, not
              handing you the summit.
            </p>
            <p>
              Unlike platforms that test and score, we focus on guided practice — building real
              understanding through exploration, not memorization. You learn to think, not just to
              pass.
            </p>
            <p>
              Every step is recorded. Every struggle becomes a lesson. And when you look back at how
              far you&apos;ve come, you&apos;ll see the path was worth it.
            </p>
          </div>
          <img alt="" className="home-sherpa__image" src="/images/generated-1778948563108.png" />
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <strong>code-sherpa</strong>
          <p>Clear path. Steady climb.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="/setup">About</a>
          <a href="/setup">Pricing</a>
          <a href="/setup">Blog</a>
          <a href="/setup">Contact</a>
        </nav>
      </footer>
    </main>
  );
}
