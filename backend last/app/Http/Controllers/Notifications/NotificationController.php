<?php

namespace App\Http\Controllers\Notifications;


use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\Notifications\NotificationService;

class NotificationController extends Controller
{
    protected NotificationService $service;

    public function __construct(NotificationService $service)
    {
        $this->service = $service;
    }

    /** List notifications for the authenticated user. */
    public function index(Request $request)
    {
        $result = $this->service->getAll($request->user());
        return response()->json($result);
    }

    /** Mark a single notification as read. */
    public function markAsRead(Request $request, $id)
    {
        $this->service->markAsRead($request->user(), $id);

        return response()->json([
            'message' => 'تم تحديد الإشعار كمقروء'
        ]);
    }

    /** Mark all notifications as read. */
    public function markAllAsRead(Request $request)
    {
        $result = $this->service->markAsRead($request->user());

        return response()->json([
            'message' => 'All notifications marked as read successfully',
            'unread_count' => $result['unread_count']
        ]);
    }

    public function delete(Request $request, $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();
        if (!$notification) return response()->json(['message' => 'Not found'], 404);

        $notification->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    public function deleteAll(Request $request)
    {
        $request->user()->notifications()->delete();

        return response()->json([
            'message' => 'All notifications deleted successfully'
        ]);
    }
}
