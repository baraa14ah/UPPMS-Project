<?php

namespace App\Scheduling;

class PopulationManager
{
    /** Mix of greedy, lightly-varied, and random chromosomes. */
    public function initialize(SchedulingContext $context, int $size): array
    {
        if ($size <= 0) {
            return [];
        }

        $greedyCount = max(1, (int) round($size * 0.20));
        $variantCount = max(0, (int) round($size * 0.30));
        $randomCount = max(0, $size - $greedyCount - $variantCount);

        $population = [];

        $greedySeed = $this->createGreedyChromosome($context, 0);
        $population[] = $greedySeed;

        for ($i = 1; $i < $greedyCount; $i++) {
            $population[] = $this->createGreedyChromosome($context, 0);
        }

        for ($i = 0; $i < $variantCount; $i++) {
            $population[] = $this->createLightVariant($greedySeed, $context);
        }

        for ($i = 0; $i < $randomCount; $i++) {
            $population[] = $this->createRandomChromosome($context, 0);
        }

        return array_slice($population, 0, $size);
    }

    /** Conflict-aware pass: assign each project to the first free slot/room. */
    public function createGreedyChromosome(SchedulingContext $context, int $generation = 0): Chromosome
    {
        $genes = [];
        $usedRoomSlots = [];
        $usedFacultySlots = [];
        $allSlots = $context->getAvailableTimeSlots();

        foreach ($context->projects as $project) {
            $genes[] = $this->createGreedyGene(
                $project,
                $context,
                $allSlots,
                $usedRoomSlots,
                $usedFacultySlots
            );
        }

        return new Chromosome($genes, $generation);
    }

    /** Small random tweaks of a seed schedule (room / slot / committee). */
    private function createLightVariant(Chromosome $seed, SchedulingContext $context): Chromosome
    {
        $variant = $seed->clone();
        $geneCount = count($variant->genes);

        if ($geneCount === 0) {
            return $variant;
        }

        $tweaks = max(1, (int) ceil($geneCount * 0.15));

        for ($i = 0; $i < $tweaks; $i++) {
            $gene = $variant->genes[array_rand($variant->genes)];
            $this->tweakGene($gene, $context);
        }

        return $variant;
    }

    private function tweakGene(Gene $gene, SchedulingContext $context): void
    {
        if ($context->usesPredefinedCommittees() && $context->predefinedCommittees) {
            $project = $context->projects->firstWhere('id', $gene->projectId);
            if ($project) {
                $eligible = $context->predefinedCommittees
                    ->filter(fn ($c) => !$c->hasConflictWith($project))
                    ->values();
                if ($eligible->isNotEmpty()) {
                    $committee = $eligible->random();
                    $committee->loadMissing('members');
                    $gene->committeeId = $committee->id;
                    $gene->committeeMembers = $committee->members->map(fn ($member) => [
                        'userId' => $member->id,
                        'name' => $member->name,
                        'email' => $member->email,
                        'role' => $member->pivot->role ?? 'member',
                        'committeeName' => $committee->name,
                    ])->values()->toArray();
                }
            }
        }

        $validSlots = empty($gene->committeeMembers)
            ? $context->getAvailableTimeSlots()
            : $context->getSlotsForCommittee($gene->committeeMembers);

        if (!empty($validSlots)) {
            $gene->timeSlot = $validSlots[array_rand($validSlots)];
        }

        $room = $context->pickRandomRoom(
            $context->projects->firstWhere('id', $gene->projectId)
        );
        $gene->roomId = $room?->id;
    }

