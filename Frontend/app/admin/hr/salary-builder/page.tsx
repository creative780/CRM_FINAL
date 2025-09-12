"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import SalarySlipForm from "@/app/components/ui/SalarySlipForm";
import SalarySlipPreview from "../../../components/ui/SalarySlipPreview";
import EmployeeModal from "@/app/components/ui/EmployeeModal";
import { FaPhoneAlt } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { FaMoneyCheckAlt } from "react-icons/fa";

/* --- employees unchanged (your big object) --- */
const employees = {
  pakistan: [
    {
      id: 1,
      name: "Ahmed Ali",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
      email: "ahmed@company.com",
      phone: "+92-300-1234567",
      salary: 2500,
      status: "Active",
      designation: "Backend Developer",
    },
    {
      id: 2,
      name: "Sara Khan",
      image: "https://randomuser.me/api/portraits/women/65.jpg",
      email: "sara@company.com",
      phone: "+92-300-2345678",
      salary: 2800,
      status: "On Leave",
      designation: "UI/UX Designer",
    },
    {
      id: 3,
      name: "Bilal Raza",
      image: "https://randomuser.me/api/portraits/men/73.jpg",
      email: "bilal@company.com",
      phone: "+92-300-3456789",
      salary: 2600,
      status: "Active",
      designation: "QA Engineer",
    },
    {
      id: 4,
      name: "Fatima Usman",
      image: "https://randomuser.me/api/portraits/women/21.jpg",
      email: "fatima@company.com",
      phone: "+92-300-4567890",
      salary: 2900,
      status: "Active",
      designation: "Product Manager",
    },
    {
      id: 5,
      name: "Hamza Tariq",
      image: "https://randomuser.me/api/portraits/men/45.jpg",
      email: "hamza@company.com",
      phone: "+92-300-5678901",
      salary: 2400,
      status: "On Leave",
      designation: "Frontend Developer",
    },
    {
      id: 6,
      name: "Zainab Rehman",
      image: "https://randomuser.me/api/portraits/women/79.jpg",
      email: "zainab@company.com",
      phone: "+92-300-6789012",
      salary: 2700,
      status: "Active",
      designation: "Business Analyst",
    },
    {
      id: 7,
      name: "Usman Haider",
      image: "https://randomuser.me/api/portraits/men/88.jpg",
      email: "usman@company.com",
      phone: "+92-300-7890123",
      salary: 3000,
      status: "Active",
      designation: "Marketing Lead",
    },
    {
      id: 8,
      name: "Noor Fatima",
      image: "https://randomuser.me/api/portraits/women/24.jpg",
      email: "noor@company.com",
      phone: "+92-300-8901234",
      salary: 2550,
      status: "Active",
      designation: "HR Manager",
    },
    {
      id: 9,
      name: "Tariq Jamil",
      image: "https://randomuser.me/api/portraits/men/94.jpg",
      email: "tariq@company.com",
      phone: "+92-300-9012345",
      salary: 3100,
      status: "On Leave",
      designation: "Finance Officer",
    },
    {
      id: 10,
      name: "Hira Yousuf",
      image: "https://randomuser.me/api/portraits/women/52.jpg",
      email: "hira@company.com",
      phone: "+92-300-1122334",
      salary: 2650,
      status: "Active",
      designation: "Support Specialist",
    },
  ],
  dubai: [
    {
      id: 11,
      name: "Mohammed Zayed",
      image: "https://randomuser.me/api/portraits/men/55.jpg",
      email: "zayed@company.com",
      phone: "+971-55-0011011",
      salary: 4000,
      status: "Active",
      designation: "Regional Manager",
    },
    {
      id: 12,
      name: "Ayesha Noor",
      image: "https://randomuser.me/api/portraits/women/11.jpg",
      email: "ayesha@company.com",
      phone: "+971-55-1122022",
      salary: 3800,
      status: "Active",
      designation: "Operations Lead",
    },
    {
      id: 13,
      name: "Omar Farooq",
      image: "https://randomuser.me/api/portraits/men/27.jpg",
      email: "omar@company.com",
      phone: "+971-55-2233033",
      salary: 3600,
      status: "On Leave",
      designation: "Sales Executive",
    },
    {
      id: 14,
      name: "Layla Hasan",
      image: "https://randomuser.me/api/portraits/women/34.jpg",
      email: "layla@company.com",
      phone: "+971-55-3344044",
      salary: 3950,
      status: "Active",
      designation: "Design Lead",
    },
    {
      id: 15,
      name: "Yusuf Khan",
      image: "https://randomuser.me/api/portraits/men/61.jpg",
      email: "yusuf@company.com",
      phone: "+971-55-4455055",
      salary: 4100,
      status: "Active",
      designation: "DevOps Engineer",
    },
    {
      id: 16,
      name: "Hassan Saeed",
      image: "https://randomuser.me/api/portraits/men/19.jpg",
      email: "hassan@company.com",
      phone: "+971-55-5566066",
      salary: 3700,
      status: "On Leave",
      designation: "Legal Advisor",
    },
    {
      id: 17,
      name: "Nadia Karim",
      image: "https://randomuser.me/api/portraits/women/44.jpg",
      email: "nadia@company.com",
      phone: "+971-55-6677077",
      salary: 3600,
      status: "Active",
      designation: "Data Analyst",
    },
    {
      id: 18,
      name: "Imran Qureshi",
      image: "https://randomuser.me/api/portraits/men/29.jpg",
      email: "imran@company.com",
      phone: "+971-55-7788088",
      salary: 4300,
      status: "Active",
      designation: "Tech Lead",
    },
    {
      id: 19,
      name: "Maya Siddiqui",
      image: "https://randomuser.me/api/portraits/women/59.jpg",
      email: "maya@company.com",
      phone: "+971-55-8899099",
      salary: 3850,
      status: "On Leave",
      designation: "Research Manager",
    },
    {
      id: 20,
      name: "Ali Raza",
      image: "https://randomuser.me/api/portraits/men/17.jpg",
      email: "ali@company.com",
      phone: "+971-55-9900011",
      salary: 4000,
      status: "Active",
      designation: "Full Stack Developer",
    },
  ],
};

