<?php

namespace App\Http\Controllers\Scheduling;


use App\Http\Controllers\Controller;
use App\Models\AvailableRoom;
use App\Support\SchedulingUniversityScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AvailableRoomController extends Controller
{
    public function index()
    {
        $rooms = SchedulingUniversityScope::apply(AvailableRoom::query())
            ->orderBy('name')
            ->get();

        return response()->json([
            'message' => 'Rooms retrieved successfully',
            'data' => $rooms,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'building' => 'nullable|string|max:255',
            'is_premium' => 'sometimes|boolean',
        ]);

        $user = Auth::user();

        $existingRoom = SchedulingUniversityScope::apply(AvailableRoom::query())
            ->where('name', $validated['name'])
            ->first();
        if ($existingRoom) {
            return response()->json([
                'message' => 'A room with this name already exists',
                'errors' => ['name' => ['The name has already been taken.']],
            ], 422);
        }

        $room = AvailableRoom::create([
            'university_id' => $user->university_id,
            'name' => $validated['name'],
            'building' => $validated['building'] ?? null,
            'is_premium' => (bool) ($validated['is_premium'] ?? false),
        ]);

        return response()->json([
            'message' => 'Room created successfully',
            'data' => $room,
        ], 201);
    }

    public function show($id)
    {
        $room = SchedulingUniversityScope::apply(AvailableRoom::query())
            ->where('id', $id)
            ->firstOrFail();

        return response()->json([
            'message' => 'Room retrieved successfully',
            'data' => $room,
        ]);
    }

    public function update(Request $request, $id)
    {
        $room = SchedulingUniversityScope::apply(AvailableRoom::query())
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'building' => 'nullable|string|max:255',
            'is_premium' => 'sometimes|boolean',
        ]);

        if (isset($validated['name']) && $validated['name'] !== $room->name) {
            $existing = SchedulingUniversityScope::apply(AvailableRoom::query())
                ->where('name', $validated['name'])
                ->where('id', '!=', $id)
                ->first();
            if ($existing) {
                return response()->json([
                    'message' => 'A room with this name already exists',
                    'errors' => ['name' => ['The name has already been taken.']],
                ], 422);
            }
        }

        $room->update($validated);

        return response()->json([
            'message' => 'Room updated successfully',
            'data' => $room,
        ]);
    }

    public function destroy($id)
    {
        $room = SchedulingUniversityScope::apply(AvailableRoom::query())
            ->where('id', $id)
            ->firstOrFail();

        $room->delete();

        return response()->json([
            'message' => 'Room deleted successfully',
        ]);
    }
}
