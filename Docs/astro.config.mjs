// @ts-check
import starlight from '@astrojs/starlight';
import starlightUtils from '@lorenzo_lewis/starlight-utils';
import d2 from 'astro-d2';
import mermaid from 'astro-mermaid';
import { defineConfig } from 'astro/config';
import starlightImageZoom from 'starlight-image-zoom';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';
import { starlightIconsPlugin } from 'starlight-plugin-icons';
import starlightThemeNext from 'starlight-theme-next';

const enableD2 = process.env.VERCEL !== '1';

// https://astro.build/config
export default defineConfig({
  site: 'https://oasis-docs.vercel.app',
  integrations: [
    enableD2 && d2({}),
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
          icon: 'external',
          label: 'Website',
          href: 'https://oasis-murex-omega.vercel.app',
        },
      ],
      plugins: [
        starlightIconsPlugin(),
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
        {
          label: 'Overview',
          items: [
            { label: 'Introduction', link: '/' },
            { label: 'Architecture', link: '/architecture' },
          ],
        },
        {
          label: 'Getting Started',
          items: [
            { label: 'Development Setup', link: '/development-setup' },
            { label: 'Folder Structure', link: '/folder-structure' },
          ],
        },
        {
          label: 'Features',
          items: [
            {
              label: 'User Journey',
              items: [
                { label: 'Onboarding', link: '/features/onboarding' },
                { label: 'Risk Assessment', link: '/features/risk-assessment' },
              ],
            },
            {
              label: 'Automation',
              items: [
                { label: 'Parametric Triggers', link: '/features/parametric-triggers' },
                { label: 'Claims Processing', link: '/features/claims-processing' },
              ],
            },
            {
              label: 'Security & Ops',
              items: [
                { label: 'Fraud Detection', link: '/features/fraud-detection' },
                { label: 'Supabase Integrations', link: '/features/supabase-integrations' },
              ],
            },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Database Schema', link: '/database' },
            { label: 'API Reference', link: '/api-overview' },
            ...openAPISidebarGroups,
            { label: 'Deployment', link: '/deployment' },
          ],
        },
      ],
      customCss: [
        './src/styles/custom.css',
      ],
      components: {
        // Use Starlight defaults
      },
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: true,
          },
        },
      ],
    }),
  ].filter(Boolean),
});
