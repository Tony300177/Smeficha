import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 5174;

// Configuração do Pool PostgreSQL
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Função auxiliar para gerar IDs
function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// SSE
const sseClients = new Set();
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const heartbeat = setInterval(() => { res.write(': heartbeat\n\n'); }, 25000);
  sseClients.add(res);
  req.on('close', () => { clearInterval(heartbeat); sseClients.delete(res); });
});

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => client.write(payload));
}

// Seed
const ESCOLAS_SEED = [
  'CEI LUIZ FELIPE', 'CEI SAO CRISTOVAO', 'CEI ARCO IRIS',
  'CEI BRUNO LEONARDO', 'CEI DOM FRANCO', 'CEI MENINO JESUS',
  'CEI NOSSO LAR', 'CEI VASCO PAPA', 'CEI CRIANÇA FELIZ',
  'CEM GUILHERME', 'CEM ORLANDO PEREIRA',
  'EM MARIA HILDA', 'EM PAULO FREIRE', 'EM JOSE ANCHIETA',
  'ERM ALVARES AZEVEDO', 'ERM CORA CORALINA', 'ERM EUCLIDES CUNHA',
  'ERM OSVALDO CRUZ', 'ERM VINICIUS DE MORAIS',
];

async function ensureTablesAndSeed() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS Usuarios (
        id VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        usuario VARCHAR(100) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        perfil VARCHAR(20) NOT NULL,
        escola VARCHAR(255) DEFAULT NULL,
        data_cadastro TIMESTAMP NOT NULL,
        ativo BOOLEAN DEFAULT TRUE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Ficai (
        id VARCHAR(50) PRIMARY KEY,
        aluno VARCHAR(255) NOT NULL,
        escola VARCHAR(255) NOT NULL,
        serie VARCHAR(100) NOT NULL,
        turno VARCHAR(20) NOT NULL,
        turma VARCHAR(100) NOT NULL,
        motivo_ficai VARCHAR(255) NOT NULL,
        data_inscricao TIMESTAMP NOT NULL,
        situacao VARCHAR(50) NOT NULL,
        observacao TEXT DEFAULT NULL,
        data_cadastro TIMESTAMP NOT NULL,
        falta_id VARCHAR(50) DEFAULT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Faltas (
        id VARCHAR(50) PRIMARY KEY,
        escola VARCHAR(255) NOT NULL,
        nome_aluno VARCHAR(255) NOT NULL,
        mes_ano VARCHAR(7) NOT NULL,
        dias_falta INT NOT NULL,
        falta_dias TEXT DEFAULT NULL,
        turma_ano VARCHAR(255) NOT NULL,
        responsavel VARCHAR(255) NOT NULL,
        celular VARCHAR(20) NOT NULL,
        observacao_administrador TEXT DEFAULT NULL,
        usuario_lancamento VARCHAR(255) NOT NULL,
        data_cadastro TIMESTAMP NOT NULL,
        ficai_aderido BOOLEAN NOT NULL DEFAULT FALSE,
        ficai_id VARCHAR(50) DEFAULT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS Notificacoes (
        id VARCHAR(50) PRIMARY KEY,
        para_perfil VARCHAR(20) NOT NULL,
        escola_alvo VARCHAR(255) DEFAULT NULL,
        titulo VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        lida BOOLEAN DEFAULT FALSE,
        data TIMESTAMP NOT NULL,
        tipo VARCHAR(20) NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS LogAcesso (
        id VARCHAR(50) PRIMARY KEY,
        usuario VARCHAR(100) NOT NULL,
        acao VARCHAR(255) NOT NULL,
        data TIMESTAMP NOT NULL
      )
    `);

    // Seed: admin
    await client.query(`
      INSERT INTO Usuarios (id, nome, usuario, senha, perfil, escola, data_cadastro, ativo)
      VALUES ('u_admin', 'Administrador SME', 'admin', 'Admin@123', 'admin', NULL, NOW(), TRUE)
      ON CONFLICT (usuario) DO NOTHING
    `);

    // Seed: escolas
    for (let i = 0; i < ESCOLAS_SEED.length; i++) {
      const escola = ESCOLAS_SEED[i];
      await client.query(`
        INSERT INTO Usuarios (id, nome, usuario, senha, perfil, escola, data_cadastro, ativo)
        VALUES ($1, $2, $3, '123', 'escola', $4, NOW(), TRUE)
        ON CONFLICT (usuario) DO NOTHING
      `, [`u_${i}`, escola, escola, escola]);
    }

    console.log('✅ Tabelas e usuários padrão verificados/criados com sucesso (PostgreSQL).');
  } catch (err) {
    console.error('⚠️  Erro no seed inicial:', err.message);
  } finally {
    client.release();
  }
}

// Auth
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const { rows } = await pool.query(
      'SELECT * FROM Usuarios WHERE usuario = $1 AND senha = $2 AND ativo = TRUE',
      [usuario, senha]
    );
    if (rows.length > 0) {
      const user = rows[0];
      await pool.query(
        'INSERT INTO LogAcesso (id, usuario, acao, data) VALUES ($1, $2, $3, $4)',
        [generateId(), user.usuario, 'LOGIN', new Date()]
      );
      res.json({ success: true, usuario: user });
    } else {
      res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
    }
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
});

// Usuários
app.get('/api/usuarios', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM Usuarios ORDER BY perfil, nome');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const { nome, usuario, senha, perfil, escola } = req.body;
    const id = generateId();
    await pool.query(
      'INSERT INTO Usuarios (id, nome, usuario, senha, perfil, escola, data_cadastro, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)',
      [id, nome, usuario, senha, perfil, escola || null, new Date()]
    );
    res.json({ id, nome, usuario, perfil, escola, data_cadastro: new Date(), ativo: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE Usuarios SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Faltas
app.get('/api/faltas', async (req, res) => {
  try {
    const { escola } = req.query;
    let query = 'SELECT * FROM Faltas ORDER BY data_cadastro DESC';
    let params = [];
    if (escola) {
      query = 'SELECT * FROM Faltas WHERE escola = $1 ORDER BY data_cadastro DESC';
      params = [escola];
    }
    const { rows } = await pool.query(query, params);
    const faltas = rows.map(f => ({
      ...f,
      falta_dias: typeof f.falta_dias === 'string' ? JSON.parse(f.falta_dias) : (f.falta_dias || [])
    }));
    res.json(faltas);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.post('/api/faltas', async (req, res) => {
  try {
    const { escola, nome_aluno, mes_ano, dias_falta, falta_dias, turma_ano, responsavel, celular, usuario_lancamento, ficai_aderido } = req.body;
    const id = generateId();
    await pool.query(
      `INSERT INTO Faltas (id, escola, nome_aluno, mes_ano, dias_falta, falta_dias, turma_ano, responsavel, celular, usuario_lancamento, data_cadastro, ficai_aderido)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, escola, nome_aluno, mes_ano, dias_falta, JSON.stringify(falta_dias || []), turma_ano, responsavel, celular, usuario_lancamento, new Date(), ficai_aderido ? true : false]
    );
    const notifId = generateId();
    await pool.query(
      `INSERT INTO Notificacoes (id, para_perfil, escola_alvo, titulo, mensagem, lida, data, tipo)
       VALUES ($1, 'admin', NULL, $2, $3, FALSE, NOW(), 'alerta')`,
      [notifId, `Novo registro de falta — ${escola}`, `${nome_aluno} · ${dias_falta} dia(s) · ${mes_ano} · Lançado por: ${usuario_lancamento}`]
    );
    const rec = { id, escola, nome_aluno, mes_ano, dias_falta, falta_dias, turma_ano, responsavel, celular, usuario_lancamento, data_cadastro: new Date(), ficai_aderido };
    broadcast('nova_falta', rec);
    res.json(rec);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.put('/api/faltas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.falta_dias) updates.falta_dias = JSON.stringify(updates.falta_dias);
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE Faltas SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
    broadcast('falta_atualizada', { id, ...updates });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.delete('/api/faltas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM Faltas WHERE id = $1', [id]);
    broadcast('falta_removida', { id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// FICAI
app.get('/api/ficai', async (req, res) => {
  try {
    const { escola } = req.query;
    let query = 'SELECT * FROM Ficai ORDER BY data_cadastro DESC';
    let params = [];
    if (escola) {
      query = 'SELECT * FROM Ficai WHERE escola = $1 ORDER BY data_cadastro DESC';
      params = [escola];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.post('/api/ficai', async (req, res) => {
  try {
    const { aluno, escola, serie, turno, turma, motivo_ficai, data_inscricao, situacao, observacao, falta_id } = req.body;
    const id = generateId();
    await pool.query(
      `INSERT INTO Ficai (id, aluno, escola, serie, turno, turma, motivo_ficai, data_inscricao, situacao, observacao, data_cadastro, falta_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, aluno, escola, serie, turno, turma, motivo_ficai, data_inscricao, situacao, observacao || null, new Date(), falta_id || null]
    );
    const notifId = generateId();
    await pool.query(
      `INSERT INTO Notificacoes (id, para_perfil, escola_alvo, titulo, mensagem, lida, data, tipo)
       VALUES ($1, 'admin', NULL, $2, $3, FALSE, NOW(), 'ficai')`,
      [notifId, `Novo FICAI — ${escola}`, `${aluno} · ${serie} · ${turma} · Situação: ${situacao}`]
    );
    const rec = { id, aluno, escola, serie, turno, turma, motivo_ficai, data_inscricao, situacao, observacao, data_cadastro: new Date(), falta_id };
    broadcast('nova_ficai', rec);
    res.json(rec);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.put('/api/ficai/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE Ficai SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
    broadcast('ficai_atualizada', { id, ...updates });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.delete('/api/ficai/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM Ficai WHERE id = $1', [id]);
    broadcast('ficai_removida', { id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Notificações
app.get('/api/notificacoes', async (req, res) => {
  try {
    const { perfil, escola } = req.query;
    let query = 'SELECT * FROM Notificacoes WHERE (para_perfil = $1 OR para_perfil = \'todos\')';
    let params = [perfil];
    if (escola) {
      query += ' AND (escola_alvo = $2 OR escola_alvo IS NULL)';
      params.push(escola);
    }
    query += ' ORDER BY data DESC LIMIT 50';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.put('/api/notificacoes/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE Notificacoes SET lida = TRUE WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Logs e Health
app.get('/api/logs', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM LogAcesso ORDER BY data DESC LIMIT 100');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Servir Frontend
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  await ensureTablesAndSeed();
});
