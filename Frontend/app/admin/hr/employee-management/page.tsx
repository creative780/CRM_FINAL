"use client";

import { useState, useEffect } from "react";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import EmployeeModal from "@/app/components/ui/EmployeeModal";
import { FaPhoneAlt, FaPlus } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { FaMoneyCheckAlt } from "react-icons/fa";
import { toast, Toaster } from "react-hot-toast";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Branch = "dubai" | "pakistan";

interface Employee {
  id: number;
  name: string;
  image: string;
  email: string;
  phone: string;
  salary: number;
  status: "Active" | "On Leave";
  designation: string;
  role: "admin" | "sales" | "designer" | "production";
  branch: Branch;
}

/* --- employees data (same as salary-builder) --- */
const employees = {
  pakistan: [
    {
      id: 1,
      name: "Ahmed Ali",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
      email: "ahmed@company.com",
      phone: "+92-300-1234567",
      salary: 2500,
      status: "Active" as "Active" | "On Leave",
      designation: "Backend Developer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 2,
      name: "Sara Khan",
      image: "https://randomuser.me/api/portraits/women/65.jpg",
      email: "sara@company.com",
      phone: "+92-300-2345678",
      salary: 2800,
      status: "On Leave" as "Active" | "On Leave",
      designation: "UI/UX Designer",
      role: "designer" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 3,
      name: "Bilal Raza",
      image: "https://randomuser.me/api/portraits/men/73.jpg",
      email: "bilal@company.com",
      phone: "+92-300-3456789",
      salary: 2600,
      status: "Active" as "Active" | "On Leave",
      designation: "QA Engineer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 4,
      name: "Fatima Usman",
      image: "https://randomuser.me/api/portraits/women/21.jpg",
      email: "fatima@company.com",
      phone: "+92-300-4567890",
      salary: 2900,
      status: "Active" as "Active" | "On Leave",
      designation: "Product Manager",
      role: "admin" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 5,
      name: "Hamza Tariq",
      image: "https://randomuser.me/api/portraits/men/45.jpg",
      email: "hamza@company.com",
      phone: "+92-300-5678901",
      salary: 2400,
      status: "On Leave" as "Active" | "On Leave",
      designation: "Frontend Developer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 6,
      name: "Zainab Rehman",
      image: "https://randomuser.me/api/portraits/women/44.jpg",
      email: "zainab@company.com",
      phone: "+92-300-6789012",
      salary: 2700,
      status: "Active" as "Active" | "On Leave",
      designation: "DevOps Engineer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 7,
      name: "Omar Sheikh",
      image: "https://randomuser.me/api/portraits/men/22.jpg",
      email: "omar@company.com",
      phone: "+92-300-7890123",
      salary: 2300,
      status: "Active" as "Active" | "On Leave",
      designation: "Junior Developer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 8,
      name: "Aisha Malik",
      image: "https://randomuser.me/api/portraits/women/33.jpg",
      email: "aisha@company.com",
      phone: "+92-300-8901234",
      salary: 3000,
      status: "Active" as "Active" | "On Leave",
      designation: "Senior Designer",
      role: "designer" as "admin" | "sales" | "designer" | "production",
    },
  ],
  dubai: [
    {
      id: 9,
      name: "Mohammed Al-Rashid",
      image: "https://randomuser.me/api/portraits/men/1.jpg",
      email: "mohammed@company.com",
      phone: "+971-50-1234567",
      salary: 8000,
      status: "Active" as "Active" | "On Leave",
      designation: "Senior Developer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 10,
      name: "Fatima Al-Zahra",
      image: "https://randomuser.me/api/portraits/women/2.jpg",
      email: "fatima@company.com",
      phone: "+971-50-2345678",
      salary: 7500,
      status: "Active" as "Active" | "On Leave",
      designation: "Project Manager",
      role: "admin" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 11,
      name: "Ahmed Hassan",
      image: "https://randomuser.me/api/portraits/men/3.jpg",
      email: "ahmed.hassan@company.com",
      phone: "+971-50-3456789",
      salary: 7200,
      status: "On Leave" as "Active" | "On Leave",
      designation: "Frontend Developer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 12,
      name: "Aisha Al-Mansouri",
      image: "https://randomuser.me/api/portraits/women/4.jpg",
      email: "aisha.mansouri@company.com",
      phone: "+971-50-4567890",
      salary: 6800,
      status: "Active" as "Active" | "On Leave",
      designation: "UI/UX Designer",
      role: "designer" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 13,
      name: "Omar Al-Sheikh",
      image: "https://randomuser.me/api/portraits/men/5.jpg",
      email: "omar.sheikh@company.com",
      phone: "+971-50-5678901",
      salary: 6500,
      status: "Active" as "Active" | "On Leave",
      designation: "Backend Developer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 14,
      name: "Layla Al-Ahmad",
      image: "https://randomuser.me/api/portraits/women/6.jpg",
      email: "layla@company.com",
      phone: "+971-50-6789012",
      salary: 7000,
      status: "Active" as "Active" | "On Leave",
      designation: "QA Engineer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 15,
      name: "Khalid Al-Mahmoud",
      image: "https://randomuser.me/api/portraits/men/7.jpg",
      email: "khalid@company.com",
      phone: "+971-50-7890123",
      salary: 6200,
      status: "On Leave" as "Active" | "On Leave",
      designation: "DevOps Engineer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 16,
      name: "Mariam Al-Khalil",
      image: "https://randomuser.me/api/portraits/women/8.jpg",
      email: "mariam@company.com",
      phone: "+971-50-8901234",
      salary: 7800,
      status: "Active" as "Active" | "On Leave",
      designation: "Senior Designer",
      role: "designer" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 17,
      name: "Youssef Al-Nasser",
      image: "https://randomuser.me/api/portraits/men/9.jpg",
      email: "youssef@company.com",
      phone: "+971-50-9012345",
      salary: 6000,
      status: "Active" as "Active" | "On Leave",
      designation: "Junior Developer",
      role: "production" as "admin" | "sales" | "designer" | "production",
    },
    {
      id: 18,
      name: "Nour Al-Sabah",
      image: "https://randomuser.me/api/portraits/women/10.jpg",
      email: "nour@company.com",
      phone: "+971-50-0123456",
      salary: 7300,
      status: "Active" as "Active" | "On Leave",
      designation: "Product Manager",
      role: "sales" as "admin" | "sales" | "designer" | "production",
    },
  ],
};

