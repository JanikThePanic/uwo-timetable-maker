import type { Timetable } from "./generate";
import type { DayCode, TimeBlock } from "./time";

/** Preference schemes the user can rank timetables by. */
export type Preference = "early" | "holidays" | "longWeekend" | "leastGaps";

export const PREFERENCES: { id: Preference; label: string }[] = [
  { id: "early", label: "Early Classes" },
  { id: "holidays", label: "Most Holidays" },
  { id: "longWeekend", label: "Long Weekend" },
  { id: "leastGaps", label: "Least Gaps" },
];

const WEEKDAYS: DayCode[] = ["Mo", "Tu", "We", "Th", "Fr"];

/** Group a timetable's blocks by weekday (Mon–Fri; weekend blocks ignored for scoring). */
function blocksByWeekday(blocks: TimeBlock[]): Record<DayCode, TimeBlock[]> {
  const map = { Mo: [], Tu: [], We: [], Th: [], Fr: [], Sa: [], Su: [] } as Record<
    DayCode,
    TimeBlock[]
  >;
  for (const b of blocks) map[b.day].push(b);
  return map;
}

/**
 * Score a timetable for a preference. Higher is always better, so ranking is a
 * single descending sort regardless of scheme.
 */
export function scoreTimetable(tt: Timetable, pref: Preference): number {
  const byDay = blocksByWeekday(tt.blocks);

  switch (pref) {
    case "early": {
      // Reward earlier starts and earlier finishes (negate so higher = better).
      let sum = 0;
      for (const b of tt.blocks) {
        if (WEEKDAYS.includes(b.day)) sum += b.startMin + b.endMin;
      }
      return -sum;
    }

    case "holidays": {
      // Count fully free weekdays.
      let free = 0;
      for (const d of WEEKDAYS) if (byDay[d].length === 0) free++;
      return free;
    }

    case "longWeekend": {
      // Contiguous free days from each end of the week (reference LongWeekend, max 8).
      const isFree = (d: DayCode) => byDay[d].length === 0;
      let score = 0;
      if (isFree("Mo")) {
        score++;
        if (isFree("Tu")) {
          score++;
          if (isFree("We")) {
            score++;
            if (isFree("Th")) score++;
          }
        }
      }
      if (isFree("Fr")) {
        score++;
        if (isFree("Th")) {
          score++;
          if (isFree("We")) {
            score++;
            if (isFree("Tu")) score++;
          }
        }
      }
      return score;
    }

    case "leastGaps": {
      // Minimize idle minutes between classes within each day (negate so higher = better).
      let gap = 0;
      for (const d of WEEKDAYS) {
        const day = byDay[d];
        if (day.length < 2) continue;
        let minStart = Infinity;
        let maxEnd = -Infinity;
        let busy = 0;
        for (const b of day) {
          if (b.startMin < minStart) minStart = b.startMin;
          if (b.endMin > maxEnd) maxEnd = b.endMin;
          busy += b.endMin - b.startMin;
        }
        gap += maxEnd - minStart - busy;
      }
      return gap === 0 ? 0 : -gap; // avoid -0
    }
  }
}

/** Return a new array of timetables sorted best→worst for the preference (stable). */
export function rankTimetables(tts: Timetable[], pref: Preference): Timetable[] {
  return tts
    .map((tt, index) => ({ tt, index, score: scoreTimetable(tt, pref) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((e) => e.tt);
}
