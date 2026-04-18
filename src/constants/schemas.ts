// Define the exact JSON shape we are validating against and sending to the Sandbox.
export const PROMOTIONAL_BANNER_SCHEMA = {
  title: "Promotional Banner Component Schema",
  type: "object" as const,
  required: ["title", "ctaLink", "rules"],
  properties: {
    title: {
      type: "string" as const,
      description: "Main text on the banner",
      minLength: 1,
    },
    imageUrl: {
      type: "string" as const,
      description: "URL of the image asset",
    },
    ctaLink: {
      type: "string" as const,
      description: "Deep link on click (e.g., /staking)",
      minLength: 1,
    },
    rules: {
      type: "object" as const,
      required: ["priority", "manualClose"],
      properties: {
        priority: {
          type: "integer" as const,
          minimum: 0,
          maximum: 1000,
          default: 0,
          description: "Banner display priority (0 = hidden)",
        },
        manualClose: {
          type: "boolean" as const,
          default: true,
          description: "Show 'X' close button",
        },
        targeting: {
          type: "object" as const,
          description: "Distribution targeting conditions. Empty arrays mean 'all'.",
          properties: {
            platforms: {
              type: "array" as const,
              uniqueItems: true,
              items: { type: "string" as const, enum: ["Android", "iOS"] },
              default: [],
            },
            networks: {
              type: "array" as const,
              uniqueItems: true,
              items: {
                type: "string" as const,
                enum: ["Ethereum", "Tron", "Arbitrum", "Base", "Polygon"],
              },
              default: [],
            },
            versions: {
              type: "array" as const,
              uniqueItems: true,
              items: { type: "string" as const },
              default: [],
            },
          },
        },
      },
    },
  },
};

// Targeting options constants
export const PLATFORM_OPTIONS = ["Android", "iOS"] as const;
export const NETWORK_OPTIONS = ["Ethereum", "Tron", "Arbitrum", "Base", "Polygon"] as const;
export const VERSION_OPTIONS = ["2.18.1", "2.19.0", "2.20.1"] as const;

export type Platform = typeof PLATFORM_OPTIONS[number];
export type Network = typeof NETWORK_OPTIONS[number];

export const SCREEN_VIEW_OPTIONS = ['Wallet', 'Browser'] as const;
export type ScreenView = typeof SCREEN_VIEW_OPTIONS[number];

// Type for json-render Spec (layout descriptor)
export interface BannerSpec {
  root: string;
  elements: Record<string, {
    type: string;
    props?: Record<string, unknown>;
    children?: string[];
    on?: Record<string, { action: string; params?: Record<string, unknown> }
      | Array<{ action: string; params?: Record<string, unknown> }>>;
  }>;
  state?: Record<string, unknown>;
}

// Type for the banner payload
export interface BannerPayload {
  title: string;
  imageUrl: string;
  ctaLink: string;
  screenView?: ScreenView; // which native screen to display on (default: 'Wallet')
  layout?: BannerSpec; // optional json-render Spec — when present, Sandbox uses Renderer
  rules: {
    priority: number;
    manualClose: boolean;
    targeting: {
      platforms: Platform[];
      networks: Network[];
      versions: string[];
    };
  };
}

// TCA Trigger types
export type TriggerType = "immediate" | "scheduled" | "event";

export interface TcaTrigger {
  type: TriggerType;
  scheduledTime?: string; // ISO date string for scheduled triggers — go-live time
  endTime?: string;       // ISO date string — auto-offline time
  eventName?: string;     // Event name for event triggers
}

// Default high-fidelity starting values
export const DEFAULT_BANNER_PAYLOAD: BannerPayload = {
  title: "Take the onboarding quiz and earn a chance to win a prize",
  imageUrl: "",
  ctaLink: 'notifications://system/1',
  screenView: 'Wallet',
  rules: {
    priority: 100,
    manualClose: true,
    targeting: {
      platforms: [],
      networks: [],
      versions: [],
    },
  },
};

// Default json-render Spec for a promotional banner (horizontal layout)
export const DEFAULT_BANNER_LAYOUT: BannerSpec = {
  root: 'card',
  elements: {
    card: {
      type: 'BannerCard',
      props: {},
      children: ['row'],
    },
    row: {
      type: 'HStack',
      props: {},
      children: ['icon', 'body'],
    },
    icon: {
      type: 'BannerIcon',
      props: { src: '' },
    },
    body: {
      type: 'VStack',
      props: {},
      children: ['headline', 'cta'],
    },
    headline: {
      type: 'BannerText',
      props: {
        content: 'Take the onboarding quiz and earn a chance to win a prize',
        weight: 'bold',
      },
    },
    cta: {
      type: 'BannerButton',
      props: { label: 'Tap to learn more →' },
      on: { press: { action: 'openBanner' } },
    },
  },
};

export const DEFAULT_TCA_TRIGGER: TcaTrigger = {
  type: "immediate",
};
