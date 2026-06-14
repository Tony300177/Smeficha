import { useEffect, useState } from 'react';
import { Falta, Ficai, Usuario, Notificacao, LogAcesso, ESCOLAS, Perfil } from './types';

const STORAGE_KEY = 'sme-ficai-v4';

type DB = {
  usuarios: Usuario[];
  faltas: Falta[];
  ficai: Ficai[];
  notificacoes: Notificacao[];
  logs: LogAcesso[];
  initialized: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function seed(): DB {
  const now = new Date().toISOString();
  
  const usuarios: Usuario[] = [
    {
      id: 'u_admin',
      nome: 'Administrador SME',
      usuario: 'admin',
      senha: 'Admin@123',
      perfil: 'admin',
      escola: null,
      data_cadastro: now,
      ativo: true,
    },
    ...ESCOLAS.map((escola, i) => ({
      id: `u_${i}`,
      nome: escola,
      usuario: escola,
      senha: '123',
      perfil: 'escola' as const,
      escola,
      data_cadastro: now,
      ativo: true,
    })),
  ];

  const sampleAlunos = [
    ['Ana Luiza Santos', 'EM PAULO FREIRE', '5º Ano B', 'Marcia Santos', '(42) 99841-2210'],
    ['Gabriel Henrique Oliveira', 'EM MARIA HILDA', '3º Ano A', 'Roberta Oliveira', '(42) 99711-5582'],
    ['Isabela Costa Ribeiro', 'CEI CRIANÇA FELIZ', 'Pré II', 'Luciana Costa', '(42) 98833-1092'],
    ['Miguel Fernandes', 'CEM GUILHERME', '8º Ano C', 'Paulo Fernandes', '(42) 99177-6620'],
    ['Sophia Almeida', 'ERM CORA CORALINA', '4º Ano Rural', 'Eliane Almeida', '(42) 99234-8841'],
    ['Davi Lucas Pereira', 'CEI ARCO IRIS', 'Maternal II', 'Carla Pereira', '(42) 98600-4122'],
    ['Helena Martins', 'EM JOSE ANCHIETA', '7º Ano A', 'Sandra Martins', '(42) 99850-1109'],
    ['Arthur Silva', 'ERM EUCLIDES CUNHA', '6º Ano', 'João Silva', '(42) 99102-5544'],
    ['Valentina Rocha', 'CEI LUIZ FELIPE', 'Pré I', 'Patrícia Rocha', '(42) 98775-3011'],
    ['Bernardo Castro', 'CEM ORLANDO PEREIRA', '9º Ano B', 'Tânia Castro', '(42) 99912-8801'],
    ['Laura Gomes', 'ERM OSVALDO CRUZ', '5º Ano', 'Renata Gomes', '(42) 98810-4428'],
    ['Heitor Nunes', 'CEI SAO CRISTOVAO', 'Berçário', 'Fábio Nunes', '(42) 99660-7733'],
  ];

  const meses = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];

  const faltas: Falta[] = sampleAlunos.map((a, idx) => {
    const mes = meses[idx % meses.length];
    const dias = [3, 7, 12, 5, 15, 9, 6, 18, 4, 11, 8, 2][idx];
    // gera dias de falta espaçados no mês
    const falta_dias = Array.from({length: dias}, (_,i)=> 2 + i*2).filter(d=>d<=28);
    return {
      id: uid(),
      nome_aluno: a[0],
      escola: a[1],
      turma_ano: a[2],
      responsavel: a[3],
      celular: a[4],
      mes_ano: mes,
      dias_falta: dias,
      falta_dias,
      observacao_administrador: idx % 3 === 0 ? (dias > 10 ? 'Realizar contato urgente com a família. Encaminhar para acompanhamento pedagógico.' : 'Solicitar justificativa das faltas.') : '',
      usuario_lancamento: a[1],
      data_cadastro: new Date(Date.now() - idx * 86400000 * 2.1).toISOString(),
      ficai_aderido: dias >= 12,
    };
  });

  // Adiciona mais registros para algumas escolas
  const extras: Omit<Falta, 'id'|'data_cadastro'>[] = [
    { escola: 'EM PAULO FREIRE', nome_aluno: 'Rafael Mendes Souza', mes_ano: '2026-02', dias_falta: 14, falta_dias: [2,3,5,6,9,10,12,13,16,17,19,20,23,24], turma_ano: '5º Ano A', responsavel: 'Cláudia Mendes', celular: '(42) 99887-1201', observacao_administrador: 'Verificar situação junto à coordenação.', usuario_lancamento: 'EM PAULO FREIRE', ficai_aderido: true },
    { escola: 'CEI MENINO JESUS', nome_aluno: 'Alice Vitória Lima', mes_ano: '2026-01', dias_falta: 6, falta_dias: [5,8,12,15,20,26], turma_ano: 'Pré II', responsavel: 'Vanessa Lima', celular: '(42) 99124-5520', usuario_lancamento: 'CEI MENINO JESUS', ficai_aderido: false },
    { escola: 'ERM VINICIUS DE MORAIS', nome_aluno: 'Enzo Gabriel Ramos', mes_ano: '2026-02', dias_falta: 22, falta_dias: [1,2,3,4,5,6,9,10,11,12,13,16,17,18,19,20,23,24,25,26,27,28], turma_ano: '9º Ano Rural', responsavel: 'Marlene Ramos', celular: '(42) 98890-3345', observacao_administrador: 'Encaminhar Conselho Tutelar - FICAI ativa.', usuario_lancamento: 'ERM VINICIUS DE MORAIS', ficai_aderido: true },
  ];
  extras.forEach(e=>{
    faltas.push({ ...e, id: uid(), data_cadastro: new Date(Date.now() - Math.random()*86400000*18).toISOString() });
  });

  const ficai: Ficai[] = [
    {
      id: uid(),
      aluno: 'Sophia Almeida',
      escola: 'ERM CORA CORALINA',
      serie: '4º Ano',
      turno: 'Matutino',
      turma: '4º Ano Rural',
      motivo_ficai: 'Excesso de faltas',
      data_inscricao: '2025-12-10',
      situacao: 'Em acompanhamento',
      observacao: 'Família contatada. Retorno parcial.',
      data_cadastro: now,
      falta_id: faltas.find(f=>f.nome_aluno==='Sophia Almeida')?.id,
    },
    {
      id: uid(),
      aluno: 'Arthur Silva',
      escola: 'ERM EUCLIDES CUNHA',
      serie: '6º Ano',
      turno: 'Vespertino',
      turma: '6º Ano',
      motivo_ficai: 'Infrequência escolar',
      data_inscricao: '2026-01-18',
      situacao: 'Encaminhada',
      observacao: 'Encaminhado ao Conselho Tutelar em 22/01/2026.',
      data_cadastro: now,
    },
    {
      id: uid(),
      aluno: 'Bernardo Castro',
      escola: 'CEM ORLANDO PEREIRA',
      serie: '9º Ano',
      turno: 'Matutino',
      turma: '9º Ano B',
      motivo_ficai: 'Abandono escolar',
      data_inscricao: '2026-02-05',
      situacao: 'Em acompanhamento',
      observacao: '',
      data_cadastro: now,
    },
    {
      id: uid(),
      aluno: 'Rafael Mendes Souza',
      escola: 'EM PAULO FREIRE',
      serie: '5º Ano',
      turno: 'Vespertino',
      turma: '5º Ano A',
      motivo_ficai: 'Excesso de faltas',
      data_inscricao: '2026-02-10',
      situacao: 'Em acompanhamento',
      observacao: 'Agendado visita domiciliar.',
      data_cadastro: now,
    },
    {
      id: uid(),
      aluno: 'Enzo Gabriel Ramos',
      escola: 'ERM VINICIUS DE MORAIS',
      serie: '9º Ano',
      turno: 'Matutino',
      turma: '9º Ano Rural',
      motivo_ficai: 'Abandono escolar',
      data_inscricao: '2026-02-02',
      situacao: 'Encaminhada',
      observacao: 'Conselho Tutelar notificado.',
      data_cadastro: now,
    },
  ];

  const notificacoes: Notificacao[] = [
    { id: uid(), para_perfil: 'admin', titulo: 'Novo registro de falta', mensagem: 'EM PAULO FREIRE enviou 1 registro com 14 dias de falta.', lida: false, data: new Date(Date.now() - 3600*1000*3).toISOString(), tipo: 'alerta' },
    { id: uid(), para_perfil: 'escola', escola_alvo: 'EM PAULO FREIRE', titulo: 'Observação da SME', mensagem: 'Verificar situação junto à coordenação. - Rafael Mendes Souza', lida: false, data: new Date(Date.now() - 3600*1000*26).toISOString(), tipo: 'info' },
    { id: uid(), para_perfil: 'admin', titulo: 'FICAI cadastrada', mensagem: 'Enzo Gabriel Ramos - ERM VINICIUS DE MORAIS - Abandono escolar', lida: false, data: new Date(Date.now() - 3600*1000*15).toISOString(), tipo: 'ficai' },
  ];

  return { usuarios, faltas, ficai, notificacoes, logs: [], initialized: true };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const db = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

let db: DB = load();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent('sme-db-updated'));
}

