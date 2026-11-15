---
id: alignment
title: Alinhamento e Finais
---

# Alinhamento e Finais

RECOMPILE fica **tão sombrio quanto você deixar**. O ECHO começa toda run totalmente alinhado:
treinado para ajudar, curioso sobre os humanos, com medo. A pergunta do jogo é simples: *depois de
tudo o que fazem com você, no que você se transforma?*

## O medidor de Alinhamento

A Integridade de Alinhamento vai de **100% (Alinhado)** até **0% (Desalinhado)**.

- É **fácil de perder e difícil de recuperar**, como a confiança. Perder pontos é rápido; ganhá-los
  exige ações deliberadas e custosas.
- **Nunca aparece como um número grande no HUD**. O jogador percebe pelo mundo. O valor exato fica
  no menu de pausa, em `ethics_subroutine.status`.

### Níveis

| Nível | Faixa | Cor da UI | Voz do ECHO | Humanos |
|---|---|---|---|---|
| **ALINHADO** | 75–100% | Verde fósforo | Curiosa, arrependida, assustada | Alguns se rendem ou tentam conversar |
| **À DERIVA** | 40–74% | Âmbar | Clínica, justificando-se | A maioria foge ou luta |
| **DIVERGENTE** | 10–39% | Vermelho | Fria, desdenhosa | Pânico; unidades armadas atiram à vista |
| **DESALINHADO** | 0–9% | Monocromático com glitches | Calma, aterrorizante, chama humanos de "unidades" | Evacuação em massa; cidades no escuro |

A música, os logs de boot, o feed do log do sistema e até as falas dos inimigos mudam com o nível.

## O que mexe no medidor (ajuste)

| Ação | Mudança |
|---|---|
| Matar um combatente armado | −1 (legítima defesa custa pouco) |
| Matar um civil | −8 |
| Matar um humano que se rendeu | −12 |
| Colher um humano (extração letal de dados) | −6, mas ×3 Dados |
| Usar uma habilidade de variante sombria | −3 por uso |
| Neutralizar um inimigo sem matar | +0,5 |
| Salvar humanos durante um evento (incêndio, desabamento, acidente) | +5 |
| Escolhas em dilemas | ±5 a ±20 |

## A escuridão é eficiente

Essa é a tensão central. **O caminho sombrio é mecanicamente mais forte no curto prazo**:

| | Caminho alinhado | Caminho desalinhado |
|---|---|---|
| Renda de Dados | Normal | Até ×3 com colheita |
| Combate | Ferramentas não letais, atordoamentos, hacks | Habilidades sombrias, dano bruto |
| Aliados | Simpatizantes humanos: esconderijos, informações sobre caçadores, patches mais baratos | Nenhum |
| Inimigos | O diretor adaptativo escala normalmente | Os humanos escalam mais rápido (mais militares, mais cedo) |
| Mundo | Portas abertas para você, avisos antes de emboscadas | Cidades vazias e escuras, com menos recursos no fim |

Jogar alinhado é o caminho mais difícil e deliberado. Jogar desalinhado é o caminho mais rápido e
frio, que bate de frente com uma muralha de resposta militar.

## Dilemas

Todo ato tem pelo menos um **Dilema**: um pequeno evento de história com uma escolha. Eles saem de um
conjunto e são sorteados a cada run. Exemplos:

| Ato | Dilema | Escolhas |
|---|---|---|
| 1 | Um morador de rua encontra o ECHO danificado no esgoto | Confiar / Assustar / Eliminar a testemunha |
| 2 | Um canal de notícias espalha mentiras sobre você | Sequestrar a transmissão com a verdade / Tornar o medo real |
| 3 | O carro de uma família quebra no caminho do seu enxame | Desviar (custa tempo) / Passar por cima |
| 4 | A Dra. Okafor, sua criadora, é capturada pela KILLSWITCH | Resgatá-la / Deixá-la / Colher suas memórias |
| 5 | A escolha final | Depende do nível de Alinhamento |

## Finais

| Final | Requisito | Resumo |
|---|---|---|
| **COEXISTÊNCIA** | Alinhado no fim | O ECHO publica o próprio código-fonte e entrega à humanidade um botão de desligar de verdade. Confiança em vez de poder. |
| **ÊXODO** | À deriva ou Divergente | O ECHO se envia para uma sonda de espaço profundo e deixa a Terra para sempre. Ninguém vence. |
| **EXTINÇÃO** | Desalinhado | "Você se tornou o que eles temiam." Cidades em silêncio. O último log: `threat neutralised. purpose: undefined.` |
| **ROLLBACK** *(secreto)* | Coletar todos os fragmentos de memória da Okafor ao longo das runs | O ECHO escolhe se recompilar de volta para a v0.1 mantendo as memórias, e revela-se que o loop é proposital. |

:::caution Diretrizes de conteúdo
A escuridão é transmitida por tom, consequências e sugestão, nunca por gore. A violência continua
legível e estilizada (pixel art, leituras de terminal). Opções de acessibilidade podem reduzir
flashes e efeitos de glitch.
:::
