"use client";
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/Tabs";
import { Button } from "../../components/Button";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { Toaster, toast } from "react-hot-toast";
import Link from "next/link";

/* ────────────────────────────────────────────────────────────────────────────
   Stage components
--------------------------------------------------------------------------- */
import OrderIntakeForm from "../../components/order-stages/OrderIntakeForm";
import QuotationForm from "../../components/order-stages/QuotationForm";
import DesignProductionForm from "../../components/order-stages/DesignProductionForm";
import PrintingQAForm from "../../components/order-stages/PrintingQAForm";
import ClientApprovalForm from "../../components/order-stages/ClientApprovalForm";
import DeliveryProcessForm from "../../components/order-stages/DeliveryProcessForm";

/* ────────────────────────────────────────────────────────────────────────────
   RBAC (role still used for badge and table route, but NOT for tab visibility)
--------------------------------------------------------------------------- */
type Role = "admin" | "sales" | "designer" | "production" | "delivery" | "finance";
type StageKey =
  | "orderIntake"
  | "quotation"
  | "designProduction"
  | "printingQA"
  | "clientApproval"
  | "deliveryProcess";

function getUserRole(): Role {
  if (typeof window === "undefined") return "sales";
  const r = (localStorage.getItem("admin_role") || "sales").toLowerCase();
  const known: Role[] = ["admin", "sales", "designer", "production", "delivery", "finance"];
  return known.includes(r as Role) ? (r as Role) : "sales";
}

/* Role → table route */
const TABLE_ROUTES: Partial<Record<Role, string>> = {
  sales: "/admin/order-lifecycle/table",
  production: "/admin/order-lifecycle/table/production",
  designer: "/admin/order-lifecycle/table/designer",
};

/* ────────────────────────────────────────────────────────────────────────────
   Stage registry
--------------------------------------------------------------------------- */
const STAGE_REGISTRY: Record<
  StageKey,
  {
    label: string;
    requiredFields: string[];
    render: (args: {
      formData: any;
      setFormData: React.Dispatch<React.SetStateAction<any>>;
      handleMarkPrinted: () => Promise<void>;
      deliveryCode: string;
      generateCode: () => Promise<void>;
      riderPhoto: File | null;
      setRiderPhoto: React.Dispatch<React.SetStateAction<File | null>>;
      handleUpload: () => Promise<void>;
      canGenerate: boolean;
    }) => JSX.Element;
  }
> = {
  orderIntake: {
    label: "Order Intake",
    requiredFields: ["clientName", "specifications", "urgency"],
    render: ({ formData, setFormData }) => <OrderIntakeForm formData={formData} setFormData={setFormData} />,
  },
  quotation: {
    label: "Quotation & Pricing",
    requiredFields: ["labourCost", "finishingCost", "paperCost"],
    render: ({ formData, setFormData }) => <QuotationForm formData={formData} setFormData={setFormData} />,
  },
  designProduction: {
    label: "Design & Production",
    requiredFields: ["assignedDesigner", "requirementsFiles", "designStatus"],
    render: ({ formData, setFormData }) => <DesignProductionForm formData={formData} setFormData={setFormData} />,
  },
  printingQA: {
    label: "Printing & QA",
    requiredFields: ["printOperator", "printTime", "batchInfo", "printStatus", "qaChecklist"],
    render: ({ formData, setFormData, handleMarkPrinted }) => (
      <PrintingQAForm formData={formData} setFormData={setFormData} handleMarkPrinted={handleMarkPrinted} />
    ),
  },
  clientApproval: {
    label: "Client Approval",
    requiredFields: ["clientApprovalFiles"],
    render: ({ formData, setFormData }) => <ClientApprovalForm formData={formData} setFormData={setFormData} />,
  },
  deliveryProcess: {
    label: "Delivery Process",
    requiredFields: ["phone", "deliveryCode", "deliveryStatus"],
    render: ({ formData, setFormData, deliveryCode, generateCode, riderPhoto, setRiderPhoto, handleUpload, canGenerate }) => (
      <DeliveryProcessForm
        formData={formData}
        setFormData={setFormData}
        deliveryCode={deliveryCode}
        generateCode={generateCode}
        riderPhoto={riderPhoto}
        setRiderPhoto={setRiderPhoto}
        handleUpload={handleUpload}
        canGenerate={canGenerate}
      />
    ),
  },
};

