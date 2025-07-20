"use client";

import { useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import ResultCard from "@/components/ResultCard";

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    aliment: string;
    vitamineK: string;
    source?: string;
    suggestions?: Array<{ nom: string; url: string; valeur?: string | null }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState("");

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

  const handleAnalyse = async () => {
    if (!imageFile) return;
    setLoading(true);
    const base64 = await toBase64(imageFile);

    const res = await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
    });

    const data = await res.json();
    setResult({
      aliment: data.aliment,
      vitamineK: data.vitamineK,
      source: data.source,
      suggestions: data.suggestions,
    });
    setLoading(false);
  };

  const handleTextAnalyse = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    const res = await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aliment: textInput.trim() }),
    });
    const data = await res.json();
    setResult({
      aliment: data.aliment,
      vitamineK: data.vitamineK,
      source: data.source,
      suggestions: data.suggestions,
    });
    setLoading(false);
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8">
      <h1
        className="text-4xl md:text-5xl font-extrabold text-green-700 mb-2 tracking-tight drop-shadow-lg select-none cursor-pointer"
        onClick={() => {
          setResult(null);
          setImageFile(null);
          setTextInput("");
        }}
      >
        <span className="inline-block align-middle mr-2">🥬</span>VitamiScan
      </h1>
      <p className="text-neutral-500 mb-8 text-center max-w-md">
        Scanne un aliment pour découvrir son taux de{" "}
        <span className="text-green-700 font-semibold">Vitamine K</span> grâce à
        l'IA, ou saisis un nom ci-dessous.
      </p>

      {/* Champ texte pour recherche sans photo */}
      {!imageFile && !result && (
        <div className="w-full max-w-xs flex flex-col items-center gap-2 mb-6">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Nom d'un aliment (ex : basilic)"
            className="w-full px-4 py-2 rounded-lg border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-lg"
          />
          <button
            onClick={handleTextAnalyse}
            className="w-full py-2 rounded-lg bg-green-500 text-white font-semibold shadow hover:bg-green-600 transition-all"
          >
            Analyser sans photo
          </button>
        </div>
      )}

      {!imageFile && !result && (
        <ImageUploader onImageSelected={setImageFile} />
      )}

      {imageFile && !result && (
        <div className="flex flex-col items-center gap-6 w-full max-w-xs">
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Aperçu de l'aliment"
            className="w-64 h-64 object-cover rounded-2xl shadow-lg border-4 border-green-200 bg-white"
          />
          <button
            onClick={handleAnalyse}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-green-600 text-lg font-bold text-white shadow-lg hover:scale-105 hover:from-green-300 hover:to-green-500 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          >
            Analyser
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-8 flex flex-col items-center animate-pulse">
          <span className="text-green-700 text-2xl mb-2">🤖</span>
          <p className="text-green-700 font-medium">
            Analyse en cours avec Gemini AI...
          </p>
        </div>
      )}

      {result && (
        <>
          {imageFile && (
            <div className="flex justify-center mb-4">
              <img
                src={URL.createObjectURL(imageFile)}
                alt="Aperçu de l'aliment"
                className="w-48 h-48 object-cover rounded-2xl shadow-lg border-4 border-green-200 bg-white"
              />
            </div>
          )}
          <ResultCard
            aliment={result.aliment}
            vitamineK={result.vitamineK}
            source={result.source}
          />
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="mt-4 w-full max-w-sm bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="mb-2 text-green-700 font-semibold text-sm">
                Variantes CIQUAL disponibles :
              </p>
              <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {result.suggestions.map((s, idx) => (
                  <li key={s.url}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-green-100 rounded-lg px-3 py-2 mb-1">
                      <div className="text-left">
                        <span className="font-medium text-green-900">
                          {s.nom}
                        </span>
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-green-500 underline text-xs hover:text-green-700"
                          >
                            Source
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 sm:mt-0">
                        <span className="text-green-700 font-bold text-base">
                          {s.valeur ? `${s.valeur} µg` : "?"}
                        </span>
                        <button
                          className="ml-2 px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 border border-green-200 transition-all"
                          onClick={async () => {
                            setLoading(true);
                            const res = await fetch("/api/analyse", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ aliment: s.nom }),
                            });
                            const data = await res.json();
                            setResult({
                              aliment: data.aliment,
                              vitamineK: data.vitamineK,
                              source: data.source,
                              suggestions: data.suggestions,
                            });
                            setLoading(false);
                          }}
                        >
                          Sélectionner
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => {
              setResult(null);
              setImageFile(null);
              setTextInput("");
            }}
            className="mt-6 px-6 py-2 rounded-xl bg-white text-green-700 font-semibold shadow hover:bg-green-50 hover:text-green-900 transition-all border border-green-200"
          >
            ⬅️ Revenir
          </button>
        </>
      )}
    </main>
  );
}
