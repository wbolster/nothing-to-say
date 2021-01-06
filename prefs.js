'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const KeybindingsWidget = Extension.imports.keybindingsWidget.KeybindingsWidget;

function init() {}

function buildPrefsWidget() {
  let gschema = Gio.SettingsSchemaSource.new_from_directory(
    Extension.dir.get_child('schemas').get_path(),
    Gio.SettingsSchemaSource.get_default(),
    false
  );
  this.settings = new Gio.Settings({
    settings_schema: gschema.lookup('org.gnome.shell.extensions.nothing-to-say', true)
  });

  let prefsWidget = new Gtk.Grid({
    margin: 18,
    column_spacing: 12,
    row_spacing: 12,
    visible: true
  });

  // Keybindings label
  let keybindingsLabel = new Gtk.Label({
    label: 'Keybindings',
    halign: Gtk.Align.START,
    visible: true
  });
  prefsWidget.attach(keybindingsLabel, 0, 1, 1, 1);

  // Keybindings widget
  let listBox = new Gtk.ListBox({ selection_mode: 0, hexpand: true});
  let keys = ["keybinding-toggle-mute"];
  let keybindingsWidget = new KeybindingsWidget(keys, this.settings);
  let keybindingsRow = new Gtk.ListBoxRow({ activatable: false });
  keybindingsRow.add(keybindingsWidget);
  listBox.add(keybindingsRow);
  listBox.show_all();
  prefsWidget.attach(listBox, 1, 1, 1, 1);

  return prefsWidget;
}
