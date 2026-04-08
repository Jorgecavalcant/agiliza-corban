# HANDOVER: Agiliza Corban — Finalização do Build e Instalador

> **Produto**: Agiliza Corban
> **PRD de origem**: `PRD-Agiliza-Corban-v1.0.md`
> **SPEC de origem**: `SPEC-Agiliza-Corban-v1.0.md`
> **Versão**: 1.0
> **Data**: 2026-04-08
> **Status**: 🔴 PENDENTE — Aguardando execução do build final
> **Autor**: JC Agent Manager (Antigravity) | **Executor**: Claude Code

---

## 🎯 Objetivo deste documento

O sistema Agiliza Corban V1.0 está **100% funcional e codificado**. Toda a lógica de frontend e backend foi implementada e testada via `npm run dev:electron`. 

A **única tarefa pendente** é gerar o instalador `.exe` para Windows (NSIS) e o executável portátil, para que o CEO Jorge possa distribuir o programa para os clientes.

---

## 📁 Localização do Projeto

```
C:\Users\jorge\Desktop\🚀 MEUS PROJETOS\Outros Projetos\Agiliza-Corban\
```

---

## ✅ O que foi implementado (não alterar)

### Funcionalidades completas da V1.0:
- **Login com PIN** via teclado físico e teclado virtual na tela
- **Painel de Caixa** com botões de serviços dinâmicos (carregados do banco)
- **Painel de Senhas** exibido no header com botão "Chamar Próxima" + integração porta COM
- **Modal de Retirada** com termômetro verde/vermelho (acima de 50% da receita = vermelho)
- **Registro avulso** de produtos/serviços com nome e valor customizados
- **AdminView (Painel do Sócio)** com 4 abas:
  - `Fechamento (Z)` — Z-Reading diário com metas de progresso
  - `Visão Mensal` — Receita e retiradas mensais com barra de progresso
  - `Produtos` — CRUD de produtos com drag-and-drop para reordenação (salva no banco)
  - `Configurações` — Metas de faturamento, gestão de PINs com envio de e-mail, porta COM
