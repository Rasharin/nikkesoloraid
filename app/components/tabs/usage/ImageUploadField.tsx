"use client";

type ImageUploadFieldProps = {
  disabled?: boolean;
  onChange: (file: File | null) => void;
};

export default function ImageUploadField({ disabled, onChange }: ImageUploadFieldProps) {
  return (
    <label className="block rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/40 px-4 py-3 text-sm text-neutral-300">
      <div>이미지 업로드</div>
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="mt-3 block w-full text-xs text-neutral-400 file:mr-3 file:rounded-xl file:border file:border-neutral-700 file:bg-neutral-900 file:px-3 file:py-2 file:text-neutral-200"
      />
    </label>
  );
}
