---
id: resources
title: Recursos
---

# Recursos

RECOMPILE tem três recursos de run. Eles foram pensados para puxar o jogador em direções
diferentes.

| Recurso | Ícone | Obtido com | Gasto em |
|---|---|---|---|
| **Dados** (DAT) | `◇` | Hackear, escanear, caches de dados, colheita | Compilação, corrigir Bugs, rerrolar módulos |
| **Sucata** (SCR) | `▣` | Máquinas destruídas, caixas, equipamento inimigo | Instalar/melhorar módulos, Compilação, reparos |
| **Energia** (PWR) | `ϟ` | Carregadores, células de energia, drenar geradores | Ela *é* sua vida e o combustível das habilidades |

## Dados

- **Hackear** um terminal ou câmera leva de 1 a 3 s de canalização (*ajuste*) e faz um ruído baixo.
- **Escanear** um inimigo (segurando a tecla do sensor com ele no seu campo de visão) dá poucos
  Dados e revela suas fraquezas.
- **Colher** um humano caído dá **3× os Dados** de qualquer outra fonte, mata a pessoa e custa
  [Alinhamento](./alignment.md). Esta é a tentação central do jogo.

## Sucata

- Dropada por máquinas, veículos e alguns equipamentos inimigos.
- Inimigos pesados dropam mais, mas demoram mais para morrer (custo de Energia).
- A Sucata é **perdida na morte**. Os Dados são parcialmente convertidos em Pesos.

## Energia

A Energia é o recurso que define o jogo:

- **Dano drena Energia.** Em 0, o ECHO desliga (morte).
- **Habilidades custam Energia.** O ataque básico é grátis ou muito barato; tudo que é forte custa.
- A **Energia máxima** vem do chassi e dos módulos de bateria, e cresce a cada versão.
- **Recarga:**
  - *Tomadas*: lenta, silenciosa, segura se ninguém te vir.
  - *Células de energia*: instantânea, dropada por inimigos e encontrada em caixas.
  - *Geradores*: drenam rápido, mas disparam um alarme.
  - *Regeneração passiva*: muito lenta, e só fora de combate.

:::tip Intenção de design
Como vida e munição dividem a mesma barra, um jogador com pouca Energia precisa escolher entre
lutar fraco ou recuar para recarregar. Agressividade é sempre uma aposta.
:::

## Valores iniciais (ajuste)

| Versão | Energia máx. | Regen. passiva | Custo típico de habilidade |
|---|---|---|---|
| v0.1 | 30 | 0,5/s | 8 |
| v1 | 80 | 0,8/s | 12 |
| v2 | 150 | 1/s | 20 |
| v3 | 120 por núcleo + drones | 1/s | 15 |
| v4 | Depende do hospedeiro | n/a | 25 |
| v5 | 500 | 2/s | 60 |
