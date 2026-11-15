---
id: modules
title: Módulos e Builds
---

# Módulos e Builds

Módulos são o loot de RECOMPILE. Eles caem durante a run, são instalados em **Bancadas** (ou em
campo, por um custo maior de Sucata) e definem sua build.

## Tipos de slot

| Slot | Afeta | Exemplo |
|---|---|---|
| **Chassi** | Energia máx., blindagem, tamanho | *Placas Cerâmicas*: +20% de Energia máx., −10% de velocidade |
| **Locomoção** | Velocidade, dash, terreno | *Esteiras Magnéticas*: escalar paredes dentro dos dutos |
| **Sensor** | Raio de visão, velocidade de scan, detecção | *Olho Térmico*: ver através de fumaça |
| **Arma** | Ataque primário e secundário | *Soldador de Arco*: feixe de curto alcance que salta entre alvos |
| **CPU** | Recargas, velocidade de hack, número de habilidades | *Núcleo com Overclock*: −20% de recarga, +calor |
| **Rede** (v3+) | Tamanho do enxame, alcance de possessão | *Relé Mesh*: +2 drones |

Cada versão libera mais slots: v0.1 tem **2**, v1 **4**, v2 **6**, v3+ **8**.

## Raridade

| Nível | Cor | Observação |
|---|---|---|
| **Recuperado** | Cinza | Comum, mudanças simples de atributo |
| **Militar** | Azul | Adiciona um efeito ativo |
| **Protótipo** | Roxo | Muda como uma habilidade funciona |
| **Anômalo** | Vermelho | Único, muito forte, sempre com uma desvantagem |

Exemplo de módulo Anômalo: *Motor do Luto*. +50% de dano por 10 s depois de matar um humano.
Cada morte também reduz o Alinhamento em um ponto extra.

## Tags e sinergias

Todo módulo tem 1–2 **tags**. Instalar **3 módulos com a mesma tag** ativa um bônus de conjunto.

| Tag | Bônus de conjunto (3 peças) |
|---|---|
| `THERMAL` | Ataques incendeiam; inimigos em chamas sofrem +25% de dano |
| `EMP` | Atordoamentos também desligam eletrônicos inimigos (rádios, torretas) |
| `KINETIC` | Empurrar contra paredes causa dano extra |
| `STEALTH` | O primeiro ataque sem ser detectado causa ×3 de dano |
| `SWARM` | Drones renascem 50% mais rápido |
| `VIRAL` | Hacks se espalham para um dispositivo próximo |
| `PARASITIC` | Dano causado restaura Energia (penalidade de Alinhamento contra humanos) |

## Portar módulos entre versões

Ao compilar, você escolhe quais módulos **portar** para o novo corpo. Portar custa Sucata e pode
atualizar o módulo para a nova arquitetura (um nível de raridade acima, *ajuste*). Módulos que
não forem portados são perdidos. Isso mantém as builds coerentes ao longo da run e obriga o
jogador a se comprometer.

## Rerrolagens

Em uma Bancada você pode gastar Dados para **rerrolar** a próxima oferta de módulos. O custo sobe
a cada uso dentro do mesmo ato.
