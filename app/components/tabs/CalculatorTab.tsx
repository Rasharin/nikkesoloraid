"use client";

import { useMemo, useState } from "react";

type UnitType = "attacker" | "supporter" | "defender";

const TYPE_OPTIONS: { key: UnitType; label: string; value: number }[] = [
  { key: "attacker", label: "화력형", value: 92658 },
  { key: "supporter", label: "지원형", value: 81039 },
  { key: "defender", label: "방어형", value: 60481 },
];

const BUFF_FIELDS = [
  "공격 데미지 증가",
  "파츠 데미지 증가",
  "관통 데미지 증가",
  "지속 데미지 증가",
  "방어 무시 데미지 증가",
  "~데미지 증가",
] as const;

const DEFAULT_BUFF_VALUES = BUFF_FIELDS.map(() => "");

function parsePercent(value: string) {
  const numeric = Number(value.replaceAll(",", "").trim());
  if (!Number.isFinite(numeric)) return 0;
  return numeric / 100;
}

function hasValue(value: string) {
  return value.trim().length > 0;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

const RAPI_DAMAGE_REFERENCE = 382723.87;

export default function CalculatorTab() {
  const [unitType, setUnitType] = useState<UnitType>("attacker");
  const [attackBuff, setAttackBuff] = useState("");
  const [attackBuff2, setAttackBuff2] = useState("");
  const [attackBuff3, setAttackBuff3] = useState("");
  const [temporalAttackBuff, setTemporalAttackBuff] = useState("");
  const [buffValues, setBuffValues] = useState<string[]>(DEFAULT_BUFF_VALUES);
  const [coefficient, setCoefficient] = useState("");
  const [chargeCoefficient, setChargeCoefficient] = useState("");
  const [chargeDamageBonus, setChargeDamageBonus] = useState("");
  const [damageTakenBonus, setDamageTakenBonus] = useState("");

  const selectedType = TYPE_OPTIONS.find((option) => option.key === unitType) ?? TYPE_OPTIONS[0];
  const baseAttack = selectedType.value;

  const attackBuffValue = parsePercent(attackBuff);
  const attackBuffValue2 = parsePercent(attackBuff2);
  const attackBuffValue3 = parsePercent(attackBuff3);
  const totalAttackBuffValue = attackBuffValue + attackBuffValue2 + attackBuffValue3;
  const temporalAttackBuffValue = parsePercent(temporalAttackBuff);
  const attackBuffApplied = baseAttack * (1 + totalAttackBuffValue);
  const temporalAttackApplied = hasValue(temporalAttackBuff)
    ? (1 + temporalAttackBuffValue) * baseAttack + baseAttack
    : 0;
  const attackPower = hasValue(temporalAttackBuff) ? attackBuffApplied + temporalAttackApplied : attackBuffApplied;

  const buffSum = useMemo(() => buffValues.reduce((total, value) => total + parsePercent(value), 0), [buffValues]);
  const coefficientValue = hasValue(coefficient) ? parsePercent(coefficient) : 1;
  const chargeCoefficientValue = parsePercent(chargeCoefficient);
  const chargeDamageBonusValue = parsePercent(chargeDamageBonus);
  const damageTakenBonusValue = parsePercent(damageTakenBonus);

  const buffMultiplier = 1 + buffSum;
  const chargeMultiplier =
    hasValue(chargeCoefficient) || hasValue(chargeDamageBonus)
      ? chargeCoefficientValue + chargeDamageBonusValue
      : 1;
  const damageTakenMultiplier = hasValue(damageTakenBonus) ? damageTakenBonusValue : 1;

  const total = useMemo(() => {
    return attackPower * buffMultiplier * chargeMultiplier * damageTakenMultiplier;
  }, [attackPower, buffMultiplier, chargeMultiplier, damageTakenMultiplier]);

  const normalAttackDamage = useMemo(() => {
    return total * coefficientValue;
  }, [coefficientValue, total]);

  const rapiCount = useMemo(() => {
    return total / RAPI_DAMAGE_REFERENCE;
  }, [total]);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
          Calculator
        </div>
        <h2 className="mt-4 text-xl font-semibold text-white sm:text-2xl">계산기</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-300 sm:text-base">
          해당 수치가 없는 경우 빈칸으로 두면 계산에서 자동으로 제외됩니다.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.95fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-sm font-semibold text-white">1. 공격력</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {TYPE_OPTIONS.map((option) => {
                  const active = option.key === unitType;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setUnitType(option.key)}
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${
                        active
                          ? "border-cyan-400 bg-cyan-500/10 text-white"
                          : "border-neutral-700 bg-neutral-900/70 text-neutral-300 hover:border-neutral-500"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-xs text-neutral-400">공증</div>
                  <div className="relative">
                    <input
                      value={attackBuff}
                      onChange={(event) => setAttackBuff(event.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                  </div>
                </label>
                <label className="block">
                  <div className="mb-2 text-xs text-neutral-400">공증</div>
                  <div className="relative">
                    <input
                      value={attackBuff2}
                      onChange={(event) => setAttackBuff2(event.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                  </div>
                </label>
                <label className="block">
                  <div className="mb-2 text-xs text-neutral-400">공증</div>
                  <div className="relative">
                    <input
                      value={attackBuff3}
                      onChange={(event) => setAttackBuff3(event.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                  </div>
                </label>
                <label className="block">
                  <div className="mb-2 text-xs text-neutral-400">시공증</div>
                  <div className="relative">
                    <input
                      value={temporalAttackBuff}
                      onChange={(event) => setTemporalAttackBuff(event.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                  </div>
                </label>
              </div>
              <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-5 text-neutral-400">
                <div>기본 공격력은 유형에 따라 자동 적용됩니다.</div>
                <div className="mt-1">화력형 92,658 / 지원형 81,039 / 방어형 60,481</div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-sm font-semibold text-white">2. 기타 버프</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {BUFF_FIELDS.map((label, index) => (
                  <label key={label} className="block">
                    <div className="mb-2 text-xs text-neutral-400">
                      {index + 1}) {label}
                    </div>
                    <div className="relative">
                      <input
                        value={buffValues[index]}
                        onChange={(event) => {
                          const next = [...buffValues];
                          next[index] = event.target.value;
                          setBuffValues(next);
                        }}
                        inputMode="decimal"
                        placeholder="0"
                        className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-sm font-semibold text-white">3. 계수</div>
              <div className="mt-3 relative">
                <input
                  value={coefficient}
                  onChange={(event) => setCoefficient(event.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
              </div>
              <div className="mt-2 text-xs leading-5 text-neutral-400">
                모를 경우 런처 61%, 소총 13.65%, 기관단총 9%, 기관총 5.5%
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
                <div className="text-sm font-semibold text-white">4. 차지 데미지 계수</div>
                <div className="mt-3 relative">
                  <input
                    value={chargeCoefficient}
                    onChange={(event) => setChargeCoefficient(event.target.value)}
                    inputMode="decimal"
                    placeholder="200"
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                </div>
                <div className="mt-2 text-xs text-neutral-400">200% ~ 350%</div>
                <div className="mt-4 text-xs text-neutral-400">차뎀증</div>
                <div className="mt-2 relative">
                  <input
                    value={chargeDamageBonus}
                    onChange={(event) => setChargeDamageBonus(event.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
                <div className="text-sm font-semibold text-white">5. 받뎀증/분배뎀증 합</div>
                <div className="mt-3 relative">
                  <input
                    value={damageTakenBonus}
                    onChange={(event) => setDamageTakenBonus(event.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full rounded-2xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <div className="text-sm font-semibold text-cyan-200">최종값</div>
              <div className="mt-3 text-3xl font-bold tabular-nums text-white">{formatNumber(total)}</div>
              <div className="mt-4 border-t border-cyan-500/20 pt-4">
                <div className="text-sm font-semibold text-cyan-200">평타 딜</div>
                <div className="mt-2 text-2xl font-bold tabular-nums text-white">{formatNumber(normalAttackDamage)}</div>
              </div>
              <div className="mt-4 border-t border-cyan-500/20 pt-4">
                <div className="text-sm font-semibold text-cyan-200">몇라피?</div>
                <div className="mt-2 text-2xl font-bold tabular-nums text-white">{formatNumber(rapiCount)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="text-sm font-semibold text-white">현재 적용값</div>
              <div className="mt-3 space-y-2 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">기본 공격력</span>
                  <span>
                    {selectedType.label} ({formatNumber(baseAttack)})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">공증 합</span>
                  <span>{formatPercent(totalAttackBuffValue * 100)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">공증 적용값</span>
                  <span>{formatNumber(attackBuffApplied)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">시공증 적용값</span>
                  <span>{formatNumber(temporalAttackApplied)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">1번 공격력 합산값</span>
                  <span>{formatNumber(attackPower)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">기타 버프 합</span>
                  <span>{formatPercent(buffMultiplier * 100)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">계수</span>
                  <span>{formatPercent(coefficientValue * 100)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">차지 데미지 계수</span>
                  <span>{formatPercent(chargeCoefficientValue * 100)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">차뎀증</span>
                  <span>{formatPercent(chargeDamageBonusValue * 100)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">4번 합산값</span>
                  <span>{formatPercent(chargeMultiplier * 100)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">받뎀증/분배뎀증 합</span>
                  <span>{formatPercent(damageTakenMultiplier * 100)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
