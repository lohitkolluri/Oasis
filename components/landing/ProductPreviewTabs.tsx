'use client';

import { AdminMiniDashboard } from '@/components/landing/AdminMiniDashboard';
import { AdminPreviewFrame } from '@/components/landing/AdminPreviewFrame';
import { RiderMiniDashboard } from '@/components/landing/RiderMiniDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, User } from 'lucide-react';

export function ProductPreviewTabs() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.015] p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs defaultValue="admin" className="w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="admin" className="gap-2">
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Admin
              </TabsTrigger>
              <TabsTrigger value="rider" className="gap-2">
                <User className="h-4 w-4" aria-hidden />
                Rider
              </TabsTrigger>
            </TabsList>

            <p className="text-[12px] leading-relaxed text-white/50 sm:max-w-sm sm:text-right">
              Preview panels are demo data rendered with the same chart stack as the real dashboards.
            </p>
          </div>

          <TabsContent value="admin">
            <AdminPreviewFrame>
              <AdminMiniDashboard />
            </AdminPreviewFrame>
          </TabsContent>
          <TabsContent value="rider">
            <RiderMiniDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

