import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Oasis",
  tagline: "AI-powered parametric wage protection for India's Q-commerce delivery partners",
  favicon: "img/logo.png",

  url: "https://oasis-docs.vercel.app",
  baseUrl: "/",

  organizationName: "oasis",
  projectName: "oasis-docs",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  themes: ["@docusaurus/theme-mermaid"],
  markdown: {
    mermaid: true,
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Oasis Docs",
      logo: {
        alt: "Oasis Logo",
        src: "img/logo.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "mainSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/lohitkolluri/oasis",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Introduction", to: "/" },
            { label: "Architecture", to: "/architecture" },
            { label: "Development Setup", to: "/development-setup" },
          ],
        },
        {
          title: "Features",
          items: [
            { label: "Parametric Triggers", to: "/features/parametric-triggers" },
            { label: "Fraud Detection", to: "/features/fraud-detection" },
            { label: "Claims Processing", to: "/features/claims-processing" },
          ],
        },
        {
          title: "Reference",
          items: [
            { label: "API Reference", to: "/api" },
            { label: "Database Schema", to: "/database" },
            { label: "Deployment", to: "/deployment" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Oasis`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "sql", "typescript", "json"],
    },
    mermaid: {
      theme: { light: "neutral", dark: "forest" },
      options: { maxTextSize: 50000 },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
