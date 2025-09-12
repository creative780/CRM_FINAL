// File: /app/admin/client-crm/ContactLog.tsx
const ContactLog = ({ clientId }: { clientId: number }) => {
  return (
    <div className="mt-4 text-sm text-gray-600">
      <p>📞 Call log available</p>
      <p>💬 WhatsApp last seen: Today</p>
    </div>
  );
};
export default ContactLog;
