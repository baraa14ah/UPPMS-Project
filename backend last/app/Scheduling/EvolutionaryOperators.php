<?php

namespace App\Scheduling;

class EvolutionaryOperators
{
    /** Tournament selection: pick k random, return the fittest. */
    public function tournamentSelect(array $population, int $k): Chromosome
    {
        $popSize = count($population);
        $tournament = [];

        for ($i = 0; $i < $k; $i++) {
            $randomIndex = rand(0, $popSize - 1);
            $tournament[] = $population[$randomIndex];
        }

        usort($tournament, fn($a, $b) => Chromosome::compare($a, $b));

        return $tournament[0];
    }

    /** Single-point crossover: combine two parents to create two offspring. */
    public function crossover(Chromosome $parent1, Chromosome $parent2): array
    {
        $geneCount = count($parent1->genes);

        if ($geneCount <= 1) {
            return [$parent1->clone(), $parent2->clone()];
        }

        $crossoverPoint = rand(1, $geneCount - 1);

        $child1Genes = [];
        $child2Genes = [];

        for ($i = 0; $i < $geneCount; $i++) {
            if ($i < $crossoverPoint) {
                $child1Genes[] = $parent1->genes[$i]->clone();
                $child2Genes[] = $parent2->genes[$i]->clone();
            } else {
                $child1Genes[] = $parent2->genes[$i]->clone();
                $child2Genes[] = $parent1->genes[$i]->clone();
            }
        }

        $child1 = new Chromosome($child1Genes, max($parent1->generation, $parent2->generation) + 1);
        $child2 = new Chromosome($child2Genes, max($parent1->generation, $parent2->generation) + 1);

        return [$child1, $child2];
    }

    /** Mutate a chromosome by randomly changing committee members. */
    public function mutate(Chromosome $chromosome, SchedulingContext $context, float $rate): Chromosome
    {
        $mutated = $chromosome->clone();

        foreach ($mutated->genes as $gene) {
            if ((mt_rand() / mt_getrandmax()) > $rate) {
                continue;
            }

            $this->mutateGene($gene, $context);
        }

        return $mutated;
    }

    /**
     * Fix room and faculty double-bookings after crossover/mutation.
     * Leaves unresolved conflicts for the fitness penalty to handle.
     */
    public function repair(Chromosome $chromosome, SchedulingContext $context): Chromosome
    {
        $repaired = $chromosome->clone();

        $this->repairRoomDoubleBookings($repaired, $context);
        $this->repairFacultyDoubleBookings($repaired, $context);

        return $repaired;
    }

    private function repairRoomDoubleBookings(Chromosome $chromosome, SchedulingContext $context): void
    {
        $occupied = [];

        foreach ($chromosome->genes as $gene) {
            if ($gene->timeSlot === null || $gene->roomId === null) {
                continue;
            }

            $slotKey = $gene->timeSlot->getConflictKey();
            $roomKey = $gene->roomId . '@' . $slotKey;

            if (!isset($occupied[$roomKey])) {
                $occupied[$roomKey] = true;
                continue;
            }

            $rooms = $context->getRoomsForProjectId($gene->projectId)->values();
            $moved = false;
            foreach ($rooms as $room) {
                $candidateKey = $room->id . '@' . $slotKey;
                if (isset($occupied[$candidateKey])) {
                    continue;
                }

                $gene->roomId = $room->id;
                $occupied[$candidateKey] = true;
                $moved = true;
                break;
            }

            if (!$moved) {
                $altSlot = $this->findFreeRoomSlotForGene($gene, $context, $occupied);
                if ($altSlot !== null) {
                    $gene->timeSlot = $altSlot['slot'];
                    $gene->roomId = $altSlot['roomId'];
                    $occupied[$altSlot['roomId'] . '@' . $altSlot['slot']->getConflictKey()] = true;
                }
            }
        }
    }

