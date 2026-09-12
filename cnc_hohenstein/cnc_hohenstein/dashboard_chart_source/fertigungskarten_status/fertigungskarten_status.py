import frappe
from frappe import _
from frappe.utils.dashboard import cache_source

STATUS_ORDER = ["Offen", "In Produktion", "Fertig"]


def _count(filters):
    result = frappe.get_list(
        "Fertigungskarte",
        fields=[{"COUNT": "1", "as": "total"}],
        filters=filters,
        ignore_ifnull=True,
    )
    return result[0].total if result else 0


@frappe.whitelist()
@cache_source
def get(
    chart_name=None,
    chart=None,
    no_cache=None,
    filters=None,
    from_date=None,
    to_date=None,
    timespan=None,
    time_interval=None,
    heatmap_year=None,
):
    filters = frappe.parse_json(filters)

    if not filters and chart_name:
        chart_doc = frappe.get_cached_doc("Dashboard Chart", chart_name)
        filters = frappe.parse_json(chart_doc.filters_json)

    filters = filters or []

    values = [_count([*filters, ["Fertigungskarte", "status", "=", status]]) for status in STATUS_ORDER]

    return {
        "labels": STATUS_ORDER,
        "datasets": [{"name": _("Fertigungskarten"), "values": values}],
    }
