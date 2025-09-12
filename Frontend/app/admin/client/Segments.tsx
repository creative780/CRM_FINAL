// File: /app/admin/client-crm/Segments.tsx
const Segments = ({ segments }: { segments: string[] }) => {
  return (
    <div className="flex flex-wrap gap-1 my-2">
      {segments.map((tag, idx) => (
        <span
          key={idx}
          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

export default Segments;