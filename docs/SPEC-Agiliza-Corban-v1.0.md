### SPEC: Agiliza Corban (Caixa Rápido)

> **Produto**: Agiliza Corban
> **PRD de origem**: `PRD-Agiliza-Corban-v1.0.md`
> **Versão**: 1.0
> **Data**: 2026-04-08
> **Status**: [ ] Rascunho  [x] Revisada  [ ] Aprovada (Aguardando Jorge)
> **Autor**: Claude (JC Agent Manager / Diretor de Tecnologia) | **Revisor**: Agente Revisor

---

#### Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| Electron | 30+ | Cápsula Desktop (Windows) e Acesso a Hardware Local |
| Next.js | 14+ | Interface e Lógica de View (Exportação Estática) |
| TailwindCSS | 3+ | Estilização Rápida e UI Toolkit |
| SQLite (better-sqlite3)| 9+ | Banco de Dados Offline Embutido e Rápido |
| serialport | 12+ | Comunicação COM/Serial com Painéis de Senha |

**Dependências novas**: `electron-builder`, `better-sqlite3`, `serialport`, `lucide-react`.

---

#### Sprint 1: Setup Infrastructure & Database Offline

**Descrição**: Configurar o container desktop (Electron), o processo backend do Node que comunica com SQLite, e a gestão de arquivos de banco locais e de backup de emergência.
**Entregável**: App iniciando em Desktop com SQLite criado localmente e persistindo testes iniciais.
**Risco**: [ ] Baixo  [x] Médio  [ ] Alto
**Pré-requisito**: nenhum
**Agente**: desenvolvedor-backend

##### Feature 1.1: Inicialização do App Electron + Next.js estático
**Categoria**: build
**Descrição**: Configurar e amarrar Electron rodando files estáticos do Next.js do diretório out/.
**Steps:**
1. Criar setup Next.js com Tailwind
2. Criar script Electron (main.js)
3. Configurar IPC para o Render process falar com o Main process
**Critérios de aceite:**
- [ ] Aplicativo abre uma janela Desktop nativa.
- [ ] Não há dev servers rodando no pacote final.
**Edge cases:**
- E se o usuário abrir 2 instâncias do App? Bloquear e exibir a primeira instância.

##### Feature 1.2: Engine do SQLite Local
**Categoria**: database
**Descrição**: Configuração do connection layer e migrations.
**Steps:**
1. Criar db `agiliza.db` local (diretório `appData` do OS).
2. Criar migrations: `transactions` e `settings`.
**Critérios de aceite:**
- [ ] O banco é instanciado ao ligar a aplicação e nunca pede credenciais.
- [ ] As tabelas necessárias existem.
**Edge cases:**
- E se o banco de dados não tem permissão de escrita local? Fechar app avisando erro fatal por UI nativa do OS.

---

#### Sprint 2: Home de Registro Focado em Agilidade

**Descrição**: Construir a vista única de lançamentos diários focada em botões e macros rápidos.
**Entregável**: Interface de Caixa que registra cliques em botões de valor instantaneamente.
**Risco**: [x] Baixo  [ ] Médio  [ ] Alto
**Pré-requisito**: Sprint 1
**Agente**: desenvolvedor-frontend

##### Feature 2.1: UI Grid Rápido
**Categoria**: frontend
**Descrição**: Tela inicial limpa com "blocos" das taxas (R$1,00 - R$2,00 - Recebimento Boleto, etc).
**Steps:**
1. Desenhar a Sidebar (menu dono vs menu funcionário).
2. Área principal preenchida com grid de serviços.
3. IPC Send: a cada clique, disparar insert de registro no backend Electron.
**Critérios de aceite:**
- [ ] Registrar um serviço salva offline em menos de 1 segundo (UI otimística).
- [ ] Clicar no serviço "Diversos" faz aparecer Modal simples para nome/valor.
**Edge cases:**
- E se a base encher e a busca for lenta? As inserts não bloqueiam render ("fire-and-forget" até o IPC acusar retorno); renderizar na timeline via React suspense.

---

#### Sprint 3: Gestão de Senhas e Terminais

**Descrição**: Gerar senha diária, acionar bipe na porta serial/usb.
**Entregável**: Clicar em "Chamar Senha" dispara som (Bipe) na Porta COM1 do aparelho eletrônico físico.
**Risco**: [ ] Baixo  [x] Médio  [ ] Alto
**Pré-requisito**: Sprint 2
**Agente**: desenvolvedor-backend

##### Feature 3.1: Integração Porta Serial / Painel
**Categoria**: integracao
**Descrição**: Envio de comandos ASCII para o letreiro LED.
**Steps:**
1. Usar pacote `serialport` no processo Main do Electron.
2. Ler a String/Porta COM escolhida nas Configurações.
**Critérios de aceite:**
- [ ] Disparar a chamada acende o painel ou toca bipe no hardware via OS Windows.
**Edge cases:**
- E se o aparelho desconectar no momento? A library não deve travar o banco. Falhar silenciosamente com alerta Toast amarelo "Painel de Senhas Error", permitindo o registro de transação.

---

#### Sprint 4: Fechamento Analítico (Visão Sócio / Master)

**Descrição**: Relatórios de Termômetro de Retirada e Z-Reading.
**Entregável**: Área bloqueada por senha que acusa a saude financeira baseada na regra > 50%.
**Risco**: [ ] Baixo  [x] Médio  [ ] Alto
**Pré-requisito**: Sprint 1
**Agente**: desenvolvedor-backend

##### Feature 4.1: Termômetro Diário/Mensal
**Categoria**: frontend
**Descrição**: Painel consolidado que compara: Receitas Totais vs Retiradas PF.
**Steps:**
1. Consultar agregados via IPC.
2. Renderizar indicador Verde/Vermelho dependendo do rácio (>50%).
**Critérios de aceite:**
- [ ] Painel lida as queries offline.
- [ ] Funcionário regular vê erro "Acesso Restrito" ao tentar acessar.
**Edge cases:**
- E se nenhuma venda for feita, lida com divisão por zero no Termômetro? Fallback para 0% (Verde/Neutro).

---

#### Data Models

##### Tabela: `transactions`

| Coluna | Tipo | Constraints | Descrição |
|---|---|---|---|
| id | INTEGER | PK Auto Increment | ID nativo SQLite |
| type | VARCHAR | NOT NULL | RECIPE, AVULSO, SAQUE |
| description | VARCHAR | NOT NULL | Ex: Impressão P&B |
| amount_cents | INTEGER | NOT NULL | Evita float precision bugs |
| created_at | INTEGER | NOT NULL | Epoch timestamp |

**Índices**: `idx_trans_created`, `idx_type`

---

#### Estrutura de arquivos

```
Agiliza-Corban/
  main/                  <- Backend (Processo Electron Main)
    database/
    hardware/
    main.js
  renderer/              <- Frontend (Processo Electron Renderer / Next.js)
    src/
  docs/
    PRD-Agiliza-Corban-v1.0.md
    SPEC-Agiliza-Corban-v1.0.md  <- Você está aqui
```

---

#### Compliance

- [x] LGPD: Operação 100% offline; não armazenamos PII (Personally Identifiable Information) de clientes finais. Identidade é opcional.
- [x] CVM175: N/A - Sem sugestões de investimento. Atividade fim operacional.

---

#### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 1.0 | 2026-04-08 | Versão inicial gerada a partir do PRD. |

> **Próximo passo**: Mandar a SPEC para o Agente desenvolvedor executar Sprint por Sprint em sessões limpas.
