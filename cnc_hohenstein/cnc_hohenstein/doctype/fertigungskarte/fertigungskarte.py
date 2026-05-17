import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import flt


class Fertigungskarte(Document):
    pass


def get_finished_goods_warehouse():
    possible_warehouses = [
        "Finished Goods - HOH",
        "Fertigerzeugnisse - HOH",
        "Fertigwaren - HOH"
    ]

    for warehouse in possible_warehouses:
        if frappe.db.exists("Warehouse", warehouse):
            return warehouse

    frappe.throw(
        _("Kein Fertigwarenlager gefunden. Geprüft wurden: {0}")
        .format(", ".join(possible_warehouses))
    )


@frappe.whitelist()
def report_produced_qty(fertigungskarte, menge):
    menge = flt(menge)

    if menge <= 0:
        frappe.throw(_("Die produzierte Menge muss größer als 0 sein."))

    fk = frappe.get_doc("Fertigungskarte", fertigungskarte)

    if not fk.sales_order:
        frappe.throw(_("Keine Sales Order in der Fertigungskarte hinterlegt."))

    if not fk.sales_order_item:
        frappe.throw(_("Keine Auftragsposition in der Fertigungskarte hinterlegt."))

    if not fk.artikel:
        frappe.throw(_("Kein Artikel in der Fertigungskarte hinterlegt."))

    bereits_produziert = flt(fk.menge_produziert)
    rueckmeldemenge = menge - bereits_produziert

    if rueckmeldemenge <= 0:
        frappe.throw(_("Die Rückmeldemenge muss größer als 0 sein."))

    if menge > flt(fk.menge):
        frappe.throw(_("Die produzierte Gesamtmenge darf nicht größer als die Sollmenge sein."))

    fertigwarenlager = get_finished_goods_warehouse()

    stock_entry = frappe.new_doc("Stock Entry")
    stock_entry.stock_entry_type = "Material Receipt"
    stock_entry.company = "Hohenstein GmbH"
    stock_entry.custom_fertigungskarte = fk.name if frappe.get_meta("Stock Entry").has_field("custom_fertigungskarte") else None

    stock_entry.append("items", {
        "item_code": fk.artikel,
        "qty": rueckmeldemenge,
        "t_warehouse": fertigwarenlager,
        "allow_zero_valuation_rate": 1
    })

    stock_entry.insert()
    stock_entry.submit()

    fk.db_set("menge_produziert", menge)
    fk.db_set("stock_entry", stock_entry.name)
    fk.db_set("gebucht", 1)

    gesamte_produzierte_menge = frappe.db.sql(
        """
        SELECT SUM(menge_produziert)
        FROM `tabFertigungskarte`
        WHERE sales_order = %s
          AND sales_order_item = %s
          AND docstatus < 2
        """,
        (fk.sales_order, fk.sales_order_item),
    )[0][0] or 0

    frappe.db.set_value(
        "Sales Order Item",
        fk.sales_order_item,
        "produced_qty",
        flt(gesamte_produzierte_menge)
    )

    frappe.db.set_value(
        "Sales Order",
        fk.sales_order,
        "modified",
        frappe.utils.now()
    )

    frappe.db.commit()

    return {
        "fertigungskarte": fk.name,
        "sales_order": fk.sales_order,
        "sales_order_item": fk.sales_order_item,
        "menge_produziert": menge,
        "rueckmeldemenge": rueckmeldemenge,
        "produced_qty": flt(gesamte_produzierte_menge),
        "stock_entry": stock_entry.name,
        "warehouse": fertigwarenlager
    }
