.PHONY: zip compile-schemas

zip: compile-schemas
	zip "gnome-shell-extension-nothing-to-say-$$(date +%Y%m%d%H%M%S)-$$(git rev-parse --short @).zip" \
		*.js \
		metadata.json \
		sounds/*.ogg \
		schemas/gschemas.compiled \
		schemas/org.gnome.shell.extensions.nothing-to-say.gschema.xml

compile-schemas:
	glib-compile-schemas --strict schemas/
