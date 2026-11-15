---
id: roadmap
title: Roadmap
---

# Roadmap

O desenvolvimento é dividido em marcos. Cada um termina com algo **jogável** no navegador.

| Marco | Objetivo | Status |
|---|---|---|
| **M0: Design** | Conceito, documentos de design, site de documentação (EN/PT-BR) | ✅ Concluído |
| **M1: Protótipo DUSTMITE** | Um setor do Ato 0: movimento, cones de visão, ruído, guardas, hacking, atordoamento, saída | ⏳ Próximo |
| **M2: Loop principal** | Recursos, módulos, Bancada, primeiro cerco de Compilação, Ato 0 → Ato 1 (combate do SCRAPPER) | Planejado |
| **M3: Humanos vivos** | Nível de Ameaça, Diretor Adaptativo, Bugs e Patches, Ato 2 (REVENANT, combate à distância) | Planejado |
| **M4: Alinhamento** | Medidor de Alinhamento, níveis de UI, dilemas, variantes sombrias, voz do log do sistema | Planejado |
| **M5: Tornar-se muitos** | Ato 3 (enxame HIVE) e Ato 4 (possessão GRID), a parte técnica mais difícil | Planejado |
| **M6: Singularidade** | Ato 5, chefe ECHO-8, todos os finais, hub do Espaço Latente, meta-progressão | Planejado |
| **M7: Lançamento** | Áudio, polimento, revisão de acessibilidade, balanceamento, Épocas, lançamento no itch.io + GitHub Pages | Planejado |

## M1 em detalhe (próximo)

O primeiro protótipo responde a uma pergunta: **é divertido ser um robô fraco e caçado?**

- [ ] Estrutura do projeto `game/`: Vite + TypeScript + Phaser, CI, lint, testes
- [ ] Movimento com visão de cima e passo fixo, câmera, um tilemap
- [ ] Névoa de guerra do ECHO e cones de visão dos guardas (shadow casting)
- [ ] Sistema de ruído e máquina de estados dos guardas (patrulha → desconfiado → alerta)
- [ ] Dutos como segunda camada de navegação
- [ ] Hackear um terminal (canalizado, interrompível)
- [ ] Habilidade de atordoamento *Choque Estático* com custo de Energia
- [ ] HUD básico de terminal e log do sistema
- [ ] Deploy no GitHub Pages em `/recompile/play/`

## Perguntas em aberto

- Phaser 3 ou Phaser 4: decidir no M1 com base em estabilidade e suporte a iluminação.
- O enxame da v3 fica legível em 480×270? Prototipar cedo no M5, ou antes como um spike.
- O medidor de Alinhamento precisa de um número visível para ficar claro? Validar nos playtests do M4.
