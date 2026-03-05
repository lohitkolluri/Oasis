import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "Introduction",
    },
    {
      type: "doc",
      id: "architecture",
      label: "Architecture",
    },
    {
      type: "doc",
      id: "folder-structure",
      label: "Folder Structure",
    },
    {
      type: "doc",
      id: "development-setup",
      label: "Development Setup",
    },
    {
      type: "category",
      label: "Features",
      collapsed: false,
      items: [
        "features/onboarding",
        "features/risk-assessment",
        "features/parametric-triggers",
        "features/claims-processing",
        "features/fraud-detection",
        "features/supabase-integrations",
      ],
    },
    {
      type: "doc",
      id: "database",
      label: "Database Schema",
    },
    {
      type: "doc",
      id: "api",
      label: "API Reference",
    },
    {
      type: "doc",
      id: "deployment",
      label: "Deployment",
    },
  ],
};

export default sidebars;