    private function repairFacultyDoubleBookings(Chromosome $chromosome, SchedulingContext $context): void
    {
        $facultySlots = [];
        $roomOccupied = $this->buildRoomOccupancy($chromosome);

        foreach ($chromosome->genes as $geneIndex => $gene) {
            if ($gene->timeSlot === null || empty($gene->committeeMembers)) {
                continue;
            }

            $slotKey = $gene->timeSlot->getConflictKey();
            $conflicted = false;

            foreach ($gene->committeeMembers as $member) {
                $userId = $member['userId'];
                if (isset($facultySlots[$userId][$slotKey]) && $facultySlots[$userId][$slotKey] !== $geneIndex) {
                    $conflicted = true;
                    break;
                }
            }

            if (!$conflicted) {
                foreach ($gene->committeeMembers as $member) {
                    $facultySlots[$member['userId']][$slotKey] = $geneIndex;
                }
                continue;
            }

            $freeSlot = $this->findFreeFacultySlot($gene, $context, $facultySlots, $roomOccupied, $geneIndex);

            if ($freeSlot !== null) {
                // Free previous room occupancy if moving
                if ($gene->roomId !== null && $gene->timeSlot !== null) {
                    unset($roomOccupied[$gene->roomId . '@' . $gene->timeSlot->getConflictKey()]);
                }

                $gene->timeSlot = $freeSlot['slot'];
                if ($freeSlot['roomId'] !== null) {
                    $gene->roomId = $freeSlot['roomId'];
                }

                $newKey = $gene->timeSlot->getConflictKey();
                foreach ($gene->committeeMembers as $member) {
                    $facultySlots[$member['userId']][$newKey] = $geneIndex;
                }
                if ($gene->roomId !== null) {
                    $roomOccupied[$gene->roomId . '@' . $newKey] = $geneIndex;
                }
            }
        }
    }

    private function buildRoomOccupancy(Chromosome $chromosome): array
    {
        $occupied = [];
        foreach ($chromosome->genes as $index => $gene) {
            if ($gene->timeSlot === null || $gene->roomId === null) {
                continue;
            }
            $occupied[$gene->roomId . '@' . $gene->timeSlot->getConflictKey()] = $index;
        }

        return $occupied;
    }

    /** @return array{slot: TimeSlot, roomId: ?int}|null */
    private function findFreeRoomSlotForGene(Gene $gene, SchedulingContext $context, array $occupied): ?array
    {
        $validSlots = empty($gene->committeeMembers)
            ? $context->getAvailableTimeSlots()
            : $context->getSlotsForCommittee($gene->committeeMembers);

        $rooms = $context->getRoomsForProjectId($gene->projectId)->values();

        foreach ($validSlots as $slot) {
            $slotKey = $slot->getConflictKey();
            foreach ($rooms as $room) {
                $key = $room->id . '@' . $slotKey;
                if (!isset($occupied[$key])) {
                    return ['slot' => $slot, 'roomId' => $room->id];
                }
            }
        }

        return null;
    }

    /** @return array{slot: TimeSlot, roomId: ?int}|null */
    private function findFreeFacultySlot(
        Gene $gene,
        SchedulingContext $context,
        array $facultySlots,
        array $roomOccupied,
        int $geneIndex
    ): ?array {
        $validSlots = $context->getSlotsForCommittee($gene->committeeMembers);
        $rooms = $context->getRoomsForProjectId($gene->projectId)->values();

        foreach ($validSlots as $slot) {
            $slotKey = $slot->getConflictKey();

            $facultyFree = true;
            foreach ($gene->committeeMembers as $member) {
                $userId = $member['userId'];
                if (isset($facultySlots[$userId][$slotKey]) && $facultySlots[$userId][$slotKey] !== $geneIndex) {
                    $facultyFree = false;
                    break;
                }
            }

            if (!$facultyFree) {
                continue;
            }

            if ($rooms->isEmpty()) {
                return ['slot' => $slot, 'roomId' => null];
            }

            // Prefer keeping current room if free
            if ($gene->roomId !== null) {
                $preferKey = $gene->roomId . '@' . $slotKey;
                if (!isset($roomOccupied[$preferKey]) || $roomOccupied[$preferKey] === $geneIndex) {
                    return ['slot' => $slot, 'roomId' => $gene->roomId];
                }
            }

            foreach ($rooms as $room) {
                $key = $room->id . '@' . $slotKey;
                if (!isset($roomOccupied[$key]) || $roomOccupied[$key] === $geneIndex) {
                    return ['slot' => $slot, 'roomId' => $room->id];
                }
            }
        }

        return null;
    }

