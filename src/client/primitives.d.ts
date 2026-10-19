/**
 * Minimal ambient declarations for the harness's UI primitive module.
 *
 * The browser shell provides `@deepseek-ai/dsh-client-ui-primitives` through its
 * frozen platform table, so the plugin never installs it. Only the pieces this
 * panel uses are declared, which keeps the dependency surface at zero and makes
 * the compile-time contract explicit.
 * @module dsh-plugin-dayflow/client/primitives
 */
declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ButtonHTMLAttributes, ForwardRefExoticComponent, ReactElement, ReactNode, RefAttributes } from 'react';

  /** Visual family, each backed by the `--dsw-alias-button-*` token family. */
  export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'toolbar';

  /** The shared button control. */
  export const Button: ForwardRefExoticComponent<
    {
      variant?: ButtonVariant;
      size?: 'md' | 'sm';
      icon?: ReactNode;
      className?: string;
      children?: ReactNode;
    } & ButtonHTMLAttributes<HTMLButtonElement> &
      RefAttributes<HTMLButtonElement>
  >;

  /** Bubble placement relative to the anchor. */
  export type TooltipSide = 'right' | 'bottom' | 'top';

  /** Hover/focus tooltip anchored on a single element. */
  export function Tooltip(props: {
    label: string | (() => string);
    side?: TooltipSide;
    align?: 'start' | 'center' | 'end';
    portal?: boolean;
    delayMs?: number;
    focusDelayMs?: number;
    gap?: number;
    disabled?: boolean;
    maxWidth?: number;
    openOnClick?: boolean;
    children: ReactElement;
  }): ReactElement;

  /** State semantics the dot renders. */
  export type StateDotState = 'done' | 'warning' | 'ongoing' | 'error' | 'idle';

  /** A small state indicator; pair it with text for accessibility. */
  export function StateDot(props: {
    state: StateDotState;
    size?: number;
    className?: string;
    appearance?: 'dot' | 'step';
  }): ReactElement;
}
