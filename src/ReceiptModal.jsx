import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { X, Download, Stamp } from "lucide-react";
import logo from "./assets/logo-datum-final.png";

const fmtBRL = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(n) || 0
  );

const fmtDateLong = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  return `${d} de ${meses[m - 1]} de ${y}`;
};

// Recibo Nº a partir do id do pagamento, curto e estável.
function receiptNumber(paymentId) {
  return paymentId.slice(0, 6).toUpperCase();
}

export default function ReceiptModal({
  payment,
  job,
  client,
  onClose,
}) {
  const ref = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    if (!ref.current) return;
    setDownloading(true);
    setError("");
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement("a");
      const fileDate = payment.date || "";
      const safeClient = (client?.name || "cliente")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-");
      link.download = `recibo-${safeClient}-${fileDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setError("Não consegui gerar a imagem. Tenta de novo.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-sm w-full my-8 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#dedad0]">
          <span className="text-sm font-medium text-[#14203a]">
            Recibo
          </span>
          <button
            onClick={onClose}
            className="text-[#8a8474] hover:text-[#14203a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-[#ebe9e2] flex justify-center">
          {/* Wrapper só para o preview em miniatura; a captura usa o nó
              interno (ref), que não tem transform aplicado a ele mesmo. */}
          <div
            style={{
              width: 720 * 0.42,
              height: 900 * 0.42,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 720,
                transform: "scale(0.42)",
                transformOrigin: "top left",
              }}
            >
              <div
                ref={ref}
                style={{
                  width: 720,
                  minHeight: 900,
                  background: "#faf9f6",
                  fontFamily: "'Inter', sans-serif",
                  color: "#14203a",
                  padding: "56px 52px",
                  boxSizing: "border-box",
                  position: "relative",
                }}
              >
                <img
                  src={logo}
                  alt="Datum Studio"
                  style={{ height: 40, width: "auto", display: "block" }}
                />
                <div
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 34,
                    fontWeight: 600,
                    marginTop: 22,
                    marginBottom: 4,
                  }}
                >
                  Recibo de pagamento
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13,
                    color: "#8a8474",
                    marginBottom: 32,
                  }}
                >
                  Nº {receiptNumber(payment.id)}
                </div>

                <div
                  style={{ borderTop: "1.5px solid #dedad0", paddingTop: 28 }}
                >
                  <Field label="Recebi de">{client?.name || "—"}</Field>
                  <Field label="Referente a">{job?.description || "—"}</Field>
                  {payment.note && (
                    <Field label="Observação">{payment.note}</Field>
                  )}
                  <Field label="Data do pagamento">
                    {fmtDateLong(payment.date)}
                  </Field>
                </div>

                <div
                  style={{
                    marginTop: 36,
                    padding: "24px 28px",
                    background: "#14203a",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#b9c0d1",
                    }}
                  >
                    Valor pago
                  </span>
                  <span
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontSize: 30,
                      fontWeight: 600,
                      color: "#ffffff",
                    }}
                  >
                    {fmtBRL(payment.value)}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 48,
                    paddingTop: 20,
                    borderTop: "1px solid #dedad0",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: "#8a8474",
                    lineHeight: 1.7,
                  }}
                >
                  Recibo gerado eletronicamente pela Datum Studio.
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: 56,
                    right: 52,
                    transform: "rotate(-8deg)",
                    border: "2.5px solid #1f6f54",
                    color: "#1f6f54",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                  }}
                >
                  PAGO
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="px-4 pt-3 text-xs text-[#a83b2e]">{error}</p>
        )}

        <div className="p-4 flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium px-3 py-2.5 bg-[#1f6f54] text-white rounded-lg hover:bg-[#195c46] disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Gerando…" : "Baixar imagem"}
          </button>
        </div>
        <p className="px-4 pb-4 -mt-1 text-[11px] text-[#8a8474]">
          Baixa como PNG — depois é só anexar no WhatsApp.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#8a8474",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 500 }}>{children}</div>
    </div>
  );
}