- **Botão flutuante "Realizar Fechamento de Caixa"** visível apenas na aba Fechamento
- **Modal de Fechamento** com comparação caixa físico vs sistema + registro de quebra/sobra
- **Backup automático** do banco em `Documentos\Agiliza-Corban-Backups\` a cada fechamento
- **Impressão contextual** via IPC nativo do Electron (imprime a aba atual visível)
- **Gestão dinâmica de produtos** — O CaixaView carrega os produtos do banco (não é mais estático)
- **Drag and drop** na aba Produtos para reordenar a sequência do painel de lançamentos

### Stack técnica:
- Electron 30 + Next.js 14 (exportação estática para `out/`)
- sql.js (SQLite no browser, sem binários nativos frágeis) + serialport 12
- TailwindCSS 3 + lucide-react

---

## 🔴 Tarefa Pendente: Gerar o Instalador

### Problema encontrado
O `electron-builder` ao tentar gerar o pacote NSIS falha com o erro:

```
ERROR: Cannot create symbolic link : O cliente não tem o privilégio necessário.
C:\...\winCodeSign\...\darwin\10.12\lib\libcrypto.dylib
```

**Causa raiz**: O `electron-builder` tenta baixar e extrair o pacote `winCodeSign` (para assinar digitalmente o instalador), mas o Windows bloqueia a criação de symbolic links sem modo administrador.

**Solução**: Desabilitar a assinatura de código (não necessária para uso interno/distribuição direta) via variável de ambiente `CSC_IDENTITY_AUTO_DISCOVERY=false` **E** executar o CMD como Administrador.

### O package.json já está configurado corretamente

O arquivo `package.json` já tem as configurações necessárias para build sem assinatura:

```json
"win": {
  "target": [
    { "target": "nsis", "arch": ["x64"] },
    { "target": "portable", "arch": ["x64"] }
  ],
  "signingHashAlgorithms": null,
  "sign": null
},
"forceCodeSigning": false,
```

### Comandos para executar (em ordem)

> ⚠️ **IMPORTANTE**: Abrir o Prompt de Comando (CMD) como **Administrador**

#### Passo 1 — Limpar cache corrompido do winCodeSign:
```cmd
rmdir /s /q "C:\Users\jorge\AppData\Local\electron-builder\Cache\winCodeSign"
```

#### Passo 2 — Navegar para o projeto:
```cmd
cd "C:\Users\jorge\Desktop\🚀 MEUS PROJETOS\Outros Projetos\Agiliza-Corban"
```

#### Passo 3 — Build completo:
```cmd
set CSC_IDENTITY_AUTO_DISCOVERY=false && npm run build:next && npx electron-builder --win
```

### Resultado esperado

Dentro da pasta `dist\` serão gerados:
- `Agiliza Corban Setup 1.0.0.exe` — Instalador completo (instala no Windows com atalho na área de trabalho)
- `Agiliza Corban 1.0.0.exe` — Executável portátil (roda sem instalar, ideal para envio via WhatsApp/pendrive)

---

## 📦 Estrutura atual dos arquivos principais

```
Agiliza-Corban/
├── main/
│   ├── main.js          ← Ponto de entrada do Electron
│   ├── ipc.js           ← Todos os handlers IPC (transactions, products, settings, print, backup)
│   ├── preload.js       ← API exposta ao renderer (window.electronAPI)
│   ├── database.js      ← sql.js, initDb, saveDb, backupDb
│   └── hardware.js      ← Porta COM, painel de senhas
├── src/
│   ├── app/
│   │   ├── page.jsx     ← Roteador principal (login/caixa/admin)
│   │   └── globals.css  ← CSS global + classes de impressão (print-hide, print-box)
│   └── components/
│       ├── LoginView.jsx   ← Tela de login com PIN (teclado físico + virtual)
│       ├── CaixaView.jsx   ← Painel de caixa do dia (funcionário e sócio)
│       └── AdminView.jsx   ← Painel do sócio (fechamento, relatórios, produtos, config)
├── docs/
│   ├── PRD-Agiliza-Corban-v1.0.md
│   ├── SPEC-Agiliza-Corban-v1.0.md
│   └── HANDOVER-Build-v1.0.md   ← Você está aqui
└── package.json         ← Configuração do electron-builder já ajustada
```

---

## 🔐 Credenciais de teste

| Perfil | PIN padrão |
|--------|-----------|
| Sócio (Master) | `1234` |
| Funcionário | `0000` |

> Os PINs são salvos no banco local via `settings` table e podem ser alterados nas Configurações do Sócio.

---

## 📋 Checklist de entrega

- [x] Login com teclado físico funcionando
- [x] Painel de caixa com produtos dinâmicos
- [x] Painel de senhas no header
- [x] Modal de retirada com termômetro 50%
- [x] AdminView com 4 abas
- [x] Drag and drop de produtos com persistência
- [x] Fechamento de caixa com backup automático
- [x] Impressão contextual via Electron IPC
- [x] Gestão de PINs com envio de e-mail (mailto:)
- [x] package.json configurado para build sem assinatura
- [ ] **🔴 Gerar instalador NSIS + Portátil** ← PENDENTE
- [ ] Publicar release no GitHub com os .exe gerados

---

## 📌 Observações finais

1. O banco de dados é armazenado em: `C:\Users\[usuario]\AppData\Roaming\agiliza-corban\agiliza.db`
2. Os backups automáticos vão para: `Documentos\Agiliza-Corban-Backups\`
3. O app precisa do arquivo `sql-wasm.wasm` corretamente copiado via `extraResources` do electron-builder — já está configurado no `package.json`
4. Para futuras versões: considerar assinar digitalmente com certificado EV Code Signing (Sectigo/DigiCert) para evitar o alerta "Windows Defender SmartScreen" ao instalar

---

| Versão | Data | O que mudou |
|---|---|---|
| 1.0 | 2026-04-08 | Handover criado para finalização do build pelo Claude Code |
