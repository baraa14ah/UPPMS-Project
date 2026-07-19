/**
 * Build human-readable comparison for GA schedule candidates.
 * Ranking is lexicographic: fewer hard violations first, then higher fitness.
 */
export function getCandidateStats(candidate) {
  const breakdown = candidate?.fitnessBreakdown || {};
  const violations = breakdown.violations || [];
  return {
    rank: candidate?.rank ?? 0,
    score: Number(candidate?.fitness ?? 0),
    hard: breakdown.hardViolationCount ?? 0,
    soft: violations.filter((v) => v.severity === "soft").length,
    sessions: (candidate?.assignments || []).length,
    doctors: (candidate?.facultyWorkload || []).length,
    workload: Number(breakdown.workloadBalanceScore ?? 0),
    rest: Number(breakdown.restPeriodScore ?? 0),
    committee: Number(breakdown.committeeSizeScore ?? 0),
    compactness: Number(breakdown.compactnessScore ?? 0),
    clean: (breakdown.hardViolationCount ?? 0) === 0,
  };
}

function softWins(selected, other, key) {
  return selected[key] > other[key] + 0.5;
}

function softLosses(selected, other, key) {
  return selected[key] + 0.5 < other[key];
}

/**
 * @returns {{ verdict: 'best'|'weaker', points: string[] }}
 */
export function buildComparisonInsight(candidate, allCandidates, t) {
  const stats = getCandidateStats(candidate);
  const others = (allCandidates || [])
    .filter((c) => c.rank !== candidate.rank)
    .map(getCandidateStats);
  const best = (allCandidates || [])
    .map(getCandidateStats)
    .sort((a, b) => a.rank - b.rank)[0];

  const points = [];

  if (stats.rank === 1 || (best && best.rank === stats.rank)) {
    if (stats.clean) {
      points.push(t("scheduling.generate.compare.bestClean"));
    } else {
      points.push(
        t("scheduling.generate.compare.bestLeastHard", { count: stats.hard }),
      );
    }

    const moreHard = others.filter((o) => o.hard > stats.hard);
    if (moreHard.length) {
      points.push(
        t("scheduling.generate.compare.bestFewerHardThan", {
          count: moreHard.length,
        }),
      );
    }

    const lowerScore = others.filter(
      (o) => o.hard === stats.hard && o.score < stats.score,
    );
    if (lowerScore.length) {
      points.push(
        t("scheduling.generate.compare.bestHigherScore", {
          score: stats.score.toFixed(0),
        }),
      );
    }

    for (const key of ["workload", "rest", "compactness"]) {
      const beats = others.filter((o) => softWins(stats, o, key));
      if (beats.length === others.length && others.length > 0) {
        points.push(t(`scheduling.generate.compare.bestSoft.${key}`));
      }
    }

    if (points.length === 0) {
      points.push(t("scheduling.generate.compare.bestDefault"));
    }

    return { verdict: "best", points: points.slice(0, 4) };
  }

  // Weaker vs best
  if (best) {
    if (stats.hard > best.hard) {
      points.push(
        t("scheduling.generate.compare.worseMoreHard", {
          count: stats.hard,
          best: best.hard,
        }),
      );
    } else if (stats.hard === best.hard && stats.score < best.score) {
      points.push(
        t("scheduling.generate.compare.worseLowerScore", {
          score: stats.score.toFixed(0),
          best: best.score.toFixed(0),
        }),
      );
    }

    for (const key of ["workload", "rest", "compactness"]) {
      if (softLosses(stats, best, key)) {
        points.push(t(`scheduling.generate.compare.worseSoft.${key}`));
      }
    }

    if (stats.clean && best.clean && stats.score < best.score) {
      points.push(t("scheduling.generate.compare.worseSoftQuality"));
    }
  }

  if (points.length === 0) {
    points.push(t("scheduling.generate.compare.worseDefault"));
  }

  return { verdict: "weaker", points: points.slice(0, 4) };
}
