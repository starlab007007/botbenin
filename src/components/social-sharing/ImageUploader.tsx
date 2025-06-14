
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X, Loader2 } from "lucide-react";

interface ImageUploaderProps {
  max?: number;
  files: (File | null)[];
  urls: (string | null)[];
  onChange: (files: (File | null)[], urls: (string | null)[]) => void;
  isUploading: boolean;
  onUpload: (files: File[]) => Promise<void>;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  max = 3,
  files,
  urls,
  onChange,
  isUploading,
  onUpload,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const newFiles: (File | null)[] = [...files];
    Array.from(fileList).slice(0, max).forEach((file, idx) => {
      const slot = newFiles.findIndex((f) => !f);
      if (slot !== -1) newFiles[slot] = file;
    });
    // Reset corresponding urls when new file chosen
    onChange(newFiles.slice(0, max), newFiles.map((f, i) => (!!f && typeof urls[i] === "string" && urls[i]) ? urls[i] : null));
  };

  const handleRemove = (i: number) => {
    const newFiles = [...files];
    const newUrls = [...urls];
    newFiles[i] = null;
    newUrls[i] = null;
    onChange(newFiles, newUrls);
  };

  const handleUpload = async () => {
    const filesToUpload = files.filter(Boolean) as File[];
    if (filesToUpload.length === 0) return;
    await onUpload(filesToUpload);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1 flex items-center gap-2 cursor-pointer">
        <ImageIcon className="h-4 w-4" />
        Images à partager (max {max})
      </label>
      <div className="flex gap-2">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className="relative group">
            {files[i] ? (
              <div className="w-20 h-20 border rounded bg-muted flex justify-center items-center overflow-hidden relative">
                <img
                  src={urls[i] || URL.createObjectURL(files[i]!)}
                  alt={`Choisie #${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-white text-red-500 rounded-full p-1 opacity-80 hover:opacity-100"
                  onClick={() => handleRemove(i)}
                  aria-label="Supprimer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-20 h-20 border-2 border-dashed rounded text-muted-foreground flex flex-col items-center justify-center"
                onClick={() => inputRef.current?.click()}
              >
                <ImageIcon className="h-6 w-6 mb-1" />
                + Image
              </button>
            )}
          </div>
        ))}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />
      </div>
      <div className="mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUpload}
          disabled={isUploading || !files.some(Boolean)}
        >
          {isUploading && <Loader2 className="animate-spin w-4 h-4 mr-1" />}
          {isUploading ? "Upload..." : "Uploader"}
        </Button>
      </div>
    </div>
  );
};
