'use client';
import { Activity, ListTodo, Video, Users, Shield, BarChart, Target, Bot, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTasksForUser, feedItems, meetings as legacyMeetings } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getDailyBriefing } from '@/ai/flows/get-daily-briefing';
import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useUser } from '@/firebase';
import { ROLES } from '@/config/roles';
import { useEnterpriseIdentity } from '@/features/auth/use-enterprise-identity';
import type { LegacyMeeting } from '@/lib/data';

type DashboardUser = { uid: string; displayName: string; email: string | null; role: string; companyId: string };

const AdminPanel = () => {
  const [open, setOpen] = useState(false);
  const systemAlerts = [
    { id: 'alert01', severity: 'high', message: 'Atividade suspeita detectada e encaminhada para revisão.' },
    { id: 'alert02', severity: 'medium', message: 'Integração de pagamentos com latência elevada.' },
    { id: 'alert03', severity: 'low', message: 'Carga elevada numa instância de jogos.' },
    { id: 'alert04', severity: 'high', message: 'Falha num job operacional requer revisão.' },
