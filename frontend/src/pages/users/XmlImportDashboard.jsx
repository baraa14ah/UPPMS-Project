import { Navigate } from "react-router-dom";

/** Legacy route — XML import lives under user management. */
export default function XmlImportDashboard() {
  return <Navigate to="/dashboard/users?tab=xml_import" replace />;
}
