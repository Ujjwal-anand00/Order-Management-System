
/**
 * EmptyState Component
 * @param {Object} props - props
 * @param {string} props.message - Custom description message
 */
const EmptyState = ({ message }) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" role="img" aria-label="package">📦</div>
      <h3 className="empty-state-title">No Orders Found</h3>
      <p className="empty-state-desc">
        {message || "There are no orders matching your selected status criteria."}
      </p>
    </div>
  );
};

export default EmptyState;
