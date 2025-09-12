import AttendanceGrid from "../../../components/ui/AttendanceGrid";

export default function AttendanceSheetPage() {
  return (
    <div className="h-screen overflow-hidden p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        📅 Attendance Sheet
      </h1>
      <AttendanceGrid />
    </div>
  );
}
