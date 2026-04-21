"use client";

import { useEffect, useState } from "react";

const termsText = `이용약관

제1조 (목적)
본 약관은 니케 솔로레이드 덱 도우미(이하 "서비스"라 합니다)가 제공하는 니케 솔로레이드 덱 기록 및 공유 플랫폼의 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 니케 솔로레이드 덱 도우미가 제공하는 니케 솔로레이드 덱 기록 및 공유 플랫폼을 의미합니다.
2. "이용자"란 본 약관에 따라 서비스를 이용하는 자를 말합니다.
3. "회원"이란 서비스에 로그인하여 이용자격을 부여받은 자를 말합니다.
4. "솔로레이드"란 게임 『승리의 여신: 니케』 내 콘텐츠를 의미합니다.

제3조 (이용자격 및 계정)
1. 서비스는 누구나 이용할 수 있으며, 일부 기능은 로그인을 필요로 합니다.
2. 이용자는 구글 계정을 통해 로그인할 수 있습니다.
3. 이용자는 자신의 계정 정보를 스스로 관리할 책임이 있으며, 이를 소홀히 하여 발생한 문제에 대해 서비스는 책임을 지지 않습니다.
4. 타인의 계정을 도용하거나 부정하게 사용하는 행위는 금지됩니다.

제4조 (서비스 내용)
서비스는 다음의 기능을 제공합니다:
- 솔로레이드 덱 생성 및 관리
- 솔로레이드 보스 정보 제공
- 덱 기록 및 저장 기능
- 이용자 데이터를 기반으로 한 덱 추천 기능
- 게시판을 통한 커뮤니티 기능

제5조 (데이터의 활용)
1. 서비스는 이용자가 생성한 덱 데이터를 가공하여 통계, 분석, 시각화 등의 형태로 활용할 수 있습니다.
2. 해당 데이터는 개인을 식별할 수 없는 형태로 활용됩니다.

제6조 (이용자의 의무 및 금지행위)
이용자는 다음 행위를 하여서는 안 됩니다:
- 허위 정보 입력
- 서비스 운영을 방해하는 행위
- 서비스의 취약점을 악용하는 행위
- 타인의 권리를 침해하는 행위
- 기타 법령에 위반되는 행위

제7조 (게시물 및 콘텐츠)
1. 이용자가 작성한 게시물의 책임은 해당 이용자에게 있습니다.
2. 서비스는 다음에 해당하는 게시물을 사전 통보 없이 삭제할 수 있습니다:
   - 법령 위반 또는 불법 콘텐츠
   - 타인의 권리를 침해하는 내용
   - 서비스 운영에 부적절한 내용
3. 서비스는 서비스 운영 및 홍보를 위해 이용자의 게시물을 활용할 수 있습니다.

제8조 (서비스 이용제한)
1. 서비스는 이용자가 본 약관을 위반할 경우 사전 통보 없이 이용을 제한할 수 있습니다.
2. 이용제한은 일시적 제한 또는 영구 차단의 형태로 이루어질 수 있습니다.
3. 이용자는 이용제한에 대해 문의를 통해 이의신청을 할 수 있습니다.

제9조 (서비스의 변경 및 중단)
1. 서비스는 운영상 필요에 따라 일부 또는 전체 서비스를 변경하거나 중단할 수 있습니다.
2. 서비스 변경 또는 중단 시 사전에 공지합니다. 단, 긴급한 경우 사후 공지할 수 있습니다.

제10조 (면책조항)
1. 본 서비스는 『승리의 여신: 니케』의 비공식 팬 사이트입니다.
2. 서비스는 제공되는 정보의 정확성, 완전성, 신뢰성을 보장하지 않습니다.
3. 이용자가 서비스를 통해 얻은 정보 또는 추천 결과로 인해 발생한 손해에 대해 책임지지 않습니다.
4. 이용자 간 분쟁에 대해 서비스는 개입하지 않으며 책임을 지지 않습니다.
5. 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.

제11조 (약관의 변경)
1. 서비스는 필요한 경우 약관을 변경할 수 있습니다.
2. 변경된 약관은 시행일 7일 전부터 공지합니다.
3. 이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있습니다.
4. 시행일 이후 서비스를 계속 이용하는 경우 변경에 동의한 것으로 간주합니다.

제12조 (준거법 및 관할법원)
1. 본 약관은 대한민국 법률에 따라 해석됩니다.
2. 서비스와 이용자 간 발생한 분쟁은 민사소송법에 따른 관할법원에 제기합니다.`;

type TermsContentProps = {
  content?: string;
  canEdit?: boolean;
  saving?: boolean;
  onSave?: (nextText: string) => Promise<boolean>;
};

export default function TermsContent({ content = "", canEdit = false, saving = false, onSave }: TermsContentProps) {
  const displayText = content.trim() ? content : termsText;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayText);

  useEffect(() => {
    if (!editing) {
      setDraft(displayText);
    }
  }, [displayText, editing]);

  async function handleSave() {
    if (!onSave) return;
    const saved = await onSave(draft);
    if (saved) {
      setEditing(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-2xl sm:p-8">
      <div className="mb-5 flex flex-col gap-3 border-b border-neutral-700 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-neutral-100">이용약관</h2>
        {canEdit ? (
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(displayText);
                    setEditing(false);
                  }}
                  disabled={saving}
                  className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-2xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200"
              >
                수정
              </button>
            )}
          </div>
        ) : null}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-[60vh] w-full resize-y rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 font-sans text-sm leading-7 text-neutral-100 outline-none focus:border-neutral-500"
        />
      ) : (
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-300">
          {displayText}
        </pre>
      )}
    </section>
  );
}