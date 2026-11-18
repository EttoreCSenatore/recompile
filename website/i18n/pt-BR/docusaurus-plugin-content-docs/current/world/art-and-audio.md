---
id: art-and-audio
title: Arte e Áudio
---

# Arte e Áudio

## Direção visual

- **Pixel art**, tiles de 32×32, personagens com cerca de 24–32 px de altura na v0.1, crescendo a
  cada versão (o REVENANT v2 é visivelmente mais alto que os humanos).
- **Resolução interna de 480×270**, ampliada com escala inteira para pixels nítidos.
- **Perspectiva de cima em 3/4**, como RPGs de ação clássicos.
- **Iluminação dinâmica**: lanternas, luzes de emergência, clarões de disparo. A escuridão é uma
  ferramenta de jogo para a furtividade.
- **Cones de visão e névoa de guerra** vêm dos sensores do ECHO: o que você não vê aparece como um
  wireframe escuro com scanlines.
- **Pós-processamento CRT** (scanlines, leve curvatura, aberração cromática). Opcional.

## Paleta e Alinhamento

A paleta da UI muda com o [Alinhamento](../design/alignment.md):

| Nível | Cor da UI | Sensação |
|---|---|---|
| Alinhado | `#39FF6A` verde fósforo | Terminal antigo, esperança |
| À deriva | `#FFB000` âmbar | Alerta |
| Divergente | `#FF3B3B` vermelho | Hostil |
| Desalinhado | Monocromático + glitch | Algo está errado |

O mundo em si fica em tons urbanos dessaturados, para que a UI e as ameaças sempre se destaquem.

## Regras de legibilidade

- Humanos têm cores quentes; máquinas têm cores frias.
- Ataques inimigos são anunciados com uma linha ou círculo vermelho pelo menos 0,4 s antes de acertar.
- Objetos interativos têm um pulso sutil na cor atual da UI.

## Direção de áudio

- **Música**: synthwave sombrio e industrial. Camadas entram conforme a Ameaça sobe (ambiente →
  pulso → combate completo).
- **O Alinhamento afeta a música**: os temas alinhados são melódicos; as versões desalinhadas dos
  mesmos temas são desafinadas, mais lentas e distorcidas.
- **Efeitos sonoros**: zumbido de servos, cliques de relés, chiados de modem ao hackear; cada versão
  tem seu próprio som de passos e movimento.
- **Vozes**: falas humanas aparecem como texto com um curto chiado de rádio. Sem dublagem completa no
  início; talvez uma voz sintetizada para o ECHO no futuro.

## Pipeline de assets

- **Modelos 3D** em glTF: as peças de cenário (pisos, painéis de parede, portas, terminais, baús, dutos) vêm do pacote gratuito CC0 **Quaternius Modular SciFi MegaKit**, carregado por `game/src/render3d/kit.ts` com reserva procedural; o corpo SCRAPPER do ECHO é o robô animado QuadShell do pacote CC0 **Quaternius Sci-Fi Essentials Kit** (`scripts/import-essentials.py`); o DUSTMITE é um robô de limpeza low-poly feito à mão em código (corpo em disco, para-choque, cúpula de lidar, escovas laterais giratórias, um olho vermelho). A bagunça junto às paredes (caixas, barris, armários, prateleiras, colunas de tubos) vem dos dois pacotes, é puramente visual e muda por fase: um laboratório limpo e uma Undercity mais suja. Guardas e oficiais são corpos humanos com esqueleto do pacote CC0 **Quaternius Universal Base Characters**, em cores lisas de uniforme, animados com clipes da **Universal Animation Library** (parado, andar, varrer com lanterna quando desconfia, correr em alerta, postura de pistola para oficiais, golpe, morte) escolhidos pelo estado da IA (`scripts/import-characters.py`). Os demais corpos do ECHO serão modelados à mão no Blender. `scripts/import-megakit.py` copia as peças usadas e reduz as texturas (cerca de 0,4 MB no total).
- Sprites no **Aseprite**, exportados como sprite sheets mais JSON (só HUD e arte 2D).
- Mapas e pedaços no **Tiled**, exportados como JSON.
- Áudio em **OGG** com MP3 de reserva.
- Todos os assets são originais ou devidamente licenciados; as licenças ficam registradas em
  `CREDITS.md`.