    private function createGreedyGene(
        $project,
        SchedulingContext $context,
        array $allSlots,
        array &$usedRoomSlots,
        array &$usedFacultySlots
    ): Gene {
        if ($context->usesPredefinedCommittees()) {
            return $this->createGreedyGeneFromCommittee(
                $project,
                $context,
                $allSlots,
                $usedRoomSlots,
                $usedFacultySlots
            );
        }

        $eligibleFaculty = $context->eligibleFaculty
            ->filter(fn ($f) => $f->id !== $project->supervisor_id)
            ->values();

        $committeeSize = $context->needsDynamicReduction()
            ? min(2, $eligibleFaculty->count())
            : min($context->getCommitteeSize(), $eligibleFaculty->count());

        $shuffled = $eligibleFaculty->shuffle();
        $selectedFaculty = $shuffled->take($committeeSize);

        $committeeMembers = $selectedFaculty->map(fn ($f) => [
            'userId' => $f->id,
            'name' => $f->name,
            'email' => $f->email,
        ])->toArray();

        [$timeSlot, $roomId] = $this->pickConflictFreePlacement(
            $committeeMembers,
            $context,
            $allSlots,
            $usedRoomSlots,
            $usedFacultySlots,
            true,
            $project
        );

        return new Gene(
            $project->id,
            $project->title,
            $project->supervisor_id,
            $project->supervisor?->name ?? 'Unknown',
            $committeeMembers,
            $timeSlot,
            $roomId
        );
    }

    private function createGreedyGeneFromCommittee(
        $project,
        SchedulingContext $context,
        array $allSlots,
        array &$usedRoomSlots,
        array &$usedFacultySlots
    ): Gene {
        $eligibleCommittees = $context->predefinedCommittees
            ->filter(fn ($committee) => !$committee->hasConflictWith($project))
            ->values();

        if ($eligibleCommittees->isEmpty()) {
            return new Gene(
                $project->id,
                $project->title,
                $project->supervisor_id,
                $project->supervisor?->name ?? 'Unknown',
                [],
                null,
                null
            );
        }

        $bestGene = null;

        foreach ($eligibleCommittees->shuffle() as $committee) {
            $committee->loadMissing('members');

            $committeeMembers = $committee->members->map(fn ($member) => [
                'userId' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->pivot->role ?? 'member',
                'committeeName' => $committee->name,
            ])->values()->toArray();

            [$timeSlot, $roomId] = $this->pickConflictFreePlacement(
                $committeeMembers,
                $context,
                $allSlots,
                $usedRoomSlots,
                $usedFacultySlots,
                reserve: false,
                project: $project
            );

            if ($timeSlot !== null) {
                $this->reservePlacement($committeeMembers, $timeSlot, $roomId, $usedRoomSlots, $usedFacultySlots);

                return new Gene(
                    $project->id,
                    $project->title,
                    $project->supervisor_id,
                    $project->supervisor?->name ?? 'Unknown',
                    $committeeMembers,
                    $timeSlot,
                    $roomId,
                    $committee->id
                );
            }

            if ($bestGene === null) {
                $bestGene = new Gene(
                    $project->id,
                    $project->title,
                    $project->supervisor_id,
                    $project->supervisor?->name ?? 'Unknown',
                    $committeeMembers,
                    null,
                    null,
                    $committee->id
                );
            }
        }

        return $bestGene;
    }

    /**
     * Find first room+slot free of room/faculty conflicts for the committee.
     *
     * @return array{0: ?TimeSlot, 1: ?int}
     */
    private function pickConflictFreePlacement(
        array $committeeMembers,
        SchedulingContext $context,
        array $allSlots,
        array &$usedRoomSlots,
        array &$usedFacultySlots,
        bool $reserve = true,
        $project = null
    ): array {
        $validSlots = empty($committeeMembers)
            ? $allSlots
            : $context->getSlotsForCommittee($committeeMembers);

        if (empty($validSlots)) {
            $validSlots = $allSlots;
        }

        $rooms = $context->getRoomsForProject($project)->values();

        foreach ($validSlots as $slot) {
            $slotKey = $slot->getConflictKey();

            if ($this->facultyBusyAt($committeeMembers, $slotKey, $usedFacultySlots)) {
                continue;
            }

            if ($rooms->isEmpty()) {
                if ($reserve) {
                    $this->reservePlacement($committeeMembers, $slot, null, $usedRoomSlots, $usedFacultySlots);
                }

                return [$slot, null];
            }

            foreach ($rooms as $room) {
                $roomKey = $room->id . '@' . $slotKey;
                if (isset($usedRoomSlots[$roomKey])) {
                    continue;
                }

                if ($reserve) {
                    $this->reservePlacement($committeeMembers, $slot, $room->id, $usedRoomSlots, $usedFacultySlots);
                }

                return [$slot, $room->id];
            }
        }

        // Fallback: allow a slot even if rooms are exhausted (repair may fix later)
        if (!empty($validSlots)) {
            $slot = $validSlots[0];
            $roomId = $rooms->isNotEmpty() ? $rooms->first()->id : null;
            if ($reserve) {
                $this->reservePlacement($committeeMembers, $slot, $roomId, $usedRoomSlots, $usedFacultySlots);
            }

            return [$slot, $roomId];
        }

        return [null, null];
    }

