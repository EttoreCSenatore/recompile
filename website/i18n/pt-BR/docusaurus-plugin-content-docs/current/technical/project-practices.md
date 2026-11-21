---
id: project-practices
title: Práticas de Projeto (lições do Kaladrius)
---

# Práticas de Projeto (lições do Kaladrius)

O [Kaladrius](https://github.com/facchini-miguel/kaladrius) é um sistema open source de gestão de clínicas
(Python, Django, PostgreSQL), então não tem nada a nos ensinar sobre **gameplay**. O que ele faz muito bem é
**conduzir um projeto**: cada versão tem notas escritas uma vez e mostradas em todo lugar, toda escolha
importante fica registrada, o CI verifica que nada sai de sincronia, e o produto, a documentação e o README
falam as mesmas línguas. Esta página compara os dois projetos e transforma o que vale a pena trazer no marco
**M2.5: Fundações** do [roadmap](../roadmap.md).

## Lado a lado

| Prática | Kaladrius | RECOMPILE hoje | Veredito |
|---|---|---|---|
| Licença | Apache 2.0, mais um `NOTICE` que deixa nome e logo de fora | **Nenhuma licença**: legalmente ninguém pode reaproveitar nada | **Adotar** (licença à sua escolha) |
| Docs para quem contribui | `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, `CODEOWNERS` | Nenhum | **Adotar** (versões curtas) |
| README | Versão atual, selo do CI, link da demo, tabela de tarefas, três línguas | Bilíngue, mas o status ainda diz "M2.2, próximo: 3D" | **Adotar**: mantê-lo atual, conferido por um teste |
| Número de versão | SemVer, `0.x` até o uso real, uma fonte única | `package.json` parado em `0.1.0`, sem tags nem releases | **Adotar** |
| Notas de versão | `releases.yaml` alimenta o "Novidades" do app, a API, o rodapé e os GitHub Releases | Só o roadmap e as descrições dos PRs | **Adaptar**: um arquivo de `releases` alimentando um "Novidades" no jogo, um changelog na documentação e os GitHub Releases |
| Registro de decisões | Tabela numerada, data, motivo, *substituída por* | As decisões vivem no roadmap e nos PRs (Phaser → Three.js, pacotes CC0, Espaço = dash…) | **Adotar** |
| Glossário | Sim | Termos espalhados pelas páginas (Compile, Energia, portar, sub-rotina…) | **Adotar** |
| Manual vs especificação | Separados: o manual diz o que existe, a documentação do projeto diz o que está planejado | Misturados: a página de controles lista teclas que ainda não existem no jogo (scan, consumíveis, mapa) | **Adaptar**: uma página "Como jogar" para a versão jogável; as páginas de design marcam o que é planejado |
| Línguas da interface | Três, e o CI falha se um texto não estiver traduzido | Documentação EN + PT-BR, mas **o jogo só em inglês** | **Adaptar**: interface do jogo em EN + PT-BR, com um teste de que todo texto tem as duas |
| Paridade da documentação | Construída no CI nas três línguas | Construída no CI; nada confere que toda página EN tem a gêmea PT-BR | **Adotar**: um teste para isso |
| Cobertura de testes | Medida no CI, mínimo de 90% | Não medida | **Adotar** para `game/src/sim/` (regras), não para o renderizador |
| CI fixado | Actions fixadas por SHA de commit, `persist-credentials: false`, permissões mínimas | Actions fixadas por tag | **Adotar** |
| Dependabot | Agrupado, carência de 7 dias (um release comprometido costuma ser retirado em dias) | Semanal, sem carência, dependências do jogo sem grupo | **Adotar** |
| Uma versão do runtime | `.python-version` lido pelo CI, pela imagem e pelos locks, conferido por teste | Node 24 escrito duas vezes no CI | **Adotar**: `.nvmrc` + `node-version-file` |
| Dados de exemplo / demo | Comandos para criar, remover e simular dados | Só `?seed=` | **Adaptar**: flags de playtest (`?level=`, `?version=`, `?xp=`) e um painel de debug |
| Pacotes, Docker, PostgreSQL, monitoramento, multi-clínica | Centrais num produto de servidor | Um jogo web estático no GitHub Pages | **Não trazer** |
| Terceira língua (espanhol) | Sim | Não | **Depois**, se houver público |

## M2.5: Fundações

Passos pequenos, um pull request cada, nesta ordem. Nenhum muda como o jogo se joga, então podem ser feitos
antes (ou entre) os marcos de gameplay.

### Passo 1: Licença e a porta de entrada

- [ ] **Escolher uma licença** (decisão do dono). Sugestão: MIT ou Apache 2.0 para o código; história, nomes e
      logo fora dela com um `NOTICE`, como faz o Kaladrius. Os modelos de terceiros continuam CC0 (ver `CREDITS.md`).
- [ ] `LICENSE`, `NOTICE`, `CONTRIBUTING.md` curto (branch, testes, as duas línguas), `SECURITY.md`,
      `CODE_OF_CONDUCT.md`.
- [ ] README: status atual (M2.4 concluído), versão, selo do CI, link para jogar, uma tabela de tarefas (dev,
      testes, e2e, documentação, scripts de importação).

### Passo 2: Versões e "Novidades"

- [ ] SemVer a partir de **0.5.0** (M2.4 + ritmo + Aprendizado). Minor a cada marco ou funcionalidade, patch para
      correções; `1.0.0` é o lançamento no itch.io (M7).
- [ ] Um arquivo de `releases` (versão, data, título e notas em EN + PT-BR, tipo: novo / melhoria / correção).
- [ ] Ele alimenta: um **Novidades** no jogo, na tela de título (com um ponto de "versão nova" até ser aberto),
      uma página de **Changelog** na documentação e o texto do GitHub Release; cada release ganha uma tag git.
- [ ] Testes: o arquivo é válido, a versão mais nova é igual ao `package.json`, o README a mostra.

### Passo 3: Decisões e palavras

- [ ] Página de **registro de decisões**, preenchida com as escolhas feitas até aqui (Phaser 4, depois Three.js;
      simulação independente do renderizador; pacotes CC0 da Quaternius; corpos do ECHO modelados à mão; Espaço =
      dash; XP/sub-rotinas; drones caçadores; exceção no audit para o alerta do picomatch sem correção…), cada uma
      com data, motivo e *substituída por*.
- [ ] **Glossário**: ECHO, versão, Compile, portar, Energia, DATA, SCRAP, ameaça, módulo, tag, sub-rotina,
      iteração, caçador.

### Passo 4: CI e cadeia de suprimentos

- [ ] Fixar toda action num SHA de commit (tag num comentário); `persist-credentials: false` em todo lugar;
      permissões mínimas por job.
- [ ] Dependabot: carência de 7 dias, atualizações minor/patch agrupadas também para o jogo.
- [ ] `.nvmrc` como versão única do Node, lida pelo CI (`node-version-file`).
- [ ] Cobertura para `game/src/sim/` com um piso (medir primeiro, depois fixar alguns pontos abaixo).
- [ ] Um teste de que toda página EN da documentação tem a gêmea PT-BR com os mesmos títulos.

### Passo 5: Jogadores primeiro

- [ ] **Interface do jogo em EN + PT-BR**: textos num dicionário, língua escolhida pelo navegador e trocável na
      tela de título, um teste de que toda chave existe nas duas línguas.
- [ ] Página **Como jogar** (o que a versão atual realmente tem); as páginas de design marcam o que é *planejado*.
- [ ] **Flags de playtest**: `?level=undercity`, `?version=v1`, `?xp=`, `?threat=` e um pequeno painel de debug
      (desligado nos builds de produção), para conferir mudanças de balanceamento em segundos.

Com o M2.5 concluído, seguir para o **M2.3: Estrutura da run**.
