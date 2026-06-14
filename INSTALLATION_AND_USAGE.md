# Documentação de Instalação e Uso do Sistema de Controle de Faltas Escolares

Este documento detalha os passos necessários para instalar, configurar e utilizar o Sistema de Controle de Faltas Escolares em um ambiente local com XAMPP, MySQL e Node.js.

---

## Credenciais de Acesso (Usuários Padrão)

> **O sistema funciona em dois modos:** com banco de dados MySQL (modo completo) ou sem banco de dados (modo offline). Em ambos os casos os usuários abaixo são válidos.

### Administrador SME
| Campo   | Valor       |
|---------|-------------|
| Usuário | `admin`     |
| Senha   | `Admin@123` |

### Escolas (todas usam senha `123`)
O usuário de cada escola é o **nome completo da escola**, exatamente como listado abaixo:

| Usuário                    | Tipo  |
|----------------------------|-------|
| `CEI LUIZ FELIPE`          | escola |
| `CEI SAO CRISTOVAO`        | escola |
| `CEI ARCO IRIS`            | escola |
| `CEI BRUNO LEONARDO`       | escola |
| `CEI DOM FRANCO`           | escola |
| `CEI MENINO JESUS`         | escola |
| `CEI NOSSO LAR`            | escola |
| `CEI VASCO PAPA`           | escola |
| `CEI CRIANÇA FELIZ`        | escola |
| `CEM GUILHERME`            | escola |
| `CEM ORLANDO PEREIRA`      | escola |
| `EM MARIA HILDA`           | escola |
| `EM PAULO FREIRE`          | escola |
| `EM JOSE ANCHIETA`         | escola |
| `ERM ALVARES AZEVEDO`      | escola |
| `ERM CORA CORALINA`        | escola |
| `ERM EUCLIDES CUNHA`       | escola |
| `ERM OSVALDO CRUZ`         | escola |
| `ERM VINICIUS DE MORAIS`   | escola |

### Modo Offline (sem banco de dados)

O sistema possui **autenticação local embutida**. Se o backend ou o banco de dados não estiver disponível, o login ainda funciona com os usuários listados acima. Os dados ficam em memória durante a sessão.

Para usar neste modo, basta abrir o frontend no navegador — **não é necessário configurar MySQL**.

---

## 1. Visão Geral do Sistema

O Sistema de Controle de Faltas Escolares é uma aplicação web desenvolvida com React (frontend) e Node.js/Express (backend), utilizando MySQL como banco de dados. Ele permite o registro e acompanhamento de faltas de alunos, gerenciamento de usuários e notificações, e o controle de FICAI (Ficha de Comunicação de Aluno Infrequente).

## 2. Pré-requisitos

Para rodar o sistema, você precisará dos seguintes softwares instalados em seu computador:

