"use client";

import type React from "react";
import { useState, useMemo } from "react";
import {
  Search,
  Edit,
  UserPlus,
  History,
  Eye,
  EyeOff,
  CheckCircle2,
  Zap,
  Award,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/* ---------- Types ---------- */
type Client = {
  id: string;
  name: string;
  company: string;
  phone: string;
  businessType: "Enterprise" | "SMB" | "Startup";
  status: "Active" | "Inactive";
  zone: string;
  location: string;
  value: string; // includes $ and commas
  lastContact: string;
};

// Replace this with your full dataset
const mockClients = [
  {
    id: "1",
    name: "John Smith",
    company: "Acme Corporation",
    phone: "+971-555-0123",
    businessType: "Enterprise",
    status: "Active",
    zone: "Zone A",
    location: "Dubai, UAE",
    value: "$50,000",
    lastContact: "2024-01-15",
  },
  {
    id: "2",
    name: "Sara Khan",
    company: "Tech Solutions Ltd",
    phone: "+971-555-0456",
    businessType: "SMB",
    status: "Inactive",
    zone: "Zone B",
    location: "Riyadh, Saudi Arabia",
    value: "$25,000",
    lastContact: "2024-01-10",
  },
  {
    id: "3",
    name: "Ali Al-Mansoori",
    company: "Global Industries",
    phone: "+971-555-0789",
    businessType: "Enterprise",
    status: "Active",
    zone: "Zone C",
    location: "Abu Dhabi, UAE",
    value: "$100,000",
    lastContact: "2024-01-20",
  },
  {
    id: "4",
    name: "Fatima Noor",
    company: "StartupCo",
    phone: "+971-555-0321",
    businessType: "Startup",
    status: "Active",
    zone: "Zone D",
    location: "Doha, Qatar",
    value: "$10,000",
    lastContact: "2024-01-18",
  },
  {
    id: "5",
    name: "Mohammed Salim",
    company: "MegaCorp International",
    phone: "+971-555-0654",
    businessType: "Enterprise",
    status: "Active",
    zone: "Zone A",
    location: "Dubai, UAE",
    value: "$200,000",
    lastContact: "2024-01-22",
  },
  {
    id: "6",
    name: "Ayesha Rahman",
    company: "InnovaTech",
    phone: "+971-555-1111",
    businessType: "SMB",
    status: "Active",
    zone: "Zone E",
    location: "Kuwait City, Kuwait",
    value: "$30,000",
    lastContact: "2024-01-19",
  },
  {
    id: "7",
    name: "Yousef Hamdan",
    company: "NextGen Apps",
    phone: "+971-555-1222",
    businessType: "Startup",
    status: "Inactive",
    zone: "Zone F",
    location: "Sharjah, UAE",
    value: "$5,000",
    lastContact: "2023-12-29",
  },
  {
    id: "8",
    name: "Nadia Farooq",
    company: "Vertex Labs",
    phone: "+971-555-1333",
    businessType: "Enterprise",
    status: "Active",
    zone: "Zone G",
    location: "Manama, Bahrain",
    value: "$70,000",
    lastContact: "2024-01-05",
  },
  {
    id: "9",
    name: "Hassan Al-Farsi",
    company: "PixelEdge",
    phone: "+971-555-1444",
    businessType: "SMB",
    status: "Active",
    zone: "Zone H",
    location: "Muscat, Oman",
    value: "$12,000",
    lastContact: "2024-01-12",
  },
  {
    id: "10",
    name: "Leila Karim",
    company: "BlueWave Media",
    phone: "+971-555-1555",
    businessType: "SMB",
    status: "Active",
    zone: "Zone A",
    location: "Ajman, UAE",
    value: "$18,000",
    lastContact: "2024-01-17",
  },
  {
    id: "11",
    name: "Jennifer Rivas",
    company: "Washington-West",
    phone: "+971-555-4808",
    businessType: "SMB",
    status: "Inactive",
    zone: "Zone D",
    location: "Ajman, UAE",
    value: "$66,842",
    lastContact: "2025-06-20",
  },
  {
    id: "12",
    name: "Jerome Barnes",
    company: "Durham, Boyd and Hurst",
    phone: "+971-555-3312",
    businessType: "Startup",
    status: "Inactive",
    zone: "Zone A",
    location: "Muscat, Oman",
    value: "$174,832",
    lastContact: "2025-07-03",
  },
  {
    id: "13",
    name: "Jessica Mosley",
    company: "Nunez Inc",
    phone: "+971-555-8848",
    businessType: "SMB",
    status: "Inactive",
    zone: "Zone G",
    location: "Kuwait City, Kuwait",
    value: "$154,310",
    lastContact: "2024-09-10",
  },
  {
    id: "14",
    name: "Jesse Bridges",
    company: "Buckley-Wright",
    phone: "+971-555-8501",
    businessType: "SMB",
    status: "Active",
    zone: "Zone B",
    location: "Sharjah, UAE",
    value: "$17,329",
    lastContact: "2025-03-31",
  },
  {
    id: "15",
    name: "Mary Chung",
    company: "Silva, Grant and Gutierrez",
    phone: "+971-555-6436",
    businessType: "Enterprise",
    status: "Active",
    zone: "Zone A",
    location: "Dubai, UAE",
    value: "$15,938",
    lastContact: "2025-08-05",
  },
  {
    id: "16",
    name: "Joseph Medina",
    company: "Cardenas, Moody and Harris",
    phone: "+971-555-9678",
    businessType: "Startup",
    status: "Active",
    zone: "Zone B",
    location: "Riyadh, Saudi Arabia",
    value: "$36,005",
    lastContact: "2025-04-24",
  },
  {
    id: "17",
    name: "Elizabeth Valentine",
    company: "Green-Jacobs",
    phone: "+971-555-4137",
    businessType: "SMB",
    status: "Inactive",
    zone: "Zone E",
    location: "Abu Dhabi, UAE",
    value: "$166,382",
    lastContact: "2025-08-02",
  },
  {
    id: "18",
    name: "Micheal Franklin",
    company: "Thompson-Anderson",
    phone: "+971-555-8796",
    businessType: "Startup",
    status: "Inactive",
    zone: "Zone G",
    location: "Manama, Bahrain",
    value: "$70,444",
    lastContact: "2025-05-20",
  },
  {
    id: "19",
    name: "Janet Howell MD",
    company: "Davis, Evans and Hooper",
    phone: "+971-555-6201",
    businessType: "SMB",
    status: "Inactive",
    zone: "Zone G",
    location: "Manama, Bahrain",
    value: "$147,469",
    lastContact: "2025-07-07",
  },
  {
    id: "20",
    name: "James Evans",
    company: "Stephens-Cardenas",
    phone: "+971-555-9149",
    businessType: "Enterprise",
    status: "Inactive",
    zone: "Zone B",
    location: "Abu Dhabi, UAE",
    value: "$15,429",
    lastContact: "2025-02-23",
  },
  {
    id: "21",
    name: "Taylor Martinez",
    company: "Austin PLC",
    phone: "+971-555-8909",
    businessType: "Startup",
    status: "Inactive",
    zone: "Zone G",
    location: "Sharjah, UAE",
    value: "$147,651",
    lastContact: "2025-04-26",
  },
  {
    id: "22",
    name: "Christopher Browning",
    company: "Perez-Reed",
    phone: "+971-555-7585",
    businessType: "SMB",
    status: "Active",
    zone: "Zone F",
    location: "Manama, Bahrain",
    value: "$123,323",
    lastContact: "2025-05-25",
  },
  {
    id: "23",
    name: "Billy Stanley",
    company: "Goodman, Young and Avila",
    phone: "+971-555-9951",
    businessType: "SMB",
    status: "Active",
    zone: "Zone G",
    location: "Kuwait City, Kuwait",
    value: "$6,385",
    lastContact: "2025-05-07",
  },
  {
    id: "24",
    name: "Jose Kelley",
    company: "Villarreal, Brown and Rivera",
    phone: "+971-555-8575",
    businessType: "Enterprise",
    status: "Inactive",
    zone: "Zone A",
    location: "Muscat, Oman",
    value: "$89,384",
    lastContact: "2025-02-23",
  },
  {
    id: "25",
    name: "Monique Bowen",
    company: "Simpson, Espinoza and Brady",
    phone: "+971-555-6669",
    businessType: "SMB",
    status: "Inactive",
    zone: "Zone G",
    location: "Abu Dhabi, UAE",
    value: "$187,135",
    lastContact: "2025-07-14",
  },
  {
    id: "26",
    name: "Katherine Bell",
    company: "Vaughn-Mann",
    phone: "+971-555-2426",
    businessType: "SMB",
    status: "Active",
    zone: "Zone C",
    location: "Kuwait City, Kuwait",
    value: "$108,528",
    lastContact: "2024-11-15",
  },
  {
    id: "27",
    name: "Kathryn Lee",
    company: "Stone Inc",
    phone: "+971-555-5231",
    businessType: "SMB",
    status: "Active",
    zone: "Zone E",
    location: "Ajman, UAE",
    value: "$71,095",
    lastContact: "2024-10-11",
  },
  {
    id: "28",
    name: "Emily Hartman",
    company: "Scott Ltd",
    phone: "+971-555-3033",
    businessType: "Enterprise",
    status: "Active",
    zone: "Zone A",
    location: "Manama, Bahrain",
    value: "$167,346",
    lastContact: "2024-09-27",
  },
  {
    id: "29",
    name: "Gabrielle Wiley",
    company: "Farrell Ltd",
    phone: "+971-555-6122",
    businessType: "SMB",
    status: "Inactive",
    zone: "Zone C",
    location: "Sharjah, UAE",
    value: "$133,678",
    lastContact: "2024-10-30",
  },
  {
    id: "30",
    name: "Maria Bradley",
    company: "Wilcox-Collins",
    phone: "+971-555-7115",
    businessType: "SMB",
    status: "Active",
    zone: "Zone E",
    location: "Dubai, UAE",
    value: "$139,557",
    lastContact: "2024-09-10",
  },
] as Client[];

/* ---------- Utils ---------- */
function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length <= 6) return phone;
  return `${phone.substring(0, 8)}${"*".repeat(3)}${phone.substring(
    phone.length - 3
  )}`;
}

