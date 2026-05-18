import { expect, test } from '@playwright/test';

test.describe('Home Page', () => {
  test('renders hero, sections, and navigation', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigation
    await expect(page.locator('nav').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start Learning' }).first()).toBeVisible();

    // Hero
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Your guide to mastering problem-solving',
    );
    await expect(page.getByRole('link', { name: 'Start Your Journey' })).toBeVisible();

    // Sections
    await expect(
      page.getByRole('heading', { name: 'Built for learners who want to grow' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Four steps to the summit' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A guide, not a judge' })).toBeVisible();

    // Learner cards
    await expect(page.getByRole('heading', { name: 'Career builders' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Self-taught developers' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Skill sharpeners' })).toBeVisible();

    // Steps
    await expect(page.getByText('01')).toBeVisible();
    await expect(page.getByText('04')).toBeVisible();

    // Footer
    await expect(page.locator('footer')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/home.png', fullPage: true });
    expect(errors).toHaveLength(0);
  });

  test('navigates to /learn from CTA', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Start Learning' }).first().click();
    await expect(page).toHaveURL('/learn');
  });

  test('navigates to /setup from footer', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Footer navigation' })
      .getByRole('link', { name: 'About' })
      .click();
    await expect(page).toHaveURL('/setup');
  });
});

test.describe('Setup Page', () => {
  test('renders setup overview with AI and folder cards', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      // Only collect non-CORS, non-API-unavailable errors
      if (
        msg.type() === 'error' &&
        !msg.text().includes('CORS') &&
        !msg.text().includes('Failed to load resource') &&
        !msg.text().includes('Failed to fetch')
      ) {
        errors.push(msg.text());
      }
    });

    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // Header
    await expect(page.getByRole('heading', { name: /Connect what you need/i })).toBeVisible();

    // Card headings (rendered as h2 inside Card component) — exact match to avoid matching config section headings
    await expect(page.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Practice Folder', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Preferences', exact: true })).toBeVisible();

    // Configure/reconnect links are present
    await expect(page.locator('a[href="/setup#assistant"]')).toBeVisible();
    await expect(page.locator('a[href="/setup#practice-folder"]')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/setup-overview.png', fullPage: true });
    expect(errors).toHaveLength(0);
  });

  test('renders AI assistant config panel via anchor link', async ({ page }) => {
    // The page renders both overview and config sections; #assistant scrolls to it
    await page.goto('/setup#assistant');
    await page.waitForLoadState('networkidle');

    // SetupConfiguration section with id="assistant" should be in view
    const panel = page.locator('#assistant');
    await expect(panel).toBeVisible();

    // Agent runtime toggle and path fields
    await expect(page.locator('#agent-runtime')).toBeAttached();

    await page.screenshot({ path: 'e2e/screenshots/setup-ai-config.png', fullPage: true });
  });

  test('renders Practice Folder config panel via anchor link', async ({ page }) => {
    await page.goto('/setup#practice-folder');
    await page.waitForLoadState('networkidle');

    const panel = page.locator('#practice-folder');
    await expect(panel).toBeVisible();
    await expect(page.locator('#workspace-path')).toBeAttached();

    await page.screenshot({ path: 'e2e/screenshots/setup-folder-config.png', fullPage: true });
  });

  test('renders preferences panel via anchor link', async ({ page }) => {
    await page.goto('/setup#preferences');
    await page.waitForLoadState('networkidle');

    const panel = page.locator('#preferences');
    await expect(panel).toBeVisible();
    await expect(page.locator('#exercise-language')).toBeAttached();
    await expect(page.locator('#guide-tone')).toBeAttached();

    await page.screenshot({ path: 'e2e/screenshots/setup-preferences.png', fullPage: true });
  });
});

test.describe('Learning Space', () => {
  test('renders main learning workspace', async ({ page }) => {
    const hardErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('CORS') &&
        !msg.text().includes('Failed to load resource') &&
        !msg.text().includes('Failed to fetch') &&
        !msg.text().includes('127.0.0.1:8000')
      ) {
        hardErrors.push(msg.text());
      }
    });

    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Continue where you left off')).toBeVisible();
    await expect(page.getByText('Two Sum')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/learn-workspace.png', fullPage: true });
    expect(hardErrors).toHaveLength(0);
  });

  test('renders theory view', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const theorySection = page.locator('#theory');
    await expect(theorySection).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/learn-theory.png', fullPage: true });
  });

  test('renders quiz view with question and choices', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const quizSection = page.locator('#quiz');
    await expect(quizSection).toBeVisible();

    // Actual question from quiz-view.tsx
    await expect(
      page.getByText('What is the average time complexity of a hash map lookup operation?'),
    ).toBeVisible();
    await expect(page.getByText('O(1) — Constant time')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/learn-quiz.png', fullPage: true });
  });

  test('renders quiz results view', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const quizResultsSection = page.locator('#quiz-results');
    await expect(quizResultsSection).toBeVisible();

    // h1 in main content area
    await expect(
      page.getByRole('heading', { name: 'Quiz Complete', exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText('You scored 7 out of 10')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/learn-quiz-results.png', fullPage: true });
  });

  test('POC controls are accessible via details disclosure', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForLoadState('networkidle');

    const pocDetails = page.locator('details.poc-fallback');
    await expect(pocDetails).toBeAttached();
    await pocDetails.locator('summary').click();
    await expect(pocDetails).toHaveAttribute('open');

    await page.screenshot({ path: 'e2e/screenshots/learn-poc-open.png', fullPage: true });
  });
});

test.describe('Design system', () => {
  test('design tokens applied (accent color visible on home CTA)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cta = page.getByRole('link', { name: 'Start Learning' }).first();
    const bgColor = await cta.evaluate((el) =>
      window.getComputedStyle(el).getPropertyValue('background-color'),
    );
    // Should have a non-transparent background (accent color applied)
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('transparent');
  });
});
