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
| **M2.1: A Compilação** | Sucata, fabricadora e cerco de Compilação, corpo a corpo e Bote do SCRAPPER v1, policiais armados, setor da Subcidade no Ato 1, controle | ✅ Concluído: [jogar](pathname:///recompile/play/) |
| **M2.2: Módulos** | Módulos que caem, slots, raridade, tags e bônus de conjunto, Bancada, portar módulos na Compilação | ✅ Concluído: [jogar](pathname:///recompile/play/) |
| **M2.3: Estrutura da run** | Mapa de rotas com 3 setores por ato, setores montados com pedaços, resumo da run, suspender/retomar com saves (validados com Zod) | Planejado |
| **M2.4: Visual 3D moderno** | Trocar o 2D plano por uma cena 3D com câmera inclinada, estilo Diablo; modelos detalhados de personagens, objetos e cenários; iluminação e sombras. A simulação não muda | 🔬 Spike feito, engine escolhida: Three.js |
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
O suporte a controle chegou no M2.1. A validação com Zod chega junto com os saves no M2.3. Um ECS se mostrou desnecessário
até agora; ele será avaliado para o enxame da v3 no M5 (veja [Arquitetura](./technical/architecture.md)).
:::

## M2.1 em detalhe (concluído)

O loop da Compilação de ponta a ponta: fugir do laboratório como DUSTMITE, se reconstruir e lutar pela Subcidade como SCRAPPER.

- [x] **Sucata** de pilhas de sucata (segurar `F`) e de humanos neutralizados
- [x] **Fabricadora + cerco de Compilação**: hackear a SEGURANÇA para ligá-la, pagar 40 ◇ + 30 ▣, defendê-la por 45 s contra reforços;
      a falha a reinicia e mantém seus recursos
- [x] **SCRAPPER v1**: 80 de Energia, mais rápido, grande demais para dutos, **garras** (mira com mouse, `LMB`/`Espaço`) e **Bote** (`Q`)
- [x] Humanos podem ser feridos e neutralizados; **policiais** disparam tiros anunciados (linha vermelha de mira)
- [x] Setor da **Subcidade no Ato 1**: a água do esgoto drena Energia, o terminal de uplink abre a saída
- [x] Suporte a **controle**; testes de balanceamento provam que um jogador parado perde o cerco e um defensor sensato vence

## Resultado do spike M2.4

`game/spike3d.html` (código em `game/src/render3d/spike.ts`) renderiza o `World` real com Three.js: paredes e chão instanciados, câmera em perspectiva a 52°, sombras, uma luz que segue o ECHO, ECHO, guardas e objetos low-poly procedurais, cones de visão com o mesmo `castRay`, névoa de guerra e o HUD DOM existente. A simulação não foi alterada.

- **Engine: Three.js.** O Phaser é uma engine 2D; iluminação, sombras e malhas reais seriam uma luta constante. O Three.js adiciona cerca de 137 kB gzip (a página 3D, sem o Phaser).
- **Custo:** cerca de 50 draw calls e 18 mil triângulos em uma fase da Undercity; a névoa é só uma atualização de cor por instância quando a visibilidade muda.
- **Legibilidade:** paredes entre a câmera e o ECHO precisam ser rebaixadas (feito, caem à altura do joelho); cones de visão como leques no chão continuam legíveis.
- **Falta:** portar entrada, menus, título e efeitos da cena Phaser e então aposentar o Phaser; modelos reais (pipeline de arte segue em aberto); recorte de parede suave; opções de acessibilidade para iluminação.

## Perguntas em aberto

- ~~Phaser 3 ou Phaser 4~~: decidido no M1, **Phaser 4**.
- O enxame da v3 fica legível em 480×270? Prototipar cedo no M5, ou antes como um spike.
- O medidor de Alinhamento precisa de um número visível para ficar claro? Validar nos playtests do M4.
