// File: /app/admin/client-crm/ActivityLog.tsx
const ActivityLog = ({ clientId }: { clientId: number }) => {
  return (
    <div className="mt-4">
      <p className="text-sm text-gray-600">🖥️ Screenshot logs available</p>
      <p className="text-sm text-gray-600">📝 Last active: 5 min ago</p>
    </div>
  );
};

export default ActivityLog;