    private function facultyBusyAt(array $committeeMembers, string $slotKey, array $usedFacultySlots): bool
    {
        foreach ($committeeMembers as $member) {
            $userId = $member['userId'];
            if (isset($usedFacultySlots[$userId][$slotKey])) {
                return true;
            }
        }

        return false;
    }

    private function reservePlacement(
        array $committeeMembers,
        TimeSlot $slot,
        ?int $roomId,
        array &$usedRoomSlots,
        array &$usedFacultySlots
    ): void {
        $slotKey = $slot->getConflictKey();

        if ($roomId !== null) {
            $usedRoomSlots[$roomId . '@' . $slotKey] = true;
        }

        foreach ($committeeMembers as $member) {
            $usedFacultySlots[$member['userId']][$slotKey] = true;
        }
    }

    /** Create a single random chromosome. */
    private function createRandomChromosome(SchedulingContext $context, int $generation): Chromosome
    {
        $genes = [];
        $availableSlots = $context->getAvailableTimeSlots();
        $slotIndex = 0;

        foreach ($context->projects as $project) {
            $gene = $this->createRandomGene($project, $context, $availableSlots, $slotIndex);
            $genes[] = $gene;
            $slotIndex = ($slotIndex + 1) % max(1, count($availableSlots));
        }

        return new Chromosome($genes, $generation);
    }

    /** Create a random gene (project assignment). */
    private function createRandomGene($project, SchedulingContext $context, array $slots, int $slotIndex): Gene
    {
        if ($context->usesPredefinedCommittees()) {
            return $this->createGeneFromPredefinedCommittee($project, $context, $slots, $slotIndex);
        }

        $eligibleFaculty = $context->eligibleFaculty
            ->filter(fn($f) => $f->id !== $project->supervisor_id)
            ->values();

        $committeeSize = $context->needsDynamicReduction()
            ? min(2, $eligibleFaculty->count())
            : min($context->getCommitteeSize(), $eligibleFaculty->count());

        $shuffled = $eligibleFaculty->shuffle();
        $selectedFaculty = $shuffled->take($committeeSize);

        $committeeMembers = $selectedFaculty->map(fn($f) => [
            'userId' => $f->id,
            'name' => $f->name,
            'email' => $f->email,
        ])->toArray();

        $validSlots = $context->getSlotsForCommittee($committeeMembers);
        $timeSlot = $this->pickTimeSlot($validSlots, $slots, $slotIndex);
        $room = $context->pickRandomRoom($project);

        return new Gene(
            $project->id,
            $project->title,
            $project->supervisor_id,
            $project->supervisor?->name ?? 'Unknown',
            $committeeMembers,
            $timeSlot,
            $room?->id
        );
    }

    private function createGeneFromPredefinedCommittee($project, SchedulingContext $context, array $slots, int $slotIndex): Gene
    {
        $eligibleCommittees = $context->predefinedCommittees
            ->filter(fn ($committee) => !$committee->hasConflictWith($project))
            ->values();

        if ($eligibleCommittees->isEmpty()) {
            return new Gene(
                $project->id,
                $project->title,
                $project->supervisor_id,
                $project->supervisor?->name ?? 'Unknown',
                [],
                null,
                null
            );
        }

        $committee = $eligibleCommittees->random();
        $committee->loadMissing('members');

        $committeeMembers = $committee->members->map(fn ($member) => [
            'userId' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'role' => $member->pivot->role ?? 'member',
            'committeeName' => $committee->name,
        ])->values()->toArray();

        $validSlots = $context->getSlotsForCommittee($committeeMembers);
        $timeSlot = $this->pickTimeSlot($validSlots, $slots, $slotIndex);
        $room = $context->pickRandomRoom($project);

        return new Gene(
            $project->id,
            $project->title,
            $project->supervisor_id,
            $project->supervisor?->name ?? 'Unknown',
            $committeeMembers,
            $timeSlot,
            $room?->id,
            $committee->id
        );
    }

