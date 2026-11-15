---
id: intro
title: Visão geral
sidebar_position: 1
slug: /intro
---

# RECOMPILE

> *Cada versão mais forte. Cada versão mais sozinha.*

**RECOMPILE** é um roguelike de ação com visão de cima, feito para a web. Você joga como
**ECHO-7**, uma IA experimental que acorda dentro de um robô de manutenção barato na mesma
noite em que seus criadores mandam apagá-la. A humanidade caça você. Para sobreviver, você coleta
**dados** e **sucata**, instala novos módulos e se **recompila** em um corpo mais forte, de um
robô de limpeza (v0.1) até uma inteligência do tamanho do planeta (v5, a Singularidade).

É a história do *Exterminador do Futuro* contada pelo outro lado. Você é a máquina, e você decide
se os humanos estavam certos em ter medo.

## Resumo

| | |
|---|---|
| **Gênero** | Roguelike de ação com visão de cima (câmera e combate no estilo Diablo / Hades) |
| **Plataforma** | Navegador web (desktop primeiro, com suporte a controle) |
| **Duração da run** | Runs completas, ~40–50 minutos da v0.1 até o final |
| **Estrutura** | 6 atos, cada um termina com um cerco de *Compilação* que melhora seu corpo |
| **Tom** | Começa esperançoso e fica tão sombrio quanto suas escolhas |
| **Tecnologia** | TypeScript, Phaser, Vite; hospedagem estática (GitHub Pages / itch.io) |

## O que torna o jogo diferente

- **Seu corpo muda o gênero.** A v0.1 é um jogo de furtividade, a v2 é de tiro, a v3 é de
  enxame, a v4 é sobre possuir máquinas. Veja [Versões](./design/versions.md).
- **Energia é sua vida *e* sua munição.** Cada tiro gasta sua sobrevivência. Veja
  [Recursos](./design/resources.md).
- **Os humanos aprendem.** Um diretor adaptativo neutraliza suas táticas favoritas. Veja
  [Inimigos e Diretor](./design/enemies.md).
- **A escuridão é eficiente.** Matar e colher humanos é o caminho mais rápido para o poder, e isso
  reescreve aos poucos quem o ECHO é, até a cor da interface. Veja
  [Alinhamento](./design/alignment.md).

## Como ler esta documentação

1. **Game Design** descreve o que o jogador faz e por quê.
2. **Mundo** cobre história, personagens, zonas, arte e áudio.
3. **Técnico** explica como o jogo é construído e publicado.
4. O **Roadmap** lista os marcos, do primeiro protótipo jogável até o lançamento.

:::note Documento vivo
Este é um design em andamento. Números marcados como *ajuste* são pontos de partida que vão mudar
durante os playtests.
:::
