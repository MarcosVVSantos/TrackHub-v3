function TagFilter({ tags, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onToggle(tag)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            selected.includes(tag)
              ? "border-brand-primary bg-brand-accent/20 text-brand-primary"
              : "border-gray-200 text-gray-500 hover:border-brand-primary"
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}

export default TagFilter;
