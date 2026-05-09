frappe.ui.form.on('Sales Order', {
    refresh(frm) {
        if (frm.doc.docstatus !== 1) return;

        frm.add_custom_button(__('Fertigungskarten erstellen'), function () {
            open_fertigungskarten_dialog(frm);
        }, __('CNC Hohenstein'));
    }
});

function open_fertigungskarten_dialog(frm) {
    const produkte = (frm.doc.items || []).filter(row => {
        return row.item_group === "Produkte";
    });

    if (!produkte.length) {
        frappe.msgprint(__('Keine Artikel mit Artikelgruppe "Produkte" im Auftrag gefunden.'));
        return;
    }

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

            console.log('Ausgewählte Fertigungskarten:', selected);

            frappe.msgprint(__('Auswahl funktioniert. Als nächstes wird die Server-Methode zum Erstellen der Fertigungskarten aufgerufen.'));

            d.hide();
        }
    });

    d.show();

    // Standard-Auswahlspalte der Frappe-Tabelle ausblenden
    setTimeout(() => {
        d.$wrapper.find('.grid-row-check').hide();
        d.$wrapper.find('.grid-heading-row .grid-row-check').hide();
    }, 100);
}
