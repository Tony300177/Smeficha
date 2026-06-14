import { useEffect, useState } from 'react';
import * as api from './api';
import { Falta, Ficai, Usuario, Notificacao, LogAcesso, Perfil, ESCOLAS } from './types';

type DB = {
  usuarios: Usuario[];
  faltas: Falta[];
  ficai: Ficai[];
  notificacoes: Notificacao[];
  logs: LogAcesso[];
  initialized: boolean;
};

// ============ USUÁRIOS PADRÃO (fallback offline) ============
const _now = new Date().toISOString();
const USUARIOS_PADRAO: Usuario[] = [
  {
    id: 'u_admin',
    nome: 'Administrador SME',
    usuario: 'admin',
    senha: 'Admin@123',
    perfil: 'admin',
    escola: null,
    data_cadastro: _now,
    ativo: true,
  },
  ...ESCOLAS.map((escola, i) => ({
    id: `u_${i}`,
    nome: escola,
    usuario: escola,
    senha: '123',
    perfil: 'escola' as const,
    escola,
    data_cadastro: _now,
    ativo: true,
  })),
];

// Estado global em memória
let db: DB = {
  usuarios: [],
  faltas: [],
  ficai: [],
  notificacoes: [],
  logs: [],
  initialized: false,
};

let currentUser: Usuario | null = null;

// Listeners para re-render dos componentes React
const listeners = new Set<() => void>();
function notifyListeners() {
  listeners.forEach(l => l());
}

// ============================================================
// Sincronização em tempo real via SSE
// Quando o servidor faz broadcast de um evento (nova_falta,
// ficai_atualizada, etc.), o store atualiza o estado local
// imediatamente — sem precisar recarregar a página.
// ============================================================
let sseUnsubscribe: (() => void) | null = null;
let notifPollInterval: ReturnType<typeof setInterval> | null = null;

function startRealtime() {
  // SSE — recebe eventos do servidor
  try {
    sseUnsubscribe = api.subscribeEvents((event, data) => {
      switch (event) {
        case 'nova_falta':
          if (!db.faltas.find(f => f.id === data.id)) {
            db.faltas.unshift(data);
            notifyListeners();
          }
          break;
        case 'falta_atualizada': {
          const idx = db.faltas.findIndex(f => f.id === data.id);
          if (idx >= 0) { db.faltas[idx] = { ...db.faltas[idx], ...data }; notifyListeners(); }
          break;
        }
        case 'falta_removida':
          db.faltas = db.faltas.filter(f => f.id !== data.id);
          notifyListeners();
          break;
        case 'nova_ficai':
          if (!db.ficai.find(f => f.id === data.id)) {
            db.ficai.unshift(data);
            notifyListeners();
          }
          break;
        case 'ficai_atualizada': {
          const idx = db.ficai.findIndex(f => f.id === data.id);
          if (idx >= 0) { db.ficai[idx] = { ...db.ficai[idx], ...data }; notifyListeners(); }
          break;
        }
        case 'ficai_removida':
          db.ficai = db.ficai.filter(f => f.id !== data.id);
          notifyListeners();
          break;
      }
    });
  } catch (_) {
    // SSE não disponível (modo offline) — sem problema
  }

  // Polling de notificações a cada 15 s para garantir que o admin
  // veja badges atualizados mesmo sem SSE
  if (notifPollInterval) clearInterval(notifPollInterval);
  notifPollInterval = setInterval(async () => {
    if (!currentUser) return;
    try {
      const notifs = await api.getNotificacoes(
        currentUser.perfil,
        currentUser.escola || undefined
      ) as Notificacao[];
      if (Array.isArray(notifs)) {
        db.notificacoes = notifs;
        notifyListeners();
      }
    } catch (_) {}
  }, 15000);
}

function stopRealtime() {
  if (sseUnsubscribe) { sseUnsubscribe(); sseUnsubscribe = null; }
  if (notifPollInterval) { clearInterval(notifPollInterval); notifPollInterval = null; }
}

