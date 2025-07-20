"use client";

import { useRef, useState } from "react";

export default function ImageUploader({
  onImageSelected,
}: {
  onImageSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onImageSelected(file);
  }

  return (
    <div className={`w-full max-w-xs flex flex-col items-center gap-4`}>
      <div
        className={`w-64 h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all duration-150 cursor-pointer select-none
          ${dragActive ? "border-green-400 bg-green-100" : "border-green-700 bg-white hover:border-green-400"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <span className="text-5xl mb-2">📷</span>
        <span className="text-green-700 font-semibold text-lg mb-1">
          Scanner un aliment
        </span>
        <span className="text-neutral-500 text-sm text-center">
          Glisse une image ici ou clique pour choisir une photo
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageSelected(file);
        }}
        className="hidden"
      />
    </div>
  );
}
