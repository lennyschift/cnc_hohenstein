frappe.ui.form.on('Sales Order', {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;
        if (frm.doc.status !== "To Deliver and Bill") return;

        frm.add_custom_button(__('Fertigungskarten erstellen'), function () {
            open_fertigungskarten_dialog(frm);
        }, __('CNC Hohenstein'));
    }
});

function open_fertigungskarten_dialog(frm) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Fertigungskarte",
            filters: {
                sales_order: frm.doc.name
            },
            fields: ["sales_order_item"],
            limit_page_length: 999
        },
        freeze: true,
        freeze_message: __('Prüfe vorhandene Fertigungskarten...'),
        callback(r) {
            const vorhandene_auftragspositionen = (r.message || [])
                .map(row => row.sales_order_item)
                .filter(Boolean);

            const produkte = (frm.doc.items || []).filter(row => {
                return row.item_group === "Produkte"
                    && !vorhandene_auftragspositionen.includes(row.name);
            });

            if (!produkte.length) {
                frappe.msgprint(__('Für diesen Auftrag gibt es keine Produkt-Positionen mehr ohne Fertigungskarte.'));
                return;
            }

            open_fertigungskarten_dialog_mit_positionen(frm, produkte);
        }
    });
}

function open_fertigungskarten_dialog_mit_positionen(frm, produkte) {
    let d = new frappe.ui.Dialog({
        title: __('Fertigungskarten erstellen'),
        fields: [
            {
                fieldname: 'positionen',
                fieldtype: 'Table',
                label: __('Positionen'),
                cannot_add_rows: true,
                cannot_delete_rows: true,
                in_place_edit: true,
                data: produkte.map(row => ({
                    erstellen: 1,
                    sales_order_item: row.name,
                    item_code: row.item_code,
                    item_name: row.item_name,
                    qty: row.qty,
                    produzierende_menge: row.qty
                })),
                fields: [
                    {
                        fieldname: 'erstellen',
                        fieldtype: 'Check',
                        label: __('Auswahl'),
                        in_list_view: 1,
                        columns: 1
                    },
                    {
                        fieldname: 'item_code',
                        fieldtype: 'Data',
                        label: __('Artikel-Code'),
                        read_only: 1,
                        in_list_view: 1,
                        columns: 2
                    },
                    {
                        fieldname: 'item_name',
                        fieldtype: 'Data',
                        label: __('Artikelname'),
                        read_only: 1,
                        in_list_view: 1,
                        columns: 3
                    },
                    {
                        fieldname: 'qty',
                        fieldtype: 'Float',
                        label: __('Menge'),
                        read_only: 1,
                        in_list_view: 1,
                        columns: 2
                    },
                    {
                        fieldname: 'produzierende_menge',
                        fieldtype: 'Float',
                        label: __('Produzierende Menge'),
                        reqd: 1,
                        in_list_view: 1,
                        columns: 2
                    }
                ]
            }
        ],

        primary_action_label: __('Fertigungskarten erstellen'),

        primary_action(values) {
            const selected = (values.positionen || []).filter(row => row.erstellen);

            if (!selected.length) {
                frappe.msgprint(__('Bitte mindestens eine Position auswählen.'));
                return;
            }

            for (const row of selected) {
                if (!row.produzierende_menge || row.produzierende_menge <= 0) {
                    frappe.msgprint(__('Die produzierende Menge muss größer als 0 sein.'));
                    return;
                }
            }

            frappe.call({
                method: "cnc_hohenstein.api.fertigungskarte.create_from_sales_order",
                args: {
                    sales_order: frm.doc.name,
                    items: selected
                },
                freeze: true,
                freeze_message: __('Erstelle Fertigungskarten...'),
                callback(r) {
                    if (!r.message) return;

                    let links = r.message.map(row => {
                        return `<a href="/app/fertigungskarte/${row.name}">${row.name}</a> - ${row.artikel} - Menge ${row.menge}`;
                    }).join('<br>');

                    frappe.msgprint({
                        title: __('Fertigungskarten erstellt'),
                        indicator: 'green',
                        message: links
                    });

                    d.hide();
                    frm.reload_doc();
                }
            });
        }
    });

    d.show();

    setTimeout(() => {
        d.$wrapper.find('.grid-row-check').hide();
        d.$wrapper.find('.grid-heading-row .grid-row-check').hide();
    }, 100);
}
