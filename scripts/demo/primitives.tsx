/**
 * Stand-ins for the three `@deepseek-ai/dsh-client-ui-primitives` components the
 * panel uses, for the README recording only.
 *
 * The recording renders inside a plain page, not the harness shell, so the real
 * package — which pulls a code highlighter, a markdown pipeline, and an icon set
 * — is not installed here. These copies emit the same DOM with the same class
 * names, and `scripts/demo/assets/` holds the package's own stylesheets, so the
 * recorded pixels match what the harness draws.
 *
 * The stylesheets themselves are inlined by `scripts/demo/build.mjs`, so this
 * module stays a plain component file.
 * @module scripts/demo/primitives
 */

import type { CSSProperties, ReactNode } from 'react';
import { forwardRef, useRef } from 'react';

/** Join class names, dropping the empty ones. */
function clsx(...names: (string | undefined | false)[]): string {
  return names.filter((name): name is string => typeof name === 'string' && name !== '').join(' ');
}

/** Props accepted by the harness Button. */
interface ButtonProps {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'md' | 'sm';
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
}

/**
 * Render a button with the harness's classes.
 * @param props - visual family, size, optional leading icon, and native props.
 * @param ref - forwarded native button.
 * @returns the button element.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', size = 'md', icon, className, children, ...rest },
  ref,
) {
  return (
    <button ref={ref} type="button" className={clsx('button', variant, size, className)} {...rest}>
      {icon != null && <span className="icon">{icon}</span>}
      {children}
    </button>
  );
});

/** One segment of a segmented control. */
interface SegmentOption {
  value: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

/** Props accepted by the harness SegmentedControl. */
interface SegmentedControlProps<T extends string> {
  id: string;
  value: T;
  options: SegmentOption[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Render the harness's segmented control, including the sliding indicator that
 * is positioned purely from custom properties.
 * @param props - the controlled selection and its options.
 * @returns the tablist.
 */
export function SegmentedControl<T extends string>({
  id,
  value,
  options,
  onChange,
  label,
  disabled = false,
  className,
}: SegmentedControlProps<T>): ReactNode {
  const list = useRef<HTMLDivElement>(null);
  const selected = options.findIndex((option) => option.value === value);
  const indicator = {
    '--dsh-segment-count': String(options.length),
    '--dsh-segment-index': String(selected),
  } as CSSProperties;

  return (
    <div ref={list} role="tablist" aria-label={label} className={clsx('control', className)} style={indicator}>
      <span aria-hidden="true" className="indicator" />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            id={`${id}-${option.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${id}-${option.value}-panel`}
            tabIndex={active ? 0 : -1}
            disabled={disabled || option.disabled === true}
            title={option.title}
            className="tab"
            onClick={() => {
              if (!active) onChange(option.value as T);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Props accepted by the harness Tooltip. */
interface TooltipProps {
  label: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  children: ReactNode;
}

/**
 * Render a tooltip anchor. The recording never hovers the header button, so the
 * bubble is omitted; the anchor keeps its own accessible name.
 * @param props - the anchor and its label.
 * @returns the anchor.
 */
export function Tooltip({ label, children }: TooltipProps): ReactNode {
  return (
    <span className="tooltip-anchor" data-tooltip-label={label}>
      {children}
    </span>
  );
}
