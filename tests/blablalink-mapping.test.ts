import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBlaBlaLinkMappingCandidates,
  findDuplicateResourceIds,
  getBlaBlaLinkMappingStatus,
  planAutomaticBlaBlaLinkMappings,
} from "../lib/blablalink-mapping.ts";

const candidates = buildBlaBlaLinkMappingCandidates(
  {
    rapi: { id: 10, name: "라피" },
    anis: { id: 20, name: "아니스" },
  },
  [
    { name_code: 101, resource_id: 10 },
    { name_code: 201, resource_id: 20 },
  ],
);

test("initial mapping uses an exact normalized name and stores resource_id/name_code", () => {
  const result = planAutomaticBlaBlaLinkMappings([
    { id: "site-rapi", name: " 라피 ", resourceId: null, nameCode: null, mappingSource: null, mappingVerified: false },
  ], candidates);

  assert.deepEqual(result, {
    updates: [{ id: "site-rapi", resourceId: 10, nameCode: 101, mappingSource: "auto", mappingVerified: false }],
    ambiguousIds: [],
    unmatchedIds: [],
  });
});

test("ambiguous and unmatched names are never guessed", () => {
  const ambiguousCandidates = [...candidates, { ...candidates[0], resourceId: 30, nameCode: 301 }];
  const result = planAutomaticBlaBlaLinkMappings([
    { id: "ambiguous", name: "라피", resourceId: null, nameCode: null, mappingSource: null, mappingVerified: false },
    { id: "unmatched", name: "존재하지 않음", resourceId: null, nameCode: null, mappingSource: null, mappingVerified: false },
  ], ambiguousCandidates);

  assert.deepEqual(result.updates, []);
  assert.deepEqual(result.ambiguousIds, ["ambiguous"]);
  assert.deepEqual(result.unmatchedIds, ["unmatched"]);
});

test("automatic mapping never overwrites manual or verified mappings", () => {
  const result = planAutomaticBlaBlaLinkMappings([
    { id: "manual", name: "라피", resourceId: 999, nameCode: 999, mappingSource: "manual", mappingVerified: true },
    { id: "verified", name: "라피", resourceId: 998, nameCode: 998, mappingSource: "auto", mappingVerified: true },
    { id: "auto", name: "라피", resourceId: 997, nameCode: 997, mappingSource: "auto", mappingVerified: false },
  ], candidates);

  assert.deepEqual(result.updates, [
    { id: "auto", resourceId: 10, nameCode: 101, mappingSource: "auto", mappingVerified: false },
  ]);
});

test("duplicate resource ids and derived admin statuses are explicit", () => {
  const rows = [
    { id: "a", resourceId: 10 },
    { id: "b", resourceId: 10 },
    { id: "c", resourceId: 20 },
  ];
  assert.deepEqual(findDuplicateResourceIds(rows), new Set([10]));
  assert.equal(getBlaBlaLinkMappingStatus({ resourceId: null, mappingSource: null, mappingVerified: false }, new Set()), "unmatched");
  assert.equal(getBlaBlaLinkMappingStatus({ resourceId: 10, mappingSource: "auto", mappingVerified: false }, new Set([10])), "duplicate");
  assert.equal(getBlaBlaLinkMappingStatus({ resourceId: 20, mappingSource: "manual", mappingVerified: true }, new Set()), "manual");
  assert.equal(getBlaBlaLinkMappingStatus({ resourceId: 20, mappingSource: "auto", mappingVerified: false }, new Set()), "review");
  assert.equal(getBlaBlaLinkMappingStatus({ resourceId: 20, mappingSource: "auto", mappingVerified: true }, new Set()), "matched");
});
