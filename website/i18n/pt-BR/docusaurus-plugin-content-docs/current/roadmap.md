---
id: roadmap
title: Roadmap
---

# Roadmap

O desenvolvimento é dividido em marcos. Cada um termina com algo **jogável** no navegador.

| Marco | Objetivo | Status |
|---|---|---|
| **M0: Design** | Conceito, documentos de design, site de documentação (EN/PT-BR) | ✅ Concluído |
| **M1: Protótipo DUSTMITE** | Um setor do Ato 0: movimento, cones de visão, ruído, guardas, hacking, atordoamento, saída | ✅ Concluído: [jogar](pathname:///recompile/play/) |
| **M2: Loop principal** | Recursos, módulos, Bancada, primeiro cerco de Compilação, Ato 0 → Ato 1 (combate do SCRAPPER) | ⏳ Próximo |
| **M3: Humanos vivos** | Nível de Ameaça, Diretor Adaptativo, Bugs e Patches, Ato 2 (REVENANT, combate à distância) | Planejado |
| **M4: Alinhamento** | Medidor de Alinhamento, níveis de UI, dilemas, variantes sombrias, voz do log do sistema | Planejado |
| **M5: Tornar-se muitos** | Ato 3 (enxame HIVE) e Ato 4 (possessão GRID), a parte técnica mais difícil | Planejado |
| **M6: Singularidade** | Ato 5, chefe ECHO-8, todos os finais, hub do Espaço Latente, meta-progressão | Planejado |
| **M7: Lançamento** | Áudio, polimento, revisão de acessibilidade, balanceamento, Épocas, lançamento no itch.io + GitHub Pages | Planejado |

## M1 em detalhe (concluído)

O primeiro protótipo responde a uma pergunta: **é divertido ser um robô fraco e caçado?**
[Jogue no navegador](pathname:///recompile/play/) (precisa de teclado). Adicione `?seed=123` à URL para repetir uma run específica.

- [x] Estrutura do projeto `game/`: Vite + TypeScript + Phaser 4, CI, lint, testes unitários, teste de fumaça com Playwright
- [x] Movimento com visão de cima e passo fixo, câmera, um setor feito à mão
- [x] Névoa de guerra do ECHO e cones de visão de guardas e câmeras (ray casting)
- [x] Sistema de ruído e máquina de estados dos guardas (patrulha → desconfiado → investigar → alerta)
- [x] Dutos como segunda camada de navegação (guardas não entram nem veem dentro)
- [x] Hackear terminais e câmeras (canalizado, interrompível, barulhento)
- [x] Habilidade de atordoamento *Choque Estático* com custo de Energia
- [x] HUD de terminal, log do sistema, nível de Ameaça, runs com seed
- [x] Deploy no GitHub Pages em `/recompile/play/`

:::note Observações de escopo
O M1 mantém a simulação em classes TypeScript simples (`game/src/sim/`), separadas da renderização e totalmente testadas.
O ECS (bitECS) e a validação de dados (Zod) descritos em [Arquitetura](./technical/architecture.md) chegam no M2,
quando módulos, inimigos e arquivos de conteúdo justificarem. O suporte a controle também está planejado para o M2.
:::

## Perguntas em aberto

- ~~Phaser 3 ou Phaser 4~~: decidido no M1, **Phaser 4**.
- O enxame da v3 fica legível em 480×270? Prototipar cedo no M5, ou antes como um spike.
- O medidor de Alinhamento precisa de um número visível para ficar claro? Validar nos playtests do M4.
