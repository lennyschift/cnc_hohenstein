import frappe

# Gleiche Zuordnung wie im Angebot-Druckformat (Salutation ist in ERPNext
# nicht uebersetzt, kommt immer als "Mr"/"Mrs"/... aus der DB).
SALUTATION_DE = {
	"Mr": "Herr",
	"Mrs": "Frau",
	"Ms": "Frau",
	"Madam": "Frau",
	"Miss": "Frau",
}


@frappe.whitelist()
def get_kunden():
	"""Kunden fuer die Angebots-Workbench, im selben Format wie die alte
	kunden.json (name/adresse/email/lieferanten_nr/ansprechpartner), aber
	live aus Customer/Address/Contact gelesen. Respektiert automatisch die
	Berechtigungen des eingeloggten Nutzers (kein ignore_permissions)."""
	customers = frappe.get_all(
		"Customer", fields=["name", "customer_name"], order_by="customer_name asc"
	)
	if not customers:
		return []

	customer_names = [c.name for c in customers]

	company_names = frappe.get_all("Company", limit_page_length=1, pluck="name")
	company = company_names[0] if company_names else None

	address_links = frappe.get_all(
		"Dynamic Link",
		filters={
			"link_doctype": "Customer",
			"link_name": ["in", customer_names],
			"parenttype": "Address",
		},
		fields=["parent", "link_name"],
	)
	contact_links = frappe.get_all(
		"Dynamic Link",
		filters={
			"link_doctype": "Customer",
			"link_name": ["in", customer_names],
			"parenttype": "Contact",
		},
		fields=["parent", "link_name"],
	)

	addresses = {}
	address_names = [link.parent for link in address_links]
	if address_names:
		for addr in frappe.get_all(
			"Address",
			filters={"name": ["in", address_names]},
			fields=[
				"name",
				"address_line1",
				"address_line2",
				"pincode",
				"city",
				"is_primary_address",
			],
		):
			addresses[addr.name] = addr

	contacts = {}
	contact_names = [link.parent for link in contact_links]
	if contact_names:
		for contact in frappe.get_all(
			"Contact",
			filters={"name": ["in", contact_names]},
			fields=[
				"name",
				"salutation",
				"first_name",
				"last_name",
				"email_id",
				"phone",
				"mobile_no",
				"is_primary_contact",
			],
		):
			contacts[contact.name] = contact

	customer_address_map = {}
	for link in address_links:
		customer_address_map.setdefault(link.link_name, []).append(link.parent)

	customer_contact_map = {}
	for link in contact_links:
		customer_contact_map.setdefault(link.link_name, []).append(link.parent)

	supplier_numbers = {}
	if company:
		for row in frappe.get_all(
			"Supplier Number At Customer",
			filters={
				"parenttype": "Customer",
				"parent": ["in", customer_names],
				"company": company,
			},
			fields=["parent", "supplier_number"],
		):
			supplier_numbers[row.parent] = row.supplier_number

	result = []
	for cust in customers:
		addr_names = customer_address_map.get(cust.name, [])
		primary_addr = None
		for addr_name in addr_names:
			addr = addresses.get(addr_name)
			if addr and addr.is_primary_address:
				primary_addr = addr
				break
		if not primary_addr and addr_names:
			primary_addr = addresses.get(addr_names[0])

		adresse_lines = [cust.customer_name]
		if primary_addr:
			if primary_addr.address_line1:
				adresse_lines.append(primary_addr.address_line1)
			if primary_addr.address_line2:
				adresse_lines.append(primary_addr.address_line2)
			ort = " ".join(filter(None, [primary_addr.pincode, primary_addr.city]))
			if ort:
				adresse_lines.append(ort)

		ansprechpartner = []
		email = ""
		for contact_name in customer_contact_map.get(cust.name, []):
			contact = contacts.get(contact_name)
			if not contact:
				continue
			full_name = " ".join(filter(None, [contact.first_name, contact.last_name])).strip()
			ansprechpartner.append(
				{
					"name": full_name or contact.name,
					"anrede": SALUTATION_DE.get(contact.salutation, contact.salutation or ""),
					"vorname": contact.first_name or "",
					"nachname": contact.last_name or "",
					"email": contact.email_id or "",
					"telefon": contact.phone or contact.mobile_no or "",
				}
			)
			if not email and contact.email_id:
				email = contact.email_id

		result.append(
			{
				"erpnext_name": cust.name,
				"name": cust.customer_name,
				"adresse": "\n".join(adresse_lines),
				"email": email,
				"lieferanten_nr": supplier_numbers.get(cust.name, ""),
				"ansprechpartner": ansprechpartner,
			}
		)

	return result
