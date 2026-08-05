<?php

namespace App\Services\Users;

use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UserDeletionService
{
    /**
     * حذف مستخدم مع تنظيف الارتباطات.
     *
     * @return array{status: int, message: string}
     */
    public function delete(User $user): array
    {
        DB::beginTransaction();

        try {
            $id = (int) $user->id;
            $uniId = (int) $user->university_id;

            $ownedProjects = Project::query()
                ->when($uniId, fn ($q) => $q->where('university_id', $uniId))
                ->where('user_id', $id)
                ->get();

            foreach ($ownedProjects as $project) {
                $otherMember = DB::table('project_members')
                    ->where('project_id', $project->id)
                    ->where('student_id', '!=', $id)
                    ->where('status', 'accepted')
                    ->orderBy('created_at')
                    ->first();

                if ($otherMember) {
                    $project->user_id = $otherMember->student_id;
                    $project->save();
                    DB::table('project_members')
                        ->where('project_id', $project->id)
                        ->where('student_id', $otherMember->student_id)
                        ->delete();
                } else {
                    DB::table('project_members')->where('project_id', $project->id)->delete();
                    DB::table('student_invitations')->where('project_id', $project->id)->delete();
                    DB::table('supervisor_invitations')->where('project_id', $project->id)->delete();
                    $project->delete();
                }
            }

            DB::table('project_members')->where('student_id', $id)->delete();
            DB::table('tasks')->where('assigned_to', $id)->update(['assigned_to' => null]);
            Project::query()->where('supervisor_id', $id)->update(['supervisor_id' => null]);
            DB::table('supervisor_universities')->where('user_id', $id)->delete();
            DB::table('project_user')->where('user_id', $id)->delete();

            DB::table('student_invitations')
                ->where('student_id', $id)
                ->orWhere('sent_by_id', $id)
                ->delete();
            DB::table('supervisor_invitations')
                ->where('supervisor_id', $id)
                ->orWhere('student_id', $id)
                ->delete();

            DB::table('comments')->where('user_id', $id)->delete();
            DB::table('project_versions')->where('user_id', $id)->delete();
            DB::table('project_activities')->where('user_id', $id)->delete();
            DB::table('ratings')->where('user_id', $id)->delete();
            DB::table('password_reset_requests')->where('user_id', $id)->delete();

            DB::table('notifications')
                ->where('notifiable_type', User::class)
                ->where('notifiable_id', $id)
                ->delete();

            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $id)
                ->delete();

            $user->delete();

            DB::commit();

            return ['status' => 200, 'message' => 'تم حذف المستخدم بنجاح.'];
        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();

            return [
                'status' => 400,
                'message' => 'تعذر الحذف — يوجد ارتباط في قاعدة البيانات: ' . $e->getMessage(),
            ];
        } catch (\Exception $e) {
            DB::rollBack();

            return [
                'status' => 500,
                'message' => 'تعذر حذف المستخدم: ' . $e->getMessage(),
            ];
        }
    }
}
