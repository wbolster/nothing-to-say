.PHONY: zip compile-schemas

zip: compile-schemas
	zip gnome-shell-extension-nothing-to-say-$$(jq .version metadata.json).zip \
		*.js \
		metadata.json \
		schemas/gschemas.compiled \
		schemas/org.gnome.shell.extensions.nothing-to-say.gschema.xml

compile-schemas:
	glib-compile-schemas --strict schemas/
