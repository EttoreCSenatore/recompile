---
id: learning
title: Aprendizado, Níveis e Sub-rotinas
---

# Aprendizado, Níveis e Sub-rotinas

O ECHO é uma IA: ele **aprende com tudo o que faz**. Dentro de uma run ele ganha XP rápido, sobe
de nível com frequência, e cada nível instala uma nova **sub-rotina**: uma carta escolhida entre
três. Esta é a camada rápida de progressão, ao lado das duas mais lentas:

| Camada | Ritmo | O que muda |
|---|---|---|
| **Sub-rotinas** (esta página) | A cada um ou dois minutos | O próprio código do ECHO: atributos e truques novos |
| [Módulos](./modules.md) | Alguns por setor | Hardware que você encontra e instala |
| [O Compile](./versions.md) | Uma vez por ato | Um corpo inteiro novo |

## XP

| Ação | XP |
|---|---|
| Hackear um terminal de DATA | 8 |
| Hackear SECURITY / UPLINK | 10 |
| Desativar uma câmera | 5 |
| Coletar sucata | 4 |
| Abrir um cofre | 6 |
| Atordoar alguém | 5 |
| Derrubar guarda / oficial / drone | 12 / 16 / 5 |
| Escapar (um guarda em alerta perde você) | 4 |
| Concluir um Compile | 30 |

O próximo nível pede `14 + 9 × (nível − 1)` de XP, então os primeiros níveis chegam em menos de
um minuto. Cada nível restaura **25% da Energia máxima**. Vários níveis seguidos acumulam várias escolhas.

## Subir de nível: escolha uma de três

O jogo pausa e oferece **três cartas diferentes**. Escolha com `1` `2` `3`, setas + `Enter` ou um
clique. As cartas acumulam **ranks** até um máximo, e algumas só aparecem para o corpo certo
(cartas de garra pedem o SCRAPPER, cartas de choque pedem o choque estático).

| Carta | Por rank |
|---|---|
| Overclocked Servos | +12% de velocidade |
| Capacitor Bank | +15% de Energia máxima |
| Trickle Charger | +50% de regeneração de Energia |
| Quick Cycle | −10% nas recargas de ataque e habilidade |
| Ghost Protocol | −20% de ruído |
| Data Siphon | +25% de DATA nos hacks |
| Fast Hands | +30% de velocidade para hackear e coletar |
| Lingering Charge | +25% de duração do atordoamento |
| Pattern Learner | +25% de XP |
| Phase Dash | o dash recarrega 20% mais rápido e vai 0,4 casa mais longe |
| Arc Dash | atravessar inimigos com o dash os atordoa; drones queimam |
| Hardened Plating | −15% de dano recebido |
| Chain Shock | o choque estático salta para mais um inimigo |
| Static Field | +0,5 casa de alcance do choque estático |
| Efficient Routines | −20% no custo de Energia das habilidades |
| Power Leech | +4 de Energia por abate, +1,5 por atordoamento |
| Discharge Nova | abates atordoam todos por perto |
| Serrated Claws | +1 de dano de garra e salto (SCRAPPER) |
| Wide Sweep | +25% de arco da garra e +0,2 de alcance (SCRAPPER) |

As sub-rotinas duram a run inteira e sobrevivem ao Compile (são o código do ECHO, não o corpo).

## Drones caçadores

Aprender exige algo com que aprender. A partir do **nível de ameaça 2**, drones caçadores
decolam fora de vista e seguem o sinal do ECHO: frágeis, rápidos e irritantes. Até
`ameaça − 1` voam ao mesmo tempo, e eles decolam mais rápido conforme a ameaça sobe. Um
**choque estático destrói um drone** na hora, então até o DUSTMITE consegue revidar; garras,
salto e Arc Dash também funcionam. Drones não bloqueiam a regeneração de Energia nem a queda da
ameaça, perdem o ECHO dentro dos dutos, e nenhum decola durante o cerco do Compile.
