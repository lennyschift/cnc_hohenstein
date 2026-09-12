import frappe
from frappe import _


@frappe.whitelist()
def create_from_sales_order(sales_order, items):
    items = frappe.parse_json(items)

    if not sales_order:
        frappe.throw(_("Kein Kundenauftrag übergeben."))

    so = frappe.get_doc("Sales Order", sales_order)

    if so.docstatus != 1:
        frappe.throw(_("Fertigungskarten können nur aus eingereichten Aufträgen erstellt werden."))

    created = []

    for row in items:
        if not row.get("erstellen"):
            continue

        sales_order_item = row.get("sales_order_item")

        if not sales_order_item:
            frappe.throw(_("Auftragsposition fehlt."))

        so_item = None
        for item in so.items:
            if item.name == sales_order_item:
                so_item = item
                break

        if not so_item:
            frappe.throw(_("Auftragsposition wurde im Auftrag nicht gefunden."))

        if so_item.item_group != "Products":
            frappe.throw(_("Nur Artikel aus der Artikelgruppe Produkte dürfen verwendet werden."))

        fk = frappe.new_doc("Fertigungskarte")
        fk.sales_order = so.name
        fk.sales_order_item = so_item.name
        fk.status = "Offen"

        fk.artikel = so_item.item_code
        fk.kunde = so.customer

        fk.menge = so_item.qty
        fk.menge_produziert = 0

        fk.serial_von = so_item.get("custom_start_serialnummer")
        fk.serial_bis = so_item.get("custom_ende_serialnummer")

        fk.liefertermin = so_item.delivery_date or so.delivery_date

        fk.insert()

        created.append({
            "name": fk.name,
            "artikel": fk.artikel,
            "menge": fk.menge
        })

    if not created:
        frappe.throw(_("Keine Positionen ausgewählt."))

    return created
