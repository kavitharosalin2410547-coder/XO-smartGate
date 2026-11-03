import test from "node:test";
import assert from "node:assert/strict";
import { cleanPlate, extractPlateCandidates, formatPlate, parseIndianPlate } from "../lib/plate.ts";

test("cleanPlate strips spaces, dashes and lowercases", () => {
  assert.equal(cleanPlate("tn 09-ab 1234"), "TN09AB1234");
});

test("formatPlate prints the standard layout", () => {
  assert.equal(formatPlate("TN09AB1234"), "TN 09 AB 1234");
  assert.equal(formatPlate("KA01A1234"), "KA 01 A 1234");
  assert.equal(formatPlate("22BH1234AA"), "22 BH 1234 AA");
  assert.equal(formatPlate("XYZ123"), "XYZ123");
});

test("parseIndianPlate accepts a clean plate", () => {
  const m = parseIndianPlate("TN09AB1234");
  assert.deepEqual(m, { plate: "TN09AB1234", fixes: 0, validState: true });
});

test("parseIndianPlate repairs look-alike characters", () => {
  // O in the district, 0 in the series, S for 5, B for 8
  assert.equal(parseIndianPlate("TNO9A01234")?.plate, "TN09AO1234");
  assert.equal(parseIndianPlate("TN09AB12S4")?.plate, "TN09AB1254");
  assert.equal(parseIndianPlate("MH12DE143B")?.plate, "MH12DE1438");
});

test("extractPlateCandidates finds the plate inside noisy OCR text", () => {
  const text = "IND\n  TN 09 AB 1234 \nBHARAT";
  assert.equal(extractPlateCandidates(text)[0].plate, "TN09AB1234");
});

test("extractPlateCandidates handles a plate split over two lines", () => {
  const text = "KA 01\nAB 4321";
  assert.equal(extractPlateCandidates(text)[0].plate, "KA01AB4321");
});

test("a misread state code is repaired, look-alike swaps ranked first", () => {
  // T read as I, M read as N
  assert.equal(extractPlateCandidates("IN09AB1234")[0].plate, "TN09AB1234");
  assert.equal(extractPlateCandidates("NH12DE1433")[0].plate, "MH12DE1433");
  // only offered when there is no valid reading
  assert.equal(extractPlateCandidates("TN09AB1234 IN09AB1234")[0].plate, "TN09AB1234");
});

test("extractPlateCandidates ignores text with no plate", () => {
  assert.deepEqual(extractPlateCandidates("HELLO WORLD"), []);
});

test("extractPlateCandidates falls back to generic tokens for foreign plates", () => {
  const r = extractPlateCandidates("ABC1234");
  assert.equal(r[0].plate, "ABC1234");
  assert.equal(r[0].validState, false);
});
