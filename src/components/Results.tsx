import { useEffect, useMemo, useState } from "react";
import type { GenerationResult } from "../lib/generate";
import { PREFERENCES, rankTimetables, type Preference } from "../lib/rank";
import { useStore } from "../state/useStore";
import { TimetableGrid } from "./TimetableGrid";

const PAGE = 5; // top-N shown; "Show more" reveals another PAGE

export function Results({
  result,
  hasSelection,
}: {
  result: GenerationResult;
  hasSelection: boolean;
}) {
  const [shown, setShown] = useState(PAGE);
  const preference = useStore((s) => s.preference);
  const setPreference = useStore((s) => s.setPreference);
  const profLock = useStore((s) => s.profLock);
  const setProfLock = useStore((s) => s.setProfLock);

  const { timetables, total, truncated, courseErrors } = result;

  const ranked = useMemo(
    () => rankTimetables(timetables, preference),
    [timetables, preference],
  );

  // Reset the render window whenever the ranked list changes.
  useEffect(() => {
    setShown(PAGE);
  }, [ranked]);

  return (
    <div className="results">
      <div className="panel-head">
        <h2>Results</h2>
        {hasSelection && (
          <div className="panel-head-actions">
            {total > 0 && (
              <label className="pref-select">
                Rank by{" "}
                <select
                  value={preference}
                  onChange={(e) => setPreference(e.target.value as Preference)}
                >
                  {PREFERENCES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label
              className="prof-lock"
              title="On: a course's LEC/TUT/LAB must share the same instructor. Off: mix and match sections freely."
            >
              <span className={`switch ${profLock ? "switch-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={profLock}
                  onChange={(e) => setProfLock(e.target.checked)}
                />
                <span className="slider" />
              </span>
              Prof lock
            </label>
          </div>
        )}
      </div>

      {courseErrors.length > 0 && (
        <div className="banner banner-warn">
          {courseErrors.map((e) => (
            <div key={e.courseCode}>{e.message}</div>
          ))}
        </div>
      )}

      {!hasSelection ? (
        <p className="hint">No courses selected yet.</p>
      ) : total === 0 ? (
        courseErrors.length === 0 && (
          <p className="hint">
            No conflict-free timetable exists for this selection. Try disabling some
            sections or removing a course.
          </p>
        )
      ) : (
        <>
          <p className="results-count">
            <strong>
              {truncated ? `${total.toLocaleString()}+` : total.toLocaleString()}
            </strong>{" "}
            conflict-free timetable{total === 1 ? "" : "s"} · showing best{" "}
            {Math.min(shown, ranked.length)}
            {truncated && " (capped — disable sections to narrow down)"}
          </p>

          <div className="tt-scroll">
            {ranked.slice(0, shown).map((tt, i) => (
              <TimetableGrid key={i} tt={tt} index={i} />
            ))}
          </div>

          {shown < ranked.length && (
            <button className="show-more" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({ranked.length - shown} hidden)
            </button>
          )}
        </>
      )}
    </div>
  );
}
