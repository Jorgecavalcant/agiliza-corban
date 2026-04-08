# Agiliza Corban

> App desktop offline para Correspondentes Bancários — controle de caixa, retiradas e painel de senhas em poucos cliques.

---

## 📥 Download

Acesse a página de releases e baixe o instalador:

**[⬇️ Agiliza Corban v1.0.0 — Releases](https://github.com/Jorgecavalcant/agiliza-corban/releases/tag/v1.0.0)**

| Arquivo | Para quê |
|---|---|
| `Agiliza.Corban.Setup.1.0.0.exe` | Instalador completo (recomendado) |
| `Agiliza.Corban.1.0.0-Portatil.exe` | Versão portátil — roda sem instalar |

> ⚠️ O Windows pode exibir um aviso de segurança na primeira execução. Clique em **"Mais informações"** → **"Executar assim mesmo"**.

---

## 💡 O que é

O **Agiliza Corban** resolve um problema real de correspondentes bancários: o controle do caixa feito na calculadora, sem registro, sem auditoria, com perda de dinheiro por quebra de caixa.

O app roda **100% offline** no computador da loja, sem internet, sem nuvem, sem mensalidade.

---

## ✅ Funcionalidades (v1.0.0)

- **Login com PIN** — teclado físico e teclado virtual na tela
- **Painel de Caixa** — botões grandes para registrar serviços com 1 clique
- **Registro Avulso** — lança qualquer produto/serviço com nome e valor livres
- **Painel de Senhas** — chama próxima senha e envia bipe via porta COM
- **Termômetro de Retiradas** — verde se retirada < 50% do faturamento, vermelho se passar
- **Fechamento de Caixa (Z-Reading)** — compara caixa físico vs sistema, registra quebra/sobra
- **Visão Mensal** — receita e retiradas do mês com barra de progresso
- **CRUD de Produtos** — adiciona, edita, remove e reordena os botões do painel (drag & drop)
- **Configurações** — metas de faturamento, gestão de PINs e porta COM
- **Backup automático** — salva o banco em `Documentos\Agiliza-Corban-Backups\` a cada fechamento
- **Impressão contextual** — imprime a aba que está aberta no momento

---

## 🔐 Perfis de acesso

| Perfil | PIN padrão | Acesso |
|---|---|---|
| Sócio (Master) | `1234` | Tudo — caixa, fechamento, relatórios, configurações |
| Funcionário | `0000` | Somente painel de caixa e senhas |

> Os PINs podem ser alterados nas **Configurações** do painel do Sócio.

---

## 🖥️ Requisitos

- Windows 10 ou superior (64-bit)
- Sem necessidade de instalar Node.js, Python ou qualquer outra dependência

---

## 🗂️ Onde os dados ficam

| O quê | Onde |
|---|---|
| Banco de dados | `C:\Users\[usuario]\AppData\Roaming\agiliza-corban\agiliza.db` |
| Backups automáticos | `Documentos\Agiliza-Corban-Backups\` |

---

## 🛠️ Stack técnica

- [Electron 30](https://www.electronjs.org/) — cápsula desktop nativa
- [Next.js 14](https://nextjs.org/) — interface moderna (exportação estática)
- [sql.js](https://sql.js.org/) — SQLite rodando no navegador, sem binários externos
- [TailwindCSS 3](https://tailwindcss.com/) — estilização
- [serialport 12](https://serialport.io/) — integração com painel de senhas via porta COM

---

## 🏢 Desenvolvido por

**JC Tecnologia LTDA**  
Produto: Agiliza Corban v1.0.0 — 2026
