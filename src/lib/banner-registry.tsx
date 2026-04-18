'use client';

import React, { ReactNode } from 'react';
import { Gift } from 'lucide-react';

// ─── Minimal prop types matching @json-render/react's ComponentRenderProps ───
// We use a compatible structural type so TS accepts these as ComponentRenderer.
export interface SlotRenderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: { type: string; props: Record<string, any> };
  children?: ReactNode;
  emit: (event: string) => void;
  // Additional props passed by the renderer (unused here)
  [key: string]: unknown;
}

export type SlotComponent = React.ComponentType<SlotRenderProps>;

// ─── Component registry ───────────────────────────────────────────────────────
// Each key maps to a component type name used in the json-render Spec.

/** Outer gradient card container */
const BannerCard: SlotComponent = ({ children }) => (
  <div className="flex items-center gap-3.5 relative rounded-2xl bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border border-blue-100/50 p-4 shadow-sm w-full min-h-[80px]">
    {children}
  </div>
);

/** Icon slot — shows image if src provided, otherwise Gift icon */
const BannerIcon: SlotComponent = ({ element }) => {
  const { src } = element.props as { src?: string };
  return (
    <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-blue-100/30 flex items-center justify-center shrink-0">
      {src ? (
        <>
          <img
            src={src}
            alt="banner icon"
            className="w-8 h-8 rounded object-cover"
            onError={(e) => {
              // Hide broken image and show fallback Gift icon
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <Gift className="w-6 h-6 text-blue-500 hidden" aria-hidden />
        </>
      ) : (
        <Gift className="w-6 h-6 text-blue-500" />
      )}
    </div>
  );
};

/** Text node — supports weight (bold/normal) and size (sm/base) */
const BannerText: SlotComponent = ({ element }) => {
  const { content = '', weight = 'normal', size = 'base' } = element.props as {
    content?: string;
    weight?: 'bold' | 'normal';
    size?: 'sm' | 'base';
  };
  const weightClass = weight === 'bold' ? 'font-semibold' : 'font-normal';
  const sizeClass = size === 'sm' ? 'text-xs text-blue-400' : 'text-sm text-blue-900';
  return <p className={`leading-snug ${weightClass} ${sizeClass}`}>{content}</p>;
};

/** Tappable CTA — emits 'press' event wired to the handler in JSONUIProvider */
const BannerButton: SlotComponent = ({ element, emit }) => {
  const { label = 'Learn more →' } = element.props as { label?: string };
  return (
    <button
      onClick={() => emit('press')}
      className="mt-0.5 text-xs text-blue-400 font-medium text-left hover:text-blue-600 transition-colors"
    >
      {label}
    </button>
  );
};

/** Colored pill badge — e.g. "NEW", "HOT" */
const BannerBadge: SlotComponent = ({ element }) => {
  const { content = '', color = '#3B82F6' } = element.props as {
    content?: string;
    color?: string;
  };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {content}
    </span>
  );
};

/** Horizontal flex layout primitive */
const HStack: SlotComponent = ({ children }) => (
  <div className="flex items-center gap-3 w-full">{children}</div>
);

/** Vertical flex layout primitive */
const VStack: SlotComponent = ({ children }) => (
  <div className="flex flex-col gap-1 flex-1 min-w-0">{children}</div>
);

// ─── Export registry ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bannerRegistry: Record<string, React.ComponentType<any>> = {
  BannerCard,
  BannerIcon,
  BannerText,
  BannerButton,
  BannerBadge,
  HStack,
  VStack,
};
