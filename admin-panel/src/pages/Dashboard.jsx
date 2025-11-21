import { useEffect, useState } from "react";
import StatCard from "../components/StatCard.jsx";
import {
  UserCheck,
  Clock,
  FileSearch,
  Users
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Simulating API call — replace with your backend
    fetch("http://localhost:5000/api/admin/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

      <StatCard
        title="Verified Users"
        value={stats?.verifiedUsers ?? 200}
        change={stats?.verifiedChange ?? 8}
        changeType={stats?.verifiedChange >= 0 ? "increase" : "decrease"}
        icon={UserCheck}
        color="green"
      />

      <StatCard
        title="Pending Review"
        value={stats?.pendingReview ?? 89}
        change={stats?.pendingChange ?? -5}
        changeType={stats?.pendingChange >= 0 ? "increase" : "decrease"}
        icon={Clock}
        color="yellow"
      />

      <StatCard
        title="Rejected Applications"
        value={stats?.rejected ?? 12}
        change={stats?.rejectedChange ?? 2}
        changeType={stats?.rejectedChange >= 0 ? "increase" : "decrease"}
        icon={FileSearch}
        color="red"
      />

      <StatCard
        title="Total Users"
        value={stats?.totalUsers ?? 1200}
        change={stats?.userGrowth ?? 4}
        changeType={stats?.userGrowth >= 0 ? "increase" : "decrease"}
        icon={Users}
        color="blue"
      />
    </div>
  );
}
