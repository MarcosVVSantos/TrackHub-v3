function Skeleton({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-3 rounded bg-th-line2" />
      ))}
    </div>
  );
}

export default Skeleton;
