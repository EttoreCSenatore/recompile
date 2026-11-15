import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'RECOMPILE',
  tagline: 'Every version stronger. Every version more alone.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://ettorecsenatore.github.io',
  baseUrl: '/recompile/',
  organizationName: 'EttoreCSenatore',
  projectName: 'recompile',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt-BR'],
    localeConfigs: {
      en: {label: 'English', htmlLang: 'en'},
      'pt-BR': {label: 'Português (BR)', htmlLang: 'pt-BR'},
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
    navbar: {
      title: 'RECOMPILE',
      logo: {
        alt: 'RECOMPILE logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/docs/roadmap', label: 'Roadmap', position: 'left'},
        {type: 'localeDropdown', position: 'right'},
        {
          href: 'https://github.com/EttoreCSenatore/recompile',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Design',
          items: [
            {label: 'Overview', to: '/docs/intro'},
            {label: 'Core loop', to: '/docs/design/core-loop'},
            {label: 'Versions', to: '/docs/design/versions'},
          ],
        },
        {
          title: 'World',
          items: [
            {label: 'Story', to: '/docs/world/story'},
            {label: 'Zones', to: '/docs/world/zones'},
          ],
        },
        {
          title: 'Tech',
          items: [
            {label: 'Architecture', to: '/docs/technical/architecture'},
            {label: 'Roadmap', to: '/docs/roadmap'},
          ],
        },
      ],
      copyright: `RECOMPILE © ${new Date().getFullYear()} Ettore Senatore. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['json', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
