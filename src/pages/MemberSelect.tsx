import * as React from "react";
import { Check, ChevronsUpDown, User, Users, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface Member {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    ministry: string[];
}

interface MemberSelectProps {
    selectedMembers: string[];
    onChange: (values: string[]) => void;
    maxSelections?: number;
    currentMembers?: string[]; // New prop for pre-selected members
}

type GroupedMembers = {
    [key: string]: Member[];
};

export function MemberSelect({
                                 selectedMembers = [],
                                 onChange,
                                 maxSelections = Infinity,
                                 currentMembers = [] // Default to empty array
                             }: MemberSelectProps) {
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    const [members, setMembers] = React.useState<Member[]>([]);
    const [recentSelections, setRecentSelections] = React.useState<Member[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Fetch members and recent selections
    React.useEffect(() => {
        async function fetchData() {
            try {
                // Fetch all members
                const { data: membersData, error: membersError } = await supabase
                    .from('members')
                    .select('id, first_name, last_name, role, ministry')
                    .order('first_name');

                if (membersError) throw membersError;

                // Fetch recent selections
                const { data: recentData, error: recentError } = await supabase
                    .from('member_selections')
                    .select('selected_member_id, members!member_selections_selected_member_id_fkey(id, first_name, last_name, role, ministry)')
                    .eq('selector_id', user?.id)
                    .order('last_selected_at', { ascending: false })
                    .limit(5);

                if (recentError) throw recentError;

                setMembers(membersData || []);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                setRecentSelections(recentData?.map(s => s?.members));
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user]);

    // Group members by ministry
    const groupedByMinistry = React.useMemo(() => {
        return members.reduce((acc: GroupedMembers, member) => {
            member.ministry?.forEach(ministry => {
                if (!acc[ministry]) {
                    acc[ministry] = [];
                }
                acc[ministry].push(member);
            });
            return acc;
        }, {});
    }, [members]);

    // Group members by role
    const groupedByRole = React.useMemo(() => {
        return members.reduce((acc: GroupedMembers, member) => {
            const role = member.role || 'member';
            if (!acc[role]) {
                acc[role] = [];
            }
            acc[role].push(member);
            return acc;
        }, {});
    }, [members]);

    const toggleMember = (memberId: string) => {
        // If member is already selected, remove them
        if (selectedMembers.includes(memberId)) {
            onChange(selectedMembers.filter(id => id !== memberId));
        }
        // If not at max selections, add member
        else if (selectedMembers.length < maxSelections) {
            onChange([...selectedMembers, memberId]);
        }
    };

    const removeSelected = (memberId: string) => {
        onChange(selectedMembers.filter(id => id !== memberId));
    };

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 shrink-0 opacity-50" />
                            {selectedMembers.length === 0 ? (
                                <span>Select members...</span>
                            ) : (
                                <span>
                                    {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                                </span>
                            )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                    <Command>
                        <CommandInput placeholder="Search members..." />
                        <CommandList>
                            <CommandEmpty>No member found.</CommandEmpty>
                            {loading ? (
                                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                            ) : (
                                <>
                                    {/* Current Members Section */}
                                    {currentMembers.length > 0 && (
                                        <>
                                            <CommandGroup heading="Current Members">
                                                {currentMembers.map((memberId) => {
                                                    const member = members.find(m => m.id === memberId);
                                                    return member ? (
                                                        <CommandItem
                                                            key={member.id}
                                                            onSelect={() => toggleMember(member.id)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedMembers.includes(member.id)
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {member.first_name} {member.last_name}
                                                            <span className="ml-2 text-xs text-muted-foreground">
                                                                (Current)
                                                            </span>
                                                        </CommandItem>
                                                    ) : null;
                                                })}
                                            </CommandGroup>
                                            <CommandSeparator />
                                        </>
                                    )}

                                    {/* Recent Selections Section */}
                                    {recentSelections.length > 0 && (
                                        <>
                                            <CommandGroup heading="Recent">
                                                {recentSelections.map((member) => (
                                                    <CommandItem
                                                        key={member.id}
                                                        onSelect={() => toggleMember(member.id)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="h-4 w-4 opacity-50" />
                                                            <span>{member.first_name} {member.last_name}</span>
                                                        </div>
                                                        <Check
                                                            className={cn(
                                                                "ml-auto h-4 w-4",
                                                                selectedMembers.includes(member.id)
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                            <CommandSeparator />
                                        </>
                                    )}

                                    {/* Ministry Grouping */}
                                    <CommandGroup heading="By Ministry">
                                        {Object.entries(groupedByMinistry).map(([ministry, ministryMembers]) => (
                                            <CommandGroup key={ministry} heading={ministry}>
                                                {ministryMembers.map((member) => (
                                                    <CommandItem
                                                        key={member.id}
                                                        onSelect={() => toggleMember(member.id)}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedMembers.includes(member.id)
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {member.first_name} {member.last_name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        ))}
                                    </CommandGroup>

                                    <CommandSeparator />

                                    {/* Role Grouping */}
                                    <CommandGroup heading="By Role">
                                        {Object.entries(groupedByRole).map(([role, roleMembers]) => (
                                            <CommandGroup key={role} heading={role.charAt(0).toUpperCase() + role.slice(1)}>
                                                {roleMembers.map((member) => (
                                                    <CommandItem
                                                        key={member.id}
                                                        onSelect={() => toggleMember(member.id)}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedMembers.includes(member.id)
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {member.first_name} {member.last_name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected members display */}
            {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((memberId) => {
                        const member = members.find(m => m.id === memberId);
                        if (!member) return null;
                        return (
                            <Badge
                                key={member.id}
                                variant="secondary"
                                className="flex items-center gap-1"
                            >
                                <User className="h-3 w-3" />
                                {member.first_name} {member.last_name}
                                {currentMembers.includes(member.id) && (
                                    <span className="text-xs text-muted-foreground ml-1">(Current)</span>
                                )}
                                <button
                                    onClick={() => removeSelected(member.id)}
                                    className="ml-1 rounded-full outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        );
                    })}
                </div>
            )}
        </div>
    );
}