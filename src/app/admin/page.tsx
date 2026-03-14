import StatsWidget from '@/services/StatsWidget';
import TaskTemplateManager from '@/services/TaskTemplateManager';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DbConnectionTestWidget } from '@/components/db-connection-test-widget';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage your property management services and view statistics.</p>
      </div>

      <StatsWidget />

      <DbConnectionTestWidget />

      <Card>
        <CardHeader>
          <CardTitle>Task Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskTemplateManager />
        </CardContent>
      </Card>
    </div>
  );
}
