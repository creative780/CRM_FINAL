"use client";

import React, { useEffect, useState } from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "../../components/ui/dialog";
import {Button} from "../../components/ui/button";

type Client = {
  id: string;
  name: string;
  company: string;
  phone: string;
  businessType: string;
  status: "Active" | "Inactive";
  zone: string;
  location: string;
  value: string;
  lastContact: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (
    changes: Pick<Client, "id" | "status" | "value" | "lastContact">
  ) => void;
};

const ReadonlyField: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex flex-col">
    <label className="mb-1 text-sm font-medium text-gray-700">{label}</label>
    <input
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-800"
      value={value}
      readOnly
    />
  </div>
);

const toDateInput = (isoLike: string) => {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return isoLike;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const ClientProfileModal: React.FC<Props> = ({
  open,
  onClose,
  client,
  onSave,
}) => {
  const [status, setStatus] = useState<Client["status"]>("Active");
  const [value, setValue] = useState<string>("");
  const [lastContact, setLastContact] = useState<string>("");

  useEffect(() => {
    if (!client) return;
    setStatus(client.status);
    setValue(client.value);
    setLastContact(toDateInput(client.lastContact));
  }, [client]);

  const handleSave = () => {
    if (!client) return;
    onSave({ id: client.id, status, value, lastContact });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
        <div className="border-t border-gray-200 -mt-2 pt-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadonlyField label="Name" value={client?.name ?? ""} />
          <ReadonlyField label="Company" value={client?.company ?? ""} />
          <ReadonlyField label="Phone" value={client?.phone ?? ""} />
          <ReadonlyField
            label="Business Type"
            value={client?.businessType ?? ""}
          />
          <ReadonlyField label="Location" value={client?.location ?? ""} />
          <ReadonlyField label="Zone" value={client?.zone ?? ""} />

          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Value
            </label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="$6,385"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Last Contact
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              value={lastContact}
              onChange={(e) => setLastContact(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black
                ${
                  status === "Active"
                    ? "bg-green-100 border-green-300 text-green-800"
                    : "bg-red-100 border-red-300 text-red-800"
                }`}
              value={status}
              onChange={(e) => setStatus(e.target.value as Client["status"])}
            >
              <option value="Active" className="bg-green-100 text-green-800">
                Active
              </option>
              <option value="Inactive" className="bg-red-100 text-red-800">
                Inactive
              </option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              status === "Active"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex justify-end">
          <Button
            className="bg-[#891F1A] text-white hover:bg-[#6e1815] px-4 py-2 rounded-md"
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientProfileModal;