    /** Mutate a single gene by replacing one committee member or whole committee. */
    private function mutateGene(Gene $gene, SchedulingContext $context): void
    {
        if ($context->usesPredefinedCommittees()) {
            $this->mutateGeneWithPredefinedCommittee($gene, $context);
            return;
        }

        if (empty($gene->committeeMembers)) {
            return;
        }

        $currentMemberIds = $gene->getCommitteeMemberIds();

        $eligibleFaculty = $context->eligibleFaculty
            ->filter(fn($f) => $f->id !== $gene->supervisorId)
            ->filter(fn($f) => !in_array($f->id, $currentMemberIds))
            ->values();

        if ($eligibleFaculty->isEmpty()) {
            return;
        }

        $newFaculty = $eligibleFaculty->random();

        $indexToReplace = rand(0, count($gene->committeeMembers) - 1);

        $gene->replaceCommitteeMember($indexToReplace, [
            'userId' => $newFaculty->id,
            'name' => $newFaculty->name,
            'email' => $newFaculty->email,
        ]);

        $this->reassignTimeSlot($gene, $context);
    }

    private function mutateGeneWithPredefinedCommittee(Gene $gene, SchedulingContext $context): void
    {
        $project = $context->projects->firstWhere('id', $gene->projectId);
        if (!$project) {
            return;
        }

        $eligibleCommittees = $context->predefinedCommittees
            ->filter(fn ($committee) => $committee->id !== $gene->committeeId)
            ->filter(fn ($committee) => !$committee->hasConflictWith($project))
            ->values();

        if ($eligibleCommittees->isEmpty()) {
            return;
        }

        $committee = $eligibleCommittees->random();
        $committee->loadMissing('members');

        $gene->committeeId = $committee->id;
        $gene->committeeMembers = $committee->members->map(fn ($member) => [
            'userId' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'role' => $member->pivot->role ?? 'member',
            'committeeName' => $committee->name,
        ])->values()->toArray();

        $this->reassignTimeSlot($gene, $context);
    }

    /** Pick a random slot where all current committee members are available. */
    private function reassignTimeSlot(Gene $gene, SchedulingContext $context): void
    {
        if (empty($gene->committeeMembers)) {
            return;
        }

        $validSlots = $context->getSlotsForCommittee($gene->committeeMembers);

        if (!empty($validSlots)) {
            $gene->timeSlot = $validSlots[array_rand($validSlots)];
        }

        $this->reassignRoom($gene, $context);
    }

    private function reassignRoom(Gene $gene, SchedulingContext $context): void
    {
        $room = $context->pickRandomRoomForProjectId($gene->projectId);
        $gene->roomId = $room?->id;
    }

    /** Generate offspring from population using selection, crossover, mutation, and repair. */
    public function generateOffspring(
        array $population,
        SchedulingContext $context,
        int $count,
        int $tournamentSize,
        float $mutationRate
    ): array {
        $offspring = [];

        while (count($offspring) < $count) {
            $parent1 = $this->tournamentSelect($population, $tournamentSize);
            $parent2 = $this->tournamentSelect($population, $tournamentSize);

            [$child1, $child2] = $this->crossover($parent1, $parent2);

            $child1 = $this->mutate($child1, $context, $mutationRate);
            $child2 = $this->mutate($child2, $context, $mutationRate);

            $child1 = $this->repair($child1, $context);
            $child2 = $this->repair($child2, $context);

            $offspring[] = $child1;
            if (count($offspring) < $count) {
                $offspring[] = $child2;
            }
        }

        return $offspring;
    }
}
