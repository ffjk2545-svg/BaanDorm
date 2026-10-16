"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function DashboardRealtime({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let noticeTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`dashboard-${organizationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "payments", filter: `organization_id=eq.${organizationId}` }, () => {
        setNotice("มีการบันทึกรับชำระใหม่ · กำลังอัปเดตภาพรวม");
        router.refresh();
        if (noticeTimer) clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => setNotice(""), 5000);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "maintenance_tickets", filter: `organization_id=eq.${organizationId}` }, () => {
        setNotice("มีรายการแจ้งซ่อมใหม่ · กำลังอัปเดตภาพรวม");
        router.refresh();
        if (noticeTimer) clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => setNotice(""), 5000);
      })
      .subscribe();

    return () => {
      if (noticeTimer) clearTimeout(noticeTimer);
      void supabase.removeChannel(channel);
    };
  }, [organizationId, router]);

  return <span className="realtime-status" aria-live="polite">{notice}</span>;
}

