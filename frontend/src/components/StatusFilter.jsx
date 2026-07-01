
/**
 * StatusFilter Component
 * @param {Object} props - props
 * @param {string} props.selectedStatus - Currently active status filter
 * @param {Function} props.onChange - Handler invoked when select option changes
 * @param {boolean} props.disabled - Whether inputs should be disabled during loading
 */
const StatusFilter = ({ selectedStatus, onChange, disabled }) => {
  return (
    <div className="filter-container">
      <label htmlFor="status-filter" className="filter-label">
        Filter by Status:
      </label>
      <select
        id="status-filter"
        className="select-filter"
        value={selectedStatus}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="ALL">All Statuses</option>
        <option value="PLACED">Placed</option>
        <option value="PROCESSING">Processing</option>
        <option value="READY_TO_SHIP">Ready to Ship</option>
      </select>
    </div>
  );
};

export default StatusFilter;
