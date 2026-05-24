"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { HealthResponse } from "@farmagest/shared";

export default function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<HealthResponse>("/health")
      .then((r) => setHealth(r.data))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main className="min-h-screen bg-pmdc-blue flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-pmdc-blue rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl">
          💊
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 mb-1">
          FarmaGest
        </h1>
        <p className="text-sm text-slate-500 mb-2">
          Controle de medicamentos e correlatos
        </p>
        <p className="text-xs text-slate-400 tracking-wider mb-8">
          PREFEITURA MUNICIPAL DE DUQUE DE CAXIAS
        </p>

        <div className="border-t pt-6">
          {error && (
            <div className="bg-status-danger-bg text-status-danger p-3 rounded-lg text-sm">
              ❌ Erro ao conectar à API: {error}
            </div>
          )}
          {health && (
            <div className="bg-status-success-bg text-status-success p-3 rounded-lg text-sm">
              ✓ API conectada — v{health.version}
              <div className="text-xs text-slate-500 mt-1">
                {new Date(health.timestamp).toLocaleString("pt-BR")}
              </div>
            </div>
          )}
          {!health && !error && (
            <div className="text-slate-400 text-sm">Verificando API...</div>
          )}
        </div>
      </div>
    </main>
  );
}
