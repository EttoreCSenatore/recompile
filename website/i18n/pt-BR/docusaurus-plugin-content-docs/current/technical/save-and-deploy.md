---
id: save-and-deploy
title: Saves, Build e Deploy
---

# Saves, Build e Deploy

## Sistema de saves

| Dados | Armazenamento | Quando |
|---|---|---|
| Meta-progressão (Pesos, desbloqueios, códice, finais vistos) | IndexedDB | Depois de cada run e de cada desbloqueio |
| Configurações (controles, acessibilidade, áudio) | localStorage | Ao mudar |
| Run suspensa | IndexedDB | Somente entre setores |

### Regras

- **Suspender, não save-scum**: uma run suspensa é **apagada ao ser carregada**, como é padrão em
  roguelikes.
- **Schema versionado**: todo save tem um `schemaVersion`. Migrações atualizam saves antigos passo a
  passo.
- **Validação**: os saves são lidos com Zod; dados inválidos são rejeitados e o jogador é avisado (o
  backup anterior é mantido).
- **Exportar / importar**: o jogador pode exportar a meta-progressão como arquivo JSON para levar
  entre navegadores. Importações são validadas do mesmo jeito e nunca executadas.
- O acesso ao armazenamento fica dentro de `try/catch`, então o jogo funciona em janelas anônimas
  (com um aviso de que o progresso não será salvo).

## Build

```bash
# Jogo
cd game
npm ci
npm run dev        # servidor local de desenvolvimento
npm run test       # testes unitários (Vitest)
npm run build      # build estática em game/dist

# Documentação
cd website
npm ci
npm start          # docs locais (inglês)
npm start -- --locale pt-BR   # docs locais (português)
npm run build      # build estática de todos os idiomas
```

## Integração contínua

Em cada pull request, o GitHub Actions roda:

1. Instalação com `npm ci` (lockfile obrigatório).
2. Checagem de tipos, lint, testes unitários.
3. Teste de estresse da geração procedural.
4. Teste de fumaça com Playwright (inicia o jogo e joga um setor roteirizado).
5. `npm audit --audit-level=high`.
6. Build da documentação (os dois idiomas; links quebrados falham a build).

## Deploy

O GitHub Pages hospeda a documentação e o jogo, a partir de um único workflow na `main`:

| Caminho | Conteúdo |
|---|---|
| `https://ettorecsenatore.github.io/recompile/` | Documentação (inglês) |
| `https://ettorecsenatore.github.io/recompile/pt-BR/` | Documentação (português) |
| `https://ettorecsenatore.github.io/recompile/play/` | O jogo |

O workflow gera a documentação, gera o jogo dentro de `play/` e publica um único artefato do Pages.
As builds para o **itch.io** são uma cópia compactada de `game/dist`.
