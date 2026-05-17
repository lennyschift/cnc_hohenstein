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
        produzierende_menge = frappe.utils.flt(row.get("produzierende_menge"))

        if not sales_order_item:
            frappe.throw(_("Auftragsposition fehlt."))

        if produzierende_menge <= 0:
            frappe.throw(_("Produzierende Menge muss größer als 0 sein."))

        so_item = None
        for item in so.items:
            if item.name == sales_order_item:
                so_item = item
                break

        if not so_item:
            frappe.throw(_("Auftragsposition wurde im Auftrag nicht gefunden."))

        if so_item.item_group != "Produkte":
            frappe.throw(_("Nur Artikel aus der Artikelgruppe Produkte dürfen verwendet werden."))

        fk = frappe.new_doc("Fertigungskarte")
        fk.sales_order = so.name
        fk.sales_order_item = so_item.name
        fk.status = "Offen"
        fk.prioritaet = "Normal"

        fk.artikel = so_item.item_code
        fk.kunde = so.customer

        fk.menge = produzierende_menge
        fk.menge_produziert = 0
        fk.menge_geliefert = 0

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
