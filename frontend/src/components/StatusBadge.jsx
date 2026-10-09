import React from "react";

export function StatusBadge({ status, type }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  let badgeClass = "badge-status-neutral";
  let icon = "bi-circle";

  if (normalized === "pending") {
    badgeClass = "badge-status-pending";
    icon = "bi-hourglass-split";
  } else if (
    normalized === "approved" ||
    normalized === "active" ||
    normalized === "credited" ||
    normalized === "present" ||
    normalized === "completed"
  ) {
    badgeClass = "badge-status-approved";
    icon = normalized === "completed" ? "bi-check2-all" : "bi-check-circle-fill";
  } else if (
    normalized === "in progress" ||
    normalized === "checked in"
  ) {
    badgeClass = "badge-status-pending";
    icon = "bi-play-circle-fill";
  } else if (
    normalized === "rejected" ||
    normalized === "inactive" ||
    normalized === "absent"
  ) {
    badgeClass = "badge-status-rejected";
    icon = "bi-x-circle-fill";
  } else if (
    normalized === "processed" ||
    normalized === "half-day" ||
    normalized === "leave"
  ) {
    badgeClass = "badge-status-processed";
    icon = "bi-info-circle-fill";
  } else if (
    normalized === "not checked in"
  ) {
    badgeClass = "badge-status-neutral";
    icon = "bi-dash-circle";
  }

  return (
    <span className={`badge-status ${badgeClass}`}>
      <i className={`bi ${icon}`} style={{ fontSize: "0.75rem" }}></i>
      <span>{status}</span>
    </span>
  );
}

export default StatusBadge;
