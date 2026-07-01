import { describe, expect, it } from "vitest";
import { rankTimetables, scoreTimetable } from "./rank";
import type { Timetable } from "./generate";
import { toMinutes, type DayCode, type TimeBlock } from "./time";

function block(day: DayCode, start: string, end: string): TimeBlock {
  return { day, startMin: toMinutes(start), endMin: toMinutes(end), location: "" };
}

// Scoring only reads `blocks`; options/sections are irrelevant here.
function tt(...blocks: TimeBlock[]): Timetable {
  return { options: [], sections: [], blocks };
}

describe("Early Classes", () => {
  it("ranks the earlier-starting timetable first", () => {
    const early = tt(block("Mo", "09:00", "10:00"));
    const late = tt(block("Mo", "11:00", "12:00"));
    const [first] = rankTimetables([late, early], "early");
    expect(first).toBe(early);
  });
});

describe("Most Holidays", () => {
  it("ranks the timetable with more free weekdays first", () => {
    const oneFree = tt(block("Mo", "09:00", "10:00"), block("Tu", "09:00", "10:00"));
    const twoFree = tt(block("Mo", "09:00", "10:00")); // Tue–Fri free
    expect(scoreTimetable(twoFree, "holidays")).toBeGreaterThan(
      scoreTimetable(oneFree, "holidays"),
    );
    const [first] = rankTimetables([oneFree, twoFree], "holidays");
    expect(first).toBe(twoFree);
  });
});

describe("Long Weekend", () => {
  it("ranks edge free days above a free middle day", () => {
    // Free Thu+Fri (edge) vs free Wed (middle) — same number of classes.
    const edge = tt(
      block("Mo", "09:00", "10:00"),
      block("Tu", "09:00", "10:00"),
      block("We", "09:00", "10:00"),
    ); // Thu & Fri free
    const middle = tt(
      block("Mo", "09:00", "10:00"),
      block("Tu", "09:00", "10:00"),
      block("Th", "09:00", "10:00"),
      block("Fr", "09:00", "10:00"),
    ); // Wed free
    expect(scoreTimetable(edge, "longWeekend")).toBeGreaterThan(
      scoreTimetable(middle, "longWeekend"),
    );
    const [first] = rankTimetables([middle, edge], "longWeekend");
    expect(first).toBe(edge);
  });
});

describe("Least Gaps", () => {
  it("ranks back-to-back classes above the same classes with a midday gap", () => {
    const compact = tt(block("Mo", "09:00", "10:00"), block("Mo", "10:00", "11:00"));
    const gappy = tt(block("Mo", "09:00", "10:00"), block("Mo", "13:00", "14:00"));
    expect(scoreTimetable(compact, "leastGaps")).toBe(0); // no idle time
    expect(scoreTimetable(gappy, "leastGaps")).toBeLessThan(0);
    const [first] = rankTimetables([gappy, compact], "leastGaps");
    expect(first).toBe(compact);
  });
});