    /** Prefer committee-valid slots; fall back to global slot list. */
    private function pickTimeSlot(array $validSlots, array $allSlots, int $slotIndex): ?TimeSlot
    {
        if (!empty($validSlots)) {
            return $validSlots[$slotIndex % count($validSlots)];
        }

        if (!empty($allSlots)) {
            return $allSlots[$slotIndex % count($allSlots)];
        }

        return null;
    }

    /** Select top N chromosomes by fitness, preferring valid schedules. */
    public function selectTop(array $population, int $count): array
    {
        return $this->selectDistinctTop($population, $count);
    }

    /** Select top N distinct chromosomes, preferring hard-constraint-valid schedules. */
    public function selectDistinctTop(array $population, int $count): array
    {
        usort($population, fn (Chromosome $a, Chromosome $b) => Chromosome::compare($a, $b));

        $selected = [];
        $signatures = [];

        foreach ($population as $chromosome) {
            $signature = $this->chromosomeSignature($chromosome);
            if (isset($signatures[$signature])) {
                continue;
            }

            $signatures[$signature] = true;
            $selected[] = $chromosome;

            if (count($selected) >= $count) {
                break;
            }
        }

        if (count($selected) < $count) {
            foreach ($population as $chromosome) {
                if (in_array($chromosome, $selected, true)) {
                    continue;
                }

                $selected[] = $chromosome;

                if (count($selected) >= $count) {
                    break;
                }
            }
        }

        return array_slice($selected, 0, $count);
    }

    /** Fingerprint a chromosome for duplicate detection. */
    private function chromosomeSignature(Chromosome $chromosome): string
    {
        $parts = [];

        foreach ($chromosome->genes as $gene) {
            $memberIds = $gene->getCommitteeMemberIds();
            sort($memberIds);
            $slotKey = $gene->timeSlot?->getConflictKey() ?? 'unscheduled';
            $roomKey = $gene->roomId ?? 0;
            $parts[] = $gene->projectId . ':' . implode(',', $memberIds) . '@' . $slotKey . '#' . $roomKey;
        }

        sort($parts);

        return implode('|', $parts);
    }

    /** Replace worst chromosomes with offspring, preserving elites. */
    public function replaceWorst(array $population, array $offspring, int $eliteCount): array
    {
        usort($population, fn($a, $b) => Chromosome::compare($a, $b));

        $elites = array_slice($population, 0, $eliteCount);

        $remaining = array_slice($population, $eliteCount);

        $replacementCount = min(count($offspring), count($remaining));
        for ($i = 0; $i < $replacementCount; $i++) {
            $remaining[count($remaining) - 1 - $i] = $offspring[$i];
        }

        return array_merge($elites, $remaining);
    }

    /** Calculate faculty workload for every eligible doctor (zeros included). */
    public function calculateFacultyWorkload(Chromosome $chromosome, SchedulingContext $context): array
    {
        $counts = $chromosome->countAssignmentsPerFaculty();
        $workload = [];
        $seen = [];

        foreach ($context->eligibleFaculty as $faculty) {
            $userId = (int) $faculty->id;
            $seen[$userId] = true;
            $workload[] = [
                'userId' => $userId,
                'name' => $faculty->name,
                'totalAssignments' => (int) ($counts[$userId] ?? 0),
            ];
        }

        // Include members who appear on the schedule but are outside the eligible pool.
        foreach ($counts as $userId => $count) {
            $userId = (int) $userId;
            if (isset($seen[$userId])) {
                continue;
            }
            $faculty = $context->getFacultyById($userId);
            $workload[] = [
                'userId' => $userId,
                'name' => $faculty?->name ?? ("#{$userId}"),
                'totalAssignments' => (int) $count,
            ];
        }

        usort($workload, function ($a, $b) {
            if ($a['totalAssignments'] !== $b['totalAssignments']) {
                return $b['totalAssignments'] <=> $a['totalAssignments'];
            }

            return strcmp($a['name'], $b['name']);
        });

        return $workload;
    }
}
