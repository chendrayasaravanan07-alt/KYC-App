import { TrendingUp, TrendingDown } from "lucide-react";

const StatCard = ({ title, value, change, changeType, icon: Icon, color }) => {
  // Ensure everything is numeric to avoid crashes
  const safeValue = Number(value) || 0;
  const safeChange = Number(change) || 0;

  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        
        {/* Left side */}
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>

          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>

            <p className="text-2xl font-bold text-gray-900">
              {safeValue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Change indicator */}
        <div
          className={`flex items-center text-sm font-medium ${
            changeType === "increase"
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {changeType === "increase" ? (
            <TrendingUp className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 mr-1" />
          )}
          {Math.abs(safeChange)}%
        </div>
      </div>
    </div>
  );
};

export default StatCard;