function useUser() {
  return {
    isAdmin: true,
    isSales: false,
  };
}

export default function ClientDirectory() {
  const { isAdmin, isSales } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [isUnmasked, setIsUnmasked] = useState(false);

  // NEW: modal state
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    return mockClients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSegment =
        segmentFilter === "all" ||
        client.businessType === (segmentFilter as Client["businessType"]);
      const matchesStatus =
        statusFilter === "all" ||
        client.status === (statusFilter as Client["status"]);
      const matchesZone = zoneFilter === "all" || client.zone === zoneFilter;

      return matchesSearch && matchesSegment && matchesStatus && matchesZone;
    });
  }, [searchTerm, segmentFilter, statusFilter, zoneFilter]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isSales) {
      e.preventDefault();
    }
  };

  // NEW: open/confirm handlers
  const openConvertModal = (client: Client) => {
    setSelectedRow(client);
    setIsConvertDialogOpen(true);
  };

  const confirmConversion = () => {
    if (!selectedRow) return;
    setIsConvertDialogOpen(false);
    // You can replace this with your real save call
    alert(
      `🎉 ${selectedRow.name} has been successfully converted to a client!`
    );
    setSelectedRow(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-[#891F1A]">Client Directory</h1>

        {/* Filter controls with consistent compact spacing */}
        <div className="flex flex-wrap gap-3">
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm bg-white">
              <SelectValue placeholder="All Zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              <SelectItem value="Zone A">Zone A</SelectItem>
              <SelectItem value="Zone B">Zone B</SelectItem>
              <SelectItem value="Zone C">Zone C</SelectItem>
              <SelectItem value="Zone D">Zone D</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm bg-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-[190px] h-9 text-sm bg-white">
              <SelectValue placeholder="All Business Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Business Types</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
              <SelectItem value="SMB">SMB</SelectItem>
              <SelectItem value="Startup">Startup</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 w-[250px] text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[calc(100vh-5rem)] overflow-auto px-0.5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#891F1A]">
                Clients ({filteredClients.length})
              </CardTitle>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => setIsUnmasked(!isUnmasked)}
                  className={`transition-colors duration-200 ${
                    isUnmasked
                      ? "bg-[#891F1A] text-white hover:bg-[#6d1916]"
                      : "border border-[#891F1A] text-[#891F1A] bg-white hover:bg-[#891F1A]/10"
                  }`}
                >
                  {isUnmasked ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Mask Data
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Unmask Data
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-0.5">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center rounded-tl-md">
                    Name
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                    Company
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                    Phone
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                    Type
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                    Status
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                    Zone
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                    Location
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                    Value
                  </TableHead>
                  <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center">
                    Last Contact
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="sticky top-0 z-20 bg-[#891F1A] text-white text-center rounded-tr-md">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} onContextMenu={handleContextMenu}>
                    <TableCell className="text-center">{client.name}</TableCell>
                    <TableCell className="text-center">
                      {client.company}
                    </TableCell>
                    <TableCell className="text-center">
                      {isAdmin && isUnmasked
                        ? client.phone
                        : maskPhone(client.phone)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{client.businessType}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`px-2 py-1 text-white text-xs font-medium rounded ${
                          client.status === "Active"
                            ? "bg-[#891F1A]"
                            : "bg-[#891F1A]/50"
                        }`}
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{client.zone}</TableCell>
                    <TableCell className="text-center">
                      {client.location}
                    </TableCell>
                    <TableCell className="text-center">
                      {client.value}
                    </TableCell>
                    <TableCell className="text-center">
                      {client.lastContact}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openConvertModal(client)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Convert
                          </Button>
                          <Button size="sm" variant="outline">
                            <History className="h-4 w-4 mr-1" />
                            History
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Convert to Client Modal (same layout as your Lead Funnel) ---------- */}
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

          {selectedRow && (
            <div className="grid gap-4 py-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Lead Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Name:</strong> {selectedRow.name}
                  </div>
                  <div>
                    <strong>Company:</strong> {selectedRow.company}
                  </div>
                  <div>
                    <strong>Value:</strong> {selectedRow.value}
                  </div>
                  <div>
                    <strong>Last Contact:</strong> {selectedRow.lastContact}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input id="clientName" defaultValue={selectedRow.name} />
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input id="companyName" defaultValue={selectedRow.company} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" defaultValue={selectedRow.phone} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractValue">Contract Value *</Label>
                  <Input id="contractValue" defaultValue={selectedRow.value} />
                </div>
                <div>
                  <Label htmlFor="segment">Client Segment</Label>
                  <Select defaultValue={selectedRow.businessType.toLowerCase()}>
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
                <Select
                  defaultValue={
                    selectedRow.location.toLowerCase().includes("uae")
                      ? "uae"
                      : selectedRow.location.toLowerCase().includes("saudi")
                      ? "saudi"
                      : selectedRow.location.toLowerCase().includes("qatar")
                      ? "qatar"
                      : "uae"
                  }
                >
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
                  defaultValue={`Converted from lead. Previous record: ${selectedRow.name} @ ${selectedRow.company}.`}
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
      {/* ---------- End Modal ---------- */}
    </div>
  );
}
