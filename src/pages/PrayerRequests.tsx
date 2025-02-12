import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { PrayerRequestForm } from './PrayerRequestForm';
import {RefreshCw, User} from "lucide-react";
import {formatRelativeTime} from "@/lib/utils.ts";

export interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  is_permanent: boolean;
  status: string;
  created_at: string;
  creator: {
    first_name: string;
    last_name: string;
  };
  prayer_members: {
    member: {
      id: string;
      first_name: string;
      last_name: string;
    };
  }[];
}

export default function PrayerRequests() {
  const { user } = useAuth();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'kanban'>('list');

  useEffect(() => {
    fetchPrayers();
  }, [filter]);

  // Refresh button
  const handleRefresh = () => {
    fetchPrayers();
  };

  async function fetchPrayers() {
    try {
      let query = supabase
          .from('prayer_requests')
          .select(`
        *,
        creator:members!prayer_requests_creator_id_fkey (
          id,
          first_name,
          last_name
        ),
        prayer_request_members (
          member:members (
            id,
            first_name,
            last_name
          )
        )
      `)
          .order('created_at', { ascending: false });

      if (filter !== 'all') {
        if (filter === 'permanent') {
          query = query.eq('is_permanent', true);
        } else {
          query = query.eq('status', filter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setPrayers(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching prayers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(formData: unknown) {
    try {
      if (selectedPrayer) {
        // Update existing prayer
        const { error } = await supabase
            .from('prayer_requests')
            .update({
              ...formData,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedPrayer.id);
        if (error) throw error;
      } else {
        // Create new prayer
        const { error } = await supabase
            .from('prayer_requests')
            .insert([{
              ...formData,
              member_id: user?.id
            }]);
        if (error) throw error;
      }
      fetchPrayers();
      setDialogOpen(false);
      setSelectedPrayer(null);
    } catch (error) {
      console.error('Error saving prayer request:', error);
      throw error;
    }
  }

  async function updatePrayerStatus(id: string, status: string) {
    try {
      const { error } = await supabase
          .from('prayer_requests')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
      if (error) throw error;
      fetchPrayers();
    } catch (error) {
      console.error('Error updating prayer status:', error);
    }
  }

  // const handleEdit = (prayer: PrayerRequest) => {
  //   setSelectedPrayer(prayer);
  //   setDialogOpen(true);
  // };

  const handleOpenDialog = () => {
    setSelectedPrayer(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPrayer(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading prayer requests...</div>;
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Prayer Requests</h1>
          <div className="flex items-center space-x-2">
            {/* Layout switcher */}
            <div className="flex space-x-1">
              <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
              <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  onClick={() => setViewMode('kanban')}
              >
                Kanban
              </Button>
            </div>

            {/* Refresh button with last updated time */}
            <Button
                variant="outline"
                onClick={handleRefresh}
                className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4"/>
              {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                Updated {formatRelativeTime(lastUpdated)}
              </span>
              )}
            </Button>

            <Button onClick={handleOpenDialog}>
              Add Prayer Request
            </Button>
          </div>
        </div>

        {/* Prayer Request Form Dialog */}
        <PrayerRequestForm
            open={dialogOpen}
            onOpenChange={handleCloseDialog}
            onSubmit={handleSubmit}
            initialData={selectedPrayer}
            isEditing={!!selectedPrayer}
            currentUserId={user?.id}
        />

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'active', 'answered', 'permanent'].map((filterOption) => (
              <Button
                  key={filterOption}
                  variant={filter === filterOption ? "default" : "outline"}
                  onClick={() => setFilter(filterOption)}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Button>
          ))}
        </div>

        {/* Conditional rendering based on view mode */}
        {viewMode === 'list' && (
            <ScrollArea className="h-[600px] rounded-md border">
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-left">Title</th>
                    <th className="p-3 text-left hidden md:table-cell">Category</th>
                    <th className="p-3 text-left hidden sm:table-cell">Creator</th>
                    <th className="p-3 text-left hidden lg:table-cell">Date</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                  </thead>
                  <tbody>
                  {prayers.map((prayer) => (
                      <tr
                          key={prayer.id}
                          onClick={() => {
                            setSelectedPrayer(prayer);
                            setDialogOpen(true);
                          }}
                          className="hover:bg-gray-50 cursor-pointer border-b transition-colors"
                      >
                        <td className="p-3 max-w-[200px]">
                          <div className="flex items-center space-x-2">
                            {prayer.is_permanent && (
                                <Badge variant="secondary" className="shrink-0">P</Badge>
                            )}
                            <div className="truncate" title={prayer.title}>
                              {prayer.title}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <Badge variant="outline" className="truncate max-w-[100px]">
                            {prayer.category}
                          </Badge>
                        </td>
                        <td className="p-3 hidden sm:table-cell truncate">
                          {prayer.creator?.first_name} {prayer.creator?.last_name}
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          {new Date(prayer.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <select
                              onClick={(e) => e.stopPropagation()}
                              value={prayer.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                updatePrayerStatus(prayer.id, e.target.value);
                              }}
                              className="text-sm border rounded p-1"
                          >
                            <option value="active">Active</option>
                            <option value="in_progress">In Progress</option>
                            <option value="answered">Answered</option>
                          </select>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
        )}

        {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-4">
                {prayers.map((prayer) => (
                    <div
                        key={prayer.id}
                        className="bg-white border rounded-lg shadow-sm p-4 space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold truncate max-w-[80%]">
                          {prayer.title}
                        </h3>
                        {prayer.is_permanent && (
                            <Badge variant="secondary" className="shrink-0">Permanent</Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span>By {prayer.creator?.first_name} {prayer.creator?.last_name}</span>
                        <span className="ml-2">
          {new Date(prayer.created_at).toLocaleDateString()}
        </span>
                      </div>

                      <p className="text-muted-foreground line-clamp-2">
                        {prayer.description}
                      </p>

                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{prayer.category}</Badge>
                        <select
                            value={prayer.status}
                            onChange={(e) => updatePrayerStatus(prayer.id, e.target.value)}
                            className="text-sm border rounded p-1"
                        >
                          <option value="active">Active</option>
                          <option value="in_progress">In Progress</option>
                          <option value="answered">Answered</option>
                        </select>
                      </div>
                    </div>
                ))}
              </div>
            </div>
        )}

        {viewMode === 'kanban' && (
            <div className="flex space-x-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['active', 'in_progress', 'answered'].map((status) => (
                    <div
                        key={status}
                        className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-[70vh] overflow-y-auto"
                    >
                      <h2 className="text-lg font-semibold capitalize sticky top-0 bg-gray-50 z-10">
                        {status.replace('_', ' ')}
                      </h2>
                      {prayers.filter(p => p.status === status).map((prayer) => (
                          <Card
                              key={prayer.id}
                              className="hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <h3
                                    className="text-base font-semibold truncate max-w-[70%]"
                                    title={prayer.title}
                                >
                                  {prayer.title}
                                </h3>
                                {prayer.is_permanent && (
                                    <Badge variant="secondary" className="shrink-0">Permanent</Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p
                                  className="text-muted-foreground text-sm line-clamp-2 mb-2"
                                  title={prayer.description}
                              >
                                {prayer.description}
                              </p>
                              <div className="flex justify-between items-center">
                                <Badge
                                    variant="outline"
                                    className="text-xs truncate max-w-[50%]"
                                >
                                  {prayer.category}
                                </Badge>
                                <div className="flex items-center text-xs text-muted-foreground space-x-1">
                                  <User className="h-3 w-3"/>
                                  <span className="truncate">
                  {prayer.creator?.first_name} {prayer.creator?.last_name}
                </span>
                                </div>
                              </div>
                              <select
                                  value={prayer.status}
                                  onChange={(e) => updatePrayerStatus(prayer.id, e.target.value)}
                                  className="w-full text-xs border rounded mt-2"
                              >
                                <option value="active">Active</option>
                                <option value="in_progress">In Progress</option>
                                <option value="answered">Answered</option>
                              </select>
                            </CardContent>
                          </Card>
                      ))}
                    </div>
                ))}
              </div>
            </div>
        )}

        {/*/!* Prayer Requests List *!/*/}
        {/*<ScrollArea className="h-[600px] rounded-md border">*/}
        {/*  <div className="space-y-4 p-4">*/}
        {/*    {prayers.map((prayer) => (*/}
        {/*        <Card key={prayer.id}>*/}
        {/*          <CardHeader>*/}
        {/*            <div className="flex justify-between items-start">*/}
        {/*              <div>*/}
        {/*                <CardTitle className="flex items-center gap-2">*/}
        {/*                  {prayer.title}*/}
        {/*                  {prayer?.id === user?.id && (*/}
        {/*                      <Button*/}
        {/*                          variant="ghost"*/}
        {/*                          size="icon"*/}
        {/*                          onClick={() => handleEdit(prayer)}*/}
        {/*                          className="h-8 w-8"*/}
        {/*                      >*/}
        {/*                        <Pencil className="h-4 w-4"/>*/}
        {/*                      </Button>*/}
        {/*                  )}*/}
        {/*                </CardTitle>*/}
        {/*                <CardDescription>*/}
        {/*                  By {prayer?.creator?.first_name} {prayer?.creator?.last_name} •*/}
        {/*                  {new Date(prayer.created_at).toLocaleDateString()}*/}
        {/*                </CardDescription>*/}
        {/*                {prayer.prayer_members?.length > 0 && (*/}
        {/*                    <div className="mt-2 flex flex-wrap gap-2">*/}
        {/*                      {prayer.prayer_members.map(({member}) => (*/}
        {/*                          <Badge key={member.id} variant="outline">*/}
        {/*                            <User className="h-3 w-3 mr-1"/>*/}
        {/*                            {member.first_name} {member.last_name}*/}
        {/*                          </Badge>*/}
        {/*                      ))}*/}
        {/*                    </div>*/}
        {/*                )}*/}
        {/*              </div>*/}
        {/*              <div className="flex items-center space-x-2">*/}
        {/*                {prayer.is_permanent && (*/}
        {/*                    <Badge variant="secondary">Permanent</Badge>*/}
        {/*                )}*/}
        {/*                <select*/}
        {/*                    value={prayer.status}*/}
        {/*                    onChange={(e) => updatePrayerStatus(prayer.id, e.target.value)}*/}
        {/*                    className="text-sm border rounded p-1"*/}
        {/*                >*/}
        {/*                  <option value="active">Active</option>*/}
        {/*                  <option value="in_progress">In Progress</option>*/}
        {/*                  <option value="answered">Answered</option>*/}
        {/*                </select>*/}
        {/*              </div>*/}
        {/*            </div>*/}
        {/*          </CardHeader>*/}
        {/*          <CardContent>*/}
        {/*            <p className="text-muted-foreground whitespace-pre-wrap">*/}
        {/*              {prayer.description}*/}
        {/*            </p>*/}
        {/*            <Badge variant="outline" className="mt-2">*/}
        {/*              {prayer.category}*/}
        {/*            </Badge>*/}
        {/*          </CardContent>*/}
        {/*        </Card>*/}
        {/*    ))}*/}
        {/*  </div>*/}
        {/*</ScrollArea>*/}
      </div>
  );
}