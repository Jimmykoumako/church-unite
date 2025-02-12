import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { supabase } from '../lib/supabase';
import { Users, Calendar, Activity, HandHeart } from 'lucide-react';

// Define interfaces for the data structures
interface DashboardStats {
  totalMembers: number;
  activePrayers: number;
  permanentPrayers: number;
  answeredPrayers: number;
}

interface Member {
  first_name: string;
  last_name: string;
}

interface PrayerRequest {
  id: string;
  title: string;
  status: 'active' | 'in_progress' | 'answered';
  created_at: string;
  member: Member;
  is_permanent: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activePrayers: 0,
    permanentPrayers: 0,
    answeredPrayers: 0
  });
  const [recentPrayers, setRecentPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Type the database responses
      const { data: members } = await supabase
        .from('members')
        .select('id');

      const { data: prayers } = await supabase
        .from('prayer_requests')
        .select('status, is_permanent');

      const { data: recentPrayerData } = await supabase
        .from('prayer_requests')
        .select(`
          *,
          member:members (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalMembers: members?.length || 0,
        activePrayers: prayers?.filter(p => p.status === 'active').length || 0,
        permanentPrayers: prayers?.filter(p => p.is_permanent).length || 0,
        answeredPrayers: prayers?.filter(p => p.status === 'answered').length || 0
      });

      setRecentPrayers(recentPrayerData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Prayers</CardTitle>
            <HandHeart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePrayers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Permanent Prayers</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.permanentPrayers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Answered Prayers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.answeredPrayers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Prayer Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPrayers.map((prayer) => (
              <div key={prayer.id} className="flex items-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{prayer.title}</p>
                  <p className="text-sm text-muted-foreground">
                    by {prayer.member.first_name} {prayer.member.last_name} •
                    {new Date(prayer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className={`px-2 py-1 text-xs rounded-full
                    ${prayer.status === 'active' ? 'bg-green-100 text-green-800' : 
                      prayer.status === 'answered' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {prayer.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}