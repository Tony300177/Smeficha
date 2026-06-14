-- Script de Configuração do Banco de Dados - SME FICAI
-- Compatível com MySQL e MariaDB (XAMPP)

-- 1. Criação do Banco de Dados
DROP DATABASE IF EXISTS sme_ficai;
CREATE DATABASE sme_ficai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sme_ficai;

-- 2. Tabela de Usuários
CREATE TABLE Usuarios (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    usuario VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil ENUM('admin', 'escola') NOT NULL,
    escola VARCHAR(255) DEFAULT NULL,
    data_cadastro DATETIME NOT NULL,
    ativo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

-- 3. Tabela de Ficai (Criada primeiro para evitar erro de FK em Faltas)
CREATE TABLE Ficai (
    id VARCHAR(50) PRIMARY KEY,
    aluno VARCHAR(255) NOT NULL,
    escola VARCHAR(255) NOT NULL,
    serie VARCHAR(100) NOT NULL,
    turno ENUM('Matutino', 'Vespertino', 'Integral') NOT NULL,
    turma VARCHAR(100) NOT NULL,
    motivo_ficai VARCHAR(255) NOT NULL,
    data_inscricao DATETIME NOT NULL,
    situacao ENUM('Em acompanhamento', 'Encaminhada', 'Resolvida', 'Arquivada') NOT NULL,
    observacao TEXT DEFAULT NULL,
    data_cadastro DATETIME NOT NULL,
    falta_id VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB;

-- 4. Tabela de Faltas
CREATE TABLE Faltas (
    id VARCHAR(50) PRIMARY KEY,
    escola VARCHAR(255) NOT NULL,
    nome_aluno VARCHAR(255) NOT NULL,
    mes_ano VARCHAR(7) NOT NULL, -- Formato YYYY-MM
    dias_falta INT NOT NULL,
    falta_dias TEXT DEFAULT NULL, -- Usando TEXT em vez de JSON para maior compatibilidade com versões antigas do MariaDB
    turma_ano VARCHAR(255) NOT NULL,
    responsavel VARCHAR(255) NOT NULL,
    celular VARCHAR(20) NOT NULL,
    observacao_administrador TEXT DEFAULT NULL,
    usuario_lancamento VARCHAR(255) NOT NULL,
    data_cadastro DATETIME NOT NULL,
    ficai_aderido TINYINT(1) NOT NULL DEFAULT 0,
    ficai_id VARCHAR(50) DEFAULT NULL,
    CONSTRAINT fk_falta_ficai FOREIGN KEY (ficai_id) REFERENCES Ficai(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Adicionar a Foreign Key na tabela Ficai (Agora que Faltas existe)
ALTER TABLE Ficai ADD CONSTRAINT fk_ficai_falta FOREIGN KEY (falta_id) REFERENCES Faltas(id) ON DELETE SET NULL;

-- 6. Tabela de Notificações
CREATE TABLE Notificacoes (
    id VARCHAR(50) PRIMARY KEY,
    para_perfil ENUM('admin', 'escola', 'todos') NOT NULL,
    escola_alvo VARCHAR(255) DEFAULT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    lida TINYINT(1) DEFAULT 0,
    data DATETIME NOT NULL,
    tipo ENUM('info', 'alerta', 'sucesso', 'ficai') NOT NULL
) ENGINE=InnoDB;

-- 7. Tabela de Logs de Acesso
CREATE TABLE LogAcesso (
    id VARCHAR(50) PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL,
    acao VARCHAR(255) NOT NULL,
    data DATETIME NOT NULL
) ENGINE=InnoDB;

-- ============================================================
-- 8. Inserção de Usuários Iniciais (Seed)
-- ============================================================
-- ADMINISTRADOR
-- Usuário: admin  |  Senha: Admin@123
INSERT INTO Usuarios (id, nome, usuario, senha, perfil, escola, data_cadastro, ativo) VALUES
('u_admin', 'Administrador SME', 'admin', 'Admin@123', 'admin', NULL, NOW(), 1);

-- ESCOLAS CEI
-- Usuário: nome da escola  |  Senha: 123
INSERT INTO Usuarios (id, nome, usuario, senha, perfil, escola, data_cadastro, ativo) VALUES
('u_0',  'CEI LUIZ FELIPE',      'CEI LUIZ FELIPE',      '123', 'escola', 'CEI LUIZ FELIPE',      NOW(), 1),
('u_1',  'CEI SAO CRISTOVAO',    'CEI SAO CRISTOVAO',    '123', 'escola', 'CEI SAO CRISTOVAO',    NOW(), 1),
('u_2',  'CEI ARCO IRIS',        'CEI ARCO IRIS',        '123', 'escola', 'CEI ARCO IRIS',        NOW(), 1),
('u_3',  'CEI BRUNO LEONARDO',   'CEI BRUNO LEONARDO',   '123', 'escola', 'CEI BRUNO LEONARDO',   NOW(), 1),
('u_4',  'CEI DOM FRANCO',       'CEI DOM FRANCO',       '123', 'escola', 'CEI DOM FRANCO',       NOW(), 1),
('u_5',  'CEI MENINO JESUS',     'CEI MENINO JESUS',     '123', 'escola', 'CEI MENINO JESUS',     NOW(), 1),
('u_6',  'CEI NOSSO LAR',        'CEI NOSSO LAR',        '123', 'escola', 'CEI NOSSO LAR',        NOW(), 1),
('u_7',  'CEI VASCO PAPA',       'CEI VASCO PAPA',       '123', 'escola', 'CEI VASCO PAPA',       NOW(), 1),
('u_8',  'CEI CRIANÇA FELIZ',    'CEI CRIANÇA FELIZ',    '123', 'escola', 'CEI CRIANÇA FELIZ',    NOW(), 1);

-- ESCOLAS CEM
INSERT INTO Usuarios (id, nome, usuario, senha, perfil, escola, data_cadastro, ativo) VALUES
('u_9',  'CEM GUILHERME',        'CEM GUILHERME',        '123', 'escola', 'CEM GUILHERME',        NOW(), 1),
('u_10', 'CEM ORLANDO PEREIRA',  'CEM ORLANDO PEREIRA',  '123', 'escola', 'CEM ORLANDO PEREIRA',  NOW(), 1);

-- ESCOLAS EM
INSERT INTO Usuarios (id, nome, usuario, senha, perfil, escola, data_cadastro, ativo) VALUES
('u_11', 'EM MARIA HILDA',       'EM MARIA HILDA',       '123', 'escola', 'EM MARIA HILDA',       NOW(), 1),
('u_12', 'EM PAULO FREIRE',      'EM PAULO FREIRE',      '123', 'escola', 'EM PAULO FREIRE',      NOW(), 1),
('u_13', 'EM JOSE ANCHIETA',     'EM JOSE ANCHIETA',     '123', 'escola', 'EM JOSE ANCHIETA',     NOW(), 1);

-- ESCOLAS ERM
INSERT INTO Usuarios (id, nome, usuario, senha, perfil, escola, data_cadastro, ativo) VALUES
('u_14', 'ERM ALVARES AZEVEDO',  'ERM ALVARES AZEVEDO',  '123', 'escola', 'ERM ALVARES AZEVEDO',  NOW(), 1),
('u_15', 'ERM CORA CORALINA',    'ERM CORA CORALINA',    '123', 'escola', 'ERM CORA CORALINA',    NOW(), 1),
('u_16', 'ERM EUCLIDES CUNHA',   'ERM EUCLIDES CUNHA',   '123', 'escola', 'ERM EUCLIDES CUNHA',   NOW(), 1),
('u_17', 'ERM OSVALDO CRUZ',     'ERM OSVALDO CRUZ',     '123', 'escola', 'ERM OSVALDO CRUZ',     NOW(), 1),
('u_18', 'ERM VINICIUS DE MORAIS','ERM VINICIUS DE MORAIS','123','escola', 'ERM VINICIUS DE MORAIS',NOW(), 1);
