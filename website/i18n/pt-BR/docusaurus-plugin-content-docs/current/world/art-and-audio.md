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

- Sprites no **Aseprite**, exportados como sprite sheets mais JSON.
- Mapas e pedaços no **Tiled**, exportados como JSON.
- Áudio em **OGG** com MP3 de reserva.
- Todos os assets são originais ou devidamente licenciados; as licenças ficam registradas em
  `CREDITS.md`.