*   **XAMPP**: Inclui Apache, MySQL e PHP. Utilizaremos o MySQL e, opcionalmente, o Apache para servir o frontend estático.
    *   Download: [https://www.apachefriends.org/index.html](https://www.apachefriends.org/index.html)
*   **Node.js e npm**: O ambiente de execução para o backend e o gerenciador de pacotes para as dependências do frontend e backend.
    *   Download: [https://nodejs.org/en/download](https://nodejs.org/en/download)
*   **Git (Opcional)**: Para clonar o repositório, se aplicável. Como você já forneceu o ZIP, não é estritamente necessário.

## 3. Configuração do Banco de Dados MySQL

1.  **Inicie o MySQL no XAMPP**: Abra o painel de controle do XAMPP e inicie o módulo `MySQL`.
2.  **Acesse o phpMyAdmin**: No painel de controle do XAMPP, clique no botão `Admin` ao lado do MySQL para abrir o phpMyAdmin no seu navegador (geralmente em `http://localhost/phpmyadmin`).
3.  **Crie o Banco de Dados**: No phpMyAdmin, clique na aba `SQL` e execute o seguinte comando para criar o banco de dados `sme_ficai`:
    ```sql
    CREATE DATABASE IF NOT EXISTS sme_ficai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE sme_ficai;
    ```
4.  **Importe o Esquema e Dados Iniciais**: Selecione o banco de dados `sme_ficai` no menu lateral esquerdo. Clique na aba `Importar`, selecione o arquivo `database_setup.sql` (localizado na pasta raiz do sistema) e clique em `Executar`.
    *   Este script criará todas as tabelas necessárias e inserirá um usuário administrador (`admin` / `Admin@123`) e algumas escolas de exemplo.

### Solução de Problemas de Banco de Dados:
Se ocorrer um erro ao importar o arquivo `database_setup.sql`:
1.  **Certifique-se de que o banco `sme_ficai` foi criado** e está selecionado no phpMyAdmin.
2.  **Tente executar o SQL manualmente**: Abra o arquivo `database_setup.sql` em um editor de texto (como o Bloco de Notas), copie todo o conteúdo, vá na aba `SQL` do phpMyAdmin, cole o conteúdo e clique em `Executar`.
3.  **Erro de Foreign Key**: O script foi atualizado para evitar erros de chaves estrangeiras circulares, criando as tabelas primeiro e adicionando as restrições depois.
4.  **Versão do MariaDB/MySQL**: O script agora usa `TEXT` em vez de `JSON` para garantir compatibilidade com versões mais antigas do XAMPP.

## 4. Configuração e Execução do Backend (Node.js/Express)

1.  **Navegue até a pasta do Backend**: Abra seu terminal ou prompt de comando e navegue até a pasta `server` dentro do diretório principal do sistema:
    ```bash
    cd /caminho/para/school-system/server
    ```
2.  **Instale as Dependências**: Execute o comando para instalar as dependências do Node.js:
    ```bash
    npm install
    ```
3.  **Configure as Variáveis de Ambiente**: Crie um arquivo chamado `.env` na pasta `server` (o mesmo diretório onde está `package.json`) com base no arquivo `.env.example` fornecido. Edite-o com suas configurações de banco de dados e portas:
    ```ini
    # Configuração do Banco de Dados MySQL
    DB_HOST=192.168.3.220  # Seu IP local
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=          # Senha do seu MySQL (deixe em branco se não tiver)
    DB_NAME=sme_ficai

    # Configuração do Servidor da API
    SERVER_PORT=5174
    SERVER_HOST=0.0.0.0

    # Configuração de CORS (URLs do frontend que podem acessar a API)
    CORS_ORIGINS=http://192.168.3.220:5173,http://24.152.30.159:5173,http://localhost:5173,http://127.0.0.1:5173
    ```
    *   **Importante**: Certifique-se de que `DB_HOST` seja o IP local do seu computador (`192.168.3.220`) para que o backend possa se conectar ao MySQL do XAMPP. O `SERVER_HOST=0.0.0.0` permite que o backend seja acessível de qualquer IP.
    *   A lista `CORS_ORIGINS` deve incluir todos os IPs e portas pelos quais você pretende acessar o frontend.
4.  **Inicie o Servidor Backend**: Execute o comando para iniciar o servidor da API:
    ```bash
    npm start
    ```
    *   O servidor estará rodando na porta `5174` (ou a porta configurada em `SERVER_PORT`). Você verá uma mensagem no console como `🚀 Servidor rodando em http://0.0.0.0:5174`.

## 5. Configuração e Execução do Frontend (React/Vite)

1.  **Navegue até a pasta Raiz do Frontend**: Abra um novo terminal ou prompt de comando e navegue até o diretório raiz do sistema (onde está o `package.json` principal):
    ```bash
    cd /caminho/para/school-system
    ```
2.  **Instale as Dependências**: Execute o comando para instalar as dependências do React:
    ```bash
    npm install
    ```
3.  **Configure as Variáveis de Ambiente**: Crie um arquivo chamado `.env` na pasta raiz do sistema (o mesmo diretório onde está `package.json`) com base no arquivo `.env.example` fornecido. Edite-o com a URL da sua API:
    ```ini
    # Configuração do Frontend
    VITE_API_URL=http://192.168.3.220:5174/api
    VITE_APP_TITLE=Sistema de Controle de Faltas Escolares
    ```
    *   **Importante**: `VITE_API_URL` deve apontar para o endereço onde seu backend está rodando. Use o IP local (`192.168.3.220`) se estiver acessando o frontend do mesmo computador, ou o IP público (`24.152.30.159`) se for acessar de outro dispositivo na rede ou pela internet.
4.  **Inicie o Servidor Frontend**: Execute o comando para iniciar o servidor de desenvolvimento do frontend:
    ```bash
    npm run dev
    ```
    *   O frontend estará rodando na porta `5173` (ou a porta configurada no `vite.config.ts`). Você verá uma mensagem no console indicando o endereço, como `http://192.168.3.220:5173`.

## 6. Acesso ao Sistema

Com o backend e o frontend rodando, você pode acessar o sistema através do seu navegador:

*   **Acesso Local (no mesmo computador)**:
    *   `http://localhost:5173`
    *   `http://127.0.0.1:5173`
    *   `http://192.168.3.220:5173` (usando seu IP local)
*   **Acesso Externo (de outros dispositivos na sua rede local ou pela internet)**:
    *   `http://192.168.3.220:5173` (para dispositivos na mesma rede local)
    *   `http://24.152.30.159:5173` (usando seu IP público, se as portas estiverem configuradas no seu roteador)

**Credenciais de Acesso Inicial:**
*   **Administrador** — Usuário: `admin` | Senha: `Admin@123`
*   **Escolas** — Usuário: nome da escola (ex: `EM PAULO FREIRE`) | Senha: `123`

> Consulte a tabela completa de usuários no início deste documento.

## 7. Configurações de Rede (Portas)

As portas utilizadas pelo sistema são:

*   **5173**: Porta padrão para o frontend (Vite).
*   **5174**: Porta padrão para o backend (Node.js/Express API).

Se você precisar acessar o sistema de fora da sua rede local (usando o IP público `24.152.30.159`), será necessário configurar o **redirecionamento de portas (port forwarding)** no seu roteador para as portas `5173` e `5174`, apontando para o IP local do seu computador (`192.168.3.220`). As portas `5175` e `5176` não estão sendo utilizadas diretamente por esta configuração do sistema, mas podem ser reservadas para futuras funcionalidades ou outros serviços.

## 8. Estrutura de Pastas

```
school-system/
├── public/
├── src/
│   ├── components/
│   ├── lib/
│   │   ├── api.ts         # Novo arquivo para chamadas à API
│   │   ├── store-api.ts   # Novo store que usa a API
│   │   └── types.ts
│   ├── utils/
│   └── App.tsx
├── server/              # Novo diretório para o backend Node.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── .env.example         # Variáveis de ambiente para o frontend
├── database_setup.sql   # Script de criação do banco de dados e dados iniciais
├── INSTALLATION_AND_USAGE.md # Este documento
├── package.json         # Dependências do frontend
├── vite.config.ts
└── ... outros arquivos do frontend
```

Com estas instruções, você deve ser capaz de configurar e rodar o sistema de controle de faltas escolares com MySQL e XAMPP em seu ambiente. Em caso de dúvidas ou problemas, verifique os logs do terminal do backend e do frontend para mensagens de erro.
