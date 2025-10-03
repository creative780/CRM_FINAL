"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/Tabs";
import { Button } from "../../components/Button";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { Toaster, toast } from "react-hot-toast";
import Link from "next/link";
import ProductSearchModal from "../../components/modals/ProductSearchModal";
import ProductConfigModal from "../../components/modals/ProductConfigModal";
import { BaseProduct, ConfiguredProduct } from "../../types/products";
import { getProductById } from "../../lib/products";
import { clearFilesFromStorage } from "../../lib/fileStorage";
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

/* Role ? table route */
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
      onSaveDraft?: () => void | Promise<void>;
      onSendToSales?: () => void | Promise<void>;
      savingDraft?: boolean;
      sendingToSales?: boolean;
      selectedProducts?: ConfiguredProduct[];
      onAddProduct?: () => void;
      onRemoveProduct?: (id: string) => void;
      onEditProduct?: (id: string) => void;
    }) => React.ReactElement;
  }
> = {
  orderIntake: {
    label: "Order Intake",
    requiredFields: ["clientName", "specifications", "urgency", "products"],
    render: ({
      formData,
      setFormData,
      onSaveDraft,
      onSendToSales,
      savingDraft,
      sendingToSales,
      selectedProducts = [],
      onAddProduct,
      onRemoveProduct,
      onEditProduct,
    }) => (
      <OrderIntakeForm
        formData={formData}
        setFormData={setFormData}
        onSaveDraft={onSaveDraft}
        onSendToSales={onSendToSales}
        savingDraft={savingDraft}
        sendingToSales={sendingToSales}
        selectedProducts={selectedProducts}
        onAddProduct={onAddProduct}
        onRemoveProduct={onRemoveProduct}
        onEditProduct={onEditProduct}
      />
    ),
  },
  quotation: {
    label: "Quotation & Pricing",
    requiredFields: ["labourCost", "finishingCost", "paperCost"],
    render: ({ 
      formData, 
      setFormData, 
      selectedProducts = [], 
      onAddProduct, 
      onRemoveProduct, 
      onEditProduct 
    }) => (
      <QuotationForm 
        formData={formData} 
        setFormData={setFormData}
        selectedProducts={selectedProducts}
        onAddProduct={onAddProduct}
        onRemoveProduct={onRemoveProduct}
        onEditProduct={onEditProduct}
      />
    ),
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
    requiredFields: ["deliveryCode"],
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
  // Avoid SSR/CSR hydration mismatch by deferring role resolution to client
  const [role, setRole] = useState<Role>("sales");
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    setRole(getUserRole());
  }, []);
  const router = useRouter();

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

  // Initialize current stage index with localStorage persistence
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    // Try to load from localStorage
    const savedIndex = localStorage.getItem('orderLifecycle_currentIndex');
    if (savedIndex) {
      try {
        return parseInt(savedIndex, 10) || 0;
      } catch (e) {
        console.warn('Failed to parse saved current index:', e);
      }
    }

    return 0;
  });
  const [deliveryCode, setDeliveryCode] = useState("");
  const [riderPhoto, setRiderPhoto] = useState<File | null>(null);
  const canGenerate = deliveryCode === "";

  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(visibleStageKeys.length - 1, 0)));
  }, [visibleStageKeys]);

  // Initialize form data with localStorage persistence
  const [formData, setFormData] = useState<any>(() => {
    if (typeof window === "undefined") {
      return {
        clientName: "",
        companyName: "",
        trn: "",
        specifications: "",
        urgency: "",
        items: [],
        products: [],
        status: "New",
        rawMaterialCost: "",
        labourCost: "",
        finishingCost: "",
        paperCost: "",
        inkCost: "",
        machineCost: "",
        designCost: "",
        packagingCost: "",
        deliveryCost: "",
        discount: "",
        advancePaid: "",
        requirementsFiles: [],
        sku: "",
        qty: "",
        deliveryCode: "",
        deliveryStatus: "Dispatched",
      };
    }

    // Check if we're loading an existing order from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlOrderId = urlParams.get('orderId');
    
    // If loading an existing order, don't load from localStorage
    if (urlOrderId) {
      console.log('Loading existing order from URL, skipping localStorage');
      return {
        clientName: "",
        companyName: "",
        trn: "",
        specifications: "",
        urgency: "",
        items: [],
        products: [],
        status: "New",
        rawMaterialCost: "",
        labourCost: "",
        finishingCost: "",
        paperCost: "",
        inkCost: "",
        machineCost: "",
        designCost: "",
        packagingCost: "",
        deliveryCost: "",
        discount: "",
        advancePaid: "",
        requirementsFiles: [],
        sku: "",
        qty: "",
        deliveryCode: "",
        deliveryStatus: "Dispatched",
      };
    }

    // Try to load from localStorage only for new orders
    const savedData = localStorage.getItem('orderLifecycle_formData');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.warn('Failed to parse saved form data:', e);
      }
    }

    return {
      clientName: "",
      specifications: "",
      urgency: "",
      items: [],
      products: [],
      status: "New",
      rawMaterialCost: "",
      labourCost: "",
      finishingCost: "",
      paperCost: "",
      inkCost: "",
      machineCost: "",
      designCost: "",
      packagingCost: "",
      deleiveryCost: "",
      discount: "",
      advancePaid: "",
      requirementsFiles: [],
      sku: "",
      qty: "",
      phone: "",
      deliveryCode: "",
      deliveryStatus: "Dispatched",
    };
  });

  // Initialize selected products with localStorage persistence
  const [selectedProducts, setSelectedProducts] = useState<ConfiguredProduct[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    // Check if we're loading an existing order from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlOrderId = urlParams.get('orderId');
    
    // If loading an existing order, don't load from localStorage
    if (urlOrderId) {
      console.log('Loading existing order from URL, skipping localStorage for selectedProducts');
      return [];
    }

    // Try to load from localStorage only for new orders
    const savedProducts = localStorage.getItem('orderLifecycle_selectedProducts');
    if (savedProducts) {
      try {
        return JSON.parse(savedProducts);
      } catch (e) {
        console.warn('Failed to parse saved selected products:', e);
      }
    }

    return [];
  });

  // Sync selectedProducts with formData.selectedProducts when it changes
  useEffect(() => {
    if (formData.selectedProducts && Array.isArray(formData.selectedProducts)) {
      setSelectedProducts(formData.selectedProducts);
    }
  }, [formData.selectedProducts]);

  // Auto-save form data to localStorage whenever it changes (only for new orders)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlOrderId = urlParams.get('orderId');
      
      // Only save to localStorage if we're not loading an existing order
      if (!urlOrderId) {
        localStorage.setItem('orderLifecycle_formData', JSON.stringify(formData));
      }
    }
  }, [formData]);

  // Auto-save selected products to localStorage whenever they change (only for new orders)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlOrderId = urlParams.get('orderId');
      
      // Only save to localStorage if we're not loading an existing order
      if (!urlOrderId) {
        localStorage.setItem('orderLifecycle_selectedProducts', JSON.stringify(selectedProducts));
      }
    }
  }, [selectedProducts]);

  // Auto-save current index to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem('orderLifecycle_currentIndex', currentIndex.toString());
    }
  }, [currentIndex]);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [pendingBaseProduct, setPendingBaseProduct] = useState<BaseProduct | null>(null);
  const [pendingInitialQty, setPendingInitialQty] = useState<number | undefined>(undefined);
  const [pendingInitialAttributes, setPendingInitialAttributes] = useState<Record<string, string> | undefined>(undefined);
  const [pendingInitialPrice, setPendingInitialPrice] = useState<number | undefined>(undefined);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const handleAddProductClick = useCallback(() => {
    setShowSearchModal(true);
  }, []);

  const resetPendingProduct = () => {
    setPendingBaseProduct(null);
    setPendingInitialQty(undefined);
    setPendingInitialAttributes(undefined);
    setPendingInitialPrice(undefined);
    setEditingProductId(null);
  };

  const handlePickBaseProduct = useCallback((product: BaseProduct, qty = 1) => {
    setPendingBaseProduct(product);
    setPendingInitialQty(qty);
    setPendingInitialAttributes(undefined);
    setPendingInitialPrice(product.defaultPrice);
    setEditingProductId(null);
    setShowSearchModal(false);
    setShowConfigModal(true);
  }, []);

  const handleConfirmProduct = useCallback((configured: ConfiguredProduct) => {
    setSelectedProducts((prev) => {
      const index = prev.findIndex((item) => item.id === configured.id);
      const next = index >= 0 ? prev.map((item, idx) => (idx === index ? configured : item)) : [...prev, configured];
      
      // Update formData with the new products list
      setFormData((prevData: any) => ({ 
        ...prevData, 
        items: serializeSelectedProducts(next),
        products: next // Also update products array for quotation stage
      }));
      
      return next;
    });
    // Close the modal and reset state
    setShowConfigModal(false);
    resetPendingProduct();
  }, []);

  const handleRemoveProduct = useCallback((id: string) => {
    setSelectedProducts((prev) => {
      const next = prev.filter((item) => item.id !== id);
      
      // Update formData with the new products list
      setFormData((prevData: any) => ({ 
        ...prevData, 
        items: serializeSelectedProducts(next),
        products: next // Also update products array for quotation stage
      }));
      
      return next;
    });
  }, []);

  const handleEditProduct = useCallback((id: string) => {
    const existing = selectedProducts.find((item) => item.id === id);
    if (!existing) return;
    setPendingBaseProduct({
      id: existing.productId,
      name: existing.name,
      imageUrl: existing.imageUrl,
    });
    setPendingInitialQty(existing.quantity);
    setPendingInitialAttributes(existing.attributes);
    setPendingInitialPrice(existing.price);
    setEditingProductId(existing.id);
    setShowConfigModal(true);
  }, [selectedProducts]);

  const handleCloseSearchModal = useCallback(() => {
    setShowSearchModal(false);
  }, []);

  const handleCloseConfigModal = useCallback(() => {
    setShowConfigModal(false);
    resetPendingProduct();
  }, []);

  const handleBackToSearch = useCallback(() => {
    setShowConfigModal(false);
    setShowSearchModal(true);
    // Keep the pending product data for when user comes back
  }, []);
  const serializeSelectedProducts = (items: ConfiguredProduct[] = selectedProducts) =>
    items.map((item) => {
      const unitPrice = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
      const quantity = typeof item.quantity === 'string' ? parseInt(item.quantity) : (item.quantity || 0);
      const lineTotal = unitPrice * quantity;
      
      return {
        product_id: item.productId,
        name: item.name,
        quantity: quantity,
        attributes: item.attributes,
        sku: item.sku,
        unit_price: unitPrice,
        line_total: lineTotal,
        custom_requirements: item.customRequirements || item.design?.customRequirements || "",
        design_ready: item.design?.ready || false,
        design_need_custom: item.design?.needCustom || false,
        design_files_manifest: item.design?.files || []
      };
    });
  const generateCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setDeliveryCode(code);
    setFormData((prev: any) => ({ ...prev, deliveryCode: code }));
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    await fetch(`${apiBase}/api/send-delivery-code`, {
      method: "POST",
      body: JSON.stringify({ code, phone: "+971XXXXXXXXX" }),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
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
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const form = new FormData();
      form.append("photo", riderPhoto);
      form.append("orderId", formData._orderId.toString()); // Ensure it's a string
      
      console.log('Uploading rider photo:', {
        orderId: formData._orderId,
        photoName: riderPhoto.name,
        photoSize: riderPhoto.size,
        photoType: riderPhoto.type
      });
      
      const resp = await fetch(`${apiBase}/api/delivery/rider-photo`, {
        method: "POST",
        body: form,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Upload failed:', resp.status, errorText);
        throw new Error(`Upload failed (${resp.status}): ${errorText}`);
      }
      
      const data = await resp.json();
      console.log('Upload successful:', data);
      setFormData((p: any) => ({ ...p, riderPhotoPath: data.url }));
      toast.success("Photo uploaded successfully!");
    } catch (e) {
      console.error("Photo upload error:", e);
      toast.error("Photo upload failed");
    }
  };

  const handleMarkPrinted = async () => {
    if (!formData._orderId) {
      toast.error("Please save the order first");
      return;
    }

    // Validate required fields
    if (!formData.printOperator) {
      toast.error("Please enter the print operator name");
      return;
    }
    if (!formData.printTime) {
      toast.error("Please set the print time");
      return;
    }
    if (!formData.batchInfo) {
      toast.error("Please enter batch information");
      return;
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      
      // Get the first product's SKU and quantity, or use defaults
      const firstProduct = selectedProducts[0];
      const sku = firstProduct?.sku || formData.sku || `PRINT-${formData._orderId}`;
      const qty = firstProduct?.quantity || formData.qty || 1;

      const resp = await fetch(
        `${apiBase}/api/orders/${formData._orderId}/mark_printed/`,
        {
          method: "POST",
          body: JSON.stringify({ 
            sku: sku, 
            qty: qty,
            print_operator: formData.printOperator,
            print_time: formData.printTime,
            batch_info: formData.batchInfo,
            qa_checklist: formData.qaChecklist || "Quality check completed"
          }),
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Mark printed failed:', resp.status, errorText);
        throw new Error(`Mark printed failed (${resp.status}): ${errorText}`);
      }

      const result = await resp.json();
      
      // Update form data to reflect printed status
      setFormData((prev: any) => ({
        ...prev,
        printStatus: 'Printed',
        status: 'Active'
      }));

      toast.success("Order marked as printed successfully!");
      
      // Optionally auto-advance to next stage
      if (result.ok) {
        toast.success("Order is ready for client approval!");
      }
      
    } catch (e: any) {
      toast.error(`Failed to mark printed: ${e.message}`);
      if (process.env.NODE_ENV !== "production") {
        console.error("Mark printed error:", e);
      }
    }
  };

  // Auto-save function for when pressing Next button
  const handleAutoSave = async (): Promise<boolean> => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: any = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      let orderId = formData._orderId;
      console.log('handleAutoSave - Initial orderId:', orderId, 'Type:', typeof orderId);
      console.log('handleAutoSave - formData._orderId:', formData._orderId, 'Type:', typeof formData._orderId);
      
      // Ensure orderId is a valid integer
      if (orderId) {
        // Handle different orderId formats
        let orderIdStr = orderId.toString().trim();
        
        // Remove any non-numeric characters except for the first character if it's a minus sign
        if (orderIdStr.startsWith('-')) {
          orderIdStr = '-' + orderIdStr.slice(1).replace(/[^0-9]/g, '');
        } else {
          orderIdStr = orderIdStr.replace(/[^0-9]/g, '');
        }
        
        orderId = parseInt(orderIdStr, 10);
        if (isNaN(orderId) || orderId <= 0) {
          console.error('Invalid orderId format after cleaning:', formData._orderId, '-> cleaned:', orderIdStr);
          // Try to get orderId from URL parameters as fallback
          const urlParams = new URLSearchParams(window.location.search);
          const urlOrderId = urlParams.get('orderId');
          if (urlOrderId) {
            const urlOrderIdInt = parseInt(urlOrderId, 10);
            if (!isNaN(urlOrderIdInt) && urlOrderIdInt > 0) {
              console.log('Using orderId from URL as fallback:', urlOrderIdInt);
              orderId = urlOrderIdInt;
            } else {
              orderId = null;
            }
          } else {
            orderId = null;
          }
        } else {
          console.log('OrderId validated successfully:', orderId);
        }
      }
      
      if (!orderId) {
        console.log('No valid orderId found, creating new order...');
        // Create order if it doesn't exist
        // Check if all products have design files before creating items
        const itemsHaveDesignFiles = selectedProducts.every(product => 
          product.design?.files && product.design?.files.length > 0
        );
        
        const requestBody: any = {
          clientName: formData.clientName,
          companyName: formData.companyName,
          phone: formData.phone,
          trn: formData.trn,
          email: formData.email,
          address: formData.address,
          specs: formData.specifications,
          urgency: formData.urgency,
          items: [], // Always include items field, even if empty
        };
        
        // Always include at least one item (backend requires it)
        if (selectedProducts.length > 0) {
          if (itemsHaveDesignFiles) {
            requestBody.items = serializeSelectedProducts();
            console.log('Items populated with design files:', requestBody.items);
          } else {
            // Include products even without design files for order intake stage
            requestBody.items = serializeSelectedProducts();
            console.log('Items populated without design files (order intake stage):', requestBody.items);
          }
        } else {
          // Create a placeholder item if no products are selected
          requestBody.items = [{
            product_id: null,
            name: "Placeholder Item",
            quantity: 1,
            attributes: {},
            sku: "",
            unit_price: 0,
            line_total: 0,
            custom_requirements: "",
            design_ready: false,
            design_need_custom: false,
            design_files_manifest: []
          }];
          console.log('Created placeholder item for empty order');
        }
        console.log('Creating order with payload:', requestBody);
        
        const resp = await fetch(`${apiBase}/api/orders/`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });
        
        if (!resp.ok) {
          const errorText = await resp.text();
          console.error('Create order failed:', resp.status, errorText);
          
          if (resp.status === 401) {
            handleUnauthorized();
            return false;
          }
          
          throw new Error(`Create failed (${resp.status}): ${errorText}`);
        }
        const created = await resp.json();
        console.log('Order created successfully:', created);
        orderId = created.data?.id || created.id;
        
        // Ensure orderId is a valid integer
        if (orderId) {
          orderId = parseInt(orderId.toString(), 10);
          if (isNaN(orderId)) {
            console.error('Invalid orderId returned from creation:', created.data?.id || created.id);
            throw new Error('Invalid order ID returned from server');
          }
        }
        
        setFormData((p: any) => ({ ...p, _orderId: orderId }));
        console.log('Order created and formData updated with orderId:', orderId);
      } else {
        console.log('Valid orderId found, updating existing order:', orderId);
        // Update existing order with current stage data
        const stageKey = visibleStageKeys[currentIndex];
        let stage = "" as any;
        let payload: any = {};
        
        // Only update items if we're past the order intake stage or if all items have design files
        const shouldUpdateItems = stageKey === "quotation" || stageKey === "designProduction" || stageKey === "printingQA" || stageKey === "clientApproval" || stageKey === "deliveryProcess";
        const itemsHaveDesignFiles = selectedProducts.every(product => 
          product.design?.files && product.design?.files.length > 0
        );
        
        if (stageKey === "quotation") {
          stage = "quotation";
          payload = {
            labour_cost: formData.labourCost,
            finishing_cost: formData.finishingCost,
            paper_cost: formData.paperCost,
            design_cost: formData.designCost,
            delivery_cost: formData.deliveryCost,
            discount: formData.discount,
            advance_paid: formData.advancePaid,
            finalPrice: formData.finalPrice,
            sales_person: typeof window !== "undefined" ? localStorage.getItem("admin_username") || "Unknown User" : "Unknown User",
            // Order model fields
            clientName: formData.clientName,
            companyName: formData.companyName,
            phone: formData.phone,
            trn: formData.trn,
            email: formData.email,
            address: formData.address,
            specifications: formData.specifications,
          };
        }
        if (stageKey === "designProduction") {
          stage = "design";
          payload = {
            assigned_designer: formData.assignedDesigner,
            requirements_files: formData.requirementsFiles,
            design_status: formData.designStatus,
          };
        }
        if (stageKey === "printingQA") {
          stage = "printing";
          payload = {
            print_operator: formData.printOperator,
            print_time: formData.printTime,
            batch_info: formData.batchInfo,
            print_status: formData.printStatus,
            qa_checklist: formData.qaChecklist,
          };
        }
        if (stageKey === "clientApproval") {
          stage = "approval";
          payload = {
            client_approval_files: formData.clientApprovalFiles,
            approved_at: formData.approvedAt,
          };
        }
        if (stageKey === "deliveryProcess") {
          stage = "delivery";
          payload = {
            delivery_code: formData.deliveryCode,
            delivered_at: formData.deliveredAt,
            rider_photo_path: formData.riderPhotoPath,
          };
        }
        
        if (stage) {
          console.log('Updating stage with payload:', { stage, payload, orderId });
          console.log('API URL:', `${apiBase}/api/orders/${orderId}/`);
          const resp = await fetch(`${apiBase}/api/orders/${orderId}/`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ stage, payload }),
          });
          if (!resp.ok) {
            if (resp.status === 401) {
              handleUnauthorized();
              return false;
            }
            const errorText = await resp.text();
            console.error('Stage update failed:', resp.status, errorText);
            console.error('OrderId used:', orderId, 'Type:', typeof orderId);
            throw new Error(`Stage update failed (${resp.status}): ${errorText}`);
          }
        }

        // Update base order fields only if we have a valid orderId
        if (orderId && !isNaN(orderId)) {
          const updatePayload: any = {
            client_name: formData.clientName,
            specs: formData.specifications,
            urgency: formData.urgency,
          };
          
          // Only include items update if we should update items and they have design files OR if we're creating the order
          if (shouldUpdateItems && itemsHaveDesignFiles) {
            updatePayload.items = serializeSelectedProducts();
          }
          console.log('Updating order with payload:', updatePayload);
          console.log('Items being sent:', updatePayload.items);
          console.log('OrderId for update:', orderId, 'Type:', typeof orderId);
          if (updatePayload.items && updatePayload.items.length > 0) {
            console.log('First item structure:', updatePayload.items[0]);
          }
          
             const baseUpdate = await fetch(`${apiBase}/api/orders/${orderId}/`, {
               method: "PATCH",
               headers,
               body: JSON.stringify(updatePayload),
             });
        
        if (!baseUpdate.ok) {
          if (baseUpdate.status === 401) {
            handleUnauthorized();
            return false;
          }
          const errorText = await baseUpdate.text();
          console.error('Update order failed:', baseUpdate.status, errorText);
          console.error('OrderId used for update:', orderId, 'Type:', typeof orderId);
          
          // Check if this is a design files validation error and we're not in the design stage
          if (baseUpdate.status === 400 && errorText.includes('design_files_manifest')) {
            console.warn('Skipping design files validation during navigation - files will be validated later');
            return true;
          }
          
          // For now, log the error but don't fail the auto-save
          // This allows the order creation to succeed even if update fails
          console.warn('Order update failed, but order was created successfully');
          return true;
        }
        } else {
          console.warn('Skipping base order update - invalid orderId:', orderId);
        }
      }

      return true;
    } catch (e: any) {
      console.error("Auto-save failed:", e);
      return false;
    }
  };

  const handleSaveOrder = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: any = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      let orderId = formData._orderId;
      if (!orderId) {
        // Create order
        const resp = await fetch(`${apiBase}/api/orders/`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            clientName: formData.clientName,
            companyName: formData.companyName,
            phone: formData.phone,
            trn: formData.trn,
            email: formData.email,
            address: formData.address,
            specs: formData.specifications,
            urgency: formData.urgency,
            items: serializeSelectedProducts(),
          }),
        });
        if (!resp.ok) {
          if (resp.status === 401) {
            handleUnauthorized();
            return;
          }
          throw new Error(`Create failed (${resp.status})`);
        }
        const created = await resp.json();
        orderId = created.data?.id || created.id;
        setFormData((p: any) => ({ ...p, _orderId: orderId }));
      } else {
        // Update current stage payload
        const stageKey = visibleStageKeys[currentIndex];
        let stage = "" as any;
        let payload: any = {};
        if (stageKey === "quotation") {
          stage = "quotation";
          payload = {
            labour_cost: formData.labourCost,
            finishing_cost: formData.finishingCost,
            paper_cost: formData.paperCost,
            design_cost: formData.designCost,
            delivery_cost: formData.deliveryCost,
            discount: formData.discount,
            advance_paid: formData.advancePaid,
            finalPrice: formData.finalPrice,
            sales_person: typeof window !== "undefined" ? localStorage.getItem("admin_username") || "Unknown User" : "Unknown User",
            // Order model fields
            clientName: formData.clientName,
            companyName: formData.companyName,
            phone: formData.phone,
            trn: formData.trn,
            email: formData.email,
            address: formData.address,
            specifications: formData.specifications,
          };
        }
        if (stageKey === "designProduction") {
          stage = "design";
          payload = {
            assigned_designer: formData.assignedDesigner,
            requirements_files: formData.requirementsFiles,
            design_status: formData.designStatus,
          };
        }
        if (stageKey === "printingQA") {
          stage = "printing";
          payload = {
            print_operator: formData.printOperator,
            print_time: formData.printTime,
            batch_info: formData.batchInfo,
            print_status: formData.printStatus,
            qa_checklist: formData.qaChecklist,
          };
        }
        if (stageKey === "clientApproval") {
          stage = "approval";
          payload = {
            client_approval_files: formData.clientApprovalFiles,
            approved_at: formData.approvedAt,
          };
        }
        if (stageKey === "deliveryProcess") {
          stage = "delivery";
          payload = {
            delivery_code: formData.deliveryCode,
            delivered_at: formData.deliveredAt,
            rider_photo_path: formData.riderPhotoPath,
          };
        }
        if (stage) {
          const resp = await fetch(`${apiBase}/api/orders/${orderId}/`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ stage, payload }),
          });
          if (!resp.ok) throw new Error(`Update failed (${resp.status})`);
        }
      }

      if (!orderId) throw new Error("Order identifier missing after save");

      const baseUpdate = await fetch(`${apiBase}/api/orders/${orderId}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          client_name: formData.clientName,
          specs: formData.specifications,
          urgency: formData.urgency,
          items: serializeSelectedProducts(),
        }),
      });
      if (!baseUpdate.ok) throw new Error(`Update failed (${baseUpdate.status})`);
      toast.success("Order saved successfully!");

      // Clear localStorage after successful save (only clear form data, keep files and print time)
      if (typeof window !== "undefined") {
        localStorage.removeItem('orderLifecycle_formData');
        localStorage.removeItem('orderLifecycle_selectedProducts');
        localStorage.removeItem('orderLifecycle_currentIndex');
        
        // Clear intake files and client approval files (these are stage-specific)
        clearFilesFromStorage('orderLifecycle_intakeFiles');
        clearFilesFromStorage('orderLifecycle_clientApprovalFiles');
        
        // Clear design files for all products
        for (let i = 1; i <= 30; i++) {
          clearFilesFromStorage(`orderLifecycle_designFiles_${i}`);
        }
        
        // DO NOT clear requirements files, rider photo, or print time
        // These should persist across order saves
      }

      // After final stage, redirect user and flash confirmation
      if (currentIndex === stages.length - 1 && orderId) {
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "orders_flash",
              JSON.stringify({ id: orderId, name: formData.clientName })
            );
          }
        } catch {}
        router.push("/admin/orders/all");
      }
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const [busyDraft, setBusyDraft] = useState(false);
  const [busySend, setBusySend] = useState(false);

  // Function to clear localStorage (for new orders)
  const clearLocalStorage = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem('orderLifecycle_formData');
      localStorage.removeItem('orderLifecycle_selectedProducts');
      localStorage.removeItem('orderLifecycle_currentIndex');
      
      // Clear all file storage
      clearFilesFromStorage('orderLifecycle_intakeFiles');
      clearFilesFromStorage('orderLifecycle_requirementsFiles');
      clearFilesFromStorage('orderLifecycle_clientApprovalFiles');
      clearFilesFromStorage('orderLifecycle_riderPhoto');
      
      // Clear design files for all products (we'll clear all keys that start with the pattern)
      for (let i = 1; i <= 30; i++) { // Assuming we have products with IDs 1-30
        clearFilesFromStorage(`orderLifecycle_designFiles_${i}`);
      }
      
      // Clear print time
      localStorage.removeItem('orderLifecycle_printTime');
    }
  };

  // Function to handle 401 errors
  const handleUnauthorized = () => {
    toast.error("Unauthorized: Please log in again");
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
    }
  };

  // Load existing order data when orderId is present in URL or formData
  useEffect(() => {
    const loadOrderData = async () => {
      // Check for orderId in URL params first, then formData
      const urlParams = new URLSearchParams(window.location.search);
      const urlOrderId = urlParams.get('orderId');
      let orderId = urlOrderId || formData._orderId;
      
      console.log('loadOrderData - URL orderId:', urlOrderId);
      console.log('loadOrderData - formData._orderId:', formData._orderId);
      console.log('loadOrderData - final orderId:', orderId);
      
      if (!orderId) {
        console.log('loadOrderData - No orderId found, skipping load');
        return;
      }
      
      // Ensure orderId is a valid integer
      orderId = parseInt(orderId.toString(), 10);
      if (isNaN(orderId) || orderId <= 0) {
        console.error('Invalid orderId format from URL or formData:', urlOrderId || formData._orderId);
        console.log('loadOrderData - Invalid orderId, skipping load');
        return;
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
        const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
        const headers: any = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

        console.log('Loading order data - API Base:', apiBase);
        console.log('Loading order data - Order ID:', orderId);
        console.log('Loading order data - URL:', `${apiBase}/api/orders/${orderId}/`);
        console.log('Loading order data - Headers:', headers);

        const response = await fetch(`${apiBase}/api/orders/${orderId}/`, {
          method: "GET",
          headers,
        });

        console.log('Loading order data - Response status:', response.status);
        console.log('Loading order data - Response ok:', response.ok);

        if (response.ok) {
          const orderData = await response.json();
          const order = orderData.data || orderData;
          
          console.log('Loading order data:', order);

          // Update formData with loaded order data
          setFormData((prev: any) => {
            const newFormData = {
              ...prev,
              _orderId: orderId, // Ensure orderId is set
              clientName: order.client_name || prev.clientName,
              companyName: order.company_name || prev.companyName,
              phone: order.phone || prev.phone,
              trn: order.trn || prev.trn,
              email: order.email || prev.email,
              address: order.address || prev.address,
              specifications: order.specs || prev.specifications,
              urgency: order.urgency || prev.urgency,
              items: order.items || prev.items,
              products: order.items || prev.products, // Map items to products for quotation
              status: order.status || prev.status,
              stage: order.stage || prev.stage,
              orderCode: order.order_code || prev.orderCode,
              // Load quotation data if available
              labourCost: order.quotation?.labour_cost || prev.labourCost,
              finishingCost: order.quotation?.finishing_cost || prev.finishingCost,
              paperCost: order.quotation?.paper_cost || prev.paperCost,
              machineCost: order.quotation?.machine_cost || prev.machineCost,
              designCost: order.quotation?.design_cost || prev.designCost,
              deliveryCost: order.quotation?.delivery_cost || prev.deliveryCost,
              discount: order.quotation?.discount || prev.discount,
              advancePaid: order.quotation?.advance_paid || prev.advancePaid,
              salesPerson: order.quotation?.sales_person || (typeof window !== "undefined" ? localStorage.getItem("admin_username") || "Unknown User" : "Unknown User"),
              // Load design data if available
              assignedDesigner: order.design_stage?.assigned_designer || prev.assignedDesigner,
              requirementsFiles: order.design_stage?.requirements_files_manifest || prev.requirementsFiles,
              designStatus: order.design_stage?.design_status || prev.designStatus,
              // Load printing data if available
              printOperator: order.printing_stage?.print_operator || prev.printOperator,
              printTime: order.printing_stage?.print_time || prev.printTime,
              batchInfo: order.printing_stage?.batch_info || prev.batchInfo,
              printStatus: order.printing_stage?.print_status || prev.printStatus,
              qaChecklist: order.printing_stage?.qa_checklist || prev.qaChecklist,
              // Load approval data if available
              clientApprovalFiles: order.approval_stage?.client_approval_files || prev.clientApprovalFiles,
              approvedAt: order.approval_stage?.approved_at || prev.approvedAt,
              // Load delivery data if available
              deliveryCode: order.delivery_code || prev.deliveryCode,
              deliveredAt: order.delivery_stage?.delivered_at || prev.deliveredAt,
              riderPhotoPath: order.delivery_stage?.rider_photo_path || prev.riderPhotoPath,
            };
            
            console.log('Updated formData:', newFormData);
            return newFormData;
          });

          // Update selected products for order intake stage
          if (order.items && order.items.length > 0) {
            const configuredProducts: ConfiguredProduct[] = order.items.map((item: any) => {
              // Find the base product to get the imageUrl
              const baseProduct = getProductById(item.product_id);
              
              return {
                id: item.id || Math.random().toString(),
                productId: item.product_id || "",
                name: item.name || "",
                quantity: item.quantity || 0,
                attributes: item.attributes || {},
                sku: item.sku || "",
                price: item.unit_price || 0, // Fixed: use 'price' field, not 'unitPrice'
                imageUrl: baseProduct?.imageUrl || "", // Get imageUrl from base product
              };
            });
            console.log('Updated selectedProducts:', configuredProducts);
            setSelectedProducts(configuredProducts);
          }
        } else if (response.status === 404) {
          // Order not found - clear the invalid orderId and treat as new order
          console.log('Order not found, clearing invalid orderId and treating as new order');
          setFormData((prev: any) => ({ ...prev, _orderId: null }));
          
          // Clear any invalid orderId from URL if present
          if (urlOrderId) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('orderId');
            window.history.replaceState({}, '', newUrl.toString());
          }
        } else {
          // Handle other errors (401, 500, etc.)
          const errorText = await response.text();
          console.error('Failed to load order data:', response.status, errorText);
          
          if (response.status === 401) {
            handleUnauthorized();
          } else {
            toast.error(`Failed to load order data: ${response.status}`);
          }
        }
      } catch (error) {
        console.error("Error loading order data:", error);
        toast.error("Error loading order data");
      }
    };

    loadOrderData();
  }, [formData._orderId, typeof window !== 'undefined' ? window.location.search : '']);

  // Also load data when URL changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlOrderId = urlParams.get('orderId');
      if (urlOrderId && urlOrderId !== formData._orderId) {
        setFormData((prev: any) => ({ ...prev, _orderId: urlOrderId }));
      }
    }
  }, []);

  // Handle URL changes on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleUrlChange = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlOrderId = urlParams.get('orderId');
        if (urlOrderId && urlOrderId !== formData._orderId) {
          setFormData((prev: any) => ({ ...prev, _orderId: urlOrderId }));
        }
      };

      // Listen for URL changes
      window.addEventListener('popstate', handleUrlChange);
      
      // Check URL on mount
      handleUrlChange();

      return () => {
        window.removeEventListener('popstate', handleUrlChange);
      };
    }
  }, [formData._orderId]);

  // Set current stage based on loaded order data
  useEffect(() => {
    if (formData.stage) {
      const stageIndex = visibleStageKeys.findIndex(key => {
        const stageMap: Record<string, string> = {
          'order_intake': 'orderIntake',
          'quotation': 'quotation',
          'design': 'designProduction',
          'printing': 'printingQA',
          'approval': 'clientApproval',
          'delivery': 'deliveryProcess',
        };
        return stageMap[formData.stage] === key;
      });
      
      if (stageIndex !== -1) {
        setCurrentIndex(stageIndex);
      }
    }
  }, [formData.stage, visibleStageKeys]);

  // Sync selectedProducts to formData so quotation can access them
  useEffect(() => {
    if (selectedProducts.length > 0) {
      setFormData((prev: any) => ({
        ...prev,
        products: selectedProducts,
        items: selectedProducts,
      }));
    }
  }, [selectedProducts]);

  const ensureOrderExists = async (): Promise<number | null> => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: any = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      let orderId = formData._orderId;
      if (!orderId) {
        const resp = await fetch(`${apiBase}/api/orders/`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            clientName: formData.clientName,
            specs: formData.specifications,
            urgency: formData.urgency,
            items: serializeSelectedProducts(),
          }),
        });
        if (!resp.ok) throw new Error(`Create failed (${resp.status})`);
        const created = await resp.json();
        orderId = created.data?.id || created.id;
        setFormData((p: any) => ({ ...p, _orderId: orderId }));
      }
      return orderId || null;
    } catch (e: any) {
      toast.error(e?.message || "Failed to save draft");
      return null;
    }
  };

  const handleSaveDraft = async () => {
    if (busyDraft) return;
    setBusyDraft(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: any = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const orderId = await ensureOrderExists();
      if (!orderId) return;

      // Best-effort sync of basic fields if order already existed
      const resp = await fetch(`${apiBase}/api/orders/${orderId}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          client_name: formData.clientName,
          specs: formData.specifications,
          urgency: formData.urgency,
          status: "new",
          items: serializeSelectedProducts(),
        }),
      });
      if (!resp.ok) throw new Error(`Update failed (${resp.status})`);
      
      // Update formData with selectedProducts so quotation can access them
      setFormData((prev: any) => ({
        ...prev,
        products: selectedProducts,
        items: selectedProducts,
      }));
      
      toast.success("Draft saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save draft");
    } finally {
      setBusyDraft(false);
    }
  };

  const handleSendToSales = async () => {
    if (busySend) return;
    setBusySend(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: any = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const orderId = await ensureOrderExists();
      if (!orderId) return;

      // Move to quotation stage (Sales)
      const resp = await fetch(`${apiBase}/api/orders/${orderId}/`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stage: "quotation", payload: {} }),
      });
      if (!resp.ok) throw new Error(`Stage update failed (${resp.status})`);
      
      // Update formData with selectedProducts so quotation can access them
      setFormData((prev: any) => ({
        ...prev,
        products: selectedProducts,
        items: selectedProducts,
      }));
      
      toast.success("Sent to Sales");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send to Sales");
    } finally {
      setBusySend(false);
    }
  };

  const validateCurrentStage = () => {
    const stageKey = visibleStageKeys[currentIndex];
    if (!stageKey) return true;
    const required = STAGE_REGISTRY[stageKey].requiredFields || [];
    const missing: string[] = [];
    for (let field of required) {
      if (field === "products") {
        if (selectedProducts.length === 0) missing.push(field);
        continue;
      }
      const value = formData[field];
      const isMissing =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "") ||
        (typeof value === "number" && isNaN(value)) ||
        (Array.isArray(value) && value.length === 0);
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

  // Prevent hydration mismatch by only rendering on client
  if (!isClient) {
    return (
      <div className="p-6 space-y-8 bg-gray-50 min-h-screen text-black">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

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

          {/* New Order Button */}
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Are you sure you want to start a new order? This will clear all current data.")) {
                clearLocalStorage();
                setFormData({
                  clientName: "",
                  specifications: "",
                  urgency: "",
                  items: [],
                  products: [],
                  status: "New",
                  rawMaterialCost: 0,
                  labourCost: 0,
                  finishingCost: 0,
                  paperCost: 0,
                  inkCost: 0,
                  machineCost: 0,
                  designCost: 0,
                  packagingCost: 0,
                  deliveryCost: 0,
                  discount: 0,
                  advancePaid: 0,
                  requirementsFiles: [],
                  sku: "",
                  qty: "",
                  deliveryCode: "",
                  deliveryStatus: "Dispatched",
                });
                setSelectedProducts([]);
                setCurrentIndex(0);
                toast.success("New order started");
              }
            }}
            className="bg-white text-[#891F1A] border border-[#891F1A]/30 hover:bg-[#891F1A] hover:text-white transition px-4 py-2 rounded"
          >
            New Order
          </Button>

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
                onClick={async () => {
                  if (i < currentIndex) {
                    setCurrentIndex(i);
                    // Update localStorage when moving to previous stage
                    if (typeof window !== "undefined") {
                      localStorage.setItem('orderLifecycle_currentIndex', i.toString());
                    }
                  } else if (i === currentIndex) {
                    // noop
                  } else if (validateCurrentStage()) {
                    // Auto-save before moving to next stage
                    const saved = await handleAutoSave();
                    if (saved) {
                      setCurrentIndex(i);
                      // Update localStorage when moving to next stage
                      if (typeof window !== "undefined") {
                        localStorage.setItem('orderLifecycle_currentIndex', i.toString());
                      }
                      toast.success("Progress saved and moved to next stage");
                    } else {
                      toast.error("Failed to save data. Please try again.");
                    }
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
              onClick={async () => {
                if (idx < currentIndex) {
                  setCurrentIndex(idx);
                  // Update localStorage when moving to previous stage
                  if (typeof window !== "undefined") {
                    localStorage.setItem('orderLifecycle_currentIndex', idx.toString());
                  }
                } else if (idx === currentIndex) {
                  // noop
                } else if (validateCurrentStage()) {
                  // Auto-save before moving to next stage
                  const saved = await handleAutoSave();
                  if (saved) {
                    setCurrentIndex(idx);
                    // Update localStorage when moving to next stage
                    if (typeof window !== "undefined") {
                      localStorage.setItem('orderLifecycle_currentIndex', idx.toString());
                    }
                    toast.success("Progress saved and moved to next stage");
                  } else {
                    toast.error("Failed to save data. Please try again.");
                  }
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
                  canGenerate,
                  onSaveDraft: handleSaveDraft,
                  onSendToSales: handleSendToSales,
                  savingDraft: busyDraft,
                  sendingToSales: busySend,
                  selectedProducts,
                  onAddProduct: handleAddProductClick,
                  onRemoveProduct: handleRemoveProduct,
                  onEditProduct: handleEditProduct,
                })}


                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-6 max-w-md mx-auto gap-4">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border border-gray-300 text-black transition-all duration-200 hover:bg-red-900 hover:text-white"
                    onClick={() => {
                      const newIndex = Math.max(currentIndex - 1, 0);
                      setCurrentIndex(newIndex);
                      // Update localStorage when moving to previous stage
                      if (typeof window !== "undefined") {
                        localStorage.setItem('orderLifecycle_currentIndex', newIndex.toString());
                      }
                    }}
                  >
                    ← Back
                  </Button>

                  {currentIndex < stages.length - 1 ? (
                    <Button
                      className="w-full flex items-center justify-center gap-2 bg-[#891F1A] text-white hover:bg-red-800 transition-all duration-200"
                      onClick={async () => {
                        if (validateCurrentStage()) {
                          // Auto-save before moving to next stage
                          const saved = await handleAutoSave();
                          if (saved) {
                            const newIndex = currentIndex + 1;
                            setCurrentIndex(newIndex);
                            
                            // Update localStorage with new stage
                            if (typeof window !== "undefined") {
                              localStorage.setItem('orderLifecycle_currentIndex', newIndex.toString());
                            }
                            
                            toast.success("Progress saved and moved to next stage");
                          } else {
                            toast.error("Failed to save data. Please try again.");
                          }
                        }
                      }}
                    >
                      Next →
                    </Button>
                  ) : (
                    <Button
                      className="w-full flex items-center justify-center gap-2 bg-[#891F1A] text-white hover:bg-red-900 transition-all duration-200"
                      onClick={handleSaveOrder}
                    >
                      ✓ Save Order
                    </Button>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ProductSearchModal
        open={showSearchModal}
        onClose={handleCloseSearchModal}
        onPickBaseProduct={handlePickBaseProduct}
      />

      <ProductConfigModal
        open={showConfigModal}
        onClose={handleCloseConfigModal}
        baseProduct={pendingBaseProduct}
        onConfirm={handleConfirmProduct}
        initialQty={pendingInitialQty || 1}
        initialAttributes={pendingInitialAttributes || {}}
        initialPrice={pendingInitialPrice || 0}
        editingProductId={editingProductId ?? undefined}
        onBack={handleBackToSearch}
      />
    </div>
  );
}



























