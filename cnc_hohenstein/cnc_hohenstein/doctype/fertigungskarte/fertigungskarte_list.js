frappe.listview_settings['Fertigungskarte'] = {
    get_indicator: function (doc) {
        const status_colors = {
            "Offen": "red",
            "In Produktion": "orange",
            "Fertig": "green"
        };

        return [__(doc.status), status_colors[doc.status] || "gray", "status,=," + doc.status];
    }
};
