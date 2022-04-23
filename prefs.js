"use strict";

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const KeybindingsWidget = Extension.imports.keybindingsWidget.KeybindingsWidget;

const GTK_VERSION = Gtk.get_major_version();

function init() {}

function buildPrefsWidget() {
  this.settings = ExtensionUtils.getSettings();

  const isPlayingSoundSupported = is_playing_sound_supported();
  let gridProperties = {
    column_spacing: 12,
    row_spacing: 12,
    visible: true,
  };
  if (GTK_VERSION == 3) {
    gridProperties.margin = 18;
  }
  const prefsWidget = new Gtk.Grid(gridProperties);

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
  if (GTK_VERSION == 3) {
    keybindingsRow.add(keybindingsWidget);
    listBox.add(keybindingsRow);
    listBox.show_all();
  } else {
    keybindingsRow.set_child(keybindingsWidget);
    listBox.append(keybindingsRow);
  }
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

  const showOSDLabel = new Gtk.Label({
    label: "Whether to show OSD notification",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(showOSDLabel, 0, 3, 1, 1);

  let toggleOSD = new Gtk.Switch({
    active: this.settings.get_boolean("show-osd"),
    halign: Gtk.Align.END,
    visible: true,
  });
  prefsWidget.attach(toggleOSD, 1, 3, 1, 1);

  this.settings.bind(
    "show-osd",
    toggleOSD,
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );

  // Feedback sounds label
  const feedbackSoundsLabel = new Gtk.Label({
    label: "Play sound when muting and unmuting",
    halign: Gtk.Align.START,
    visible: true
  });
  prefsWidget.attach(feedbackSoundsLabel, 0, 4, 1, 1);

  // Feedback sounds switch
  const feedbackSoundsSwitch = new Gtk.Switch({
    active: settings.get_boolean("play-feedback-sounds"),
    halign: Gtk.Align.END,
    visible: true,
  });
  this.settings.bind(
    "play-feedback-sounds",
    feedbackSoundsSwitch,
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  prefsWidget.attach(feedbackSoundsSwitch, 1, 4, 1, 1);
  feedbackSoundsSwitch.set_sensitive(isPlayingSoundSupported);

  if (!isPlayingSoundSupported) {
    const playingSoundNotSupportedLabel = new Gtk.Label({
      halign: Gtk.Align.START,
    });
    playingSoundNotSupportedLabel.set_markup("<span foreground='red'>WARNING. Playing sound is not supported on this system. Is GStreamer package installed?</span>");
    if (GTK_VERSION == 3) {
      playingSoundNotSupportedLabel.set_line_wrap(true);
    } else {
      playingSoundNotSupportedLabel.set_wrap(true);
    }
    prefsWidget.attach(playingSoundNotSupportedLabel, 0, 5, 1, 1);
  }

  const controlAllInputsLabel = new Gtk.Label({
    label: "Mute and unmute all microphones",
    halign: Gtk.Align.START,
    visible: true,
  });
  prefsWidget.attach(controlAllInputsLabel, 0, 6, 1, 1);

  const controlAllInputsSwitch = new Gtk.Switch({
    active: this.settings.get_boolean("control-all-inputs"),
    halign: Gtk.Align.END,
    visible: true,
  });
  this.settings.bind(
    "control-all-inputs",
    controlAllInputsSwitch,
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  prefsWidget.attach(controlAllInputsSwitch, 1, 6, 1, 1);

  if (GTK_VERSION == 3) {
    prefsWidget.show_all();
  }

  return prefsWidget;
}

function is_playing_sound_supported() {
  try {
    imports.gi.Gst;
    imports.gi.GstAudio;
    return true;
  } catch(e) {
    log(`${Extension.metadata.uuid}: Playing sound is not supported on this system. Is GStreamer package installed?`);
    log(`${Extension.metadata.uuid}: ${e}`);
    return false;
  }
}

