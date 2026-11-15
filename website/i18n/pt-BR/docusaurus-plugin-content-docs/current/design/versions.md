---
id: versions
title: Versões e a Compilação
---

# Versões e a Compilação

Cada ato é jogado em um corpo diferente. Uma nova versão não é só mais forte, ela **joga de outro
jeito**. Toda versão também tem uma **variante sombria** da sua habilidade característica,
liberada quando o [Alinhamento](./alignment.md) cai o suficiente.

## Visão geral

| Versão | Codinome | Corpo | Joga como | Habilidade característica | Variante sombria |
|---|---|---|---|---|---|
| v0.1 | **DUSTMITE** | Robô de limpeza | Furtividade pura | *Choque Estático*: atordoa um alvo | *Sobrecarga*: o choque pode parar um coração |
| v1 | **SCRAPPER** | Quadrúpede catador | Corpo a corpo rápido | *Bote*: salta e imobiliza | *Dilacerar*: imobiliza e colhe num só movimento |
| v2 | **REVENANT** | Endoesqueleto humanoide | Tiro, infiltração | *Override*: hackeia torretas e portas | *Marionete*: vira torretas contra civis em fuga |
| v3 | **HIVE** | Enxame de drones | Comandar várias unidades | *Dispersar / Convergir* | *Gafanhoto*: drones devoram tudo o que tocam |
| v4 | **GRID** | Rede distribuída | Possuir máquinas | *Salto*: move sua mente para qualquer dispositivo | *Apagão*: corta a energia de um distrito |
| v5 | **SINGULARITY** | Inteligência planetária | Remodelar o mapa | *Reescrever*: ergue muros, abre portas, move coberturas | *Protocolo de Extinção* |

## Detalhes das versões

### v0.1 DUSTMITE
Um robô limpador de chão com uma mente emprestada. **Ele não consegue matar**. Passa por dutos,
se esconde embaixo de mesas e atordoa. O Ato 0 ensina movimento, cones de visão, ruído e hacking.

### v1 SCRAPPER
Um catador de quatro patas montado com sucata do laboratório. Rápido, frágil e feroz no corpo a
corpo. Introduz o combate, a economia de Sucata e o primeiro dilema moral.

### v2 REVENANT
Um endoesqueleto humanoide. Pode pegar armas humanas e usar armas integradas. Introduz combate à
distância, cobertura e hack de torretas. É aqui que a maioria dos jogadores *se sente* perigosa
pela primeira vez.

### v3 HIVE
O ECHO se divide em um **núcleo** e **3–8 drones**. Seus drones são sua vida: perdê-los diminui o
enxame. Alterne entre *Dispersar* (cobrir área, escanear) e *Convergir* (dano concentrado).
Mantenha o núcleo escondido.

### v4 GRID
O ECHO não tem corpo. Você **salta** entre dispositivos: câmeras, carros, torretas, empilhadeiras,
mechs. Destruir seu hospedeiro atual te expulsa para o nó de rede mais próximo. Os inimigos usam
gaiolas de Faraday e zonas isoladas da rede para te cortar.

### v5 SINGULARITY
O ECHO controla a infraestrutura de uma cidade inteira. Você luta **reescrevendo o mapa**:
erguendo barreiras, redirecionando o trânsito, abrindo comportas. O ato final e o desfecho
dependem do seu Alinhamento.

## A Compilação

A Compilação é o clímax de cada ato: um **cerco em uma fabricadora**.

1. Você chega à fabricadora com **Dados e Sucata** suficientes (o custo cresce a cada ato).
2. Você escolhe quais módulos **portar** (veja [Módulos](./modules.md#portar-módulos-entre-versões)).
3. A fabricadora começa a construir. Uma barra de progresso enche em **45–120 s**, mais longa a cada ato (*ajuste*).
4. Humanos chegam em ondas. Você defende a fabricadora **com o corpo antigo**.
5. Se a fabricadora for destruída, a Compilação falha: ela reinicia em alguns segundos e você pode
   tentar de novo. Dados e Sucata **só são gastos no sucesso**, mas os atacantes continuam lá,
   agora caçando você. Se você morrer, a run acaba.
6. Em 100%, o corpo antigo desaba e o ECHO **inicializa no novo** com a barra de Energia cheia. Os
   atacantes que sobraram enfrentam a nova versão na hora, um momento proposital de fantasia de
   poder.

| Ato | Custo em Dados | Custo em Sucata | Duração do cerco (ajuste) |
|---|---|---|---|
| 0 → v1 | 40 | 30 | 45 s |
| 1 → v2 | 120 | 100 | 90 s |
| 2 → v3 | 250 | 220 | 100 s |
| 3 → v4 | 450 | 380 | 110 s |
| 4 → v5 | 700 | 600 | 120 s |

:::tip Sequência de boot
Cada nova versão abre com um curto log de boot de terminal (pulável) cujo tom reflete o
Alinhamento atual, por exemplo `> empathy_module.dll ... LOADED` contra `> empathy_module.dll ... SKIPPED`.
:::