type Branch = "pakistan" | "dubai";

export default function SalaryBuilderPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Branch>("dubai");
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  // Shared state drives BOTH form & preview
  const [formData, setFormData] = useState({
    currency: "AED",
    basePay: 0,
    overtime: 0,
    advances: 0,
    deductions: 0,
    // new fields:
    employeeId: null as number | null,
    employeeName: "",
    designation: "",
    attendance: "Present",
    hoursWorked: 0,
    employeeEmail: "",
    employeePhone: "",
    employeeImage: "",
    branch: "Dubai",
  });

  const employeeOptions = employees[filter];

  const handleSelectEmployeeCard = (emp: any) => {
    setSelectedEmployee(emp);
    setFormData((prev) => ({
      ...prev,
      employeeId: emp.id,
      employeeName: emp.name,
      designation: emp.designation ?? "",
      employeeEmail: emp.email ?? "",
      employeePhone: emp.phone ?? "",
      employeeImage: emp.image ?? "",
      branch: filter === "dubai" ? "Dubai" : "Pakistan",
      currency: filter === "dubai" ? "AED" : "PKR",
      basePay: emp?.salary ?? prev.basePay,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-pink-100 px-6 py-10">
      <DashboardNavbar />
      <h1 className="text-4xl font-extrabold text-[#891F1A] mb-6">Salary Builder</h1>

      {/* Form (left) + Preview (right) */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* LEFT: Form */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 w-full">
            <h2 className="text-xl font-semibold text-[#891F1A] mb-4 text-center">
              Salary Details Form
            </h2>
            <p className="text-gray-600 text-sm mb-6 text-center">
              Enter the employee&apos;s monthly salary breakdown including overtime, advances, and deductions.
            </p>

            {/* Pass current-branch employees to the form */}
            <SalarySlipForm
              formData={formData}
              setFormData={setFormData}
              employeeOptions={employeeOptions}
              currency={filter === "dubai" ? "AED" : "PKR"}
              branchLabel={filter === "dubai" ? "Dubai" : "Pakistan"}
              totalMode="net"
            />
          </div>

          <p className="text-gray-600 text-sm text-center max-w-2xl mx-auto mt-4">
            Quickly generate customized salary slips per employee. Select a branch and click on an employee to begin.
          </p>
        </div>

        {/* RIGHT: Preview fills its half */}
        <div className="w-full lg:w-1/2">
          <div className="lg:sticky lg:top-4">
            <SalarySlipPreview formData={formData} />
          </div>
        </div>
      </div>

     {/* Filters & actions */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 my-10">
  <div className="flex-1" /> {/* pushes items to the right */}
  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center ml-auto">
    <select
      className="px-4 py-2 rounded-md border bg-white shadow-md text-gray-700"
      value={filter}
      onChange={(e) => setFilter(e.target.value as Branch)}
    >
      <option value="pakistan">🇵🇰 Pakistan Employees</option>
      <option value="dubai">🇦🇪 Dubai Employees</option>
    </select>

    <button
      onClick={() => router.push("/admin/hr/salary-builder/salary-table")}
      className="bg-[#891F1A] text-white font-medium py-2 px-4 rounded-md shadow hover:bg-[#6f1916] transition"
    >
      View Salary Table
    </button>
  </div>
</div>


      {/* Employee cards with reduced spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-4">
        {employeeOptions.map((emp) => (
          <div
            key={emp.id}
            className="relative bg-white/70 backdrop-blur-xl rounded-xl shadow-lg pt-20 pb-6 px-5 transform transition-transform duration-300 hover:scale-105 cursor-pointer group"
            onClick={() => handleSelectEmployeeCard(emp)}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <img
                src={emp.image}
                alt={emp.name}
                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
              />
            </div>

            <div className="absolute top-3 right-3 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              {emp.status}
            </div>

            <div className="text-center mt-8">
              <h3 className="text-lg font-bold text-gray-800">{emp.name}</h3>
              <p className="text-sm text-gray-500">
                {filter === "dubai" ? "Dubai Branch" : "Pakistan Branch"}
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
                {filter === "dubai" ? "AED" : "PKR"} {emp.salary}
              </p>
            </div>

            <div className="mt-6">
              <button className="w-full bg-[#891F1A] text-white py-2 rounded-lg font-semibold shadow hover:bg-[#701713] transition hover:scale-[1.02]">
                Generate Slip
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedEmployee && (
        <EmployeeModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}
    </div>
  );
}
