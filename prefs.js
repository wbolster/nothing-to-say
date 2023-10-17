"use strict";

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Gst from 'gi://Gst';
import GstAudio from 'gi://GstAudio';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {KeybindingsWidget} from './keybindingsWidget.js';

export default class extends ExtensionPreferences {
  getPreferencesWidget() {
    this.settings = this.getSettings();

    const isPlayingSoundSupported = Gst != null && GstAudio != null;
    let gridProperties = {
      column_spacing: 12,
      row_spacing: 12,
      visible: true,
    };
    const prefsWidget = new Gtk.Grid(gridProperties);

    // Keybindings label
    const keybindingsLabel = new Gtk.Label({
      label: "Keybindings",
      halign: Gtk.Align.START,
      visible: true,
    });
    prefsWidget.attach(keybindingsLabel, 0, 1, 1, 1);

    // Keybindings widget
    const listBox = new Gtk.ListBox({selection_mode: 0, hexpand: true});
    const keys = ["keybinding-toggle-mute"];
    const keybindingsWidget = new KeybindingsWidget(keys, this.settings);
    const keybindingsRow = new Gtk.ListBoxRow({activatable: false});
    keybindingsRow.set_child(keybindingsWidget);
    listBox.append(keybindingsRow);
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
      active: this.settings.get_boolean("play-feedback-sounds"),
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
      playingSoundNotSupportedLabel.set_wrap(true);
      prefsWidget.attach(playingSoundNotSupportedLabel, 0, 5, 1, 1);
    }

    return prefsWidget;
  }
}