export const store = {
  getState() { return db; },
  getCurrentUser() { return currentUser; },

  /**
   * Autentica o usuário.
   * 1ª tentativa: backend (MySQL).
   * Fallback: usuários padrão embutidos (modo offline).
   */
  async authenticate(usuario: string, senha: string): Promise<Usuario | null> {
    try {
      const response = await api.authenticate(usuario, senha) as any;
      if (response.success && response.usuario) {
        currentUser = response.usuario;
        notifyListeners();
        return response.usuario;
      }
      return null; // credenciais inválidas — não tenta fallback
    } catch (_) {
      console.warn('Backend indisponível, usando autenticação local.');
    }

    const u = USUARIOS_PADRAO.find(
      x => x.usuario === usuario && x.senha === senha && x.ativo !== false
    );
    if (u) { currentUser = u; notifyListeners(); return u; }
    return null;
  },

  /**
   * Carrega todos os dados do backend e inicia a sincronização
   * em tempo real (SSE + polling de notificações).
   */
  async loadData() {
    try {
      const [usuarios, faltas, ficai, notificacoes, logs] = await Promise.all([
        api.getUsuarios().catch(() => []),
        api.getFaltas().catch(() => []),
        api.getFicai().catch(() => []),
        api.getNotificacoes(
          currentUser?.perfil || 'admin',
          currentUser?.escola || undefined
        ).catch(() => []),
        api.getLogs().catch(() => []),
      ]);

      db = {
        usuarios: Array.isArray(usuarios) && usuarios.length > 0 ? usuarios : USUARIOS_PADRAO,
        faltas: Array.isArray(faltas) ? faltas : [],
        ficai: Array.isArray(ficai) ? ficai : [],
        notificacoes: Array.isArray(notificacoes) ? notificacoes : [],
        logs: Array.isArray(logs) ? logs : [],
        initialized: true,
      };
      notifyListeners();
    } catch (_) {
      db = { ...db, usuarios: USUARIOS_PADRAO, initialized: true };
      notifyListeners();
    }

    // Inicia SSE + polling após carregar os dados
    startRealtime();
  },

  listFaltas(escola?: string) {
    return db.faltas.filter(f => !escola || f.escola === escola);
  },

  async addFalta(data: Omit<Falta, 'id' | 'data_cadastro'>) {
    const rec = await api.createFalta(data) as Falta;
    // O SSE vai notificar todos os outros clientes;
    // aqui atualizamos localmente para resposta imediata
    if (!db.faltas.find(f => f.id === rec.id)) {
      db.faltas.unshift(rec);
      notifyListeners();
    }
    return rec;
  },

  async updateFalta(id: string, patch: Partial<Falta>) {
    await api.updateFalta(id, patch);
    const i = db.faltas.findIndex(f => f.id === id);
    if (i >= 0) { db.faltas[i] = { ...db.faltas[i], ...patch }; notifyListeners(); return db.faltas[i]; }
    return null;
  },

  async deleteFalta(id: string) {
    await api.deleteFalta(id);
    db.faltas = db.faltas.filter(f => f.id !== id);
    notifyListeners();
  },

  async setObservacao(id: string, obs: string) {
    await this.updateFalta(id, { observacao_administrador: obs });
  },

  listFicai(escola?: string) {
    return db.ficai.filter(f => !escola || f.escola === escola);
  },

  async addFicai(data: Omit<Ficai, 'id' | 'data_cadastro'>) {
    const rec = await api.createFicai(data) as Ficai;
    if (!db.ficai.find(f => f.id === rec.id)) {
      db.ficai.unshift(rec);
      notifyListeners();
    }
    return rec;
  },

  async updateFicai(id: string, patch: Partial<Ficai>) {
    await api.updateFicai(id, patch);
    const i = db.ficai.findIndex(f => f.id === id);
    if (i >= 0) { db.ficai[i] = { ...db.ficai[i], ...patch }; notifyListeners(); return db.ficai[i]; }
    return null;
  },

  async deleteFicai(id: string) {
    await api.deleteFicai(id);
    db.ficai = db.ficai.filter(f => f.id !== id);
    notifyListeners();
  },

  listUsuarios() { return db.usuarios; },

  async updateUsuario(id: string, patch: Partial<Usuario>) {
    await api.updateUsuario(id, patch);
    const i = db.usuarios.findIndex(u => u.id === id);
    if (i >= 0) { db.usuarios[i] = { ...db.usuarios[i], ...patch }; notifyListeners(); return db.usuarios[i]; }
    return null;
  },

  async addUsuario(data: Omit<Usuario, 'id' | 'data_cadastro'>) {
    const rec = await api.createUsuario(data) as Usuario;
    db.usuarios.push(rec);
    notifyListeners();
    return rec;
  },

  async getNotificacoes(perfil: Perfil, escola?: string) {
    try {
      const notificacoes = await api.getNotificacoes(perfil, escola) as Notificacao[];
      db.notificacoes = notificacoes;
      notifyListeners();
      return notificacoes;
    } catch (_) { return db.notificacoes; }
  },

  async markNotificacaoRead(id: string) {
    try {
      await api.markNotificacaoRead(id);
      const n = db.notificacoes.find(x => x.id === id);
      if (n) { n.lida = true; notifyListeners(); }
    } catch (_) {}
  },

  async markAllRead(perfil: Perfil, escola?: string) {
    try {
      await api.markAllNotificacoesRead(perfil, escola);
      db.notificacoes.forEach(n => {
        if (n.para_perfil === perfil || n.para_perfil === 'todos' ||
            (perfil === 'escola' && n.escola_alvo === escola)) {
          n.lida = true;
        }
      });
      notifyListeners();
    } catch (_) {}
  },

  exportJSON() { return JSON.stringify(db, null, 2); },

  importJSON(json: string) {
    try {
      const parsed = JSON.parse(json) as DB;
      if (parsed.usuarios && parsed.faltas) { db = parsed; notifyListeners(); return true; }
    } catch {}
    return false;
  },

  reset() {
    stopRealtime();
    db = { usuarios: [], faltas: [], ficai: [], notificacoes: [], logs: [], initialized: false };
    currentUser = null;
    notifyListeners();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useDbVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const unsub = store.subscribe(() => setVersion(v => v + 1));
    return unsub;
  }, []);
  return version;
}
