frappe.ui.form.on('Fertigungskarte', {
    refresh(frm) {
        if (frm.is_new()) return;

        frm.add_custom_button(__('Menge zurückmelden'), function () {
            open_menge_zurueckmelden_dialog(frm);
        }, __('CNC Hohenstein'));
    }
});

function open_menge_zurueckmelden_dialog(frm) {

    const bereits_produziert = flt(frm.doc.menge_produziert || 0);
    const sollmenge = flt(frm.doc.menge || 0);
    const noch_offen = Math.max(sollmenge - bereits_produziert, 0);

    let d = new frappe.ui.Dialog({
        title: __('Menge zurückmelden'),

        fields: [

            {
                fieldname: 'bereits_produziert',
                fieldtype: 'Float',
                label: __('Bereits produziert'),
                read_only: 1,
                default: bereits_produziert
            },

            {
                fieldname: 'sollmenge',
                fieldtype: 'Float',
                label: __('Sollmenge'),
                read_only: 1,
                default: sollmenge
            },

            {
                fieldname: 'noch_offen',
                fieldtype: 'Float',
                label: __('Noch offen'),
                read_only: 1,
                default: noch_offen
            },

            {
                fieldname: 'menge',
                fieldtype: 'Float',
                label: __('Menge zurückmelden'),
                reqd: 1,
                default: noch_offen
            }
        ],

        primary_action_label: __('Zurückmelden'),

        primary_action(values) {

            const rueckmeldemenge = flt(values.menge);

            if (rueckmeldemenge <= 0) {
                frappe.msgprint(__('Bitte gültige Menge eingeben.'));
                return;
            }

            if (rueckmeldemenge > noch_offen) {
                frappe.msgprint(__('Die Rückmeldemenge ist größer als die offene Menge.'));
                return;
            }

            const neue_gesamtmenge = bereits_produziert + rueckmeldemenge;

            frappe.call({
                method: "cnc_hohenstein.cnc_hohenstein.doctype.fertigungskarte.fertigungskarte.report_produced_qty",

                args: {
                    fertigungskarte: frm.doc.name,
                    menge: neue_gesamtmenge
                },

                freeze: true,
                freeze_message: __('Menge wird zurückgemeldet...'),

                callback(r) {

                    if (!r.message) return;

                    frappe.show_alert({
                        message: __('Menge erfolgreich zurückgemeldet'),
                        indicator: 'green'
                    });

                    d.hide();
                    frm.reload_doc();
                }
            });
        }
    });

    d.show();
}
