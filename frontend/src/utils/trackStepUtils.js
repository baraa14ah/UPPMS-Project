/** Helpers — steps link to defense types defined by admin in Scheduling (no hardcoded catalog). */

export const FINAL_DEFENSE_KEY = "final_defense";

export function isFinalDefenseType(defenseType) {
  return (
    defenseType?.stage_key === FINAL_DEFENSE_KEY ||
    defenseType?.is_final_defense === true
  );
}

/** Final defense (premium rooms) may only sit on the last step of the last phase. */
export function canAddFinalDefenseToPhase(phaseIndex, totalPhases) {
  return totalPhases > 0 && phaseIndex === totalPhases - 1;
}

export function isTerminalStepPosition(phaseIndex, totalPhases, stepIndex, stepsCount) {
  return (
    totalPhases > 0 &&
    stepsCount > 0 &&
    phaseIndex === totalPhases - 1 &&
    stepIndex === stepsCount - 1
  );
}

export function defaultDecisiveForType(defenseType) {
  return isFinalDefenseType(defenseType);
}

export function stepFromDefenseType(defenseType) {
  return {
    academic_stage_id: defenseType.id,
    name: defenseType.name,
    is_decisive: defaultDecisiveForType(defenseType),
  };
}

export function sortDefenseTypes(defenseTypes = []) {
  return [...defenseTypes].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
}

export function emptyPhase() {
  return {
    name: "",
    description: "",
    steps: [],
  };
}

/** All scheduling types — admin defines these in Scheduling, not in code. */
export function schedulingCatalogForPhase(defenseTypes = [], phaseSteps = []) {
  const activeIds = new Set(phaseSteps.map((s) => String(s.academic_stage_id)));
  const all = sortDefenseTypes(defenseTypes);

  return {
    all,
    included: all.filter((d) => activeIds.has(String(d.id))),
    excluded: all.filter((d) => !activeIds.has(String(d.id))),
  };
}

export function countPhasesUsingDefenseType(allPhases = [], academicStageId) {
  if (!academicStageId) return 0;
  const id = String(academicStageId);
  return allPhases.filter((phase) =>
    (phase.steps || []).some((s) => String(s.academic_stage_id) === id),
  ).length;
}
