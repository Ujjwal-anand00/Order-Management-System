
/**
 * Skeleton Loader Component representing table loading states
 */
const LoadingState = () => {
  // Generate 5 skeleton rows
  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="loading-wrapper">
      {skeletonRows.map((_, index) => (
        <div key={index} className="skeleton-row" style={{ display: 'flex', gap: '16px' }}>
          <div className="skeleton-cell" style={{ width: '15%', height: '24px' }}></div>
          <div className="skeleton-cell" style={{ width: '25%', height: '24px' }}></div>
          <div className="skeleton-cell" style={{ width: '20%', height: '24px' }}></div>
          <div className="skeleton-cell" style={{ width: '10%', height: '24px' }}></div>
          <div className="skeleton-cell" style={{ width: '15%', height: '24px' }}></div>
          <div className="skeleton-cell" style={{ width: '15%', height: '24px' }}></div>
        </div>
      ))}
    </div>
  );
};

export default LoadingState;
