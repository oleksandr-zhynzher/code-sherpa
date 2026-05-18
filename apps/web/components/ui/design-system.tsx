import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from 'react';

type Tone = 'danger' | 'neutral' | 'success' | 'warning';

function cx(...classes: ReadonlyArray<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function Logo(): ReactNode {
  return (
    <a aria-label="code-sherpa home" className="cs-logo" href="/">
      <svg aria-hidden="true" className="cs-logo__mark" viewBox="0 0 28 24">
        <path d="M0 24l8-20 5 8 6-10 9 22z" />
        <path className="cs-logo__flag" d="M19 2l0-2 4 1z" />
      </svg>
      <span>code sherpa</span>
    </a>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Readonly<{
    variant?: 'ghost' | 'primary' | 'secondary';
  }>;

export function Button({
  children,
  className,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps): ReactNode {
  return (
    <button className={cx('cs-button', `cs-button--${variant}`, className)} type={type} {...props}>
      {children}
    </button>
  );
}

type CardProps = PropsWithChildren<
  Readonly<{
    description?: string;
    title: string;
  }>
>;

export function Card({ children, description, title }: CardProps): ReactNode {
  return (
    <section className="cs-card">
      <div className="cs-card__header">
        <h2>{title}</h2>
        {description === undefined ? null : <p>{description}</p>}
      </div>
      {children}
    </section>
  );
}

type StatusBannerProps = PropsWithChildren<
  Readonly<{
    title: string;
    tone: Exclude<Tone, 'neutral'>;
  }>
>;

export function StatusBanner({ children, title, tone }: StatusBannerProps): ReactNode {
  return (
    <aside className={cx('cs-status-banner', `cs-status-banner--${tone}`)} role="status">
      <strong>{title}</strong>
      <p>{children}</p>
    </aside>
  );
}

type PillProps = PropsWithChildren<
  Readonly<{
    tone?: Tone;
  }>
>;

export function Pill({ children, tone = 'neutral' }: PillProps): ReactNode {
  return <span className={cx('cs-pill', `cs-pill--${tone}`)}>{children}</span>;
}

type ProgressBarProps = Readonly<{
  label: string;
  max: number;
  value: number;
}>;

export function ProgressBar({ label, max, value }: ProgressBarProps): ReactNode {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const progressStyle = {
    '--cs-progress': `${(safeValue / safeMax) * 100}%`,
  } as React.CSSProperties;

  return (
    <div
      aria-label={label}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className="cs-progress"
      role="progressbar"
    >
      <span className="cs-progress__fill" style={progressStyle} />
    </div>
  );
}

type TabItem = Readonly<{
  id: string;
  label: string;
}>;

type TabsProps = Readonly<{
  activeId: string;
  items: ReadonlyArray<TabItem>;
  onSelect?: (id: string) => void;
}>;

export function Tabs({ activeId, items, onSelect }: TabsProps): ReactNode {
  return (
    <div className="cs-tabs" role="tablist">
      {items.map((item) => {
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id}
            aria-selected={isActive}
            className={cx('cs-tab', isActive && 'cs-tab--active')}
            {...(onSelect === undefined ? {} : { onClick: () => onSelect(item.id) })}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> &
  Readonly<{
    id: string;
    label: string;
  }>;

export function TextField({ className, id, label, ...props }: TextFieldProps): ReactNode {
  return (
    <label className={cx('cs-field', className)} htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
    </label>
  );
}

type ToggleProps = Readonly<{
  id: string;
  label: string;
  onPressedChange?: (pressed: boolean) => void;
  pressed: boolean;
}>;

export function Toggle({ id, label, onPressedChange, pressed }: ToggleProps): ReactNode {
  return (
    <div className="cs-toggle-row">
      <span id={`${id}-label`}>{label}</span>
      <button
        aria-labelledby={`${id}-label`}
        aria-pressed={pressed}
        className="cs-toggle"
        onClick={() => onPressedChange?.(!pressed)}
        type="button"
      >
        <span />
      </button>
    </div>
  );
}
