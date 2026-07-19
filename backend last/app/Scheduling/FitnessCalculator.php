<?php

namespace App\Scheduling;

class FitnessCalculator
{
    private const WEIGHT_WORKLOAD_BALANCE = 400;
    private const WEIGHT_REST_PERIODS = 300;
    private const WEIGHT_COMMITTEE_SIZE = 200;
    private const WEIGHT_COMPACTNESS = 100;

    public const PENALTY_PER_HARD_VIOLATION = 5000;

    /** Evaluate a chromosome and return its fitness breakdown. */
    public function evaluate(Chromosome $chromosome, SchedulingContext $context): FitnessBreakdown
    {
        $breakdown = new FitnessBreakdown();

        $hardViolations = $this->checkHardConstraints($chromosome, $context);
        foreach ($hardViolations as $violation) {
            $breakdown->addViolation($violation);
        }

        $breakdown->hardViolationCount = count($hardViolations);
        $breakdown->hardConstraintsPassed = $breakdown->hardViolationCount === 0;

        $breakdown->workloadBalanceScore = $this->scoreWorkloadBalance($chromosome, $context);
        $breakdown->restPeriodScore = $this->scoreRestPeriods($chromosome, $context);
        $breakdown->committeeSizeScore = $this->scoreCommitteeSize($chromosome, $context);
        $breakdown->compactnessScore = $this->scoreCompactness($chromosome, $context);

        $softViolations = $this->checkSoftConstraints($chromosome, $context);
        foreach ($softViolations as $violation) {
            $breakdown->addViolation($violation);
        }

        $this->addRecommendations($breakdown, $chromosome, $context);

        $breakdown->calculateTotal(self::PENALTY_PER_HARD_VIOLATION);

        return $breakdown;
    }

    /** Check all hard constraints. Returns array of violations. */
    public function checkHardConstraints(Chromosome $chromosome, SchedulingContext $context): array
    {
        $violations = [];

        foreach ($chromosome->genes as $gene) {
            if ($gene->hasSupervisorOnCommittee()) {
                $violations[] = Violation::hard(
                    Violation::TYPE_SUPERVISOR_ON_COMMITTEE,
                    $gene->projectId,
                    "Supervisor {$gene->supervisorName} cannot be on their own project's committee"
                );
            }

            if ($gene->timeSlot !== null) {
                foreach ($gene->committeeMembers as $member) {
                    if (!$context->isFacultyAvailable($member['userId'], $gene->timeSlot)) {
                        $violations[] = Violation::hard(
                            Violation::TYPE_NO_AVAILABILITY,
                            $gene->projectId,
                            "Faculty {$member['name']} is not available at scheduled time"
                        );
                    }
                }
            }
        }

        foreach ($this->findFacultyDoubleBookings($chromosome) as $violation) {
            $violations[] = $violation;
        }

        foreach ($this->findRoomDoubleBookings($chromosome) as $violation) {
            $violations[] = $violation;
        }

        return $violations;
    }

    /** Detect faculty assigned to multiple committees at the same time slot. */
    private function findFacultyDoubleBookings(Chromosome $chromosome): array
    {
        $violations = [];
        $facultySlots = [];

        foreach ($chromosome->genes as $gene) {
            if ($gene->timeSlot === null) {
                continue;
            }

            $slotKey = $gene->timeSlot->getConflictKey();

            foreach ($gene->committeeMembers as $member) {
                $userId = $member['userId'];

                if (isset($facultySlots[$userId][$slotKey])) {
                    $violations[] = Violation::hard(
                        Violation::TYPE_FACULTY_DOUBLE_BOOKING,
                        $gene->projectId,
                        "Faculty {$member['name']} is assigned to multiple committees at the same time"
                    );
                    continue;
                }

                $facultySlots[$userId][$slotKey] = $gene->projectId;
            }
        }

        return $violations;
    }

    /** Detect the same room assigned to multiple sessions at the same time slot. */
    private function findRoomDoubleBookings(Chromosome $chromosome): array
    {
        $violations = [];
        $roomSlots = [];

        foreach ($chromosome->genes as $gene) {
            if ($gene->timeSlot === null || $gene->roomId === null) {
                continue;
            }

            $slotKey = $gene->roomId . '@' . $gene->timeSlot->getConflictKey();

            if (isset($roomSlots[$slotKey])) {
                $violations[] = Violation::hard(
                    Violation::TYPE_ROOM_DOUBLE_BOOKING,
                    $gene->projectId,
                    'Room is double-booked at the same time slot'
                );
                continue;
            }

            $roomSlots[$slotKey] = $gene->projectId;
        }

        return $violations;
    }

    /** Check soft constraints. Returns array of violations. */
    private function checkSoftConstraints(Chromosome $chromosome, SchedulingContext $context): array
    {
        $violations = [];

        $targetSize = $context->getCommitteeSize();

        foreach ($chromosome->genes as $gene) {
            if ($gene->getCommitteeSize() < $targetSize) {
                $violations[] = Violation::soft(
                    Violation::TYPE_UNDERSIZED_COMMITTEE,
                    $gene->projectId,
                    "Committee has only {$gene->getCommitteeSize()} members instead of {$targetSize}"
                );
            }
        }

        return $violations;
    }