export default function EmployeeManagementPage() {
  const [filter, setFilter] = useState<Branch>("dubai");
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Form state for new employee
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    salary: "",
    status: "Active" as "Active" | "On Leave",
    designation: "",
    role: "sales" as "admin" | "sales" | "designer" | "production",
    branch: "dubai" as Branch,
    image: "https://randomuser.me/api/portraits/men/1.jpg", // Default image
  });

  // Load employees from localStorage on component mount
  useEffect(() => {
    const savedEmployees = localStorage.getItem("employees");
    if (savedEmployees) {
      const parsedEmployees = JSON.parse(savedEmployees);
      setAllEmployees(parsedEmployees);
    } else {
      // Initialize with default employees if no saved data
      const defaultEmployees = [
        ...employees.pakistan.map((emp) => ({
          ...emp,
          branch: "pakistan" as Branch,
        })),
        ...employees.dubai.map((emp) => ({
          ...emp,
          branch: "dubai" as Branch,
        })),
      ];
      setAllEmployees(defaultEmployees);
      localStorage.setItem("employees", JSON.stringify(defaultEmployees));
    }
  }, []);

  // Filter employees based on selected branch
  const employeeOptions = allEmployees.filter((emp) => emp.branch === filter);

  // Handle adding new employee
  const handleAddEmployee = () => {
    if (
      !newEmployee.name ||
      !newEmployee.email ||
      !newEmployee.phone ||
      !newEmployee.salary ||
      !newEmployee.designation ||
      !newEmployee.role
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newEmp: Employee = {
      id: Date.now(), // Simple ID generation
      name: newEmployee.name,
      email: newEmployee.email,
      phone: newEmployee.phone,
      salary: parseInt(newEmployee.salary),
      status: newEmployee.status,
      designation: newEmployee.designation,
      role: newEmployee.role,
      branch: newEmployee.branch,
      image: newEmployee.image,
    };

    const updatedEmployees = [...allEmployees, newEmp];
    setAllEmployees(updatedEmployees);
    localStorage.setItem("employees", JSON.stringify(updatedEmployees));

    toast.success(`Employee ${newEmp.name} added successfully!`);

    // Reset form
    setNewEmployee({
      name: "",
      email: "",
      phone: "",
      salary: "",
      status: "Active" as "Active" | "On Leave",
      designation: "",
      role: "sales",
      branch: "dubai",
      image: "https://randomuser.me/api/portraits/men/1.jpg",
    });

    setIsAddEmployeeOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
        <DashboardNavbar />
        <br />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#891F1A]">
              Employee Management
            </h1>
            <p className="text-gray-600">
              Manage and view all employees across branches
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Add Employee Button */}
            <Button
              onClick={() => setIsAddEmployeeOpen(true)}
              className="bg-[#891F1A] hover:bg-[#6c1714] text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaPlus className="w-4 h-4" />
              Add Employee
            </Button>

            {/* Branch Filter */}
            <div className="bg-white/70 backdrop-blur-xl rounded-xl shadow-lg p-2">
              <button
                onClick={() => setFilter("dubai")}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  filter === "dubai"
                    ? "bg-[#891F1A] text-white shadow-md"
                    : "text-gray-600 hover:text-[#891F1A]"
                }`}
              >
                Dubai Branch
              </button>
              <button
                onClick={() => setFilter("pakistan")}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  filter === "pakistan"
                    ? "bg-green-500 text-white shadow-md"
                    : "text-gray-600 hover:text-green-500"
                }`}
              >
                Pakistan Branch
              </button>
            </div>
          </div>
        </div>

        {/* Employee cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {employeeOptions.map((emp) => (
            <div
              key={emp.id}
              className="relative bg-white/70 backdrop-blur-xl rounded-xl shadow-lg pt-20 pb-6 px-5 transform transition-transform duration-300 hover:scale-105 cursor-pointer group"
              onClick={() => setSelectedEmployee(emp)}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <img
                  src={emp.image}
                  alt={emp.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
                />
              </div>

              <div
                className={`absolute top-3 right-3 text-xs px-3 py-1 rounded-full font-medium ${
                  emp.status === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {emp.status}
              </div>

              <div className="text-center mt-8">
                <h3 className="text-lg font-bold text-gray-800">{emp.name}</h3>
                <p className="text-sm text-gray-500">
                  {emp.branch === "dubai" ? "Dubai Branch" : "Pakistan Branch"}
                </p>
              </div>

              <div className="mt-4 text-sm text-gray-600 space-y-1">
                <p className="flex items-center gap-2">
                  <MdEmail className="text-gray-700" /> Email: {emp.email}
                </p>
                <p className="flex items-center gap-2">
                  <FaPhoneAlt className="text-gray-700 text-xs" /> {emp.phone}
                </p>
                <p className="flex items-center gap-2">
                  <FaMoneyCheckAlt className="text-gray-700" /> Salary:{" "}
                  {emp.branch === "dubai" ? "AED" : "PKR"} {emp.salary}
                </p>
              </div>

              <div className="mt-6">
                <div className="text-center space-y-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {emp.designation}
                  </span>
                  <div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        (emp.role || "sales") === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : (emp.role || "sales") === "sales"
                          ? "bg-blue-100 text-blue-700"
                          : (emp.role || "sales") === "designer"
                          ? "bg-pink-100 text-pink-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {(emp.role || "sales").charAt(0).toUpperCase() +
                        (emp.role || "sales").slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Employee Modal */}
        {selectedEmployee && (
          <EmployeeModal
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
          />
        )}

        {/* Add Employee Dialog */}
        <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="text-center pb-6">
              <DialogTitle className="text-2xl font-bold text-[#891F1A]">
                Add New Employee
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                Fill in the details to add a new employee to the system
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Profile Image Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#891F1A] rounded-full"></div>
                  Profile Image
                </h3>
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <img
                        src={newEmployee.image}
                        alt="Profile Preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://randomuser.me/api/portraits/men/1.jpg";
                        }}
                      />
                    </div>
                    <div className="space-y-2 w-full max-w-xs">
                      <Label
                        htmlFor="image-upload"
                        className="text-sm font-medium text-gray-700"
                      >
                        Upload Profile Image
                      </Label>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setNewEmployee({
                                ...newEmployee,
                                image: event.target?.result as string,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          document.getElementById("image-upload")?.click()
                        }
                        className="w-full h-11 border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        Choose Image
                      </Button>
                    </div>
                  </div>

                  {/* Fields to the right */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium text-gray-700"
                      >
                        Full Name *
                      </Label>
                      <Input
                        id="name"
                        value={newEmployee.name}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter full name"
                        className="h-11 border-gray-300 focus:border-[#891F1A] focus:ring-[#891F1A] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-gray-700"
                      >
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={newEmployee.email}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            email: e.target.value,
                          })
                        }
                        placeholder="Enter email address"
                        className="h-11 border-gray-300 focus:border-[#891F1A] focus:ring-[#891F1A] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium text-gray-700"
                      >
                        Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        value={newEmployee.phone}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            phone: e.target.value,
                          })
                        }
                        placeholder="Enter phone number"
                        className="h-11 border-gray-300 focus:border-[#891F1A] focus:ring-[#891F1A] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="salary"
                        className="text-sm font-medium text-gray-700"
                      >
                        Salary *
                      </Label>
                      <Input
                        id="salary"
                        type="number"
                        value={newEmployee.salary}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            salary: e.target.value,
                          })
                        }
                        placeholder="Enter salary amount"
                        className="h-11 border-gray-300 focus:border-[#891F1A] focus:ring-[#891F1A] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="status"
                        className="text-sm font-medium text-gray-700"
                      >
                        Employment Status
                      </Label>
                      <Select
                        value={newEmployee.status}
                        onValueChange={(value: "Active" | "On Leave") =>
                          setNewEmployee({ ...newEmployee, status: value })
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-300 focus:border-[#891F1A] focus:ring-[#891F1A] transition-colors">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="Active"
                            className="hover:bg-[#891F1A]/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="On Leave"
                            className="hover:bg-[#891F1A]/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              On Leave
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="branch"
                        className="text-sm font-medium text-gray-700"
                      >
                        Branch Location
                      </Label>
                      <Select
                        value={newEmployee.branch}
                        onValueChange={(value: Branch) =>
                          setNewEmployee({ ...newEmployee, branch: value })
                        }
                      >
                        <SelectTrigger className="h-11 border-gray-300 focus:border-[#891F1A] focus:ring-[#891F1A] transition-colors">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="dubai"
                            className="hover:bg-[#891F1A]/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              Dubai Branch
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="pakistan"
                            className="hover:bg-[#891F1A]/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Pakistan Branch
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="designation"
                        className="text-sm font-medium text-gray-700"
                      >
                        Designation *
                      </Label>
                      <Input
                        id="designation"
                        value={newEmployee.designation}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            designation: e.target.value,
                          })
                        }
                        placeholder="Enter job designation"
                        className="h-11 border-gray-300 focus:border-[#891F1A] focus:ring-[#891F1A] transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="role"
                        className="text-sm font-medium text-gray-700"
                      >
                        Role *
                      </Label>
                      <Select
                        value={newEmployee.role}
                        onValueChange={(
                          value: "admin" | "sales" | "designer" | "production"
                        ) => setNewEmployee({ ...newEmployee, role: value })}
                      >
                        <SelectTrigger className="h-11 border-gray-300 focus:border-[#891F1A] focus:ring-[#891F1A] transition-colors">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="admin"
                            className="hover:bg-[#891F1A]/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="sales"
                            className="hover:bg-[#891F1A]/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              Sales
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="designer"
                            className="hover:bg-[#891F1A]/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                              Designer
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="production"
                            className="hover:bg-[#891F1A]/10"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Production
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-gray-200">
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="flex-1 h-11 border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEmployee}
                  className="flex-1 h-11 bg-[#891F1A] hover:bg-[#6c1714] text-white transition-colors font-medium"
                >
                  <FaPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Toaster position="top-center" />
      </div>
    </div>
  );
}
