"use strict";

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const KeybindingsWidget = Extension.imports.keybindingsWidget.KeybindingsWidget;

function init() {}

function buildPrefsWidget() {
  this.settings = ExtensionUtils.getSettings();

  const prefsWidget = new Gtk.Grid({
    margin: 18,
    column_spacing: 12,
    row_spacing: 12,
    visible: true,
  });

  // Keybindings label
  const keybindingsLabel = new Gtk.Label({
    label: "Keybindings",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(keybindingsLabel, 0, 1, 1, 1);

  // Keybindings widget
  const listBox = new Gtk.ListBox({ selection_mode: 0, hexpand: true });
  const keys = ["keybinding-toggle-mute"];
  const keybindingsWidget = new KeybindingsWidget(keys, this.settings);
  const keybindingsRow = new Gtk.ListBoxRow({ activatable: false });
  keybindingsRow.add(keybindingsWidget);
  listBox.add(keybindingsRow);
  listBox.show_all();
  prefsWidget.attach(listBox, 1, 1, 1, 1);

  // Show top bar icon label
  const iconVisibleLabel = new Gtk.Label({
    label: "Show top bar icon",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(iconVisibleLabel, 0, 2, 1, 1);

  // Show top bar icon combo box
  const iconVisibleComboBox = new Gtk.ComboBoxText();
  iconVisibleComboBox.append("when-recording", "When recording");
  iconVisibleComboBox.append("always", "Always");
  iconVisibleComboBox.append("never", "Never");
  this.settings.bind(
    "icon-visibility",
    iconVisibleComboBox,
    "active-id",
    Gio.SettingsBindFlags.DEFAULT
  );
  prefsWidget.attach(iconVisibleComboBox, 1, 2, 1, 1);

  prefsWidget.show_all();

  return prefsWidget;
}
