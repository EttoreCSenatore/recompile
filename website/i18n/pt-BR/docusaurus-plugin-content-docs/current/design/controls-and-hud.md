---
id: controls-and-hud
title: Controles, HUD e Acessibilidade
---

# Controles, HUD e Acessibilidade

## Controles

| Ação | Teclado + mouse | Controle |
|---|---|---|
| Mover | `W A S D` | Analógico esquerdo |
| Mirar | Mouse | Analógico direito |
| Ataque primário | Clique esquerdo | `RT` |
| Ataque secundário | Clique direito | `LT` |
| Dash | `Espaço` | `A` |
| Habilidades 1–2 | `Q` `R` | `X` `B` |
| Módulos / Bancada | `E` | `Y` |
| Interagir / hackear | `F` (segurar) | `RB` (segurar) |
| Escanear | `C` (segurar) | `LB` (segurar) |
| Modo furtivo (lento, silencioso) | `Shift` (segurar) | Clique do analógico esquerdo |
| Consumíveis | `1`–`4` | Direcional |
| Mapa | `Tab` | `View` |
| Pausa | `Esc` | `Menu` |

Todos os comandos podem ser remapeados.

## HUD

O HUD parece uma **sobreposição de terminal** projetada pelos próprios sensores do ECHO.

```text
┌──────────────────────────────────────────────────────────────┐
│ > sys.log: guard_02 lost visual. resuming route.   THREAT ▮▮▯▯▯│
│                                                              │
│                                                              │
│                        [ tela do jogo ]                      │
│                                                              │
│                                                              │
│ PWR ▮▮▮▮▮▮▮▮▯▯▯▯ 64/80          ◇ DAT 112   ▣ SCR 47          │
│ [Q] POUNCE 12ϟ  [E] SCAN  [R] --        v1.2 SCRAPPER         │
└──────────────────────────────────────────────────────────────┘
```

- **Log do sistema** (canto superior esquerdo): o monólogo interno do ECHO e rádios interceptados.
  O tom muda com o [Alinhamento](./alignment.md).
- **Medidor de Ameaça** (canto superior direito): 5 segmentos.
- **Barra de Energia** (canto inferior esquerdo): segmentada, pisca quando está baixa.
- **Recursos** e **tag de versão** (canto inferior direito).
- A **cor da UI** muda com o nível de Alinhamento.

## Acessibilidade

- Remapeamento completo de teclas e suporte a controle.
- **Seguro para daltônicos**: os níveis de Alinhamento também mudam o *padrão* e o rótulo da UI,
  nunca só a cor.
- **Reduzir efeitos**: opções para shader CRT, glitch, tremor de tela e flashes.
- Escala de **tamanho de texto** para o log do sistema.
- Controle de **velocidade do jogo** (modo assistido) que não bloqueia conquistas nem finais.
- Legendas para todas as falas de rádio (o jogo é baseado em texto por design).
