# PRD: Agiliza Corban (Caixa Rápido para Correspondente Bancário)

> **Produto**: Agiliza Corban
> **Versão**: 1.0
> **Data**: 2026-04-08
> **Status**: [ ] Rascunho  [ ] Em revisão  [x] Aprovado (Aguardando Confirmação Final do CEO)
> **Autor**: Jorge (CEO) + Claude (JC Agent Manager / Dir. Produto)

#### 1. Problema

**Qual é o problema?**
Correspondentes Bancários (Corbans) realizam centenas de micro-serviços diários (impressões, taxa de boletos, auxílio Gov.br). Atualmente, o controle desse faturamento é feito em calculadoras de forma manual, dificultando a auditoria do caixa, causando quebras de caixa (perda de dinheiro) e impedindo a previsibilidade do negócio para o sócio.

**Por que resolver agora?**
Sem controle ágil, o dono não consegue fechar o caixa adequadamente no fim do dia, sofre com possíveis erros/fraudes de funcionários e perde a noção exata de quanto pode retirar de Pró-labore sem sangrar o caixa da empresa.

**O que acontece se não resolver?**
A empresa continuará crescendo de forma desordenada, sem dados documentados, com vulnerabilidade nas retiradas societárias e perda de tempo no atendimento em balcão.

#### 2. Objetivos

| Objetivo | Métrica de sucesso |
|---|---|
| Registrar serviços (tabelados e avulsos) em poucos cliques | Redução do tempo de anotação de "caderninho" para < 3 segundos/cliente |
| Garantir backup automático para segurança de dados local | 100% dos fechamentos diários ou saídas do app salvos automaticamente |
| Controlar retiradas societárias de forma visual (Termômetro Cerbasi) | Manter saques do sócio < 50% do lucro líquido diário/mensal (KPI Visuais) |
| Comunicação universal com Painéis de Senha genéricos | Compatibilidade com displays Sonoros/Bipe (Porta COM/Serial/USB) sem uso de TV |

#### 3. Fora do escopo

- [x] Sincronização em nuvem e contas online (o app deve ser 100% offline, operando localmente).
- [x] Emissão de Nota Fiscal (o sistema é apenas para controle gerencial de caixa e lucro da loja).
- [x] Controle de Estoque Físico de produtos (foco 100% em Serviços/Taxas).
- [x] Segunda tela / TV para chamadas de senhas (usaremos integração direta com display luminoso barato de bipe).

**Por que**: É fundamental que o sistema seja absurdamente rápido e leve. Incluir regras fiscais ou burocráticas destruiria a promessa de fluidez.

#### 4. User Stories

**Usuários afetados:**
- **Funcionário (Caixa)**: Foco total em agilidade, sem acesso aos relatórios do sócio.
- **Sócio / Dono**: Acesso irrestrito com senha Master.

**Histórias:**
1. Como **Funcionário**, eu quero uma interface baseada em blocos/botões grandes, para que eu possa clicar rápido nos serviços principais sem usar teclado.
2. Como **Funcionário**, eu quero um botão "Produtos Diversos", para registrar rapidamente serviços incomuns (ex: recuperação de Gov.br) digitando nome e valor.
3. Como **Funcionário**, eu quero gerar senhas e emitir o Bipe no painel eletrônico com 1 clique.
4. Como **Sócio**, eu quero uma Assistente de "Fechamento de Caixa" (Z-Reading) que acusa as diferenças no dinheiro físico vs sistema.
5. Como **Sócio**, eu quero acessar a aba "Retiradas" e ver se o meu saque para Pessoa Física ficou Verde (<50%) ou Vermelho (>50%).
6. Como **Sócio**, eu quero poder editar registros que o funcionário errou, o que só posso fazer via Autenticação Master.

#### 5. Regras de negócio

1. **Retiradas (Termômetro):** Se Retirada <= 50% do Faturamento Líquido = Verde. Se Retirada > 50% = Vermelho. Abas por Dia e por Mês.
2. **Permissões de Caixa:** Funcionário **não** vê painel de Retiradas nem porcentagens. Funcionário **não** pode apagar/editar um serviço que já foi consolidade e salvo no dia. 
3. **Senhas:** Geração diária que zera na virada do dia (00:00).
4. **Inteligência de Backup:** O sistema irá gerar um dump do banco de dados (SQLite) e jogar na pasta designada **sempre que o app for fechado** ou às **20:00** diariamente.
5. **Data Retention (Limpeza de Cache):** A base só retém histórico nominal de 12 meses. Logs mais antigos que 365 dias são compilados em valores únicos mensais e as transações unitárias são deletadas, garantindo que o programa nunca fique pesado.

**Compliance:**
- [x] **LGPD:** Como é focado no serviço, desencoraja o preenchimento de CPF e Nome para evitar burocracia, além dos dados residirem 100% offline na máquina do dono.
- [x] **CVM175:** Não aplicável.

#### 6. Contexto técnico

- **Produto**: Agiliza Corban (Desktop Offline)
- **Framework Ouro**: Electron (Cápsula Desktop nativa), Next.js / React (Interface moderna e leve), TailwindCSS.
- **Banco de dados**: SQLite local (Ultra rápido, sem instalação complexa).
- **Integrações/Hardware**: Porta COM / Serial / USB Keyboard emulation para displays genéricos de senhas com Bipes. Impressora Térmica conectada ao Windows.

#### 7. Prioridade

- **Urgência**: [x] Alta
- **Depende de**: Definição da stack oficial final da JC Tecnologia (Electron + SQLite).
- **Bloqueia**: --

#### Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 1.0 | 2026-04-08 | Versão inicial alinhada com as necessidades do Correspondente. |
