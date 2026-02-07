function Skeleton({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-3 rounded bg-gray-200/70 dark:bg-brand-darkSecondary" />
      ))}
    </div>
  );
}

export default Skeleton;
