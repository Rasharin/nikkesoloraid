"use client";

export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK|FBAN|FBAV|Instagram|NAVER|Daum|Line|wv/i.test(navigator.userAgent);
}

export default function InAppBlockerModal(props: {
  open: boolean;
  onClose: () => void;
}) {
  const { open, onClose } = props;
  if (!open) return null;

  const openExternal = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-yellow-400/30 bg-neutral-900 p-4">
        <div className="text-base font-semibold">인앱 브라우저에서는 Google 로그인이 차단됩니다</div>
        <div className="mt-2 text-sm text-neutral-300">
          크롬(외부 브라우저)에서 다시 열고 로그인해주세요.
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-neutral-700 bg-transparent px-3 py-2 text-sm text-neutral-200"
          >
            닫기
          </button>
          <button
            onClick={openExternal}
            className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black"
          >
            크롬에서 열기
          </button>
        </div>
      </div>
    </div>
  );
}