import os
import re
from urllib.parse import urlencode

import frappe
import frappe.sessions
from frappe import _

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.response["status_code"] = 403
		frappe.msgprint(_("Log in to access this page."))
		frappe.redirect(f"/login?{urlencode({'redirect-to': frappe.request.path})}")

	built_index = frappe.get_app_path("cnc_hohenstein", "public", "workbench", "index.html")
	if not os.path.exists(built_index):
		frappe.throw(
			"Workbench-Build nicht gefunden. Im workbench/-Ordner `npm run build:app` ausfuehren."
		)

	with open(built_index, encoding="utf-8") as f:
		built = f.read()

	# Vite's eigenes gebautes index.html hat schon die korrekten (ggf.
	# gehashten) Asset-Pfade relativ zu --base gesetzt - wir uebernehmen nur
	# dessen <link>/<script> Tags in unsere eigene Huelle, statt Dateinamen
	# hier hart zu kodieren (die sich bei jedem Rebuild aendern koennen).
	context.workbench_head = "\n".join(re.findall(r"<link[^>]+>", built))
	context.workbench_body = "\n".join(
		re.findall(r"<script[^>]*>.*?</script>|<script[^>]*/>", built, re.S)
	)
	context.csrf_token = frappe.sessions.get_csrf_token()
	context.no_cache = 1
	return context