export const store = {
  getState() { return db; },

  authenticate(usuario: string, senha: string): Usuario | null {
    const u = db.usuarios.find(x => x.usuario === usuario && x.senha === senha && x.ativo !== false);
    if (u) {
      db.logs.push({ id: uid(), usuario: u.usuario, acao: 'LOGIN', data: new Date().toISOString()});
      save();
      return u;
    }
    return null;
  },

  listFaltas(escola?: string) {
    return escola ? db.faltas.filter(f => f.escola === escola) : [...db.faltas];
  },

  addFalta(data: Omit<Falta, 'id'|'data_cadastro'>) {
    const rec: Falta = { ...data, id: uid(), data_cadastro: new Date().toISOString() };
    db.faltas.unshift(rec);
    db.notificacoes.unshift({
      id: uid(),
      para_perfil: 'admin',
      titulo: 'Novo registro de falta',
      mensagem: `${rec.escola} registrou ${rec.dias_falta} falta(s) - ${rec.nome_aluno}`,
      lida: false,
      data: new Date().toISOString(),
      tipo: rec.dias_falta >= 10 ? 'alerta' : 'info',
    });
    save();
    return rec;
  },

  updateFalta(id: string, patch: Partial<Falta>) {
    const i = db.faltas.findIndex(f => f.id === id);
    if (i >= 0) { db.faltas[i] = { ...db.faltas[i], ...patch }; save(); return db.faltas[i]; }
    return null;
  },

  deleteFalta(id: string) {
    db.faltas = db.faltas.filter(f => f.id !== id);
    save();
  },

  setObservacao(id: string, obs: string) {
    const falta = db.faltas.find(f => f.id === id);
    if (!falta) return;
    falta.observacao_administrador = obs;
    db.notificacoes.unshift({
      id: uid(),
      para_perfil: 'escola',
      escola_alvo: falta.escola,
      titulo: 'Nova observação da SME',
      mensagem: `${falta.nome_aluno}: ${obs.slice(0, 80)}`,
      lida: false,
      data: new Date().toISOString(),
      tipo: 'info',
    });
    save();
  },

  listFicai(escola?: string) {
    return escola ? db.ficai.filter(f => f.escola === escola) : [...db.ficai];
  },

  addFicai(data: Omit<Ficai, 'id'|'data_cadastro'>) {
    const rec: Ficai = { ...data, id: uid(), data_cadastro: new Date().toISOString() };
    db.ficai.unshift(rec);
    db.notificacoes.unshift({
      id: uid(),
      para_perfil: 'admin',
      titulo: 'FICAI cadastrada',
      mensagem: `${rec.aluno} - ${rec.escola} - ${rec.motivo_ficai}`,
      lida: false,
      data: new Date().toISOString(),
      tipo: 'ficai',
    });
    save();
    return rec;
  },

  updateFicai(id: string, patch: Partial<Ficai>) {
    const i = db.ficai.findIndex(f => f.id === id);
    if (i >= 0) { db.ficai[i] = { ...db.ficai[i], ...patch };
      db.notificacoes.unshift({
        id: uid(),
        para_perfil: 'escola',
        escola_alvo: db.ficai[i].escola,
        titulo: 'Atualização FICAI',
        mensagem: `${db.ficai[i].aluno} - Situação: ${db.ficai[i].situacao}`,
        lida: false,
        data: new Date().toISOString(),
        tipo: 'ficai',
      });
      save(); return db.ficai[i];
    }
    return null;
  },

  deleteFicai(id: string) {
    db.ficai = db.ficai.filter(f => f.id !== id); save();
  },

  listUsuarios() { return [...db.usuarios]; },

  updateUsuario(id: string, patch: Partial<Usuario>) {
    const i = db.usuarios.findIndex(u=>u.id===id);
    if (i>=0){ db.usuarios[i] = { ...db.usuarios[i], ...patch}; save(); return db.usuarios[i]; }
    return null;
  },

  addUsuario(data: Omit<Usuario, 'id'|'data_cadastro'>) {
    const rec: Usuario = { ...data, id: uid(), data_cadastro: new Date().toISOString() };
    db.usuarios.push(rec); save(); return rec;
  },

  getNotificacoes(perfil: Perfil, escola?: string) {
    return db.notificacoes.filter(n =>
      n.para_perfil === 'todos' ||
      n.para_perfil === perfil ||
      (perfil === 'escola' && n.escola_alvo === escola)
    );
  },

  markNotificacaoRead(id: string) {
    const n = db.notificacoes.find(x=>x.id===id); if(n) { n.lida = true; save(); }
  },

  markAllRead(perfil: Perfil, escola?: string) {
    db.notificacoes.forEach(n=>{
      if (n.para_perfil === perfil || (perfil==='escola' && n.escola_alvo===escola) || n.para_perfil==='todos') n.lida = true;
    });
    save();
  },

  exportJSON() {
    return JSON.stringify(db, null, 2);
  },

  importJSON(json: string) {
    try {
      const parsed = JSON.parse(json) as DB;
      if (parsed.usuarios && parsed.faltas) { db = parsed; save(); return true; }
    } catch {}
    return false;
  },

  reset() {
    db = seed(); save();
  },

  backupNow() {
    const blob = new Blob([this.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sme-ficai-backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    db.logs.push({ id: uid(), usuario: 'sistema', acao: 'BACKUP_MANUAL', data: new Date().toISOString()});
    save();
  },
};

export function useDbVersion() {
  const [v] = useDb(); 
  return v;
}

function useDb() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => setVersion(x => x + 1);
    window.addEventListener('sme-db-updated', handler);
    return () => window.removeEventListener('sme-db-updated', handler);
  }, []);
  return [version, setVersion] as const;
}
