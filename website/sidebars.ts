import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Game Design',
      collapsed: false,
      items: [
        'design/vision',
        'design/core-loop',
        'design/resources',
        'design/modules',
        'design/versions',
        'design/alignment',
        'design/enemies',
        'design/meta-progression',
        'design/controls-and-hud',
      ],
    },
    {
      type: 'category',
      label: 'World',
      items: ['world/story', 'world/zones', 'world/art-and-audio'],
    },
    {
      type: 'category',
      label: 'Technical',
      items: [
        'technical/architecture',
        'technical/procedural-generation',
        'technical/save-and-deploy',
      ],
    },
    'roadmap',
  ],
};

export default sidebars;
