import { useCallback, useState } from 'react';
import type { QuestRun } from '../engine/questRun';
import type { FactId, Question } from '../engine/types';
import { clearQuestSnapshot, loadQuestSnapshot, writeQuestSnapshot } from '../storage/session';
import type { QuestContext } from '../storage/session';

export interface QuestSession {
  queue: Question[];
  initialRun: QuestRun | undefined;
  initialIntroduced: FactId[] | undefined;
  /** Pass to QuestScreen's onProgress: saves the run to the session after every change. */
  saveProgress(run: QuestRun, introduced: FactId[]): void;
  /** Call when the quest is finished so the next one starts fresh. */
  clear(): void;
}

/**
 * Resumes the session's saved quest when it matches `context` (same save, day, step and
 * difficulty); otherwise builds a fresh queue. Both are decided once, on mount.
 */
export function useQuestSession(session: Storage | null, context: QuestContext, build: () => Question[]): QuestSession {
  const [start] = useState(() => {
    const snap = loadQuestSnapshot(session, context);
    return snap
      ? { context, queue: snap.run.queue, run: snap.run as QuestRun | undefined, introduced: snap.introduced as FactId[] | undefined }
      : { context, queue: build(), run: undefined, introduced: undefined };
  });

  const saveProgress = useCallback(
    (run: QuestRun, introduced: FactId[]) => writeQuestSnapshot(session, { context: start.context, run, introduced }),
    [session, start.context],
  );
  const clear = useCallback(() => clearQuestSnapshot(session), [session]);

  return { queue: start.queue, initialRun: start.run, initialIntroduced: start.introduced, saveProgress, clear };
}
