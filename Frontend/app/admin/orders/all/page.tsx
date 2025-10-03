"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pencil, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardNavbar from "@/app/components/navbar/DashboardNavbar";
import { toast } from "react-hot-toast";
import { ordersApi, Order as ApiOrder } from "@/lib/orders-api";

// ---- types for sorting & arrows ----
type Order = {
  id: number;
  company: string;
  name: string;
  phone: string;
  detail: string;
  date: string;
  price: number;
  advance: number;
  remaining: number;
  location: string;
  status: string;
  zone?: string;
finalPrice?: number;
  items?: ApiOrder["items"];
};
const numericFields: Array<keyof Order> = ["id", "price", "advance", "remaining"];
const summarizeItems = (items?: ApiOrder["items"]) => {
  if (!items || items.length === 0) return "Custom Order";
  return items
    .map((item) => {
      const qty = item.quantity && item.quantity > 0 ? `${item.quantity} x ` : "";
      return `${qty}${item.name}`;
    })
    .join(", ");
};

export default function Page() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof Order | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");

  const getEffectivePrice = (o: Order) =>
    typeof o.finalPrice === "number" ? o.finalPrice : o.price;

  // Load orders from API
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiOrders = await ordersApi.getOrders();
        
        // Convert API orders to display format
        const convertedOrders: Order[] = apiOrders.map((order: ApiOrder) => {
          const summary = summarizeItems(order.items);
          const detail = order.specs ? `${summary} - ${order.specs}` : summary;
          const quotation = order.quotation;
          return {
            id: order.id,
            company: order.client_name,
            name: order.client_name,
            phone: order.phone || "+971-XXXXXXXXX",
            detail,
            date: order.created_at.split('T')[0],
            price: quotation?.grand_total || 0,
            advance: quotation?.advance_paid || 0,
            remaining: quotation?.remaining || 0,
            location: "Dubai",
            status:
              order.status === 'new'
                ? 'Pending'
                : order.status === 'active' || order.status === 'in_progress'
                ? 'In Progress'
                : order.status === 'completed'
                ? 'Completed'
                : 'Pending',
            items: order.items,
            finalPrice: quotation?.grand_total,
          };
        });


        
        setOrders(convertedOrders);
      } catch (err: any) {
        setError(err.message || 'Failed to load orders');
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // Read & clear one-time flash, then toast (when navigated from Quotation Save)
  useEffect(() => {
    try {
      const flashRaw =
        typeof window !== "undefined" &&
        window.localStorage.getItem("orders_flash");
      if (flashRaw) {
        const { id, name } = JSON.parse(flashRaw) || {};
        if (id) {
          toast.success(`Order #${id}${name ? ` (${name})` : ""} added to table`);
        }
        window.localStorage.removeItem("orders_flash");
      }
    } catch {}
  }, []);

  const handleEditClick = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setShowModal(false);
    setShowStatusDropdown(false);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      // Update order in backend
      await ordersApi.updateOrder(selectedOrder.id, {
        client_name: selectedOrder.company, // Using company as client_name
        specs: selectedOrder.detail.split(' - ')[1] || '',
        urgency:
          selectedOrder.status === 'Urgent'
            ? 'Urgent'
            : selectedOrder.status === 'In Progress'
            ? 'High'
            : 'Normal',
        status:
          selectedOrder.status === 'Completed'
            ? 'completed'
            : selectedOrder.status === 'In Progress'
            ? 'in_progress'
            : 'new',
        items: selectedOrder.items,
      });

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? selectedOrder : o))
      );

      toast.success(`Order #${selectedOrder.id} updated successfully!`);
      closeModal();
    } catch (err: any) {
      toast.error(`Failed to update order: ${err.message}`);
      console.error('Error updating order:', err);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
      await ordersApi.deleteOrder(orderId);
      setOrders(prev => prev.filter(order => order.id !== orderId));
      toast.success('Order deleted successfully!');
    } catch (err: any) {
      toast.error(`Failed to delete order: ${err.message}`);
      console.error('Error deleting order:', err);
    }
  };

  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortArrow = (field: keyof Order) => {
    // Show arrows on numeric-like fields including custom handling for "price"
    const eligible = new Set<keyof Order>([...numericFields, "date"]);
    if (!eligible.has(field)) return null;

    const isActive = sortField === field;
    const Icon = sortDirection === "asc" && isActive ? ChevronUp : ChevronDown;
    return (
      <span
        className="inline-flex items-center cursor-pointer"
        onClick={() => handleSort(field)}
      >
        <Icon className={`w-4 h-4 ml-1 ${isActive ? "text-white" : "text-white"}`} />
      </span>
    );
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const searchLower = search.toLowerCase();
        const searchMatch =
          order.name.toLowerCase().includes(searchLower) ||
          order.phone.toLowerCase().includes(searchLower) ||
          order.detail.toLowerCase().includes(searchLower) ||
          order.company.toLowerCase().includes(searchLower);

        const statusMatch = selectedStatus === "All" || order.status === selectedStatus;

        const monthMatch =
          selectedMonth === "All" ||
          new Date(order.date).toLocaleString("default", { month: "long" }) === selectedMonth;

        return searchMatch && statusMatch && monthMatch;
      })
      .sort((a, b) => {
        if (!sortField) return 0;

        // Special cases
        if (sortField === "date") {
          const at = new Date(a.date).getTime();
          const bt = new Date(b.date).getTime();
          return sortDirection === "asc" ? at - bt : bt - at;
        }
        if (sortField === "price") {
          const ap = getEffectivePrice(a);
          const bp = getEffectivePrice(b);
          return sortDirection === "asc" ? ap - bp : bp - ap;
        }

        // Generic numeric sort
        const aValue = a[sortField] as any;
        const bValue = b[sortField] as any;

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
  }, [orders, search, selectedStatus, selectedMonth, sortField, sortDirection]);

  return (
    <div className="bg-gray-100 h-screen p-6 overflow-hidden text-sm">
      <DashboardNavbar />
      <div className="max-w-[96rem] mx-auto h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <h2 className="text-3xl font-bold text-[#891F1A]">Orders</h2>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 text-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 text-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#891F1A]"
            >
              <option value="All">All Months</option>
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>

            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black text-black placeholder-gray-500"
            />

            {/* Add Order Button */}
            <button
              onClick={() => (window.location.href = "/admin/order-lifecycle")}
              className="bg-[#891F1A] text-white border border-[#891F1A] hover:bg-red-900 hover:text-white font-semibold px-4 py-2 rounded transition-all duration-200"
            >
              Add Order
            </button>
          </div>
        </div>

        <div className="flex-1 rounded-xl shadow bg-white overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Loading orders...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-lg text-red-600 mb-4">Error: {error}</div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-[#891F1A] text-white px-4 py-2 rounded hover:bg-red-800"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="w-full h-full overflow-y-auto overflow-x-auto pr-2 scrollbar-custom">
              <table className="w-full table-auto text-xs text-center divide-y divide-gray-100">
              <thead className="font-semibold sticky top-0 z-10">
                <tr>
                  <th
                    className="px-1 py-2 bg-[#891F1A] text-white sticky top-0 z-20 rounded-tl-md cursor-pointer"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      ID {renderSortArrow("id")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("company")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Company {renderSortArrow("company")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Customer {renderSortArrow("name")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("phone")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Phone {renderSortArrow("phone")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("detail")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Order {renderSortArrow("detail")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Date {renderSortArrow("date")}
                    </div>
                  </th>
                  {/* PRICE column (shows finalPrice if present, else price) */}
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Price {renderSortArrow("price")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("advance")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Advance {renderSortArrow("advance")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("remaining")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Remaining {renderSortArrow("remaining")}
                    </div>
                  </th>
                  <th
                    className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 cursor-pointer"
                    onClick={() => handleSort("location")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Location {renderSortArrow("location")}
                    </div>
                  </th>
                  <th className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20">
                    Status
                  </th>
                  <th className="px-2 py-2 bg-[#891F1A] text-white sticky top-0 z-20 rounded-tr-md">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="text-gray-800">
                    <td className="px-1 py-2 font-semibold">{order.id}</td>
                    <td className="px-2 py-2">{order.company}</td>
                    <td className="px-2 py-2">{order.name}</td>
                    <td className="px-2 py-2">{order.phone}</td>
                    <td className="px-2 py-2">{order.detail}</td>
                    <td className="px-2 py-2">{order.date}</td>
                    {/* Effective price display */}
                    <td className="px-2 py-2 font-semibold">
                      ${getEffectivePrice(order)}
                    </td>
                    <td className="px-2 py-2 font-semibold">${order.advance}</td>
                    <td className="px-2 py-2 font-semibold">${order.remaining}</td>
                    <td className="px-2 py-2">{order.location}</td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          order.status === "Completed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "In Progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleEditClick(order)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Edit order"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg p-6 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Edit Order</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-black text-xl"
              >
                Ã—
              </button>
            </div>
            <hr className="border-gray-400 mb-4" />
            <form className="space-y-4 text-black" onSubmit={(e) => e.preventDefault()}>
              {/* Price, Final Price & Advance */}
              <div className="flex gap-4">
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-medium text-gray-700">Base Price</label>
                  <input
                    type="number"
                    value={selectedOrder.price}
                    onChange={(e) =>
                      e.target.value.length <= 6 &&
                      setSelectedOrder({
                        ...selectedOrder,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-[10px] text-gray-500 mt-1">
                    Shown only if Final Price is empty.
                  </span>
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-medium text-gray-700">Final Price</label>
                  <input
                    type="number"
                    value={selectedOrder.finalPrice ?? ""}
                    onChange={(e) =>
                      e.target.value.length <= 6 &&
                      setSelectedOrder({
                        ...selectedOrder,
                        finalPrice:
                          e.target.value === ""
                            ? undefined
                            : parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-[10px] text-gray-500 mt-1">
                    If set, this is what appears in the Price column.
                  </span>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-medium text-gray-700">Advance</label>
                  <input
                    type="number"
                    value={selectedOrder.advance}
                    onChange={(e) =>
                      e.target.value.length <= 6 &&
                      setSelectedOrder({
                        ...selectedOrder,
                        advance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                {/* Remaining */}
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-medium text-gray-700">Remaining</label>
                  <input
                    type="number"
                    value={selectedOrder.remaining}
                    onChange={(e) =>
                      setSelectedOrder({
                        ...selectedOrder,
                        remaining: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  value={selectedOrder.location}
                  onChange={(e) =>
                    setSelectedOrder({
                      ...selectedOrder,
                      location: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Status & Zone */}
              <div className="flex gap-4 items-end relative">
                <div className="flex flex-col flex-1 relative">
                  <label className="text-sm font-medium text-gray-700 mb-1">Status</label>
                  <button
                    type="button"
                    onClick={() => setShowStatusDropdown((prev) => !prev)}
                    className={`w-full flex justify-between items-center px-3 py-2 rounded border text-base font-semibold focus:outline-none focus:ring-2 focus:ring-black ${
                      selectedOrder.status === "Completed"
                        ? "bg-green-100 text-green-700 border-green-300"
                        : selectedOrder.status === "In Progress"
                        ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                        : "bg-red-100 text-red-600 border-red-300"
                    }`}
                  >
                    <span>{selectedOrder.status}</span>
                    <span className="text-sm ml-2">â–¼</span>
                  </button>

                  {showStatusDropdown && (
                    <div className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded shadow z-10">
                      {["Completed", "In Progress", "Pending"].map((status) => (
                        <div
                          key={status}
                          onClick={() => {
                            setSelectedOrder({ ...selectedOrder, status });
                            setShowStatusDropdown(false);
                          }}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                            selectedOrder.status === status ? "font-bold" : ""
                          }`}
                        >
                          {status}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col flex-1">
                  <label className="text-sm font-medium text-gray-700">Zone</label>
                  <input
                    type="text"
                    value={selectedOrder.zone || ""}
                    onChange={(e) =>
                      setSelectedOrder({
                        ...selectedOrder,
                        zone: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* Status Display & Save */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-base font-semibold flex items-center gap-3">
                  Status:
                  <span
                    className={`px-4 py-1.5 rounded-full text-base font-semibold ${
                      selectedOrder.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : selectedOrder.status === "In Progress"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUpdateOrder}
                  className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}












