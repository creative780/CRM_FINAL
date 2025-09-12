"use client";

import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Star,
  FileText,
  Zap,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Filter,
  Search,
  BarChart3,
  Users,
  Timer,
  Award,
} from "lucide-react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { clientsApi, Lead as ApiLead } from "@/lib/clients";

/* ==== Type Definitions ==== */

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  value: string;
  lastContact: string;
  avatar?: string;
  notes: string;
  score: number;
  priority: "high" | "medium" | "low";
  tags: string[];
  createdAt: string;
  nextFollowUp?: string;
  contactHistory: {
    date: string;
    type: "call" | "email" | "meeting";
    notes: string;
  }[];
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
  };
  companyInfo?: {
    industry: string;
    size: string;
    website?: string;
  };
}

interface Stage {
  id: string;
  title: string;
  leads: Lead[];
  color: string;
  conversionRate: number;
  avgTimeInStage: string;
  targetCount: number;
}

/* ==== Initial Pipeline Data ==== */

const initialStages: Stage[] = [
  {
    id: "new",
    title: "New Leads",
    color: "bg-blue-50 border-blue-200",
    conversionRate: 25,
    avgTimeInStage: "2.3 days",
    targetCount: 20,
    leads: [
      {
        id: "1",
        name: "Sarah Johnson",
        email: "sarah@techinnovations.com",
        phone: "+971-555-0123",
        company: "Tech Innovations",
        source: "Website",
        value: "$15,000",
        lastContact: "2024-01-20",
        notes: "Interested in enterprise solution, budget approved",
        score: 85,
        priority: "high",
        tags: ["Enterprise", "Hot Lead"],
        createdAt: "2024-01-18",
        nextFollowUp: "2024-01-23",
        contactHistory: [
          {
            date: "2024-01-20",
            type: "email",
            notes: "Sent product demo video",
          },
          {
            date: "2024-01-19",
            type: "call",
            notes: "Initial discovery call - very interested",
          },
        ],
        companyInfo: {
          industry: "Technology",
          size: "50-200 employees",
          website: "techinnovations.com",
        },
      },
      {
        id: "2",
        name: "Mike Chen",
        email: "mike@startupco.com",
        phone: "+971-555-0456",
        company: "StartupCo",
        source: "Referral",
        value: "$8,000",
        lastContact: "2024-01-19",
        notes: "Budget approved, needs demo",
        score: 72,
        priority: "medium",
        tags: ["Startup", "Referral"],
        createdAt: "2024-01-17",
        nextFollowUp: "2024-01-22",
        contactHistory: [
          {
            date: "2024-01-19",
            type: "call",
            notes: "Discussed pricing options",
          },
        ],
        companyInfo: {
          industry: "SaaS",
          size: "10-50 employees",
        },
      },
    ],
  },
  {
    id: "contacted",
    title: "Contacted",
    color: "bg-yellow-50 border-yellow-200",
    conversionRate: 45,
    avgTimeInStage: "5.1 days",
    targetCount: 15,
    leads: [
      {
        id: "3",
        name: "David Wilson",
        email: "david@globalcorp.com",
        phone: "+971-555-0789",
        company: "Global Corp",
        source: "LinkedIn",
        value: "$25,000",
        lastContact: "2024-01-18",
        notes: "Scheduled follow-up call for next week",
        score: 68,
        priority: "medium",
        tags: ["Enterprise", "LinkedIn"],
        createdAt: "2024-01-15",
        nextFollowUp: "2024-01-25",
        contactHistory: [
          {
            date: "2024-01-18",
            type: "call",
            notes: "Discussed requirements in detail",
          },
          {
            date: "2024-01-16",
            type: "email",
            notes: "Sent company brochure",
          },
        ],
        companyInfo: {
          industry: "Manufacturing",
          size: "200+ employees",
        },
      },
    ],
  },
  {
    id: "proposal",
    title: "Proposal Sent",
    color: "bg-orange-50 border-orange-200",
    conversionRate: 65,
    avgTimeInStage: "7.2 days",
    targetCount: 10,
    leads: [
      {
        id: "4",
        name: "Lisa Anderson",
        email: "lisa@businesssolutions.com",
        phone: "+971-555-0321",
        company: "Business Solutions",
        source: "Cold Email",
        value: "$35,000",
        lastContact: "2024-01-17",
        notes: "Proposal under review, decision expected by Friday",
        score: 91,
        priority: "high",
        tags: ["High Value", "Decision Pending"],
        createdAt: "2024-01-10",
        nextFollowUp: "2024-01-24",
        contactHistory: [
          {
            date: "2024-01-17",
            type: "email",
            notes: "Sent detailed proposal",
          },
          {
            date: "2024-01-15",
            type: "meeting",
            notes: "Requirements gathering meeting",
          },
        ],
        companyInfo: {
          industry: "Consulting",
          size: "50-200 employees",
        },
      },
    ],
  },
  {
    id: "negotiation",
    title: "Negotiation",
    color: "bg-purple-50 border-purple-200",
    conversionRate: 80,
    avgTimeInStage: "4.5 days",
    targetCount: 5,
    leads: [
      {
        id: "5",
        name: "Robert Taylor",
        email: "robert@enterprise.com",
        phone: "+971-555-0654",
        company: "Enterprise Ltd",
        source: "Trade Show",
        value: "$50,000",
        lastContact: "2024-01-16",
        notes: "Negotiating contract terms, very close to closing",
        score: 95,
        priority: "high",
        tags: ["High Value", "Almost Closed"],
        createdAt: "2024-01-05",
        nextFollowUp: "2024-01-23",
        contactHistory: [
          {
            date: "2024-01-16",
            type: "meeting",
            notes: "Contract negotiation meeting",
          },
          {
            date: "2024-01-14",
            type: "call",
            notes: "Discussed pricing adjustments",
          },
        ],
        companyInfo: {
          industry: "Finance",
          size: "500+ employees",
        },
      },
    ],
  },
  {
    id: "won",
    title: "Won",
    color: "bg-green-50 border-green-200",
    conversionRate: 100,
    avgTimeInStage: "1.0 day",
    targetCount: 8,
    leads: [],
  },
];

