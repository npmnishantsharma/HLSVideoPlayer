import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "md-icon": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        slot?: string;
      };

      "md-icon-button": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "aria-label"?: string;
        disabled?: boolean;
        toggle?: boolean;
        selected?: boolean;
      };

      "md-linear-progress": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        value?: number;
        indeterminate?: boolean;
      };

      "md-circular-progress": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        value?: number;
        indeterminate?: boolean;
      };

      "md-filled-tonal-button": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        disabled?: boolean;
      };

      "md-slider": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        min?: number;
        max?: number;
        step?: number;
        value?: number;
        disabled?: boolean;
      };

      "md-menu": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        anchor?: string;
        positioning?: string;
        quick?: boolean;
        "x-offset"?: number;
        "y-offset"?: number;
      };

      "md-menu-item": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        headline?: string;
        supportingText?: string;
        "keep-open"?: boolean;
        disabled?: boolean;
      };
    }
  }
}

export {};
