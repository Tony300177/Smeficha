export type Perfil = 'admin' | 'escola';

export interface Usuario {
  id: string;
  nome: string;
  usuario: string;
  senha: string;
  perfil: Perfil;
  escola: string | null;
  data_cadastro: string;
  ativo?: boolean;
}

export interface Falta {
  id: string;
  escola: string;
  nome_aluno: string;
  mes_ano: string; // YYYY-MM
  dias_falta: number;
  falta_dias?: number[]; // dias do mês selecionados (1-31)
  turma_ano: string;
  responsavel: string;
  celular: string;
  observacao_administrador?: string;
  usuario_lancamento: string;
  data_cadastro: string;
  ficai_aderido: boolean;
  // Optional FICAI inline if registered at same time
  ficai_id?: string;
}

export interface Ficai {
  id: string;
  aluno: string;
  escola: string;
  serie: string;
  turno: 'Matutino' | 'Vespertino' | 'Integral';
  turma: string;
  motivo_ficai: string;
  data_inscricao: string;
  situacao: 'Em acompanhamento' | 'Encaminhada' | 'Resolvida' | 'Arquivada';
  observacao?: string;
  data_cadastro: string;
  falta_id?: string;
}

export interface Notificacao {
  id: string;
  para_perfil: Perfil | 'todos';
  escola_alvo?: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data: string;
  tipo: 'info' | 'alerta' | 'sucesso' | 'ficai';
}

export interface LogAcesso {
  id: string;
  usuario: string;
  acao: string;
  data: string;
}

export const ESCOLAS = [
  // CEI
  'CEI LUIZ FELIPE',
  'CEI SAO CRISTOVAO',
  'CEI ARCO IRIS',
  'CEI BRUNO LEONARDO',
  'CEI DOM FRANCO',
  'CEI MENINO JESUS',
  'CEI NOSSO LAR',
  'CEI VASCO PAPA',
  'CEI CRIANÇA FELIZ',
  // CEM
  'CEM GUILHERME',
  'CEM ORLANDO PEREIRA',
  // EM
  'EM MARIA HILDA',
  'EM PAULO FREIRE',
  'EM JOSE ANCHIETA',
  // ERM
  'ERM ALVARES AZEVEDO',
  'ERM CORA CORALINA',
  'ERM EUCLIDES CUNHA',
  'ERM OSVALDO CRUZ',
  'ERM VINICIUS DE MORAIS',
] as const;

export const MOTIVOS_FICAI = [
  'Excesso de faltas',
  'Abandono escolar',
  'Infrequência escolar',
  'Vulnerabilidade social',
  'Mudança sem transferência',
  'Outro',
] as const;
