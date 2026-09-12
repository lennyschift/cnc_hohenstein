frappe.provide("frappe.dashboards.chart_sources");

frappe.dashboards.chart_sources["Fertigungskarten Status"] = {
    method: "cnc_hohenstein.cnc_hohenstein.dashboard_chart_source.fertigungskarten_status.fertigungskarten_status.get",
    filters: []
};
