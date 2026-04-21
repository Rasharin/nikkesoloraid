const licenseText = `Nikkesolo License
=======================================================================

[한국어]

본 프로젝트(Nikkesolo)는 Rasharin이 개발 및 운영하는 개인 서비스입니다.

본 서비스에 포함된 모든 소스 코드, 디자인, 텍스트 및 관련 자료의 저작권은 
Rasharin에게 있으며, 별도의 명시가 없는 한 해당 콘텐츠는 비공개(proprietary)로 보호됩니다.

이용자는 사전 서면 동의 없이 본 프로젝트의 일부 또는 전체를 복제, 수정, 배포, 
재사용할 수 없습니다.

본 프로젝트는 오픈소스가 아닙니다.


[English]

Nikkesolo is a personal project developed and operated by Rasharin.

All source code, design, text, and related materials included in this project 
are the property of Rasharin and are protected as proprietary content unless otherwise stated.

You may not copy, modify, distribute, or reuse any part of this project, 
in whole or in part, without prior written permission from the author.

This project is not open source.`;

export default function LicenseContent() {
  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-2xl sm:p-8">
      <div className="mb-5 border-b border-neutral-700 pb-4">
        <h2 className="text-xl font-semibold text-neutral-100">라이센스</h2>
      </div>
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-neutral-300 sm:text-sm">
        {licenseText}
      </pre>
    </section>
  );
}
