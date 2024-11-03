"use strict";

import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GObject from "gi://GObject";
import Adw from "gi://Adw";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const KeyValuePair = GObject.registerClass(
  {
    Properties: {
      key: GObject.ParamSpec.string(
        "key",
        null,
        null,
        GObject.ParamFlags.READWRITE,
        "",
      ),
      value: GObject.ParamSpec.string(
        "value",
        "Value",
        "Value",
        GObject.ParamFlags.READWRITE,
        "",
      ),
    },
  },
  class KeyValuePair extends GObject.Object {},
);

export default class extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);

    let group = new Adw.PreferencesGroup({
      title: "Keybindings",
      description: "Keybindings for muting and unmuting",
    });
    page.add(group);

    // keybinding row
    group.add(
      (() => {
        const accel =
          settings.get_strv("keybinding-toggle-mute")[0] || "<Alt>backslash";
        const keybindingsRow = new Adw.EntryRow({
          title: "Mute/Unmute",
          show_apply_button: true,
          text: accel,
        });
        const resetButton = new Gtk.Button({
          icon_name: "edit-clear-symbolic",
          tooltip_text: "Reset to default",
          valign: Gtk.Align.CENTER,
        });
        resetButton.connect("clicked", () => {
          settings.reset("keybinding-toggle-mute");
          keybindingsRow.text =
            settings.get_strv("keybinding-toggle-mute")[0] || "<Alt>backslash";
        });
        keybindingsRow.add_suffix(resetButton);
        keybindingsRow.connect("apply", () => {
          settings.set_strv("keybinding-toggle-mute", [keybindingsRow.text]);
        });
        return keybindingsRow;
      })(),
    );

    group = new Adw.PreferencesGroup({
      title: "Other",
    });
    page.add(group);

    // top bar icon row
    group.add(
      (() => {
        const model = new Gio.ListStore({ item_type: KeyValuePair });
        model.splice(0, 0, [
          new KeyValuePair({ key: "when-recording", value: "When recording" }),
          new KeyValuePair({ key: "always", value: "Always" }),
          new KeyValuePair({ key: "never", value: "Never" }),
        ]);
        const iconVisibleComboBox = new Adw.ComboRow({
          title: "Top bar icon",
          subtitle: "Whether to show top bar icon",
          model: model,
          expression: new Gtk.PropertyExpression(KeyValuePair, null, "value"),
        });
        for (let i = 0; i < model.n_items; i++) {
          if (
            model.get_item(i).key ===
            settings.get_string("icon-visibility", "when-recording")
          ) {
            iconVisibleComboBox.selected = i;
            break;
          }
        }
        iconVisibleComboBox.connect("notify::selected-item", () => {
          const selected_item = iconVisibleComboBox.selected_item;
          if (selected_item) {
            settings.set_string("icon-visibility", selected_item.key);
          }
        });
        settings.bind(
          "icon-visibility",
          iconVisibleComboBox,
          "active-id",
          Gio.SettingsBindFlags.DEFAULT,
        );
        return iconVisibleComboBox;
      })(),
    );

    // osd row
    const toggleOSD = new Adw.SwitchRow({
      title: "OSD notification",
      subtitle: "Whether to show OSD notification",
    });
    settings.bind(
      "show-osd",
      toggleOSD,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );
    group.add(toggleOSD);

    // sound notification row
    const feedbackSoundsSwitch = new Adw.SwitchRow({
      title: "Sound notification",
      subtitle: "Play sound when muting and unmuting",
    });
    settings.bind(
      "play-feedback-sounds",
      feedbackSoundsSwitch,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );
    group.add(feedbackSoundsSwitch);
  }
}
