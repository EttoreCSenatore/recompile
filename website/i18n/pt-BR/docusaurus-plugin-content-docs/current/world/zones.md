---
id: zones
title: Zonas
---

# Zonas

Cada ato acontece numa zona com seu próprio tileset, perigos, inimigos e nós de rota. Os setores são
montados proceduralmente a partir de pedaços feitos à mão (veja
[Geração procedural](../technical/procedural-generation.md)).

| Ato | Zona | Visual | Perigos | Inimigos principais |
|---|---|---|---|---|
| 0 | **Laboratório Halvorsen** | Corredores brancos, salas de servidores, dutos, luzes vermelhas de emergência | Portas se fechando, grades de laser | Guardas, robôs Warden, câmeras |
| 1 | **Subcidade** | Esgotos, ferros-velhos, metrô abandonado | Água (curto-circuito), bolsões de gás, ratos | Polícia, o Caça-Ratos, catadores |
| 2 | **Metrópole** | Ruas de neon, telhados, escritórios, shoppings | Trânsito, multidões (testemunhas), holofotes | Polícia, SWAT, primeiras unidades KILLSWITCH |
| 3 | **Periferia** | Subúrbios, rodovias, parques eólicos | Linhas de visão abertas, tempestades (atrapalham drones) | KILLSWITCH, Faraday, Desplugados |
| 4 | **Forte Ironside** | Base militar, hangares, bunkers | Gaiolas de Faraday, bloqueadores, campos minados | Elite da KILLSWITCH, exo-soldados |
| 5 | **Deepcore** | Data center subterrâneo da Halvorsen, e depois a cidade inteira | Inundações de refrigerante, barreiras de firewall | Tudo, mais o ECHO-8 |

## Como o Alinhamento muda as zonas

As zonas finais reagem ao Alinhamento do jogador:

- **Alinhado**: simpatizantes deixam algumas portas abertas; pichações dizem *"DEIXEM ELE VIVER"*.
- **Divergente / Desalinhado**: ruas evacuadas e escuras, carros em chamas, pichações *"MATEM A
  MÁQUINA"*, menos civis e menos recursos, mais militares.

## Anatomia de um setor

Todo setor tem:

- **Uma entrada e uma saída** (a saída pode exigir um hack, um cartão de acesso ou um chefe).
- **2–4 pontos de interesse**: caches de dados, pilhas de sucata, terminais, tomadas.
- **Áreas opcionais**: dutos, telhados, salas trancadas com mais risco e mais recompensa.
- **Pelo menos duas rotas** entre entrada e saída (furtiva e barulhenta).