    /** Score workload balance (0-400). Higher = more balanced. */
    private function scoreWorkloadBalance(Chromosome $chromosome, SchedulingContext $context): float
    {
        $assignments = $chromosome->countAssignmentsPerFaculty();

        if (empty($assignments)) {
            return self::WEIGHT_WORKLOAD_BALANCE;
        }

        $counts = array_values($assignments);
        $mean = array_sum($counts) / count($counts);

        if ($mean === 0.0) {
            return self::WEIGHT_WORKLOAD_BALANCE;
        }

        $variance = 0;
        foreach ($counts as $count) {
            $variance += pow($count - $mean, 2);
        }
        $variance = $variance / count($counts);
        $stdDev = sqrt($variance);

        $coefficientOfVariation = $stdDev / $mean;

        $maxCV = 1.0;
        $normalizedScore = max(0, 1 - ($coefficientOfVariation / $maxCV));

        return $normalizedScore * self::WEIGHT_WORKLOAD_BALANCE;
    }

    /** Score rest periods (0-300). Higher = more rest between sessions. */
    private function scoreRestPeriods(Chromosome $chromosome, SchedulingContext $context): float
    {
        $minRestMinutes = $context->config->minRestMinutes;
        $facultySchedules = [];

        foreach ($chromosome->genes as $gene) {
            if ($gene->timeSlot === null) {
                continue;
            }

            foreach ($gene->committeeMembers as $member) {
                $userId = $member['userId'];
                if (!isset($facultySchedules[$userId])) {
                    $facultySchedules[$userId] = [];
                }
                $facultySchedules[$userId][] = [
                    'day' => $gene->timeSlot->dayOfWeek,
                    'start' => strtotime($gene->timeSlot->startTime),
                    'end' => strtotime($gene->timeSlot->endTime),
                ];
            }
        }

        $totalPairs = 0;
        $adequateRestPairs = 0;

        foreach ($facultySchedules as $schedule) {
            usort($schedule, function ($a, $b) {
                if ($a['day'] !== $b['day']) {
                    return $a['day'] - $b['day'];
                }
                return $a['start'] - $b['start'];
            });

            for ($i = 0; $i < count($schedule) - 1; $i++) {
                $current = $schedule[$i];
                $next = $schedule[$i + 1];

                if ($current['day'] === $next['day']) {
                    $totalPairs++;
                    $gap = ($next['start'] - $current['end']) / 60;
                    if ($gap >= $minRestMinutes) {
                        $adequateRestPairs++;
                    }
                }
            }
        }

        if ($totalPairs === 0) {
            return self::WEIGHT_REST_PERIODS;
        }

        return ($adequateRestPairs / $totalPairs) * self::WEIGHT_REST_PERIODS;
    }

    /** Score committee size (0-200). Higher = more 3-member committees. */
    private function scoreCommitteeSize(Chromosome $chromosome, SchedulingContext $context): float
    {
        $targetSize = $context->getCommitteeSize();
        $totalGenes = count($chromosome->genes);

        if ($totalGenes === 0) {
            return self::WEIGHT_COMMITTEE_SIZE;
        }

        $fullSizeCount = 0;
        foreach ($chromosome->genes as $gene) {
            if ($gene->getCommitteeSize() >= $targetSize) {
                $fullSizeCount++;
            }
        }

        return ($fullSizeCount / $totalGenes) * self::WEIGHT_COMMITTEE_SIZE;
    }

    /** Score schedule compactness (0-100). Higher = tighter schedule. */
    private function scoreCompactness(Chromosome $chromosome, SchedulingContext $context): float
    {
        $usedSlots = [];

        foreach ($chromosome->genes as $gene) {
            if ($gene->timeSlot !== null) {
                $key = $gene->timeSlot->dayOfWeek . '_' . $gene->timeSlot->startTime;
                $usedSlots[$key] = true;
            }
        }

        $daysUsed = [];
        foreach ($chromosome->genes as $gene) {
            if ($gene->timeSlot !== null) {
                $daysUsed[$gene->timeSlot->dayOfWeek] = true;
            }
        }

        $uniqueDays = count($daysUsed);
        $maxDays = 5;
        $dayScore = max(0, 1 - (($uniqueDays - 1) / $maxDays));

        return $dayScore * self::WEIGHT_COMPACTNESS;
    }

    /** Add recommendations based on the schedule. */
    private function addRecommendations(FitnessBreakdown $breakdown, Chromosome $chromosome, SchedulingContext $context): void
    {
        $assignments = $chromosome->countAssignmentsPerFaculty();

        if (!empty($assignments)) {
            $max = max($assignments);
            $min = min($assignments);

            if ($max - $min > 3) {
                $breakdown->addRecommendation(
                    "Consider adding more faculty to reduce workload variance (current range: {$min}-{$max} assignments)"
                );
            }
        }

        foreach ($chromosome->genes as $gene) {
            if ($gene->getCommitteeSize() < $context->getCommitteeSize()) {
                $breakdown->addRecommendation(
                    "Some committees have only {$gene->getCommitteeSize()} members due to faculty constraints"
                );
                break;
            }
        }
    }
}