/* ==== Main Component ==== */

export default function LeadFunnel() {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track which lead is visible per stage (carousel)
  const [stageIndices, setStageIndices] = useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      initialStages.forEach((stage) => {
        initial[stage.id] = 0;
      });
      return initial;
    }
  );

  // Load leads from API
  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiLeads = await clientsApi.getLeads();
        
        // Convert API leads to UI format and group by stage
        const leadsByStage: Record<string, Lead[]> = {
          new: [],
          contacted: [],
          proposal: [],
          negotiation: [],
          won: [],
        };
        
        apiLeads.forEach((apiLead) => {
          const uiLead: Lead = {
            id: apiLead.id.toString(),
            name: `${apiLead.title || `Lead #${apiLead.id}`}`,
            email: '', // Not available in API
            phone: '', // Not available in API
            company: '', // Not available in API
            source: apiLead.source || 'Unknown',
            value: `$${apiLead.value.toLocaleString()}`,
            lastContact: new Date(apiLead.created_at).toISOString().split('T')[0],
            notes: apiLead.notes || '',
            score: apiLead.probability,
            priority: apiLead.probability >= 80 ? 'high' : apiLead.probability >= 60 ? 'medium' : 'low',
            tags: [],
            createdAt: apiLead.created_at,
            contactHistory: [],
          };
          
          leadsByStage[apiLead.stage] = leadsByStage[apiLead.stage] || [];
          leadsByStage[apiLead.stage].push(uiLead);
        });
        
        // Update stages with API data
        setStages(prevStages => 
          prevStages.map(stage => ({
            ...stage,
            leads: leadsByStage[stage.id] || []
          }))
        );
        
      } catch (err) {
        console.error('Failed to load leads:', err);
        setError('Failed to load leads');
      } finally {
        setLoading(false);
      }
    };
    
    loadLeads();
  }, []);

  /* === Analytics Calculations === */
  const totalLeads = stages.reduce((sum, stage) => sum + stage.leads.length, 0);
  const totalValue = stages.reduce(
    (sum, stage) =>
      sum +
      stage.leads.reduce(
        (stageSum, lead) =>
          stageSum + Number.parseInt(lead.value.replace(/[$,]/g, "")),
        0
      ),
    0
  );
  const avgDealSize = totalLeads > 0 ? totalValue / totalLeads : 0;
  const highPriorityLeads = stages.reduce(
    (sum, stage) =>
      sum + stage.leads.filter((lead) => lead.priority === "high").length,
    0
  );

  /* === Drag End Handler === */
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;

    // If dropping within the same stage, do nothing (no reordering)
    if (source.droppableId === destination.droppableId) return;

    const sourceStageId = source.droppableId;
    const destStageId = destination.droppableId;

    const sourceStage = stages.find((s) => s.id === sourceStageId);
    const destStage = stages.find((s) => s.id === destStageId);

    if (!sourceStage || !destStage) return;

    // Determine the index of the "front" card in the source stage.
    const activeIndex = stageIndices[sourceStageId] ?? 0;

    const sourceLeads = Array.from(sourceStage.leads);
    // Remove the card that's currently visible (the front card).
    const [movedLead] = sourceLeads.splice(activeIndex, 1);
    // Update last contact date for moved lead
    movedLead.lastContact = new Date().toISOString().split("T")[0];

    // Insert the moved card at the beginning of the destination stage
    const destLeads = [movedLead, ...destStage.leads];

    // Update UI immediately for better UX
    setStages(
      stages.map((s) => {
        if (s.id === sourceStageId) {
          return { ...s, leads: sourceLeads };
        }
        if (s.id === destStageId) {
          return { ...s, leads: destLeads };
        }
        return s;
      })
    );

    // Reset the carousel indices for both affected stages
    setStageIndices((prev) => ({
      ...prev,
      [sourceStageId]: 0,
      [destStageId]: 0,
    }));

    // Update lead stage via API
    try {
      await clientsApi.updateLead(parseInt(movedLead.id), {
        stage: destStageId as any,
      });
    } catch (err) {
      console.error('Failed to update lead stage:', err);
      // Revert UI changes on API failure
      setStages(
        stages.map((s) => {
          if (s.id === sourceStageId) {
            return { ...s, leads: [...sourceLeads, movedLead] };
          }
          if (s.id === destStageId) {
            return { ...s, leads: destLeads.slice(1) };
          }
          return s;
        })
      );
      alert('Failed to update lead stage. Please try again.');
    }
  };

  /* === Helpers for Converting & Viewing === */
  const handleConvertLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsConvertDialogOpen(true);
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailDialogOpen(true);
  };

  const confirmConversion = async () => {
    if (!selectedLead) return;
    
    try {
      // Convert lead via API
      await clientsApi.convertLead(parseInt(selectedLead.id));
      
      // Remove lead from its current stage
      setStages(
        stages.map((stage) => ({
          ...stage,
          leads: stage.leads.filter((l) => l.id !== selectedLead.id),
        }))
      );
      
      setIsConvertDialogOpen(false);
      setSelectedLead(null);
      alert(
        `🎉 ${selectedLead.name} has been successfully converted to a client!`
      );
    } catch (err) {
      console.error('Failed to convert lead:', err);
      alert('Failed to convert lead. Please try again.');
    }
  };

  /* === Styling Helpers === */
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  /* === Carousel Navigation Handlers === */
  const handlePrev = (stageId: string) => {
    setStageIndices((prev) => {
      const stage = stages.find((s) => s.id === stageId);
      const len = stage ? stage.leads.length : 0;
      const newIndex = len > 0 ? (prev[stageId] - 1 + len) % len : 0;
      return { ...prev, [stageId]: newIndex };
    });
  };

  const handleNext = (stageId: string) => {
    setStageIndices((prev) => {
      const stage = stages.find((s) => s.id === stageId);
      const len = stage ? stage.leads.length : 0;
      const newIndex = len > 0 ? (prev[stageId] + 1) % len : 0;
      return { ...prev, [stageId]: newIndex };
    });
  };

  /* === Apply Search & Filter === */
  const filteredStages = stages.map((stage) => {
    const leads = stage.leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority =
        priorityFilter === "all" || lead.priority === priorityFilter;
      const matchesSource =
        sourceFilter === "all" || lead.source === sourceFilter;
      return matchesSearch && matchesPriority && matchesSource;
    });
    return { ...stage, leads };
  });

  /* === Render === */
  if (loading) {
    return (
      <div className="space-y-6 px-4 md:px-8 lg:px-12 py-6">
        <DashboardNavbar/>
        <div className="text-center py-12">
          <div className="text-gray-600">Loading leads...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 px-4 md:px-8 lg:px-12 py-6">
        <DashboardNavbar/>
        <div className="text-center py-12">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-8 lg:px-12 py-6">
      {/* Header */}
      <DashboardNavbar/>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600">
            Track and convert leads through your sales pipeline
          </p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">Active in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pipeline Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total potential revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(avgDealSize).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Per lead average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {highPriorityLeads}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Pipeline Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {stages.map((stage, index) => (
              <div key={stage.id} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${stage.color} border-2`}
                  >
                    <span className="font-bold text-lg">
                      {stage.leads.length}
                    </span>
                  </div>
                  {index < stages.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
                  )}
                </div>
                <h3 className="font-medium text-sm">{stage.title}</h3>
                <div className="text-xs text-gray-500 mt-1">
                  <div>{stage.conversionRate}% conversion</div>
                  <div>{stage.avgTimeInStage} avg time</div>
                </div>
                <Progress
                  value={(stage.leads.length / stage.targetCount) * 100}
                  className="h-2 mt-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 py-2">
        {/* Search Input on the Left */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads or companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        {/* Filters Section on the Right */}
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 w-full md:w-auto">
          {/* Heading */}
          <div className="flex items-center text-sm font-medium text-gray-700 mb-2 md:mb-0">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </div>

          {/* Priority Filter */}
          <div className="w-full md:w-48">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Filter */}
          <div className="w-full md:w-48">
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Cold Email">Cold Email</SelectItem>
                <SelectItem value="Trade Show">Trade Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Kanban Board with Carousel */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {filteredStages.map((stage) => {
            const activeIndex = stageIndices[stage.id] || 0;
            const activeLead = stage.leads[activeIndex];
            return (
              <div key={stage.id} className="space-y-4">
                <div
                  className={`p-4 rounded-lg border-2 border-dashed ${stage.color}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">
                      {stage.title}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {stage.leads.length}/{stage.targetCount}
                    </Badge>
                  </div>

                  <div className="mb-4 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Conversion: {stage.conversionRate}%</span>
                      <span>{stage.avgTimeInStage}</span>
                    </div>
                  </div>

                  <div className="relative">
                    {stage.leads.length > 1 && (
                      <>
                        <button
                          onClick={() => handlePrev(stage.id)}
                          aria-label="Previous lead"
                          className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleNext(stage.id)}
                          aria-label="Next lead"
                          className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </>
                    )}

                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[420px] flex items-center justify-center ${
                            snapshot.isDraggingOver
                              ? "bg-gray-50 rounded-lg p-2"
                              : ""
                          }`}
                        >
                          {activeLead ? (
                            <Draggable draggableId={activeLead.id} index={0}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`cursor-move w-full transition-all ${
                                    snapshot.isDragging
                                      ? "shadow-lg rotate-1 scale-105"
                                      : "hover:shadow-md hover:bg-gradient-to-br from-white to-gray-50"
                                  }`}
                                >
                                  <CardContent className="px-4 py-2 space-y-3">
                                    {/* Lead Header */}
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center space-x-3">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage
                                            src={
                                              activeLead.avatar ||
                                              "/placeholder.svg"
                                            }
                                          />
                                          <AvatarFallback>
                                            {activeLead.name
                                              .split(" ")
                                              .map((n) => n[0])
                                              .join("")}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <h4 className="font-medium text-sm">
                                            {activeLead.name}
                                          </h4>
                                          <p className="text-xs text-gray-500">
                                            {activeLead.company}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end space-y-1">
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {activeLead.source}
                                        </Badge>
                                        <div
                                          className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(
                                            activeLead.priority
                                          )}`}
                                        >
                                          {activeLead.priority}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Score + Tags Layout */}
                                    <div className="flex justify-between items-center w-full">
                                      {/* Score */}
                                      <div className="flex flex-col items-center space-y-1">
                                        <span className="text-xs font-medium text-gray-700">
                                          Score
                                        </span>
                                        <span
                                          className={`text-sm font-bold px-3 py-1 rounded-full shadow ${getScoreColor(
                                            activeLead.score
                                          )}`}
                                        >
                                          {activeLead.score}
                                        </span>
                                      </div>

                                      {/* Tags stacked vertically and center aligned */}
                                      <div className="flex flex-col items-center space-y-1">
                                        {activeLead.tags[0] && (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] px-2 py-0.5"
                                          >
                                            {activeLead.tags[0]}
                                          </Badge>
                                        )}
                                        {activeLead.tags[1] && (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] px-2 py-0.5"
                                          >
                                            {activeLead.tags[1]}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Contact Info */}
                                    <div className="space-y-2 text-xs text-gray-600">
                                      <div className="flex items-center">
                                        <Mail className="h-3 w-3 mr-2" />
                                        <span className="truncate">
                                          {activeLead.email}
                                        </span>
                                      </div>
                                      <div className="flex items-center">
                                        <Phone className="h-3 w-3 mr-2" />
                                        {activeLead.phone}
                                      </div>
                                      <div className="flex items-center">
                                        <DollarSign className="h-3 w-3 mr-2" />
                                        <span className="font-medium">
                                          {activeLead.value}
                                        </span>
                                      </div>
                                      <div className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-2" />
                                        Last: {activeLead.lastContact}
                                      </div>
                                      {activeLead.nextFollowUp && (
                                        <div className="flex items-center">
                                          <Timer className="h-3 w-3 mr-2" />
                                          Next: {activeLead.nextFollowUp}
                                        </div>
                                      )}
                                    </div>

                                    {/* Notes */}
                                    {activeLead.notes && (
                                      <p className="text-xs text-gray-600 line-clamp-2">
                                        {activeLead.notes}
                                      </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-col gap-y-[2px]">
                                      <Button
                                        size="sm"
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewDetails(activeLead);
                                        }}
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        View Details
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConvertLead(activeLead);
                                        }}
                                      >
                                        <UserPlus className="h-3 w-3 mr-1" />
                                        Convert to Client
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ) : (
                            <div className="text-center text-gray-400 text-sm">
                              No leads
                            </div>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Lead Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedLead?.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {selectedLead?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedLead?.name}</span>
                <p className="text-sm text-gray-500 font-normal">
                  {selectedLead?.company}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">Contact History</TabsTrigger>
                <TabsTrigger value="company">Company Info</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Lead Score</Label>
                    <div
                      className={`text-lg font-bold px-3 py-2 rounded ${getScoreColor(
                        selectedLead.score
                      )}`}
                    >
                      {selectedLead.score}/100
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <div
                      className={`text-sm px-3 py-2 rounded ${getPriorityColor(
                        selectedLead.priority
                      )}`}
                    >
                      {selectedLead.priority.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm">{selectedLead.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm">{selectedLead.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Deal Value</Label>
                    <p className="text-lg font-bold text-green-600">
                      {selectedLead.value}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Source</Label>
                    <Badge variant="outline">{selectedLead.source}</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedLead.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedLead.notes}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="space-y-3">
                  {selectedLead.contactHistory.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {contact.type === "call" && (
                          <Phone className="h-4 w-4 text-blue-500" />
                        )}
                        {contact.type === "email" && (
                          <Mail className="h-4 w-4 text-green-500" />
                        )}
                        {contact.type === "meeting" && (
                          <Calendar className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {contact.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {contact.date}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {contact.notes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="company" className="space-y-4">
                {selectedLead.companyInfo && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Industry</Label>
                      <p className="text-sm">
                        {selectedLead.companyInfo.industry}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Company Size
                      </Label>
                      <p className="text-sm">{selectedLead.companyInfo.size}</p>
                    </div>
                    {selectedLead.companyInfo.website && (
                      <div>
                        <Label className="text-sm font-medium">Website</Label>
                        <p className="text-sm text-blue-600">
                          {selectedLead.companyInfo.website}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsDetailDialogOpen(false);
                if (selectedLead) handleConvertLead(selectedLead);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Convert to Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Lead Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
              Convert Lead to Client
            </DialogTitle>
            <DialogDescription>
              Complete the client information to convert this lead. All lead
              data will be transferred to the client profile.
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="grid gap-4 py-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Lead Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Name:</strong> {selectedLead.name}
                  </div>
                  <div>
                    <strong>Company:</strong> {selectedLead.company}
                  </div>
                  <div>
                    <strong>Value:</strong> {selectedLead.value}
                  </div>
                  <div>
                    <strong>Score:</strong> {selectedLead.score}/100
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input id="clientName" defaultValue={selectedLead.name} />
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input id="companyName" defaultValue={selectedLead.company} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={selectedLead.email}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" defaultValue={selectedLead.phone} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractValue">Contract Value *</Label>
                  <Input id="contractValue" defaultValue={selectedLead.value} />
                </div>
                <div>
                  <Label htmlFor="segment">Client Segment</Label>
                  <Select defaultValue="enterprise">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="smb">SMB</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="region">Region</Label>
                <Select defaultValue="uae">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uae">UAE</SelectItem>
                    <SelectItem value="saudi">Saudi Arabia</SelectItem>
                    <SelectItem value="qatar">Qatar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Client Notes</Label>
                <Textarea
                  id="notes"
                  defaultValue={`Converted from lead. Original notes: ${selectedLead.notes}`}
                  rows={3}
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center text-green-800">
                  <Award className="h-4 w-4 mr-2" />
                  <span className="font-medium">Conversion Benefits</span>
                </div>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>• Full client profile with complete contact history</li>
                  <li>• Access to advanced client management features</li>
                  <li>• Automated follow-up and renewal tracking</li>
                  <li>• Integration with billing and support systems</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConvertDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmConversion}
              className="bg-green-600 hover:bg-green-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Convert to Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
