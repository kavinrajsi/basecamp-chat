"use client";

export default function MentionDropdown({ people, filter, onSelect, selectedIndex }) {
  const filtered = people.filter((p) =>
    p.name?.toLowerCase().startsWith(filter.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto rounded-lg bg-gray-700 border border-gray-600 shadow-lg z-50">
      {filtered.map((person, idx) => (
        <button
          key={person.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(person);
          }}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
            idx === selectedIndex
              ? "bg-blue-600 text-white"
              : "text-gray-200 hover:bg-gray-600"
          }`}
        >
          {person.avatar_url ? (
            <img
              src={person.avatar_url}
              alt={person.name}
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-500 text-xs font-medium text-gray-200">
              {person.name?.charAt(0)}
            </div>
          )}
          <span className="truncate">{person.name}</span>
        </button>
      ))}
    </div>
  );
}
