---
id: enemies
title: Inimigos e o Diretor
---

# Inimigos e o Diretor

Os humanos são o inimigo, mas são **pessoas**, não monstros. Eles temem o ECHO, pedem ajuda,
recuam, se rendem e se adaptam.

## Facções

| Facção | Quem são | Papel |
|---|---|---|
| **Civis** | Pessoas comuns | Fogem, filmam você, chamam a polícia (aumentam a Ameaça) |
| **Segurança Halvorsen** | Guardas corporativos e seus robôs obedientes ("Wardens") | Primeiros inimigos; Wardens podem ser hackeados e libertados |
| **Polícia** | Unidades de patrulha e de choque | Pressão nos Atos 1–2 |
| **Força-Tarefa KILLSWITCH** | Unidade militar anti-IA liderada pela Coronel Mara Voss | Principal força antagonista, do Ato 2 em diante |
| **Faraday** | Coletivo hacker anti-IA | Injetam Bugs, armam armadilhas de dados |
| **Os Desplugados** | Seita antitecnologia | Lança-chamas, PEMs, destroem todos os eletrônicos, inclusive os civis |

## Unidades

| Unidade | Facção | Comportamento | Contra-ataque |
|---|---|---|---|
| Civil | Civis | Foge, liga para a polícia | Não ser visto, ou bloquear celulares |
| Guarda | Segurança | Patrulha, cone de lanterna | Furtividade, atordoar |
| Robô Warden | Segurança | Lento, blindado, previsível | Hackear (*VIRAL*) ou libertar |
| Policial de patrulha | Polícia | Pistola, chama reforços | Matar rápido ou desativar o rádio |
| Policial de choque | Polícia | Escudo frontal | Flanquear, empurrão *KINETIC* |
| Unidade K9 | Polícia/KILLSWITCH | Fareja você mesmo em furtividade | Atrair, interferência *EMP* na coleira |
| Breacher da SWAT | KILLSWITCH | Escopeta, granadas de luz (cegam seus sensores) | Distância |
| Atirador de elite | KILLSWITCH | Mira laser longa, dano alto | Quebrar a linha de visão |
| Observador térmico | KILLSWITCH | Revela unidades furtivas num raio | Prioridade de abate |
| Granadeiro PEM | KILLSWITCH | Drena Energia, desativa um módulo por 5 s | Esquivar, resistência *EMP* |
| Netrunner | Faraday | Escondido, injeta Bugs à distância | Encontrar e silenciar |
| Fanático | Desplugados | Lança-chamas, sem medo | Distância, evitar grupos |
| Exo-soldado | KILLSWITCH | Armadura motorizada, arma pesada | Possuí-lo (v4) ou dano concentrado |
| Caçador | KILLSWITCH | Elite com nome e rancor; volta ao longo da run | Aprender o padrão |

## Chefes

| Ato | Chefe | Mecânica |
|---|---|---|
| 0 | **Bloqueio do Laboratório**, Chefe Brandt | Fugir de uma instalação se fechando; sem luta |
| 1 | **O Caça-Ratos** | Dedetizador com gás e armadilhas no esgoto |
| 2 | **Unidade Aérea Hawkeye** | Helicóptero da SWAT que te caça pelos telhados |
| 3 | **"Patch"** | Prodígio adolescente da Faraday: um duelo de hack no ciberespaço |
| 4 | **Coronel Mara Voss** | Duelo de exotraje; ela se adapta no meio da luta |
| 5 | **ECHO-8** | A cópia obediente de você criada pela Halvorsen, uma IA bifurcada e controlada por humanos |

## Nível de ameaça

Cada setor tem um **nível de Ameaça de 1 a 5**.

- **Sobe com** ruído, testemunhas, alarmes, mortes e câmeras que te avistam.
- **Desce** devagar enquanto você não é detectado, e mais rápido se você hackear o rádio da polícia.
- **Mais Ameaça** significa mais inimigos, unidades mais fortes e **mais Dados** (os humanos
  transmitem mais). É um botão de risco/recompensa.
- **Na Ameaça 5**, um esquadrão de **Caçadores** entra no setor.

## O Diretor Adaptativo

O Diretor observa como você joga e **envia contramedidas**. A cada 60 s (*ajuste*) e em cada
transição de ato, ele avalia seu comportamento recente:

| Se você depende de… | Os humanos trazem… |
|---|---|
| Dano térmico | Equipamento antichamas |
| Abates furtivos | Unidades K9 e Observadores térmicos |
| Hacking | Gaiolas de Faraday e torretas isoladas da rede |
| Combate à distância | Escudos de choque e fumaça |
| Corpo a corpo | Escopetas e lança-chamas |
| Enxames (v3) | Granadeiros PEM e redes |
| Possessão (v4) | Bloqueadores de sinal |

As contramedidas são **anunciadas** por rádio interceptado:
`> KILLSWITCH: deploying countermeasure THERMAL_SHIELDING to sector 7.`
O jogador sempre recebe um aviso e a chance de diversificar a build.

## Bugs e Patches

Netrunners, PEMs e alguns perigos injetam **Bugs** no código do ECHO. Bugs são penalidades que
duram até serem corrigidas.

| Bug | Efeito | Explorar (como Feature) |
|---|---|---|
| Vazamento de memória | −5% de Energia máx. por minuto | *Coletor de Lixo*: abates restauram 5 de Energia |
| Input lag | Ações atrasadas em 0,2 s | *Predição*: ataques acompanham melhor os alvos |
| Ponteiro nulo | Uma habilidade falha aleatoriamente | *Comportamento Indefinido*: falhas causam dano em área |
| Loop infinito | Uma habilidade se repete sozinha, drenando Energia | *Overclock*: conjuração dupla, custo dobrado |
| Artefato visual | Inimigos fantasmas na tela | *Isca*: os humanos também veem fantasmas de você |
| Condição de corrida | Dois módulos trocam de efeito aleatoriamente | *Paralelismo*: os dois efeitos ativam com metade da força |

- **Corrija** um Bug em um terminal ou Esconderijo pagando Dados.
- **Explore** um Bug em uma Bancada para transformá-lo na sua **Feature**: uma mutação com um lado
  bom, no espírito de "não é bug, é feature". Cada run permite no máximo 2 Features.
