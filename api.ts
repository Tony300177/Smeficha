// Configuração da URL base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Tipos de resposta
export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

// Função auxiliar para fazer requisições
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erro na requisição: ${response.status}`);
  }

  return response.json();
}

// ============ AUTENTICAÇÃO ============
export async function authenticate(usuario: string, senha: string) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, senha }),
  });
}

// ============ USUÁRIOS ============
export async function getUsuarios() {
  return apiCall('/usuarios');
}

export async function createUsuario(data: any) {
  return apiCall('/usuarios', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUsuario(id: string, data: any) {
  return apiCall(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============ FALTAS ============
export async function getFaltas(escola?: string) {
  const url = escola ? `/faltas?escola=${encodeURIComponent(escola)}` : '/faltas';
  return apiCall(url);
}

export async function createFalta(data: any) {
  return apiCall('/faltas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFalta(id: string, data: any) {
  return apiCall(`/faltas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteFalta(id: string) {
  return apiCall(`/faltas/${id}`, {
    method: 'DELETE',
  });
}

// ============ FICAI ============
export async function getFicai(escola?: string) {
  const url = escola ? `/ficai?escola=${encodeURIComponent(escola)}` : '/ficai';
  return apiCall(url);
}

export async function createFicai(data: any) {
  return apiCall('/ficai', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFicai(id: string, data: any) {
  return apiCall(`/ficai/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteFicai(id: string) {
  return apiCall(`/ficai/${id}`, {
    method: 'DELETE',
  });
}

// ============ NOTIFICAÇÕES ============
export async function getNotificacoes(perfil: string, escola?: string) {
  const url = escola 
    ? `/notificacoes?perfil=${perfil}&escola=${encodeURIComponent(escola)}`
    : `/notificacoes?perfil=${perfil}`;
  return apiCall(url);
}

export async function markNotificacaoRead(id: string) {
  return apiCall(`/notificacoes/${id}/read`, {
    method: 'PUT',
  });
}

export async function markAllNotificacoesRead(perfil: string, escola?: string) {
  return apiCall('/notificacoes/mark-all-read', {
    method: 'PUT',
    body: JSON.stringify({ perfil, escola }),
  });
}

// ============ LOGS ============
export async function getLogs() {
  return apiCall('/logs');
}

// ============ HEALTH CHECK ============
export async function healthCheck() {
  return apiCall('/health');
}

// ============ SSE — EVENTOS EM TEMPO REAL ============
// Conecta ao endpoint /api/events e chama onEvent para cada
// mensagem recebida do servidor. Retorna uma função para
// encerrar a conexão.
export function subscribeEvents(
  onEvent: (event: string, data: any) => void
): () => void {
  const url = `${API_BASE_URL}/events`;
  const es = new EventSource(url);

  const handler = (eventName: string) => (e: MessageEvent) => {
    try { onEvent(eventName, JSON.parse(e.data)); } catch (_) {}
  };

  const events = ['nova_falta', 'falta_atualizada', 'falta_removida',
                  'nova_ficai', 'ficai_atualizada', 'ficai_removida'];
  events.forEach(ev => es.addEventListener(ev, handler(ev) as EventListener));

  return () => es.close();
}
