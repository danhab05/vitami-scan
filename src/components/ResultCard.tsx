"use client";

import { motion } from "framer-motion";

export default function ResultCard({
  aliment,
  vitamineK,
  source,
  alimentRecherche,
}: {
  aliment: string;
  vitamineK: string;
  source?: string;
  alimentRecherche?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 mt-8 text-center border border-green-200"
    >
      <h2 className="text-2xl font-bold text-green-700 mb-3 tracking-tight">
        Résultat
      </h2>
      <p className="text-neutral-500 mb-2 text-base">🥼 Aliment détecté :</p>
      <p className="text-2xl font-extrabold capitalize text-green-800 mb-1 drop-shadow">
        {aliment}
      </p>
      {alimentRecherche && (
        <p className="text-xs text-neutral-400 mb-2">
          (Recherche sur :{" "}
          <span className="font-semibold">{alimentRecherche}</span>)
        </p>
      )}
      <p className="text-neutral-500 text-base">🧪 Vitamine K pour 100g :</p>
      <p className="text-2xl font-extrabold text-green-700 mb-4">
        {vitamineK} / 100g
      </p>
      {/* Jauge graphique stylisée */}
      <div className="w-full bg-green-100 h-5 mt-4 rounded-full overflow-hidden border border-green-200">
        <div
          className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-500"
          style={{ width: getBarWidth(vitamineK) }}
        ></div>
      </div>
      {source && (
        <a
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-4 text-green-600 underline text-sm hover:text-green-800"
        >
          Voir la source CIQUAL
        </a>
      )}
    </motion.div>
  );
}

function getBarWidth(val: string | undefined) {
  if (!val) return "5%";
  const match = val.match(/([\d,.]+)/);
  const n = match ? parseFloat(match[1].replace(",", ".")) : NaN;
  if (isNaN(n)) return "5%";
  if (n > 100) return "100%";
  return `${n}%`;
}
