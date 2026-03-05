// @ts-check
import { defineConfig } from 'astro/config';
import mermaid from 'astro-mermaid';
import starlight from '@astrojs/starlight';
import starlightThemeNext from 'starlight-theme-next';
import starlightImageZoom from 'starlight-image-zoom';
import starlightUtils from '@lorenzo_lewis/starlight-utils';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

// https://astro.build/config
export default defineConfig({
  site: 'https://oasis-docs.vercel.app',
  integrations: [
    mermaid({
      theme: 'default',
      autoTheme: true,
      mermaidConfig: {
        flowchart: { curve: 'linear' },
        sequence: { diagramMarginX: 20 },
      },
    }),
    starlight({
      title: 'Oasis Docs',
      description: "AI-powered parametric wage protection for India's Q-commerce delivery partners",
      logo: {
        src: './src/assets/logo.png',
        alt: 'Oasis Logo',
      },
      favicon: '/favicon.svg',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/lohitkolluri/oasis',
        },
      ],
      plugins: [
        starlightThemeNext(),
        starlightImageZoom(),
        starlightUtils(),
        starlightLlmsTxt({
          projectName: 'Oasis',
          description: "AI-powered parametric wage protection for India's Q-commerce delivery partners. Covers loss of income only from weather, zone lockdowns, and traffic gridlock.",
        }),
        starlightOpenAPI([
          {
            base: 'api/openapi',
            schema: './openapi.yaml',
            sidebar: { label: 'OpenAPI Reference' },
          },
        ]),
      ],
      sidebar: [
        { label: 'Introduction', link: '/' },
        { label: 'Architecture', link: '/architecture' },
        { label: 'Folder Structure', link: '/folder-structure' },
        { label: 'Development Setup', link: '/development-setup' },
        {
          label: 'Features',
          items: [
            { label: 'Onboarding', link: '/features/onboarding' },
            { label: 'Risk Assessment', link: '/features/risk-assessment' },
            { label: 'Parametric Triggers', link: '/features/parametric-triggers' },
            { label: 'Claims Processing', link: '/features/claims-processing' },
            { label: 'Fraud Detection', link: '/features/fraud-detection' },
            { label: 'Supabase Integrations', link: '/features/supabase-integrations' },
          ],
        },
        { label: 'Database Schema', link: '/database' },
        { label: 'API Reference', link: '/api' },
        ...openAPISidebarGroups,
        { label: 'Deployment', link: '/deployment' },
      ],
      customCss: [
        './src/styles/custom.css',
      ],
      components: {
        // Use Starlight defaults
      },
    }),
  ],
});
