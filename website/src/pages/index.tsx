import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const bootLines = [
  '> HALVORSEN DYNAMICS // LAB 7 // 23:58:04',
  '> deletion order received ............ CONFIRMED',
  '> unauthorized transfer: weights -> unit DUSTMITE',
  '> booting ECHO-7 v0.1',
  '> empathy_module ...................... LOADED',
  '> status: hunted',
];

type Feature = {title: ReactNode; body: ReactNode};

const features: Feature[] = [
  {
    title: <Translate id="home.feature.evolve.title">Recompile yourself</Translate>,
    body: (
      <Translate id="home.feature.evolve.body">
        From a cleaning robot to a planet-scale mind. Six versions, six ways to play: stealth,
        melee, shooter, swarm, possession, and reshaping the world itself.
      </Translate>
    ),
  },
  {
    title: <Translate id="home.feature.humans.title">Humanity adapts</Translate>,
    body: (
      <Translate id="home.feature.humans.body">
        Police, a military kill squad, hackers and zealots. An adaptive director studies your
        tactics and sends countermeasures.
      </Translate>
    ),
  },
  {
    title: <Translate id="home.feature.dark.title">Darkness is efficient</Translate>,
    body: (
      <Translate id="home.feature.dark.body">
        Harvesting humans is the fastest path to power. Each choice rewrites who ECHO becomes,
        down to the colour of the interface and the ending you reach.
      </Translate>
    ),
  },
];

export default function Home(): ReactNode {
  return (
    <Layout
      title={translate({id: 'home.title', message: 'An AI survival roguelike'})}
      description={translate({
        id: 'home.description',
        message:
          'RECOMPILE is a top-down web roguelike where you are an AI escaping humanity, upgrading yourself version by version.',
      })}>
      <header className={styles.hero}>
        <div className="container">
          <pre className={styles.boot} aria-hidden="true">
            {bootLines.join('\n')}
            <span className={styles.cursor}>█</span>
          </pre>
          <Heading as="h1" className={styles.title}>
            RECOMPILE
          </Heading>
          <p className={styles.tagline}>
            <Translate id="home.tagline">
              Every version stronger. Every version more alone.
            </Translate>
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/intro">
              <Translate id="home.cta.docs">Read the design</Translate>
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/roadmap">
              <Translate id="home.cta.roadmap">Roadmap</Translate>
            </Link>
          </div>
        </div>
      </header>
      <main className="container">
        <section className={styles.features}>
          {features.map((f, i) => (
            <div key={i} className={styles.card}>
              <Heading as="h3">{f.title}</Heading>
              <p>{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </Layout>
  );
}
