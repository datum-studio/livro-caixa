import React, { useState, useEffect, useMemo, useRef } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import ReceiptModal from "./ReceiptModal";
import logo from "./assets/logo-datum-final.png";
import {
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  Briefcase,
  Wallet,
  Calendar,
  Trash2,
  Stamp,
  Receipt,
  Download,
} from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 10);

const fmtBRL = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(n) || 0
  );

const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const monthLabel = (iso) => {
  const [y, m] = iso.split("-");
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${meses[Number(m) - 1]}/${y.slice(2)}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// Number of calendar months from a start date up to today, inclusive.
// Used to accrue the fixed monthly amount owed for "mensal" jobs.
const monthsElapsed = (startDateISO) => {
  const [sy, sm] = startDateISO.split("-").map(Number);
  const now = new Date();
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  const diff = (ny * 12 + nm) - (sy * 12 + sm) + 1;
  return Math.max(1, diff);
};

const emptyData = () => ({ clients: [], jobs: [], payments: [] });

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const skipNextSave = useRef(true);

  const [selectedClientId, setSelectedClientId] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);

  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  const [showAddJobFor, setShowAddJobFor] = useState(null); // clientId
  const [jobDraft, setJobDraft] = useState(blankJobDraft());

  const [paymentDraftFor, setPaymentDraftFor] = useState(null); // jobId
  const [paymentDraft, setPaymentDraft] = useState(blankPaymentDraft());

  const [receiptFor, setReceiptFor] = useState(null); // { payment, job, client }

  function blankJobDraft() {
    return {
      description: "",
      paymentType: "unico",
      totalValue: "",
      monthlyValue: "",
      startDate: todayISO(),
    };
  }
  function blankPaymentDraft() {
    return { value: "", date: todayISO(), note: "" };
  }

  // Documento único e fixo — sem login, só quem tem o link acessa.
  const docRef = doc(db, "livro-caixa", "principal");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        skipNextSave.current = true;
        setData(snap.exists() ? snap.data().payload : emptyData());
        setLoading(false);
      },
      () => {
        setData(emptyData());
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data) return;
    if (skipNextSave.current) {
      // This change came from Firestore itself (onSnapshot) — don't write it back.
      skipNextSave.current = false;
      return;
    }
    (async () => {
      try {
        await setDoc(docRef, { payload: data, updatedAt: Date.now() });
        setSaveError(false);
      } catch (e) {
        setSaveError(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const clients = data?.clients || [];
  const jobs = data?.jobs || [];
  const payments = data?.payments || [];

  const jobsByClient = useMemo(() => {
    const map = {};
    for (const j of jobs) {
      if (!map[j.clientId]) map[j.clientId] = [];
      map[j.clientId].push(j);
    }
    for (const k in map) {
      map[k].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    }
    return map;
  }, [jobs]);

  const paymentsByJob = useMemo(() => {
    const map = {};
    for (const p of payments) {
      if (!map[p.jobId]) map[p.jobId] = [];
      map[p.jobId].push(p);
    }
    for (const k in map) {
      map[k].sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    return map;
  }, [payments]);

  const totalRecebidoGeral = useMemo(
    () => payments.reduce((sum, p) => sum + (Number(p.value) || 0), 0),
    [payments]
  );

  const totalPorAno = useMemo(() => {
    const map = {};
    for (const p of payments) {
      const y = p.date.slice(0, 4);
      map[y] = (map[y] || 0) + (Number(p.value) || 0);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [payments]);

  function clientTotal(clientId) {
    const jobIds = new Set((jobsByClient[clientId] || []).map((j) => j.id));
    return payments
      .filter((p) => jobIds.has(p.jobId))
      .reduce((s, p) => s + (Number(p.value) || 0), 0);
  }

  function jobTotal(jobId) {
    return (paymentsByJob[jobId] || []).reduce(
      (s, p) => s + (Number(p.value) || 0),
      0
    );
  }

  function addClient() {
    const name = newClientName.trim();
    if (!name) return;
    setData((d) => ({
      ...d,
      clients: [...d.clients, { id: uid(), name }],
    }));
    setNewClientName("");
    setShowAddClient(false);
  }

  function removeClient(clientId) {
    const jobIds = new Set((jobsByClient[clientId] || []).map((j) => j.id));
    setData((d) => ({
      clients: d.clients.filter((c) => c.id !== clientId),
      jobs: d.jobs.filter((j) => j.clientId !== clientId),
      payments: d.payments.filter((p) => !jobIds.has(p.jobId)),
    }));
    if (selectedClientId === clientId) setSelectedClientId(null);
  }

  function addJob(clientId) {
    if (!jobDraft.description.trim()) return;
    if (jobDraft.paymentType === "unico" && !jobDraft.totalValue) return;
    if (jobDraft.paymentType === "mensal" && !jobDraft.monthlyValue) return;
    const job = {
      id: uid(),
      clientId,
      description: jobDraft.description.trim(),
      paymentType: jobDraft.paymentType,
      totalValue:
        jobDraft.paymentType === "unico" ? Number(jobDraft.totalValue) : null,
      monthlyValue:
        jobDraft.paymentType === "mensal"
          ? Number(jobDraft.monthlyValue)
          : null,
      startDate: jobDraft.startDate || todayISO(),
    };
    setData((d) => ({ ...d, jobs: [...d.jobs, job] }));
    setJobDraft(blankJobDraft());
    setShowAddJobFor(null);
    setExpandedJobId(job.id);
  }

  function removeJob(jobId) {
    setData((d) => ({
      ...d,
      jobs: d.jobs.filter((j) => j.id !== jobId),
      payments: d.payments.filter((p) => p.jobId !== jobId),
    }));
  }

  function addPayment(jobId) {
    if (!paymentDraft.value || Number(paymentDraft.value) <= 0) return;
    const payment = {
      id: uid(),
      jobId,
      value: Number(paymentDraft.value),
      date: paymentDraft.date || todayISO(),
      note: paymentDraft.note.trim(),
    };
    setData((d) => ({ ...d, payments: [...d.payments, payment] }));
    setPaymentDraft(blankPaymentDraft());
    setPaymentDraftFor(null);
  }

  function removePayment(paymentId) {
    setData((d) => ({
      ...d,
      payments: d.payments.filter((p) => p.id !== paymentId),
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f1ec] flex items-center justify-center">
        <div className="text-[#14203a] font-mono text-sm tracking-widest animate-pulse">
          abrindo o livro-caixa…
        </div>
      </div>
    );
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="min-h-screen bg-[#f2f1ec] text-[#14203a] font-[Inter]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        .stamp {
          transform: rotate(-6deg);
          border: 2px solid currentColor;
          border-radius: 6px;
          letter-spacing: 0.12em;
        }
        .ledger-row + .ledger-row { border-top: 1px solid #dedad0; }
      `}</style>

      {/* Header */}
      <header className="border-b border-[#dedad0] bg-[#f7f5f0]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logo}
              alt="Datum Studio"
              className="h-10 sm:h-12 w-auto shrink-0"
            />
            <div className="h-8 w-px bg-[#dedad0] shrink-0" />
            <h1 className="font-display text-lg sm:text-2xl font-semibold leading-tight truncate">
              Livro-caixa de freelas
            </h1>
          </div>
          <Stamp className="w-8 h-8 text-[#9c7a3c] opacity-70 shrink-0" />
        </div>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard
            label="Total recebido"
            value={fmtBRL(totalRecebidoGeral)}
            accent="#1f6f54"
          />
          <SummaryCard
            label="Clientes ativos"
            value={String(clients.length)}
            accent="#14203a"
          />
          <SummaryCard
            label="Trabalhos registrados"
            value={String(jobs.length)}
            accent="#9c7a3c"
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8 grid md:grid-cols-[280px_1fr] gap-8">
        {/* Client list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[13px] font-mono uppercase tracking-widest text-[#8a8474]">
              <Users className="w-4 h-4" /> Clientes
            </div>
            <button
              onClick={() => setShowAddClient((v) => !v)}
              className="w-7 h-7 rounded-full bg-[#14203a] text-[#f2f1ec] flex items-center justify-center hover:bg-[#1f2f52] transition-colors"
              aria-label="Adicionar cliente"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showAddClient && (
            <div className="mb-3 p-3 bg-white border border-[#dedad0] rounded-lg">
              <input
                autoFocus
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addClient()}
                placeholder="Nome do cliente"
                className="w-full text-sm px-2 py-1.5 border border-[#dedad0] rounded outline-none focus:border-[#14203a]"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={addClient}
                  className="text-xs font-medium px-3 py-1.5 bg-[#1f6f54] text-white rounded hover:bg-[#195c46]"
                >
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setShowAddClient(false);
                    setNewClientName("");
                  }}
                  className="text-xs font-medium px-3 py-1.5 text-[#8a8474] hover:text-[#14203a]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {clients.length === 0 && !showAddClient && (
            <p className="text-sm text-[#8a8474] leading-relaxed">
              Nenhum cliente ainda. Cadastre o primeiro para começar a
              registrar trabalhos e pagamentos.
            </p>
          )}

          <ul className="space-y-1">
            {clients.map((c) => {
              const total = clientTotal(c.id);
              const isSelected = c.id === selectedClientId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() =>
                      setSelectedClientId(isSelected ? null : c.id)
                    }
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors group ${
                      isSelected
                        ? "bg-[#14203a] border-[#14203a] text-white"
                        : "bg-white border-[#dedad0] hover:border-[#14203a]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {c.name}
                      </span>
                      <Trash2
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remover ${c.name} e todos os trabalhos associados?`))
                            removeClient(c.id);
                        }}
                        className={`w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ${
                          isSelected ? "text-white" : "text-[#a83b2e]"
                        }`}
                      />
                    </div>
                    <div
                      className={`font-mono text-xs mt-0.5 ${
                        isSelected ? "text-[#d8dce6]" : "text-[#8a8474]"
                      }`}
                    >
                      {fmtBRL(total)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {totalPorAno.length > 0 && (
            <div className="mt-8">
              <div className="text-[13px] font-mono uppercase tracking-widest text-[#8a8474] mb-2">
                Por ano
              </div>
              <ul className="space-y-1">
                {totalPorAno.map(([year, total]) => (
                  <li
                    key={year}
                    className="flex justify-between text-sm py-1 border-b border-[#dedad0]"
                  >
                    <span className="text-[#8a8474]">{year}</span>
                    <span className="font-mono">{fmtBRL(total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Main panel */}
        <div>
          {!selectedClient ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-[#8a8474]">
              <Briefcase className="w-8 h-8 mb-3 opacity-40" />
              <p className="text-sm max-w-xs">
                Selecione um cliente à esquerda para ver os trabalhos, ou
                cadastre um novo cliente para começar.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {selectedClient.name}
                  </h2>
                  <p className="font-mono text-sm text-[#8a8474] mt-0.5">
                    {fmtBRL(clientTotal(selectedClient.id))} recebido no
                    total
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddJobFor(
                      showAddJobFor === selectedClient.id
                        ? null
                        : selectedClient.id
                    );
                    setJobDraft(blankJobDraft());
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-[#14203a] text-white rounded-lg hover:bg-[#1f2f52]"
                >
                  <Plus className="w-3.5 h-3.5" /> Trabalho
                </button>
              </div>

              {showAddJobFor === selectedClient.id && (
                <JobForm
                  draft={jobDraft}
                  setDraft={setJobDraft}
                  onCancel={() => setShowAddJobFor(null)}
                  onSave={() => addJob(selectedClient.id)}
                />
              )}

              <div className="space-y-3">
                {(jobsByClient[selectedClient.id] || []).length === 0 &&
                  showAddJobFor !== selectedClient.id && (
                    <p className="text-sm text-[#8a8474]">
                      Nenhum trabalho registrado para {selectedClient.name}{" "}
                      ainda. Você pode cadastrar trabalhos passados com data
                      retroativa para manter o histórico.
                    </p>
                  )}

                {(jobsByClient[selectedClient.id] || []).map((job) => {
                  const received = jobTotal(job.id);
                  const saldo =
                    job.paymentType === "unico"
                      ? Math.max(0, job.totalValue - received)
                      : null;
                  const totalDevidoMensal =
                    job.paymentType === "mensal"
                      ? monthsElapsed(job.startDate) * job.monthlyValue
                      : null;
                  const saldoDevedorMensal =
                    job.paymentType === "mensal"
                      ? totalDevidoMensal - received
                      : null;
                  const isExpanded = expandedJobId === job.id;
                  const jobPayments = paymentsByJob[job.id] || [];
                  const quitado =
                    job.paymentType === "unico" && saldo <= 0.0001;
                  const emDiaMensal =
                    job.paymentType === "mensal" &&
                    saldoDevedorMensal <= 0.0001;

                  return (
                    <div
                      key={job.id}
                      className="bg-white border border-[#dedad0] rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedJobId(isExpanded ? null : job.id)
                        }
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {job.description}
                            </span>
                            <span
                              className={`stamp text-[9px] font-mono px-1.5 py-0.5 shrink-0 ${
                                job.paymentType === "mensal"
                                  ? emDiaMensal
                                    ? "text-[#1f6f54]"
                                    : "text-[#a83b2e]"
                                  : quitado
                                  ? "text-[#1f6f54]"
                                  : "text-[#a83b2e]"
                              }`}
                            >
                              {job.paymentType === "mensal"
                                ? emDiaMensal
                                  ? "EM DIA"
                                  : "DEVENDO"
                                : quitado
                                ? "QUITADO"
                                : "PENDENTE"}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-[#8a8474] mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            desde {fmtDate(job.startDate)}
                            {job.paymentType === "unico" && (
                              <span className="ml-2">
                                {fmtBRL(received)} / {fmtBRL(job.totalValue)}
                              </span>
                            )}
                            {job.paymentType === "mensal" && (
                              <span className="ml-2">
                                {fmtBRL(job.monthlyValue)}/mês
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 shrink-0 text-[#8a8474]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 shrink-0 text-[#8a8474]" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#dedad0] px-4 py-3 bg-[#faf9f6]">
                          {job.paymentType === "unico" &&
                            saldo != null &&
                            saldo > 0 && (
                              <p className="text-xs font-mono text-[#a83b2e] mb-3">
                                Saldo restante: {fmtBRL(saldo)}
                              </p>
                            )}
                          {job.paymentType === "mensal" && (
                            <p
                              className={`text-xs font-mono mb-3 ${
                                emDiaMensal
                                  ? "text-[#1f6f54]"
                                  : "text-[#a83b2e]"
                              }`}
                            >
                              {emDiaMensal
                                ? saldoDevedorMensal < -0.0001
                                  ? `Adiantado: ${fmtBRL(-saldoDevedorMensal)}`
                                  : "Em dia com os pagamentos"
                                : `Saldo devedor acumulado: ${fmtBRL(
                                    saldoDevedorMensal
                                  )}`}
                              <span className="text-[#8a8474]">
                                {" "}
                                · devido até agora:{" "}
                                {fmtBRL(totalDevidoMensal)} · recebido:{" "}
                                {fmtBRL(received)}
                              </span>
                            </p>
                          )}

                          {jobPayments.length > 0 && (
                            <ul className="mb-3">
                              {jobPayments.map((p) => (
                                <li
                                  key={p.id}
                                  className="ledger-row flex items-center justify-between gap-2 py-2 group"
                                >
                                  <div className="min-w-0">
                                    <div className="font-mono text-sm">
                                      {fmtBRL(p.value)}
                                    </div>
                                    <div className="text-xs text-[#8a8474] truncate">
                                      {fmtDate(p.date)}
                                      {job.paymentType === "mensal" &&
                                        ` · ${monthLabel(p.date)}`}
                                      {p.note ? ` · ${p.note}` : ""}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <Receipt
                                      onClick={() =>
                                        setReceiptFor({
                                          payment: p,
                                          job,
                                          client: selectedClient,
                                        })
                                      }
                                      className="w-3.5 h-3.5 text-[#14203a] opacity-40 group-hover:opacity-80 hover:!opacity-100 cursor-pointer"
                                    />
                                    <Trash2
                                      onClick={() => removePayment(p.id)}
                                      className="w-3.5 h-3.5 text-[#a83b2e] opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-pointer"
                                    />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}

                          {paymentDraftFor === job.id ? (
                            <PaymentForm
                              draft={paymentDraft}
                              setDraft={setPaymentDraft}
                              onCancel={() => setPaymentDraftFor(null)}
                              onSave={() => addPayment(job.id)}
                            />
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setPaymentDraft(blankPaymentDraft());
                                  setPaymentDraftFor(job.id);
                                }}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[#1f6f54] text-white rounded-lg hover:bg-[#195c46]"
                              >
                                <Plus className="w-3.5 h-3.5" /> Pagamento
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Remover este trabalho e seus pagamentos?"))
                                    removeJob(job.id);
                                }}
                                className="text-xs text-[#a83b2e] hover:underline"
                              >
                                Remover trabalho
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {saveError && (
        <div className="fixed bottom-4 right-4 bg-[#a83b2e] text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          Não consegui salvar agora. Tente novamente.
        </div>
      )}

      {receiptFor && (
        <ReceiptModal
          payment={receiptFor.payment}
          job={receiptFor.job}
          client={receiptFor.client}
          onClose={() => setReceiptFor(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent, className = "" }) {
  return (
    <div
      className={`bg-white border border-[#dedad0] rounded-lg px-4 py-3 ${className}`}
    >
      <div className="text-[10px] font-mono uppercase tracking-widest text-[#8a8474] mb-1">
        {label}
      </div>
      <div
        className="font-display text-lg sm:text-xl font-semibold"
        style={{ color: accent }}
      >
        {value}
      </div>
    </div>
  );
}

function JobForm({ draft, setDraft, onCancel, onSave }) {
  return (
    <div className="mb-4 p-4 bg-white border border-[#dedad0] rounded-lg space-y-3">
      <div>
        <label className="text-xs text-[#8a8474] block mb-1">
          Descrição do trabalho
        </label>
        <input
          autoFocus
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
          placeholder="Ex.: Sistema de controle de estoque"
          className="w-full text-sm px-2 py-1.5 border border-[#dedad0] rounded outline-none focus:border-[#14203a]"
        />
      </div>

      <div>
        <label className="text-xs text-[#8a8474] block mb-1">
          Tipo de pagamento
        </label>
        <div className="flex gap-2">
          {[
            { key: "unico", label: "Único" },
            { key: "mensal", label: "Mensal" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() =>
                setDraft((d) => ({ ...d, paymentType: opt.key }))
              }
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                draft.paymentType === opt.key
                  ? "bg-[#14203a] text-white border-[#14203a]"
                  : "border-[#dedad0] text-[#8a8474]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {draft.paymentType === "unico" && (
        <div>
          <label className="text-xs text-[#8a8474] block mb-1">
            Valor total combinado (R$)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={draft.totalValue}
            onChange={(e) =>
              setDraft((d) => ({ ...d, totalValue: e.target.value }))
            }
            placeholder="0,00"
            className="w-full text-sm px-2 py-1.5 border border-[#dedad0] rounded outline-none focus:border-[#14203a] font-mono"
          />
        </div>
      )}

      {draft.paymentType === "mensal" && (
        <div>
          <label className="text-xs text-[#8a8474] block mb-1">
            Valor mensal fixo combinado (R$)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={draft.monthlyValue}
            onChange={(e) =>
              setDraft((d) => ({ ...d, monthlyValue: e.target.value }))
            }
            placeholder="0,00"
            className="w-full text-sm px-2 py-1.5 border border-[#dedad0] rounded outline-none focus:border-[#14203a] font-mono"
          />
          <p className="text-[11px] text-[#8a8474] mt-1">
            Se um mês pagar menos que isso, a diferença acumula como saldo
            devedor para o próximo mês.
          </p>
        </div>
      )}

      <div>
        <label className="text-xs text-[#8a8474] block mb-1">
          Data de início {draft.paymentType === "unico" ? "(pode ser retroativa)" : ""}
        </label>
        <input
          type="date"
          value={draft.startDate}
          onChange={(e) =>
            setDraft((d) => ({ ...d, startDate: e.target.value }))
          }
          className="w-full text-sm px-2 py-1.5 border border-[#dedad0] rounded outline-none focus:border-[#14203a] font-mono"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          className="text-xs font-medium px-3 py-1.5 bg-[#1f6f54] text-white rounded hover:bg-[#195c46]"
        >
          Salvar trabalho
        </button>
        <button
          onClick={onCancel}
          className="text-xs font-medium px-3 py-1.5 text-[#8a8474] hover:text-[#14203a]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function PaymentForm({ draft, setDraft, onCancel, onSave }) {
  return (
    <div className="p-3 bg-white border border-[#dedad0] rounded-lg space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-[#8a8474] block mb-1">Valor (R$)</label>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={draft.value}
            onChange={(e) =>
              setDraft((d) => ({ ...d, value: e.target.value }))
            }
            placeholder="0,00"
            className="w-full text-sm px-2 py-1.5 border border-[#dedad0] rounded outline-none focus:border-[#14203a] font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-[#8a8474] block mb-1">
            Data (pode ser retroativa)
          </label>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            className="w-full text-sm px-2 py-1.5 border border-[#dedad0] rounded outline-none focus:border-[#14203a] font-mono"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-[#8a8474] block mb-1">
          Observação (opcional)
        </label>
        <input
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
          placeholder="Ex.: fechamento de folha + ajuste de relatório"
          className="w-full text-sm px-2 py-1.5 border border-[#dedad0] rounded outline-none focus:border-[#14203a]"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          className="text-xs font-medium px-3 py-1.5 bg-[#1f6f54] text-white rounded hover:bg-[#195c46]"
        >
          Registrar pagamento
        </button>
        <button
          onClick={onCancel}
          className="text-xs font-medium px-3 py-1.5 text-[#8a8474] hover:text-[#14203a]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