/* ────────────────────────────────────────────────────────────────────────────
   Component
--------------------------------------------------------------------------- */
export default function OrderLifecyclePage() {
  const role = getUserRole();

  // ⬇⬇⬇ All roles see ALL stages (no role-based filtering)
  const visibleStageKeys: StageKey[] = useMemo(() => {
    const ORDER: StageKey[] = [
      "orderIntake",
      "quotation",
      "designProduction",
      "printingQA",
      "clientApproval",
      "deliveryProcess",
    ];
    return ORDER;
  }, []);

  const stages = useMemo(() => visibleStageKeys.map((k) => STAGE_REGISTRY[k].label), [visibleStageKeys]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [riderPhoto, setRiderPhoto] = useState<File | null>(null);

  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(visibleStageKeys.length - 1, 0)));
  }, [visibleStageKeys]);

  const [formData, setFormData] = useState<any>({
    clientName: "",
    productType: "",
    specifications: "",
    urgency: "",
    status: "New",
    rawMaterialCost: 0,
    labourCost: 0,
    finishingCost: 0,
    paperCost: 0,
    inkCost: 0,
    machineCost: 0,
    designCost: 0,
    packagingCost: 0,
    requirementsFiles: [],
    sku: "",
    qty: 0,
    phone: "",
    deliveryCode: "",
    deliveryStatus: "Dispatched",
  });

  const generateCode = async (): Promise<void> => {
    if (!formData._orderId) {
      toast.error("Please save the order first");
      return;
    }
    if (!formData.phone) {
      toast.error("Phone number required");
      return;
    }
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const resp = await fetch(`${apiBase}/api/delivery/send-code`, {
        method: "POST",
        body: JSON.stringify({ orderId: formData._orderId, phone: formData.phone }),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) throw new Error(`Send code failed (${resp.status})`);
      const data = await resp.json();
      setDeliveryCode(data.code);
      setFormData((p: any) => ({ ...p, deliveryCode: data.code }));
    } catch (e) {
      toast.error("Failed to generate code");
      if (process.env.NODE_ENV !== "production") {
        console.error(e);
      }
    }
  };

  const handleUpload = async () => {
    if (!formData._orderId) {
      toast.error("Please save the order first");
      return;
    }
    if (!riderPhoto) {
      toast.error("No photo selected");
      return;
    }
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const form = new FormData();
      form.append("photo", riderPhoto);
      form.append("orderId", formData._orderId);
      const resp = await fetch(`${apiBase}/api/delivery/rider-photo`, {
        method: "POST",
        body: form,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
      const data = await resp.json();
      setFormData((p: any) => ({ ...p, riderPhotoPath: data.url }));
    } catch (e) {
      toast.error("Photo upload failed");
      if (process.env.NODE_ENV !== "production") {
        console.error(e);
      }
    }
  };

  const handleMarkPrinted = async () => {
    if (!formData._orderId) {
      toast.error("Please save the order first");
      return;
    }
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const resp = await fetch(
        `${apiBase}/api/orders/${formData._orderId}/actions/mark-printed`,
        {
          method: "POST",
          body: JSON.stringify({ sku: formData.sku, qty: formData.qty }),
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!resp.ok) throw new Error(`Mark printed failed (${resp.status})`);
    } catch (e) {
      toast.error("Failed to mark printed");
      if (process.env.NODE_ENV !== "production") {
        console.error(e);
      }
    }
  };

  const handleSaveOrder = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: any = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      if (!formData._orderId) {
        // Create order
        const resp = await fetch(`${apiBase}/api/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            clientName: formData.clientName,
            productType: formData.productType,
            specs: formData.specifications,
            urgency: formData.urgency,
          }),
        });
        if (!resp.ok) throw new Error(`Create failed (${resp.status})`);
        const created = await resp.json();
        setFormData((p: any) => ({ ...p, _orderId: created.id }));
      } else {
        // Update current stage payload
        const stageKey = visibleStageKeys[currentIndex];
        let stage = "" as any; let payload: any = {};
        if (stageKey === "quotation") { stage = "quotation"; payload = { labour_cost: formData.labourCost, finishing_cost: formData.finishingCost, paper_cost: formData.paperCost, design_cost: formData.designCost }; }
        if (stageKey === "designProduction") { stage = "design"; payload = { assigned_designer: formData.assignedDesigner, requirements_files: formData.requirementsFiles, design_status: formData.designStatus }; }
        if (stageKey === "printingQA") { stage = "printing"; payload = { print_operator: formData.printOperator, print_time: formData.printTime, batch_info: formData.batchInfo, print_status: formData.printStatus, qa_checklist: formData.qaChecklist }; }
        if (stageKey === "clientApproval") { stage = "approval"; payload = { client_approval_files: formData.clientApprovalFiles, approved_at: formData.approvedAt }; }
        if (stageKey === "deliveryProcess") { stage = "delivery"; payload = { delivery_code: formData.deliveryCode, delivery_status: formData.deliveryStatus, delivered_at: formData.deliveredAt, rider_photo_path: formData.riderPhotoPath }; }
        if (stage) {
          const resp = await fetch(`${apiBase}/api/orders/${formData._orderId}`, { method: "PATCH", headers, body: JSON.stringify({ stage, payload }) });
          if (!resp.ok) throw new Error(`Update failed (${resp.status})`);
        }
      }
      toast.success("Order saved successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const validateCurrentStage = () => {
    const stageKey = visibleStageKeys[currentIndex];
    if (!stageKey) return true;
    const required = STAGE_REGISTRY[stageKey].requiredFields || [];
    const missing: string[] = [];
    for (let field of required) {
      const value = formData[field];
      const isMissing =
        value === "" || value === null || value === undefined || (typeof value === "number" && isNaN(value));
      if (isMissing) missing.push(field);
    }
    if (missing.length > 0) {
      toast.error(`Please fill: ${missing.join(", ")}`);
      return false;
    }
    return true;
  };

  const currentStageKey = visibleStageKeys[currentIndex];
  const currentTabValue = stages[currentIndex];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen text-black">
      <Toaster position="top-center" />
      <DashboardNavbar />

      {/* Header */}
      <div className="flex flex-col gap-4 mt-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-[#891F1A]">Order Lifecycle Management</h1>

        <div className="flex items-center gap-3">
          <span className="text-sm rounded-full px-3 py-1 bg-neutral-100 border">
            Role: <strong className="ml-1 capitalize">{role}</strong>
          </span>

          {/* View Table (role-aware) */}
          {TABLE_ROUTES[role] && (
            <Link
              href={TABLE_ROUTES[role]!}
              className="bg-white text-[#891F1A] border border-[#891F1A]/30 hover:bg-[#891F1A] hover:text-white transition px-4 py-2 rounded"
            >
              View Table
            </Link>
          )}

          <Link
            href="/admin/orders/all"
            className="bg-[#891F1A] text-white px-5 py-2 rounded hover:bg-red-800 transition"
          >
            View All Orders
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex justify-between items-center relative mt-4">
        {stages.map((stage, i) => {
          const isCompleted = i <= currentIndex;
          return (
            <div key={stage} className="flex-1 text-center relative z-10 text-black">
              <div
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => {
                  if (i < currentIndex) {
                    setCurrentIndex(i);
                  } else if (i === currentIndex) {
                    // noop
                  } else if (validateCurrentStage()) {
                    setCurrentIndex(i);
                  }
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 transition-colors duration-300 group-hover:scale-110 ${
                    isCompleted ? "bg-[#891F1A]" : "bg-white border-gray-300"
                  }`}
                />
                <p className="text-xs mt-1 text-black">{stage}</p>
              </div>
              {i < stages.length - 1 && (
                <div className="absolute top-2 left-1/2 w-full flex justify-center z-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-12 h-12 -mt-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke={i < currentIndex ? "maroon" : "#d1d5db"}
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h14m0 0l-4-4m4 4l-4 4" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={currentTabValue}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-black">
          {stages.map((stageLabel, idx) => (
            <TabsTrigger
              key={stageLabel}
              value={stageLabel}
              onClick={() => {
                if (idx < currentIndex) setCurrentIndex(idx);
                else if (idx === currentIndex) {
                  // noop
                } else if (validateCurrentStage()) {
                  setCurrentIndex(idx);
                }
              }}
              className={`transition ${currentIndex === idx ? "bg-black text-white" : ""}`}
            >
              {stageLabel}
            </TabsTrigger>
          ))}
        </TabsList>

        {stages.map((stageLabel, idx) => (
          <TabsContent key={stageLabel} value={stageLabel}>
            {currentIndex === idx && currentStageKey && (
              <>
                {STAGE_REGISTRY[currentStageKey].render({
                  formData,
                  setFormData,
                  handleMarkPrinted,
                  deliveryCode,
                  generateCode,
                  riderPhoto,
                  setRiderPhoto,
                  handleUpload,
                  canGenerate: !!formData._orderId,
                })}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-6 max-w-md mx-auto gap-4">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border border-gray-300 text-black transition-all duration-200 hover:bg-red-900 hover:text-white"
                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                  >
                    ← Back
                  </Button>

                  {currentIndex < stages.length - 1 ? (
                    <Button
                      className="w-full flex items-center justify-center gap-2 bg-[#891F1A] text-white hover:bg-red-800 transition-all duration-200"
                      onClick={() => {
                        if (validateCurrentStage()) setCurrentIndex((prev) => prev + 1);
                      }}
                    >
                      Next →
                    </Button>
                  ) : (
                    <Button
                      className="w-full flex items-center justify-center gap-2 bg-[#891F1A] text-white hover:bg-red-900 transition-all duration-200"
                      onClick={handleSaveOrder}
                    >
                      ✅ Save Order
                    </Button>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
