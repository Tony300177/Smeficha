import { useState } from 'react';
import { store, useDbVersion } from './lib/store-api';
import { useEffect } from 'react';
import { Usuario, Falta, Ficai, MOTIVOS_FICAI } from './lib/types';
import { Toaster, toast } from 'sonner';
import {
  LayoutDashboard, ClipboardList, Users, FileBarChart, Bell, Database, LogOut,
  GraduationCap, Search, Plus, Save, Edit3, Trash2, Download,
  ShieldCheck, FileText, AlertTriangle, X, Menu, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = {
  dark: '#0a3b4b',
  primary: '#0f6b64',
  primary2: '#13867d',
  accent: '#e08b31',
  bg: '#f7f5f1',
  card: '#ffffff',
  muted: '#6b6b6b',
};

// Auth context simple
function useAuth() {
  const [user, setUser] = useState<Usuario | null>(() => {
    try { return JSON.parse(localStorage.getItem('sme-auth-user') || 'null'); } catch { return null; }
  });
  const signIn = async (u: string, p: string) => {
    const auth = await store.authenticate(u, p);
    if (auth) { setUser(auth); localStorage.setItem('sme-auth-user', JSON.stringify(auth)); return true; }
    return false;
  };
  const signOut = () => { store.reset(); setUser(null); localStorage.removeItem('sme-auth-user'); };
  return { user, signIn, signOut };
}

function formatMes(m: string) {
  if (!m) return '-';
  const [y, mm] = m.split('-');
  const d = new Date(Number(y), Number(mm)-1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
}

export default function App() {
  const auth = useAuth();
  const [route, setRoute] = useState<string>('dashboard');

  // Carregar dados quando o usuário logar
  useEffect(() => {
    if (auth.user) {
      store.loadData();
    }
  }, [auth.user]);

  if (!auth.user) {
    return <Login onLogin={auth.signIn} />;
  }

  return (
    <div style={{ background: BRAND.bg }} className="min-h-screen text-zinc-800">
      <Toaster richColors position="top-right" />
      <Shell user={auth.user} route={route} setRoute={setRoute} onLogout={auth.signOut}>
        {route === 'dashboard' && (auth.user.perfil === 'admin'
          ? <DashboardAdmin />
          : <DashboardEscola user={auth.user} go={(r)=>setRoute(r)} />)}
        {route === 'registros' && <RegistrosPage user={auth.user} />}
        {route === 'novo' && <RegistroFormPage user={auth.user} onDone={()=>setRoute('registros')} />}
        {route === 'ficai' && <FicaiPage user={auth.user} />}
        {route === 'relatorios' && <RelatoriosPage user={auth.user} />}
        {route === 'usuarios' && auth.user.perfil === 'admin' && <UsuariosPage />}
        {route === 'notificacoes' && <NotificacoesPage user={auth.user} />}
        {route === 'backup' && auth.user.perfil === 'admin' && <BackupPage />}
      </Shell>
      <footer className="text-center text-[12px] text-zinc-500 py-6 border-t border-stone-200 bg-white/60">
        Desenvolvido pelo Departamento de Tecnologia SME
      </footer>
    </div>
  );
}

// ---------------- Login ----------------
function Login({ onLogin }: { onLogin: (u: string, p: string) => Promise<boolean> }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onLogin(usuario.trim(), senha);
    if (!ok) toast.error('Usuário ou senha inválidos');
    else toast.success('Bem-vindo ao Registro de Faltas — SME');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12" style={{ background: '#f3f1ec' }}>
      <Toaster richColors />
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-[18px] text-white flex items-center justify-center shadow-sm" style={{ background: BRAND.primary }}>
            <GraduationCap size={26} />
          </div>
          <div className="mt-4 text-[19px] font-[650] tracking-tight text-zinc-800">Registro de Faltas — SME</div>
          <div className="text-[13px] text-zinc-500 mt-1">Secretaria Municipal de Educação</div>
        </div>

        <div className="bg-white rounded-[22px] shadow-sm border border-stone-200 p-7">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-[12.5px] text-zinc-600">Usuário</label>
              <input value={usuario} onChange={e=>setUsuario(e.target.value)} placeholder="Usuário"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-300 bg-stone-50 outline-none focus:border-teal-600 focus:bg-white transition"/>
            </div>
            <div>
              <label className="text-[12.5px] text-zinc-600">Senha</label>
              <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-stone-300 bg-stone-50 outline-none focus:border-teal-600 focus:bg-white transition"/>
            </div>
            <button className="w-full rounded-xl py-3 text-white font-medium shadow-sm hover:brightness-[1.06] active:scale-[.99] transition"
              style={{ background: BRAND.primary }}>
              Entrar
            </button>
          </form>
        </div>

        <div className="text-center text-[11px] text-zinc-500 mt-5">Desenvolvido pelo Departamento de Tecnologia SME</div>
      </div>
    </div>
  );
}

// ---------------- Shell ----------------
function Shell({ user, route, setRoute, onLogout, children }:{ user: Usuario, route:string, setRoute:(r:string)=>void, onLogout:()=>void, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useDbVersion();
  const nots = store.getState().notificacoes.filter(n=>!n.lida).length;

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'registros', label: 'Registros de Falta', icon: ClipboardList },
    { id: 'novo', label: 'Novo Registro', icon: Plus },
    { id: 'ficai', label: 'Controle FICAI', icon: ShieldCheck },
    { id: 'relatorios', label: 'Relatórios', icon: FileBarChart },
    ...(user.perfil === 'admin' ? [{ id:'usuarios', label:'Usuários', icon: Users }] : []),
    { id: 'notificacoes', label: 'Notificações', icon: Bell, badge: nots },
    ...(user.perfil === 'admin' ? [{ id:'backup', label:'Backup / Restauração', icon: Database }] : []),
  ];

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-xl border border-stone-200" onClick={()=>setOpen(true)}><Menu size={18}/></button>
            <div className="w-10 h-10 rounded-xl text-white flex items-center justify-center" style={{ background: BRAND.primary }}><GraduationCap size={20} /></div>
            <div className="leading-tight">
              <div className="font-semibold text-[15px]">Registro de Faltas — SME</div>
              <div className="text-[11px] text-zinc-500 hidden sm:block">Faltas Escolares & FICAI</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={()=>setRoute('notificacoes')} className="relative p-2 rounded-xl hover:bg-stone-100">
              <Bell size={18} />
              {nots > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-semibold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{nots}</span>}
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user.nome}</div>
              <div className="text-[11px] text-zinc-500">{user.perfil === 'admin' ? 'Administrador SME' : user.escola}</div>
            </div>
            <button onClick={onLogout} className="p-2 rounded-xl hover:bg-stone-100 text-zinc-600" title="Sair"><LogOut size={18}/></button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-7 grid grid-cols-12 gap-7">
        <aside className="hidden lg:block col-span-3">
          <div className="bg-white rounded-[22px] border border-stone-200 p-3 shadow-sm sticky top-[92px]">
            <nav className="space-y-1.5">
              {nav.map(n=>{
                const active = route===n.id;
                const Icon = n.icon;
                return (
                  <button key={n.id} onClick={()=>setRoute(n.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[14px] transition ${
                      active ? 'text-white' : 'text-zinc-700 hover:bg-stone-100'
                    }`}
                    style={active ? { background: BRAND.primary } : {}}
                  >
                    <Icon size={18} />
                    <span className="flex-1 text-left">{n.label}</span>
                    {'badge' in n && (n.badge as number) > 0 && <span className="text-[11px] bg-amber-500 text-white rounded-full px-2 py-0.5">{n.badge}</span>}
                    {active && <ChevronRight size={16} className="opacity-80" />}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 px-3 py-3 rounded-xl bg-stone-50 border border-stone-200 text-[12px] text-zinc-600">
              <div className="font-medium text-zinc-800">Status do Servidor</div>
              <div>{import.meta.env.VITE_API_URL || 'Conectado'}</div>
            </div>
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-9 min-w-0">
          {children}
        </main>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/35" onClick={()=>setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[300px] bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Menu</div>
              <button onClick={()=>setOpen(false)} className="p-2 rounded-lg hover:bg-stone-100"><X size={18}/></button>
            </div>
            <nav className="space-y-1">
              {nav.map(n=>{
                const Icon=n.icon;
                return <button key={n.id} onClick={()=>{ setRoute(n.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-700 hover:bg-stone-100"><Icon size={18}/>{n.label}</button>;
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- UI helpers ----------
function Card({ children, className = '' }: { children:React.ReactNode, className?: string }) {
  return <div className={`bg-white rounded-[22px] border border-stone-200 shadow-sm ${className}`}>{children}</div>;
}
function Stat({ label, value, sub, icon:Icon, color }:{label:string, value:string|number, sub?:string, icon:any, color:string}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] text-zinc-500">{label}</div>
          <div className="text-3xl font-semibold tracking-tight mt-1">{value}</div>
          {sub && <div className="text-[12px] text-zinc-500 mt-1">{sub}</div>}
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: color + '18', color }}>
          <Icon size={22}/>
        </div>
      </div>
    </Card>
  );
}

// --------------- Dashboard Admin --------------
function DashboardAdmin() {
  useDbVersion();
  const faltas = store.listFaltas();
  const ficai = store.listFicai();

  const totalAlunos = new Set(faltas.map(f=>f.nome_aluno.toLowerCase())).size;
  const totalFaltas = faltas.reduce((a,b)=>a+b.dias_falta,0);
  const totalRegistros = faltas.length;
  const totalFicai = ficai.length;
  const emAcomp = ficai.filter(f=>f.situacao==='Em acompanhamento').length;

  // faltas por escola
  const porEscolaMap = new Map<string, number>();
  faltas.forEach(f=>porEscolaMap.set(f.escola, (porEscolaMap.get(f.escola)||0)+f.dias_falta));
  const porEscola = Array.from(porEscolaMap.entries()).map(([escola, faltas])=>({ escola: escola.replace(/^(CEI|CEM|EM|ERM) /,''), faltas })).sort((a,b)=>b.faltas-a.faltas).slice(0,8);

  // faltas por mês
  const porMesMap = new Map<string, number>();
  faltas.forEach(f=>porMesMap.set(f.mes_ano, (porMesMap.get(f.mes_ano)||0)+f.dias_falta));
  const porMes = Array.from(porMesMap.entries()).sort().map(([mes, total])=>({ mes: formatMes(mes), total }));

  const ficaiPorStatus = ['Em acompanhamento','Encaminhada','Resolvida','Arquivada'].map(s => ({
    name: s, value: ficai.filter(x=>x.situacao===s).length
  }));

  const pieColors = ['#13867d','#e08b31','#6b7b8c','#b7aba1'];

  const ranking = Array.from(porEscolaMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-[650] tracking-tight">Painel Administrativo</h1>
          <p className="text-zinc-600 text-[14.5px]">Visão consolidada da rede municipal · {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="text-[13px] text-zinc-600 bg-white border border-stone-200 rounded-xl px-3 py-2">Última atualização: agora</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Stat label="Alunos registrados" value={totalAlunos} sub="únicos" icon={Users} color="#0f6b64" />
        <Stat label="Total de faltas" value={totalFaltas} sub="dias somados" icon={ClipboardList} color="#e08b31" />
        <Stat label="Registros" value={totalRegistros} sub="por todas as escolas" icon={FileText} color="#295e97" />
        <Stat label="Casos FICAI" value={totalFicai} sub="ativos no sistema" icon={ShieldCheck} color="#9c3d2b" />
        <Stat label="Em acompanhamento" value={emAcomp} sub="FICAI" icon={AlertTriangle} color="#0f6b64" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 xl:col-span-7 p-5">
          <div className="font-semibold mb-3">Faltas por escola</div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porEscola}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e4df" />
                <XAxis dataKey="escola" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="faltas" radius={[8,8,0,0]} fill="#13867d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5 p-5">
          <div className="font-semibold mb-3">Evolução mensal</div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e4df" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#e08b31" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 p-5">
          <div className="font-semibold mb-2">Situação FICAI</div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ficaiPorStatus} dataKey="value" nameKey="name" outerRadius={92} innerRadius={54}>
                  {ficaiPorStatus.map((_, i)=><Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 text-[12.5px] text-zinc-600">
            {ficaiPorStatus.map((s,i)=> <div key={s.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: pieColors[i] }} />{s.name}: {s.value}</div>)}
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 p-5">
          <div className="font-semibold mb-3">Ranking · Maior índice de faltas</div>
          <div className="space-y-3">
            {ranking.map(([escola, total], idx)=>(
              <div key={escola} className="flex items-center gap-3">
                <div className="w-7 text-zinc-500 text-sm">#{idx+1}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{escola}</div>
                  <div className="h-2 rounded-full bg-stone-100 mt-1">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, (total / ranking[0][1]) * 100)}%`, background: BRAND.primary2 }} />
                  </div>
                </div>
                <div className="text-sm font-semibold">{total} dias</div>
              </div>
            ))}
            {ranking.length===0 && <div className="text-zinc-500 text-sm">Sem dados</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardEscola({ user, go }: { user: Usuario, go:(r:string)=>void }) {
  useDbVersion();
  const faltas = store.listFaltas(user.escola || '');
  const ficai = store.listFicai(user.escola || '');
  const totalF = faltas.reduce((a,b)=>a+b.dias_falta,0);
  const comObs = faltas.filter(f=> (f.observacao_administrador||'').length>0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-[650]">Olá, {user.escola}</h1>
        <p className="text-zinc-600">Acompanhe seus registros de frequência e casos FICAI.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Meus registros" value={faltas.length} icon={ClipboardList} color="#0f6b64" />
        <Stat label="Total de faltas" value={totalF} icon={AlertTriangle} color="#e08b31" />
        <Stat label="FICAI ativas" value={ficai.filter(f=>f.situacao!=='Arquivada' && f.situacao!=='Resolvida').length} icon={ShieldCheck} color="#9c3d2b" />
        <Stat label="Observações SME" value={comObs} icon={FileText} color="#295e97" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-7 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Últimos registros</div>
            <button onClick={()=>go('registros')} className="text-sm text-teal-700">Ver tudo</button>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-zinc-500 text-[12px]">
                <tr><th className="text-left py-2 font-medium">Aluno</th><th className="text-left py-2 font-medium">Turma</th><th className="text-left py-2 font-medium">Mês</th><th className="text-left py-2 font-medium">Faltas</th><th className="text-left py-2 font-medium">FICAI</th></tr>
              </thead>
              <tbody>
                {faltas.slice(0,5).map(f=>(
                  <tr key={f.id} className="border-t border-stone-100">
                    <td className="py-2.5">{f.nome_aluno}</td>
                    <td className="py-2.5 text-zinc-600">{f.turma_ano}</td>
                    <td className="py-2.5">{formatMes(f.mes_ano)}</td>
                    <td className="py-2.5 font-medium">{f.dias_falta}</td>
                    <td className="py-2.5">{f.ficai_aderido ? <span className="px-2 py-1 rounded-full text-[11px] bg-amber-100 text-amber-800">Sim</span> : <span className="text-zinc-400">—</span>}</td>
                  </tr>
                ))}
                {faltas.length===0 && <tr><td colSpan={5} className="py-6 text-zinc-500">Nenhum registro ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5 p-5">
          <div className="font-semibold mb-2">Observações da SME</div>
          <div className="space-y-3 max-h-[300px] overflow-auto pr-1">
            {faltas.filter(f=>f.observacao_administrador).slice(0,6).map(f=>(
              <div key={f.id} className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-2.5">
                <div className="text-[13px] font-medium">{f.nome_aluno}</div>
                <div className="text-[13px] text-zinc-700">{f.observacao_administrador}</div>
              </div>
            ))}
            {comObs===0 && <div className="text-zinc-500 text-sm">Nenhuma observação recebida.</div>}
          </div>
          <button onClick={()=>go('novo')} className="mt-4 w-full rounded-xl py-3 text-white font-medium" style={{ background: BRAND.primary }}>
            + Novo registro de falta
          </button>
        </Card>
      </div>
    </div>
  );
}

// -------------- Registros --------------
function RegistrosPage({ user }:{ user: Usuario }) {
  useDbVersion();
  const [q, setQ] = useState('');
  const [mes, setMes] = useState('');
  const [turma, setTurma] = useState('');
  const [ficaiOnly, setFicaiOnly] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [obsModal, setObsModal] = useState<Falta | null>(null);

  const base = store.listFaltas(user.perfil === 'admin' ? undefined : user.escola || '');
  const filtered = base.filter(f => {
    if (q && !(`${f.nome_aluno} ${f.responsavel} ${f.escola}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (mes && f.mes_ano !== mes) return false;
    if (turma && !f.turma_ano.toLowerCase().includes(turma.toLowerCase())) return false;
    if (ficaiOnly && !f.ficai_aderido) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[26px] font-[650]">Registros de Falta</h1>
        <div className="text-sm text-zinc-600">{filtered.length} registro(s)</div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3.5 text-zinc-400" size={18} />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por aluno, responsável ou escola"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white outline-none focus:border-teal-600" />
          </div>
          <input type="month" value={mes} onChange={e=>setMes(e.target.value)}
            className="px-3 py-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white outline-none focus:border-teal-600" />
          <input value={turma} onChange={e=>setTurma(e.target.value)} placeholder="Turma / Ano"
            className="px-3 py-3 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white outline-none focus:border-teal-600" />
          <label className="flex items-center gap-2 text-sm px-2">
            <input type="checkbox" checked={ficaiOnly} onChange={e=>setFicaiOnly(e.target.checked)} /> Apenas FICAI
          </label>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-zinc-600 text-[12px]">
              <tr>
                {['Aluno','Escola','Turma','Mês','Faltas','Responsável','Celular','FICAI','Observação','Ações'].map(h=>(
                  <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f=>(
                <tr key={f.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium">{f.nome_aluno}</td>
                  <td className="px-4 py-3 text-zinc-700">{f.escola}</td>
                  <td className="px-4 py-3">{f.turma_ano}</td>
                  <td className="px-4 py-3">{formatMes(f.mes_ano)}</td>
                  <td className="px-4 py-3">
                    <span 
                      title={f.falta_dias && f.falta_dias.length ? `Dias: ${f.falta_dias.join(', ')}` : `${f.dias_falta} dias`}
                      className={`px-2 py-1 rounded-full text-[11px] ${f.dias_falta >= 10 ? 'bg-[#fff0ec] text-[#c83a1c]' : 'bg-stone-100 text-zinc-700'}`}
                    >{f.dias_falta}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{f.responsavel}</td>
                  <td className="px-4 py-3 text-zinc-700">{f.celular}</td>
                  <td className="px-4 py-3">{f.ficai_aderido ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3 max-w-[260px]">
                    {f.observacao_administrador
                      ? <span className="text-teal-800">{f.observacao_administrador}</span>
                      : <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {user.perfil === 'admin' && (
                        <button onClick={()=>setObsModal(f)} className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-50" title="Observação"><Edit3 size={15}/></button>
                      )}
                      {(user.perfil === 'admin' || user.usuario === f.usuario_lancamento) && (
                        <>
                          <button onClick={()=>setEditId(f.id)} className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-50" title="Editar"><FileText size={15}/></button>
                          {user.perfil === 'admin' && (
                            <button onClick={()=>{ if(confirm('Excluir registro?')) { store.deleteFalta(f.id); toast.success('Registro excluído'); } }} className="p-1.5 rounded-lg border border-stone-300 hover:bg-red-50 text-red-600" title="Excluir"><Trash2 size={15}/></button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-zinc-500">Nenhum registro encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {editId && <EditFaltaModal id={editId} user={user} onClose={()=>setEditId(null)} />}
      {obsModal && <ObservacaoModal falta={obsModal} onClose={()=>setObsModal(null)} />}
    </div>
  );
}

function EditFaltaModal({ id, user, onClose }:{ id:string, user: Usuario, onClose:()=>void }) {
  const f = store.listFaltas().find(x=>x.id===id);
  const [form, setForm] = useState<Falta | null>(f ? {...f, falta_dias: f.falta_dias || [] } : null);
  if (!form) return null;
  const canEditAll = user.perfil === 'admin';
  const diasSelecionados = form.falta_dias || [];
  return (
    <Modal title="Editar registro" onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nome do Aluno"><input value={form.nome_aluno} onChange={e=>setForm({...form, nome_aluno:e.target.value})} className="input" /></Field>
        <Field label="Mês/Ano"><input type="month" value={form.mes_ano} onChange={e=>setForm({...form, mes_ano:e.target.value, falta_dias: []})} className="input" /></Field>
        <Field label="Turma/Ano"><input value={form.turma_ano} onChange={e=>setForm({...form, turma_ano:e.target.value})} className="input" /></Field>
        <Field label="Responsável"><input value={form.responsavel} onChange={e=>setForm({...form, responsavel:e.target.value})} className="input" /></Field>
        <Field label="Celular"><input value={form.celular} onChange={e=>setForm({...form, celular:e.target.value})} className="input" /></Field>
        <Field label="Aluno aderido à FICAI?">
          <select value={form.ficai_aderido ? 'Sim' : 'Não'} onChange={e=>setForm({...form, ficai_aderido: e.target.value==='Sim'})} className="input">
            <option>Não</option><option>Sim</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Escola"><input disabled value={form.escola} className="input bg-stone-100" /></Field>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[13.5px] text-zinc-700 font-medium">Dias de Falta — marque no calendário</div>
          <div className="text-[13px] font-semibold" style={{ color: BRAND.primary }}>{diasSelecionados.length} dia(s)</div>
        </div>
        <DayPicker 
          mesAno={form.mes_ano} 
          selected={diasSelecionados} 
          onChange={(days)=> setForm({...form, falta_dias: days, dias_falta: days.length })}
        />
      </div>

      {canEditAll && (
        <div className="mt-3">
          <Field label="Observação do Administrador"><textarea value={form.observacao_administrador||''} onChange={e=>setForm({...form, observacao_administrador:e.target.value})} className="input h-24" /></Field>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border">Cancelar</button>
        <button onClick={()=>{ 
          const updated = { ...form, dias_falta: (form.falta_dias||[]).length };
          store.updateFalta(form.id, updated); 
          toast.success('Registro atualizado'); 
          onClose(); 
        }} className="px-4 py-2.5 rounded-xl text-white" style={{ background: BRAND.primary }}>Salvar</button>
      </div>
    </Modal>
  );
}

function ObservacaoModal({ falta, onClose }: { falta: Falta, onClose: ()=>void }) {
  const [obs, setObs] = useState(falta.observacao_administrador || '');
  const sugestoes = [
    'Realizar contato com a família.',
    'Solicitar justificativa das faltas.',
    'Encaminhar para acompanhamento pedagógico.',
    'Verificar situação junto à coordenação.',
  ];
  return (
    <Modal title={`Observação · ${falta.nome_aluno}`} onClose={onClose}>
      <div className="text-[13px] text-zinc-600 mb-2">{falta.escola} · {falta.turma_ano} · {formatMes(falta.mes_ano)}</div>
      <textarea className="input h-28" value={obs} onChange={e=>setObs(e.target.value)} placeholder="Digite a observação para a escola..."/>
      <div className="flex flex-wrap gap-2 mt-2 text-[12px]">
        {sugestoes.map(s=> <button key={s} onClick={()=>setObs(o=> o ? o + ' ' + s : s)} className="px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200">{s}</button>)}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border">Cancelar</button>
        <button onClick={()=>{ store.setObservacao(falta.id, obs); toast.success('Observação enviada à escola'); onClose(); }} className="px-4 py-2.5 rounded-xl text-white" style={{ background: BRAND.primary }}>Enviar observação</button>
      </div>
    </Modal>
  );
}

// -------------- Registro Form --------------
function RegistroFormPage({ user, onDone }: { user: Usuario, onDone: ()=>void }) {
  const [aluno, setAluno] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7));
  const [faltaDias, setFaltaDias] = useState<number[]>([]);
  const dias = faltaDias.length;
  const [turma, setTurma] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [celular, setCelular] = useState('');
  const [escola, setEscola] = useState(user.perfil==='admin' ? 'EM PAULO FREIRE' : user.escola || '');
  const [ficaiAderido, setFicaiAderido] = useState(false);

  // FICAI extra
  const [serie, setSerie] = useState('');
  const [turno, setTurno] = useState<'Matutino'|'Vespertino'|'Integral'>('Matutino');
  const [motivo, setMotivo] = useState<string>(MOTIVOS_FICAI[0]);
  const [dataInscricao, setDataInscricao] = useState(new Date().toISOString().slice(0,10));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aluno || !turma || !responsavel) { toast.error('Preencha os campos obrigatórios'); return; }
    if (dias === 0) { toast.error('Selecione pelo menos 1 dia de falta no calendário'); return; }
    const falta = await store.addFalta({
      escola,
      nome_aluno: aluno,
      mes_ano: mes,
      dias_falta: dias,
      falta_dias: faltaDias,
      turma_ano: turma,
      responsavel,
      celular,
      observacao_administrador: '',
      usuario_lancamento: user.usuario,
      ficai_aderido: ficaiAderido,
    });
    if (ficaiAderido) {
      await store.addFicai({
        aluno,
        escola,
        serie: serie || turma,
        turno,
        turma,
        motivo_ficai: motivo,
        data_inscricao: dataInscricao,
        situacao: 'Em acompanhamento',
        observacao: '',
        falta_id: falta.id,
      });
      toast.success('Falta registrada e FICAI aberta.');
    } else {
      toast.success('Falta registrada e enviada ao administrador.');
    }
    onDone();
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <h1 className="text-[26px] font-[650]">Registrar Falta</h1>
      <Card className="p-6 md:p-7">
        <form onSubmit={submit} className="space-y-6">
          <SectionTitle>Dados do Aluno</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do Aluno *"><input className="input" value={aluno} onChange={e=>setAluno(e.target.value)} placeholder="Nome completo" /></Field>
            <Field label="Mês / Ano *"><input type="month" className="input" value={mes} onChange={e=> { setMes(e.target.value); setFaltaDias([]); }} /></Field>
            <Field label="Turma / Ano *"><input className="input" value={turma} onChange={e=>setTurma(e.target.value)} placeholder="Ex: 5º Ano B" /></Field>
            <Field label="Nome do Responsável *"><input className="input" value={responsavel} onChange={e=>setResponsavel(e.target.value)} /></Field>
            <Field label="Número do Celular *"><input className="input" value={celular} onChange={e=>setCelular(e.target.value)} placeholder="(42) 9____-____" /></Field>
            <Field label="Escola">
              {user.perfil==='admin' ? (
                <select className="input" value={escola} onChange={e=>setEscola(e.target.value)}>
                  {store.listUsuarios().filter(u=>u.perfil==='escola').map(u=> <option key={u.id}>{u.escola}</option>)}
                </select>
              ) : (
                <input className="input bg-stone-100" disabled value={escola} />
              )}
            </Field>
          </div>

          {/* Seletor de dias de falta */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[13.5px] text-zinc-700 font-medium">Dias de Falta * <span className="text-zinc-500 font-normal">— marque no calendário</span></div>
              <div className="text-[13px] font-semibold" style={{ color: BRAND.primary }}>{dias} dia(s) selecionado(s)</div>
            </div>
            <DayPicker mesAno={mes} selected={faltaDias} onChange={setFaltaDias} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Aluno aderido à FICAI?">
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="ficai" checked={!ficaiAderido} onChange={()=>setFicaiAderido(false)} /> Não</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="ficai" checked={ficaiAderido} onChange={()=>setFicaiAderido(true)} /> Sim</label>
              </div>
            </Field>
          </div>

          {ficaiAderido && (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50/70 p-5">
              <SectionTitle small>Dados da FICAI</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <Field label="Série"><input className="input" value={serie} onChange={e=>setSerie(e.target.value)} placeholder="Ex: 5º Ano" /></Field>
                <Field label="Turno">
                  <select className="input" value={turno} onChange={e=>setTurno(e.target.value as any)}>
                    <option>Matutino</option><option>Vespertino</option><option>Integral</option>
                  </select>
                </Field>
                <Field label="Turma"><input className="input" value={turma} onChange={e=>setTurma(e.target.value)} /></Field>
                <Field label="Motivo da Ficha FICAI">
                  <select className="input" value={motivo} onChange={e=>setMotivo(e.target.value)}>
                    {MOTIVOS_FICAI.map(m=> <option key={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Data de Inscrição da Ficha FICAI"><input type="date" className="input" value={dataInscricao} onChange={e=>setDataInscricao(e.target.value)} /></Field>
              </div>
              <p className="text-[12.5px] text-amber-900 mt-3">Ao enviar, a FICAI será aberta em “Em acompanhamento” e notificada à SME.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button className="px-5 py-3 rounded-xl text-white font-medium flex items-center gap-2" style={{ background: BRAND.primary }}><Save size={18}/> Enviar para Administrador</button>
            <button type="button" onClick={onDone} className="px-5 py-3 rounded-xl border border-stone-300 bg-white">Cancelar</button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ------------ FICAI ---------------
function FicaiPage({ user }:{ user: Usuario }) {
  useDbVersion();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Ficai | null>(null);
  const rows = store.listFicai(user.perfil === 'admin' ? undefined : user.escola || '');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-[650]">Controle FICAI</h1>
        <button onClick={()=>{setEdit(null); setOpen(true)}} className="px-4 py-2.5 rounded-xl text-white text-sm flex items-center gap-2" style={{ background: BRAND.primary }}><Plus size={16}/> Nova Ficha FICAI</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {(['Em acompanhamento','Encaminhada','Resolvida','Arquivada'] as const).map(s=>{
          const n = rows.filter(r=>r.situacao===s).length;
          return <Card key={s} className="p-4"><div className="text-[12px] text-zinc-500">{s}</div><div className="text-2xl font-semibold">{n}</div></Card>;
        })}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-zinc-600 text-[12px]">
              <tr>{['Aluno','Escola','Série/Turno','Turma','Motivo','Inscrição','Situação','Ações'].map(h=> <th key={h} className="text-left font-medium px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium">{r.aluno}</td>
                  <td className="px-4 py-3">{r.escola}</td>
                  <td className="px-4 py-3">{r.serie} · {r.turno}</td>
                  <td className="px-4 py-3">{r.turma}</td>
                  <td className="px-4 py-3">{r.motivo_ficai}</td>
                  <td className="px-4 py-3">{new Date(r.data_inscricao+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[11px] ${
                      r.situacao==='Em acompanhamento' ? 'bg-amber-100 text-amber-800' :
                      r.situacao==='Encaminhada' ? 'bg-sky-100 text-sky-800' :
                      r.situacao==='Resolvida' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-stone-200 text-zinc-700'
                    }`}>{r.situacao}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={()=>{ setEdit(r); setOpen(true); }} className="p-1.5 rounded-lg border hover:bg-stone-50"><Edit3 size={15}/></button>
                      {user.perfil==='admin' && (
                        <button onClick={()=>{ if(confirm('Excluir ficha?')) { store.deleteFicai(r.id); toast.success('Ficha excluída'); } }} className="p-1.5 rounded-lg border hover:bg-red-50 text-red-600"><Trash2 size={15}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length===0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">Nenhuma FICAI cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {open && <FicaiModal initial={edit} user={user} onClose={()=>{ setOpen(false); setEdit(null); }} />}
    </div>
  );
}

function FicaiModal({ initial, user, onClose }:{ initial: Ficai | null, user: Usuario, onClose: ()=>void }) {
  const [form, setForm] = useState<Partial<Ficai>>( initial || { aluno:'', escola: user.perfil==='admin' ? 'EM PAULO FREIRE' : (user.escola||''), serie:'', turno:'Matutino', turma:'', motivo_ficai: MOTIVOS_FICAI[0], data_inscricao: new Date().toISOString().slice(0,10), situacao: 'Em acompanhamento', observacao: '' });

  const save = () => {
    if (!form.aluno || !form.escola) { toast.error('Preencha os campos'); return; }
    if (initial) { store.updateFicai(initial.id, form); toast.success('FICAI atualizada'); }
    else { store.addFicai(form as any); toast.success('FICAI cadastrada'); }
    onClose();
  };

  return (
    <Modal title={initial ? 'Editar FICAI' : 'Nova Ficha FICAI'} onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Nome Completo do Aluno"><input className="input" value={form.aluno||''} onChange={e=>setForm({...form, aluno:e.target.value})} /></Field>
        <Field label="Escola">
          {user.perfil==='admin' ? (
            <select className="input" value={form.escola} onChange={e=>setForm({...form, escola:e.target.value})}>
              {store.listUsuarios().filter(u=>u.perfil==='escola').map(u=> <option key={u.id}>{u.escola}</option>)}
            </select>
          ) : <input disabled className="input bg-stone-100" value={form.escola} />}
        </Field>
        <Field label="Série"><input className="input" value={form.serie||''} onChange={e=>setForm({...form, serie:e.target.value})} /></Field>
        <Field label="Turno">
          <select className="input" value={form.turno} onChange={e=>setForm({...form, turno:e.target.value as any})}>
            <option>Matutino</option><option>Vespertino</option><option>Integral</option>
          </select>
        </Field>
        <Field label="Turma"><input className="input" value={form.turma||''} onChange={e=>setForm({...form, turma:e.target.value})} /></Field>
        <Field label="Motivo da Ficha FICAI">
          <select className="input" value={form.motivo_ficai} onChange={e=>setForm({...form, motivo_ficai:e.target.value})}>
            {MOTIVOS_FICAI.map(m=> <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Data de Inscrição"><input type="date" className="input" value={form.data_inscricao} onChange={e=>setForm({...form, data_inscricao:e.target.value})} /></Field>
        <Field label="Situação da FICAI">
          <select className="input" value={form.situacao} onChange={e=>setForm({...form, situacao:e.target.value as any})}>
            <option>Em acompanhamento</option><option>Encaminhada</option><option>Resolvida</option><option>Arquivada</option>
          </select>
        </Field>
        <div className="md:col-span-3">
          <Field label="Observação"><textarea className="input h-24" value={form.observacao||''} onChange={e=>setForm({...form, observacao:e.target.value})} /></Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border">Cancelar</button>
        <button onClick={save} className="px-4 py-2.5 rounded-xl text-white" style={{ background: BRAND.primary }}>Salvar</button>
      </div>
    </Modal>
  );
}

// --------------- Relatórios ---------------
function RelatoriosPage({ user }:{ user: Usuario }) {
  useDbVersion();
  const faltas = store.listFaltas(user.perfil==='admin' ? undefined : user.escola || '');
  const ficai = store.listFicai(user.perfil==='admin' ? undefined : user.escola || '');

  const exportCSV = () => {
    const rows = faltas.map(f=>({
      Escola: f.escola,
      Aluno: f.nome_aluno,
      Turma: f.turma_ano,
      'Mês/Ano': f.mes_ano,
      Faltas: f.dias_falta,
      Responsável: f.responsavel,
      Telefone: f.celular,
      'FICAI': f.ficai_aderido ? 'Sim':'Não',
      'Observação SME': f.observacao_administrador||''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faltas');
    XLSX.writeFile(wb, 'relatorio-faltas-sme.xlsx');
    toast.success('Excel exportado');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Geral de Faltas - SME', 14, 18);
    doc.setFontSize(10);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [['Escola','Aluno','Turma','Faltas','Responsável','Telefone','FICAI']],
      body: faltas.map(f=>[f.escola, f.nome_aluno, f.turma_ano, String(f.dias_falta), f.responsavel, f.celular, f.ficai_aderido ? 'Sim':'Não']),
      styles: { fontSize: 9 },
    });
    doc.save('relatorio-faltas-sme.pdf');
    toast.success('PDF gerado');
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <h1 className="text-[26px] font-[650]">Relatórios</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="font-semibold">Relatório Geral</div>
          <div className="text-sm text-zinc-600 mt-1">Escola, Aluno, Turma, Faltas, Responsável, Telefone, Situação FICAI.</div>
          <div className="flex gap-2 mt-4">
            <button onClick={exportPDF} className="px-3 py-2 rounded-xl border text-sm flex items-center gap-2"><FileText size={16}/> PDF</button>
            <button onClick={exportCSV} className="px-3 py-2 rounded-xl text-white text-sm flex items-center gap-2" style={{ background: BRAND.primary }}><Download size={16}/> Excel</button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="font-semibold">Relatório FICAI</div>
          <div className="text-sm text-zinc-600 mt-1">{ficai.length} casos no filtro atual.</div>
          <button onClick={()=>{
            const rows = ficai.map(f=>({ Aluno:f.aluno, Escola:f.escola, Serie:f.serie, Turno:f.turno, Motivo:f.motivo_ficai, Situacao:f.situacao }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'FICAI');
            XLSX.writeFile(wb, 'relatorio-ficai-sme.xlsx'); toast.success('Relatório FICAI exportado');
          }} className="mt-4 px-3 py-2 rounded-xl text-white text-sm" style={{ background: BRAND.primary }}>Exportar Excel</button>
        </Card>
        <Card className="p-5">
          <div className="font-semibold">Observações</div>
          <div className="text-sm text-zinc-600 mt-1">{faltas.filter(f=>f.observacao_administrador).length} registros com observação SME.</div>
          <button onClick={exportPDF} className="mt-4 px-3 py-2 rounded-xl border text-sm">Gerar PDF</button>
        </Card>
      </div>

      <Card className="p-5">
        <div className="text-[13px] text-zinc-600">
          Relatórios disponíveis: Geral, Por Escola, Por Período, Casos FICAI, Observações. <br/>
          Exportações em PDF e Excel (XLSX) conforme RF008 / RF009.
        </div>
      </Card>
    </div>
  );
}

// --------------- Usuários ---------------
function UsuariosPage() {
  useDbVersion();
  const users = store.listUsuarios();
  const [editing, setEditing] = useState<Usuario | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-[650]">Gerenciar Usuários</h1>
        <button onClick={()=>setEditing({ id:'', nome:'', usuario:'', senha:'123', perfil:'escola', escola:'EM PAULO FREIRE', data_cadastro:'', ativo:true } as any)} className="px-4 py-2.5 rounded-xl text-white text-sm" style={{ background: BRAND.primary }}>+ Novo usuário</button>
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-zinc-600 text-[12px]">
            <tr>{['Usuário','Perfil','Escola','Status','Ações'].map(h=> <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id} className="border-t border-stone-100">
                <td className="px-4 py-3">{u.usuario}</td>
                <td className="px-4 py-3 capitalize">{u.perfil}</td>
                <td className="px-4 py-3">{u.escola || '—'}</td>
                <td className="px-4 py-3">{u.ativo===false ? 'Inativo' : 'Ativo'}</td>
                <td className="px-4 py-3">
                  <button onClick={()=>setEditing(u)} className="px-3 py-1.5 rounded-lg border text-xs">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {editing && (
        <UserModal user={editing} onClose={()=>setEditing(null)} />
      )}
    </div>
  );
}

function UserModal({ user, onClose }:{ user: Usuario, onClose: ()=>void }) {
  const isNew = !user.id;
  const [form, setForm] = useState(user);

  const save = () => {
    if (!form.usuario || !form.senha) { toast.error('Preencha usuário e senha'); return; }
    if (isNew) store.addUsuario({ nome: form.nome || form.usuario, usuario: form.usuario, senha: form.senha, perfil: form.perfil, escola: form.escola, ativo: true });
    else store.updateUsuario(form.id, form);
    toast.success('Usuário salvo');
    onClose();
  };

  return (
    <Modal title={isNew ? 'Novo usuário' : 'Editar usuário'} onClose={onClose}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Usuário"><input className="input" value={form.usuario} onChange={e=>setForm({...form, usuario:e.target.value})} /></Field>
        <Field label="Senha"><input className="input" value={form.senha} onChange={e=>setForm({...form, senha:e.target.value})} /></Field>
        <Field label="Perfil"><select className="input" value={form.perfil} onChange={e=>setForm({...form, perfil:e.target.value as any})}><option value="escola">escola</option><option value="admin">admin</option></select></Field>
        <Field label="Escola / Nome"><input className="input" value={form.escola||''} onChange={e=>setForm({...form, escola: e.target.value, nome: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={form.ativo!==false} onChange={e=>setForm({...form, ativo:e.target.checked})} /> Usuário ativo</label>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border">Cancelar</button>
        <button onClick={save} className="px-4 py-2.5 rounded-xl text-white" style={{ background: BRAND.primary }}>Salvar</button>
      </div>
    </Modal>
  );
}

// --------------- Notificações ---------------
function NotificacoesPage({ user }:{ user: Usuario }) {
  useDbVersion();
  const nots = store.getState().notificacoes;
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-[650]">Notificações</h1>
        <button onClick={()=>{ store.markAllRead(user.perfil, user.escola||undefined); toast.success('Todas marcadas como lidas'); }} className="text-sm text-teal-700">Marcar todas como lidas</button>
      </div>
      <Card className="p-4 space-y-3">
        {nots.map(n=>(
          <div key={n.id} className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${n.lida ? 'bg-white border-stone-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="mt-0.5">{n.tipo==='ficai' ? <ShieldCheck size={18} className="text-amber-700"/> : n.tipo==='alerta' ? <AlertTriangle size={18} className="text-amber-700"/> : <Bell size={18} className="text-zinc-500"/>}</div>
            <div className="flex-1">
              <div className="font-medium text-[14px]">{n.titulo}</div>
              <div className="text-sm text-zinc-700">{n.mensagem}</div>
              <div className="text-[11px] text-zinc-500 mt-1">{new Date(n.data).toLocaleString('pt-BR')}</div>
            </div>
            {!n.lida && <button onClick={()=>store.markNotificacaoRead(n.id)} className="text-xs text-teal-700">Marcar lida</button>}
          </div>
        ))}
        {nots.length===0 && <div className="text-zinc-500">Nenhuma notificação.</div>}
      </Card>
    </div>
  );
}

// --------------- Backup ---------------
function BackupPage() {
  const [fileText, setFileText] = useState('');
  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-[26px] font-[650]">Backup / Restauração</h1>
      <Card className="p-5 space-y-3">
        <div className="font-medium">Backup automático diário</div>
        <div className="text-sm text-zinc-600">O banco de dados local é armazenado no navegador (localStorage). Para segurança, faça backups periódicos.</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>{ store.backupNow(); toast.success('Backup baixado'); }} className="px-4 py-2.5 rounded-xl text-white" style={{ background: BRAND.primary }}>Fazer backup agora (.json)</button>
          <button onClick={()=>{ if(confirm('Restaurar dados de fábrica? Isso apagará os dados atuais.')) { store.reset(); toast.success('Banco restaurado'); } }} className="px-4 py-2.5 rounded-xl border">Restaurar padrão</button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="font-medium">Restaurar de arquivo</div>
        <textarea className="input h-40 font-mono text-xs" placeholder="Cole aqui o JSON de backup..." value={fileText} onChange={e=>setFileText(e.target.value)} />
        <button onClick={()=>{ const ok = store.importJSON(fileText); if(ok){ toast.success('Backup restaurado'); setFileText(''); } else toast.error('Arquivo inválido'); }} className="px-4 py-2.5 rounded-xl border">Importar JSON</button>
        <div className="text-[12px] text-zinc-500">Servidor: 192.168.3.220:5174 · Banco local · Criptografia de senhas (simulado) · Logs de acesso ativos.</div>
      </Card>
    </div>
  );
}

// --------------- UI primitives ---------------
function DayPicker({ mesAno, selected, onChange }:{ mesAno: string, selected: number[], onChange: (days: number[])=>void }) {
  const [yStr, mStr] = (mesAno || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`).split('-');
  const year = Number(yStr) || new Date().getFullYear();
  const month = Number(mStr) || new Date().getMonth()+1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekDay = new Date(year, month-1, 1).getDay(); // 0=Dom
  const weekLabels = ['D','S','T','Q','Q','S','S'];

  const toggle = (d:number) => {
    const set = new Set(selected);
    if (set.has(d)) set.delete(d); else set.add(d);
    onChange(Array.from(set).sort((a,b)=>a-b));
  };

  const selectWeekdays = () => {
    const weekdays:number[] = [];
    for (let d=1; d<=daysInMonth; d++){
      const wd = new Date(year, month-1, d).getDay();
      if (wd !== 0 && wd !== 6) weekdays.push(d);
    }
    onChange(weekdays);
  };
  const clearAll = () => onChange([]);

  const selSet = new Set(selected);
  const FALTA_COLOR = '#d9482b';
  const FALTA_BORDER = '#b9331b';

  return (
    <div className="rounded-[14px] border border-stone-300 bg-white p-3">
      <div className="flex items-center justify-between mb-2 px-1 text-[12.5px]">
        <div className="font-medium text-zinc-800 capitalize">
          {new Date(year, month-1, 1).toLocaleDateString('pt-BR', { month:'long', year:'numeric' })}
          <span className="ml-2 text-[11.5px] font-semibold" style={{ color: FALTA_COLOR }}>
            · {selected.length} dia(s)
          </span>
        </div>
        <div className="flex gap-1.5 text-[11px]">
          <button type="button" onClick={selectWeekdays} className="px-2 py-1 rounded-full bg-stone-100 hover:bg-stone-200">Seg–Sex</button>
          <button type="button" onClick={clearAll} className="px-2 py-1 rounded-full bg-white hover:bg-stone-50 border border-stone-200">Limpar</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-[5px] text-center text-[10.5px] text-zinc-500 mb-1">
        {weekLabels.map((w,i)=><div key={i} className={i===0||i===6 ? 'text-zinc-400' : ''}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-[5px] max-w-[280px]">
        {Array.from({length: firstWeekDay}).map((_,i)=> <div key={'b'+i} className="w-8 h-8" />)}
        {Array.from({length: daysInMonth}, (_,i)=> i+1).map(d=>{
          const active = selSet.has(d);
          const wd = new Date(year, month-1, d).getDay();
          const isWeekend = wd === 0 || wd === 6;
          return (
            <button
              type="button"
              key={d}
              onClick={()=>toggle(d)}
              className={`w-8 h-8 rounded-[8px] text-[12px] font-[600] transition border
                ${active 
                  ? 'text-white shadow-sm' 
                  : isWeekend 
                    ? 'bg-stone-50 text-zinc-400 border-stone-200 hover:bg-stone-100'
                    : 'bg-white text-zinc-700 border-stone-200 hover:border-teal-400 hover:bg-teal-50'
                }`}
              style={active ? { background: FALTA_COLOR, borderColor: FALTA_BORDER } : {}}
              aria-pressed={active}
              title={active ? `Falta dia ${d}` : `Dia ${d}`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-zinc-600 mt-2.5">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[4px]" style={{ background: FALTA_COLOR }}></span> Falta</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[4px] bg-white border border-stone-300"></span> Letivo</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[4px] bg-stone-100 border border-stone-200"></span> FDS</span>
      </div>
    </div>
  );
}

function Field({ label, children }:{ label:string, children:React.ReactNode }) {
  return <label className="block">
    <div className="text-[12.5px] text-zinc-600 mb-1">{label}</div>
    {children}
  </label>;
}
function SectionTitle({ children, small }: { children: React.ReactNode, small?: boolean }) {
  return <div className={`${small ? 'text-[15px]' : 'text-[17px]'} font-semibold`}>{children}</div>;
}
function Modal({ title, children, onClose, wide }:{ title:string, children:React.ReactNode, onClose: ()=>void, wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-[22px] shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-2xl'} p-5 md:p-6`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{title}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100"><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Inject global input styling once
const styleId = 'sme-input-style';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const st = document.createElement('style');
  st.id = styleId;
  st.textContent = `.input { width:100%; padding:.78rem .95rem; border-radius: 14px; border:1px solid #d6d3cf; background:#faf9f7; outline:none } .input:focus{ border-color:#0f6b64; background:white }`;
  document.head.appendChild(st);
}